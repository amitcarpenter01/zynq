import configs from "../config/config.js";
import db from "../config/db.js";
import { openai } from "../../app.js"
import { deleteGuestDataModel, getInvitedZynqUsers } from "../models/api.js";
import { zynqReminderEnglishTemplate, zynqReminderSwedishTemplate } from "./templates.js";
import { sendEmail } from "../services/send_email.js";
import { cosineSimilarity } from "./user_helper.js";
import axios from "axios";

// 🔹 Levenshtein distance (edit distance)
const levenshteinDistance = (a, b) => {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
};

// 🔹 Fuzzy similarity between two words (1 → identical, 0 → very different)
const fuzzySimilarity = (a, b) => {
  if (!a || !b) return 0;
  const dist = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - dist / maxLen;
};

const phraseMeaningSimilarity = (a, b) => {
  if (!a || !b) return 0;

  const aTokens = a.toLowerCase().split(/\s+/);
  const bTokens = b.toLowerCase().split(/\s+/);

  let total = 0;

  for (const aTok of aTokens) {
    let best = 0;
    for (const bTok of bTokens) {
      const sim = fuzzySimilarity(aTok, bTok);
      if (sim > best) best = sim;
    }
    total += best;
  }

  // Average across all search tokens
  return total / aTokens.length;
};

// --------------------------------------
// 4️⃣ Final boost logic (only based on name)
// --------------------------------------
function getHybridScore(nameScore, fullScore) {

  // 1️⃣ Strong exact/near match → name dominates
  if (nameScore >= 0.80) {
    let hybrid =
      (nameScore * 0.85) +
      (fullScore * 0.10) +
      0.05;

    return Math.min(hybrid, 1);
  }

  // 2️⃣ If nameScore is weak (< 0.50), give ZERO weight to nameScore
  if (nameScore < 0.50) {
    return fullScore;   // ❗ Only semantic score matters
  }

  // 3️⃣ Adaptive Hybrid Weighting (middle range 0.50 - 0.79)
  const diff = Math.abs(fullScore - nameScore);
  let nameWeight = 0.50;
  let fullWeight = 0.50;

  if (diff >= 0.20) {
    nameWeight = 0.35;
    fullWeight = 0.65;
  } else if (diff >= 0.10) {
    nameWeight = 0.45;
    fullWeight = 0.55;
  } else {
    nameWeight = 0.60;
    fullWeight = 0.40;
  }

  return (nameScore * nameWeight) + (fullScore * fullWeight);
}




export const getTreatmentsVectorResult = async (
  rows,
  search,
  threshold = 0.4,
  topN = null,
  language = 'en',
  actualSearch
) => {
  if (!search?.trim()) return rows;

  const normalized_search = search.trim().toLowerCase();

  // 1️⃣ Get embedding for the search term
  const queryEmbedRes = await axios.post(
    "http://localhost:11434/api/embeddings",
    {
      model: "nomic-embed-text",
      prompt: normalized_search
    }
  );

  const queryEmbedding = queryEmbedRes.data.embedding;

  let results = [];

  for (const row of rows) {
    if (!row.embeddings) continue;

    // ----------------------------
    // Full semantic embeddings
    // ----------------------------
    const fullEmbedding = Array.isArray(row.embeddings)
      ? row.embeddings
      : JSON.parse(row.embeddings);

    const fullScore = cosineSimilarity(queryEmbedding, fullEmbedding);

    // ----------------------------
    // Name-only embeddings (optional)
    // ----------------------------
    let nameScore = 0;

    if (row.name_embeddings) {
      const nameEmbedding = Array.isArray(row.name_embeddings)
        ? row.name_embeddings
        : JSON.parse(row.name_embeddings);

      nameScore = cosineSimilarity(queryEmbedding, nameEmbedding);
    }

const hybridScore = getHybridScore(nameScore, fullScore);

    if (hybridScore >= threshold) {
      const { embeddings, name_embeddings, ...rest } = row;

      results.push({
        ...rest,
        score: hybridScore,
        fullScore,
        nameScore
      });
    }
  }

  // Sort high → low
  results.sort((a, b) => b.score - a.score);

  // Translate fields
  results = results.map((result) => ({
    ...result,
    name: language === "en" ? result.name : result.swedish,
    benefits: language === "en" ? result.benefits_en : result.benefits_sv,
    description: language === "en" ? result.description_en : result.description_sv,
  }));

  return topN ? results.slice(0, topN) : results;
};


export const getDoctorsVectorResult = async (rows, search, threshold = 0.4, topN = null) => {
  if (!search?.trim()) return rows;

  const normalized_search = search.toLowerCase().replace(/^dr\.?\s*/, "").trim();

  // 1️⃣ Get embedding for the search term
  const response = await axios.post("http://localhost:11434/api/embeddings", {
    model: "nomic-embed-text",
    prompt: normalized_search,
  });
  const queryEmbedding = response.data.embedding;

  // 2️⃣ Compute similarity for each row
  let results = [];

  for (const row of rows) {
    if (!row.embeddings) continue;

    const dbEmbedding = Array.isArray(row.embeddings)
      ? row.embeddings
      : JSON.parse(row.embeddings);

    const doctorName = (row.name || "").toLowerCase().replace(/^dr\.?\s*/, "").trim();
    const doctorTokens = doctorName.split(/\s+/);
    const searchTokens = normalized_search.split(/\s+/);

    // 🔸 Compute fuzzy overlap
    let maxFuzzyScore = 0;
    for (const s of searchTokens) {
      for (const d of doctorTokens) {
        const sim = fuzzySimilarity(s, d);
        if (sim > maxFuzzyScore) maxFuzzyScore = sim;
      }
    }

    // 🔹 Keyword boost based on fuzzy match (e.g., “Karlson” vs “Karlsson” → still boosted)
    const keywordBoost = maxFuzzyScore > 0.7 ? 0.15 * maxFuzzyScore : 0;

    const score = cosineSimilarity(queryEmbedding, dbEmbedding);
    const hybridScore = score + keywordBoost;

    if (hybridScore >= threshold) {
      const { embeddings, ...rest } = row;
      results.push({ ...rest, score: hybridScore });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return topN && topN > 0 ? results.slice(0, topN) : results;
};
export const getClinicsVectorResult = async (rows, search, threshold = 0.4, topN = null) => {
  if (!search?.trim()) return rows;

  const normalized_search = search.toLowerCase().replace(/^dr\.?\s*/, "").trim();

  // 1️⃣ Get embedding for the search term
  const response = await axios.post("http://localhost:11434/api/embeddings", {
    model: "nomic-embed-text",
    prompt: normalized_search,
  });
  const queryEmbedding = response.data.embedding;

  // 2️⃣ Compute similarity for each row
  const results = [];

  for (const row of rows) {
    if (!row.embeddings) continue;

    const dbEmbedding = Array.isArray(row.embeddings)
      ? row.embeddings
      : JSON.parse(row.embeddings);

    const clinicName = (row.clinic_name || "").toLowerCase().replace(/^dr\.?\s*/, "").trim();
    const clinicTokens = clinicName.split(/\s+/);
    const searchTokens = normalized_search.split(/\s+/);

    // 🔸 Compute fuzzy overlap
    let maxFuzzyScore = 0;
    for (const s of searchTokens) {
      for (const d of clinicTokens) {
        const sim = fuzzySimilarity(s, d);
        if (sim > maxFuzzyScore) maxFuzzyScore = sim;
      }
    }

    // 🔹 Keyword boost based on fuzzy match (e.g., “Karlson” vs “Karlsson” → still boosted)
    const keywordBoost = maxFuzzyScore > 0.7 ? 0.15 * maxFuzzyScore : 0;

    const score = cosineSimilarity(queryEmbedding, dbEmbedding);
    const hybridScore = score + keywordBoost;

    if (hybridScore >= threshold) {
      const { embeddings, ...rest } = row;
      results.push({ ...rest, score: hybridScore });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return topN && topN > 0 ? results.slice(0, topN) : results;
};