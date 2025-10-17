// import hnswlib from "hnswlib-node";
import dbOperations from '../models/common.js';

// Global in-memory vector index
let treatmentIndex = null;
let treatmentIdMap = [];

export const loadTreatmentEmbeddings = async () => {
  console.log("🔄 Loading treatment embeddings into HNSW index...");

  // 1️⃣ Load all embeddings from MySQL
  const rows = await dbOperations.getData(
    "tbl_treatments",
    "WHERE embeddings IS NOT NULL"
  );

  if (!rows.length) {
    console.warn("⚠️ No embeddings found in tbl_treatments.");
    return;
  }

  // Parse embeddings (ensure stored as JSON array)
  const vectors = rows.map((r) => {
    try {
      return Array.isArray(r.embeddings)
        ? r.embeddings
        : (r.embeddings);
    } catch {
      return [];
    }
  });

  const dimension = vectors[0].length;

  // 2️⃣ Create index
  const space = "cosine";
  const index = new hnswlib.HierarchicalNSW(space, dimension);

  // 3️⃣ Initialize index
  index.initIndex(vectors.length);

  // 4️⃣ Add all vectors
  vectors.forEach((vec, i) => {
    index.addPoint(vec, i);
  });

  treatmentIndex = index;
  treatmentIdMap = rows.map((r) => r.treatment_id);

  console.log(`✅ HNSW index built with ${vectors.length} treatments.`);
};


export const queryTreatments = async (queryEmbedding, k = 10) => {
  if (!treatmentIndex) {
    throw new Error("❌ HNSW index not loaded. Call loadTreatmentEmbeddings() first.");
  }

  const { neighbors, distances } = treatmentIndex.searchKnn(queryEmbedding, k);


  return neighbors.map((i, idx) => ({
    treatment_id: treatmentIdMap[i],
    score: 1 - distances[idx], 
  }));
};
