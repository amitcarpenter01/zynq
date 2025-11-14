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
  export const getTreatmentsVectorResult = async (
    rows,
    search,
    threshold = 0.4,
    topN = null,
    language = 'en',
    actualSearch
  ) => {
    if (!search?.trim()) return rows;
  
    const normalized_search = search;
    
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
  
      // 🧠 Combined text for keyword relevance (used for boost)
      const combinedText = `
        Treatment Name: ${row.name || ""}
        Swedish: ${row.swedish || ""}
        Benefits: ${row.benefits_en || ""}
        Benefits Swedish: ${row.benefits_sv || ""}
        Description: ${row.description_en || ""}
        Concern: ${row.concern_en || ""}
        Devices Used: ${row.device_name || ""}
      `.toLowerCase();
  
      const score = cosineSimilarity(queryEmbedding, dbEmbedding);
      const keywordBoost =
        combinedText.includes(actualSearch.toLowerCase()) ? 0.15 : 0;
  
      const hybridScore = score + keywordBoost;
  
      if (hybridScore >= threshold) {
        const { embeddings, ...rest } = row;
        results.push({ ...rest, score: hybridScore });
      }
    }
  
    // 3️⃣ Sort descending by similarity
    results.sort((a, b) => b.score - a.score);
  
    results = results.map((result) => ({
      ...result,
      name: language === "en" ? result.name : result.swedish,
      benefits: language === "en" ? result.benefits_en : result.benefits_sv,
      description: language === "en" ? result.description_en : result.description_sv,
      devices: result.device_name,
      classification_type: result.classification_type,
      treatment_id: result.treatment_id,
      score: result.score,
    }));
  
    // 4️⃣ Return all above threshold or topN if specified
    if (topN && topN > 0) {
      return results.slice(0, topN);
    }
    return results;
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