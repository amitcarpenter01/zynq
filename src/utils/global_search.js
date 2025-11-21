import configs from "../config/config.js";
import db from "../config/db.js";
import { openai } from "../../app.js"
import { deleteGuestDataModel, getInvitedZynqUsers } from "../models/api.js";
import { zynqReminderEnglishTemplate, zynqReminderSwedishTemplate } from "./templates.js";
import { sendEmail } from "../services/send_email.js";
import { cosineSimilarity } from "./user_helper.js";
import axios from "axios";
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_KEY });
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




// export const getTreatmentsVectorResult = async (
//   rows,
//   search,
//   threshold = 0.4,
//   topN = null,
//   language = 'en',
//   actualSearch
// ) => {
//   if (!search?.trim()) return rows;

//   const normalized_search = search.trim().toLowerCase();

//   // 1️⃣ Get embedding for the search term
//   const queryEmbedRes = await axios.post(
//     "http://localhost:11434/api/embeddings",
//     {
//       model: "nomic-embed-text",
//       prompt: normalized_search
//     }
//   );

//   const queryEmbedding = queryEmbedRes.data.embedding;

//   let results = [];

//   for (const row of rows) {
//     if (!row.embeddings) continue;

//     // ----------------------------
//     // Full semantic embeddings
//     // ----------------------------
//     const fullEmbedding = Array.isArray(row.embeddings)
//       ? row.embeddings
//       : JSON.parse(row.embeddings);

//     const fullScore = cosineSimilarity(queryEmbedding, fullEmbedding);

//     // ----------------------------
//     // Name-only embeddings (optional)
//     // ----------------------------
//     let nameScore = 0;

//     if (row.name_embeddings) {
//       const nameEmbedding = Array.isArray(row.name_embeddings)
//         ? row.name_embeddings
//         : JSON.parse(row.name_embeddings);

//       nameScore = cosineSimilarity(queryEmbedding, nameEmbedding);
//     }

// const hybridScore = getHybridScore(nameScore, fullScore);

//     if (hybridScore >= threshold) {
//       const { embeddings, name_embeddings, ...rest } = row;

//       results.push({
//         ...rest,
//         score: hybridScore,
//         fullScore,
//         nameScore
//       });
//     }
//   }

//   // Sort high → low
//   results.sort((a, b) => b.score - a.score);

//   // Translate fields
//   results = results.map((result) => ({
//     ...result,
//     name: language === "en" ? result.name : result.swedish,
//     benefits: language === "en" ? result.benefits_en : result.benefits_sv,
//     description: language === "en" ? result.description_en : result.description_sv,
//   }));

//   return topN ? results.slice(0, topN) : results;
// };


export const getTreatmentsVectorResult = async (
  rows,
  search,
  threshold = 0.40,
  topN = null,
  language = "en"
) => {
  if (!search?.trim()) return rows;

  const normalized = search.trim().toLowerCase();

  const scoreResults = await batchGPTSimilarity(rows, normalized);

  const scoreMap = new Map(scoreResults.map(r => [r.id, r.score]));

  const filtered = rows
    .map(r => ({
      ...r,
      score: scoreMap.get(r.treatment_id) ?? 0
    }))
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score);

  const translated = filtered.map(result => ({
    ...result,
    name: language === "en" ? result.name : result.swedish,
    benefits: language === "en" ? result.benefits_en : result.benefits_sv,
    description: language === "en"
      ? result.description_en
      : result.description_sv
  }));

  return topN ? translated.slice(0, topN) : translated;
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
export const getDoctorsAIResult = async (rows, search, language = "en") => {
  const rowsWithText = rows.map(r => ({
    ...r,
    combined_text: `
      Doctor ${r.name || ''} 
      treats ${r.treatments || ''} 
      and practices at ${r.clinic_address || ''}.
    `.trim()
  }));

  const scoreResults = await runGPTSimilarity(rowsWithText, search, {
    idField: "doctor_id",
    textFields: ["combined_text"]
  });

  // ⛔ GPT returned no matches → return empty array
  if (!scoreResults || scoreResults.length === 0) {
    console.warn("⚠️ GPT returned no similarity matches");
    return [];
  }

  // Apply similarity threshold
  let results = applyAISimilarity(rows, scoreResults, {
    idField: "doctor_id",
    threshold: 0.40,
  });

  // ⛔ After threshold filtering, no results → return empty array
  if (!results || results.length === 0) {
    console.warn("⚠️ Similarity threshold removed all results");
    return [];
  }

  return results;
};
export const getClinicsAIResult = async (rows, search, language = "en") => {
  const rowsWithText = rows.map(r => ({
    ...r,
    combined_text: `
      Clinic ${r.clinic_name || ''} 
      located at ${r.address || ''}.
    `.trim()
  }));

  const scoreResults = await runGPTSimilarity(rowsWithText, search, {
    idField: "clinic_id",
    textFields: ["combined_text"],
    batchSize: 500
  });

  // ⛔ GPT returned no matches → return empty array
  if (!scoreResults || scoreResults.length === 0) {
    console.warn("⚠️ GPT returned no similarity matches");
    return [];
  }

  // Apply similarity threshold
  let results = applyAISimilarity(rows, scoreResults, {
    idField: "clinic_id",
    threshold: 0.40,
  });

  // ⛔ After threshold filtering, no results → return empty array
  if (!results || results.length === 0) {
    console.warn("⚠️ Similarity threshold removed all results");
    return [];
  }

  return results;
};


export const getDevicesAIResult = async (
  rows,
  search,
  threshold = 0.40,
  topN = null,
  language = "en"
) => {
  if (!search?.trim()) return rows;

  const normalized = search.trim().toLowerCase();

  const scoreResults = await batchDeviceGPTSimilarity(rows, normalized);
console.log("scoreResults device", scoreResults);
  const scoreMap = new Map(scoreResults.map(r => [r.id, r.score]));

  const filtered = rows
    .map(r => ({
      ...r,
      score: scoreMap.get(r.id) ?? 0
    }))
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score);

  const translated = filtered.map(result => ({
    ...result,
    device_name: result.device_name,
    treatment_name: result.treatment_name
  }));

  return topN ? translated.slice(0, topN) : translated;
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

async function batchGPTSimilarity(rows, searchQuery) {
  const list = rows.map(r => ({
    id: r.treatment_id,
    text: `${safeString(r.name)} - ${safeString(r.concern_en)} ${safeString(r.description_en)}`.trim()
  }));

  const prompt = `
You are a similarity scoring engine.
Compare each item in the list to the search query.

Search Query: "${searchQuery}"

Return ONLY this exact JSON:
{
  "results": [
    { "id": string, "score": number }
  ]
}

IMPORTANT RULES ABOUT IDs:
• You MUST ONLY return IDs from the ITEM LIST.
• Never invent or modify an ID.
• IDs are strings (UUIDs), NOT numbers.
• If unsure, return lower score, not a fake ID.

SCORING RULES:
• 0.85 – 1.0 strong match
• 0.60 – 0.85 good match
• 0.40 – 0.60 medium match
• Medium similarity MUST stay in 0.40–0.60
• Understand spelling errors & Swedish–English variants
• Never output 0 unless 100% unrelated

NEGATION RULE:
If query contains:
  - "non laser"
  - "not laser"
  - "without laser"
Then:
  a) Exclude laser-related treatments
  b) Still match best semantic alternatives

ITEM LIST:
${JSON.stringify(list)}

ALLOWED IDs:
${JSON.stringify(rows.map(r => r.treatment_id))}
`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You output ONLY valid JSON. No extra text. No markdown."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const raw = res.choices[0].message.content;
  

  try {
    const match = raw.match(/{[\s\S]*}/);
    if (!match) return [];
    return JSON.parse(match[0]).results || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}
/**
 * 🔥 Main Function — Handles batching automatically
 */
export async function batchDeviceGPTSimilarity(rows, searchQuery, batchSize = 400) {
  const batches = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize));
  }

  console.log(`Processing ${batches.length} batches in parallel...`);

  // Process all batches in parallel
  const batchPromises = batches.map(batch => 
    runDeviceSimilarityBatch(batch, searchQuery)
  );

  const results = await Promise.all(batchPromises);
  
  // Log each partial result
  results.forEach(partial => {
    console.log("partial device", partial);
  });

  return results.flat();
}



/**
 * 🧠 Runs GPT similarity on a *single batch*
 */
async function runDeviceSimilarityBatch(rows, searchQuery) {
  if (!rows || rows.length === 0) return [];

  const list = rows.map(r =>
    `${r.id}|${safeString(r.device_name)} ${safeString(r.treatment_name)}`
  );

  const prompt = `
You are a STRICT JSON similarity scoring engine.
You MUST return ONLY valid JSON. No markdown. No comments.

Search Query: "${searchQuery}"

Return EXACTLY this:
{
  "results": [
    { "id": string, "score": number }
  ]
}

SCORING:
• 0.85–1.0 strong
• 0.60–0.85 good
• 0.40–0.60 medium
• Never output 0 unless fully unrelated

ITEM LIST (id|text):
${list.join("\n")}
`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Return ONLY pure JSON. No markdown." },
      { role: "user", content: prompt }
    ]
  });

  const raw = res.choices[0].message.content;

  try {
    // 👉 Catch broken JSON by extracting the first {...}
    const match = raw.match(/{[\s\S]*}/);
    if (!match) {
      console.error("NO JSON RETURNED:", raw);
      return [];
    }

    return JSON.parse(match[0]).results || [];

  } catch (err) {
    console.error("JSON Parse Error:", err);
    console.log("RAW OUTPUT:", raw);
    return [];
  }
}


/**
 * 🔥 Universal GPT Similarity Engine
 * Works for doctors, clinics, devices, treatments, anything.
 */
export async function runGPTSimilarity(rows, searchQuery, options = {}) {
  const {
    idField = "id",
    textFields = [],
    batchSize = 200,
  } = options;

  if (!rows || rows.length === 0) return [];
  if (!searchQuery?.trim()) return [];

  // Split into batches
  const batches = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize));
  }

  // ------------------------------
  // RUN ALL BATCHES IN PARALLEL
  // ------------------------------
  const results = await Promise.all(
    batches.map(batch =>
      runSingleBatch(batch, searchQuery, idField, textFields)
        .catch(err => {
          console.error("Batch failed:", err);
          return []; // return empty so other batches still succeed
        })
    )
  );

  // Flatten result arrays
  return results.flat();
}



/**
 * 🧠 Runs GPT similarity on a single batch
 */
async function runSingleBatch(batch, searchQuery, idField, textFields) {
 
  // compact "id|text" format
  const list = batch.map((row) => {
    const id = row[idField];
    const combinedText = textFields
      .map(f => safeString(row[f]))
      .filter(Boolean)
      .join(" ");

    return `${id}|${combinedText}`;
  });
 
  const prompt = `
You are a similarity scoring engine.
Compare each item with the search query.

Search Query: "${searchQuery}"

Return ONLY:
{
  "results": [
    { "id": string, "score": number }
  ]
}

SCORING:
• 0.85 – 1.0 strong  
• 0.60 – 0.85 good  
• 0.40 – 0.60 medium  
• Understand Swedish/English errors  
• Never output 0 unless fully unrelated  

NEGATION RULE:
If query contains:
 - "non laser"
 - "not laser"
 - "without laser"
then downscore items related to "laser".

ITEM LIST (id|text):
${list.join("\n")}
`;

  const res = await client.chat.completions.create({
    model: "gpt-4.1-nano",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Output ONLY JSON. No markdown." },
      { role: "user", content: prompt }
    ]
  });

  const raw = res.choices[0].message.content;

  try {
    return JSON.parse(raw).results || [];
  } catch (err) {
    console.error("JSON parse failed:", raw);
    return [];
  }
}

export function applyAISimilarity(rows, scoreResults, {
  idField = "id",
  threshold = 0.40,
  topN = null
}) {

  const scoreMap = new Map(scoreResults.map(r => [r.id, r.score]));

  const filtered = rows
    .map(r => ({ ...r, score: scoreMap.get(r[idField]) ?? 0 }))
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score);

  return topN ? filtered.slice(0, topN) : filtered;
}










function safeString(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

