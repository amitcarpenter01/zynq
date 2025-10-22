import dotenv from "dotenv";

import * as apiModels from "../../models/api.js";
import { asyncHandler, handleError, handleSuccess } from "../../utils/responseHandler.js";
import { queryTreatments } from "../../utils/vectorIndex.js";
import dbOperations from '../../models/common.js';
import { cosineSimilarity } from "../../utils/user_helper.js";
dotenv.config();
import axios from 'axios';
const APP_URL = process.env.APP_URL;

export const generateTreatmentEmbeddings = async (req, res) => {
  try {
    
    const rows = await dbOperations.getTreatmentsWithConcerns();
    // console.log(rows);
    if (!rows || rows.length === 0) {
      return handleError(res, 404,'en', "No Data found");
    }

 
    for (const row of rows) {
      const combinedText = `
        Treatment Name: ${row.name || ''}.
        Swedish: ${row.swedish || ''}.
        Classification Type: ${row.classification_type || ''}.
        Benefits EN: ${row.benefits_en || ''}.
        Benefits SV: ${row.benefits_sv || ''}.
        Description EN: ${row.description_en || ''}.
        Description SV: ${row.description_sv || ''}.
        Related Concerns: ${row.concerns || ''}.
      `;

      if (!combinedText.trim()) continue;

      try {
        const response = await axios.post("http://localhost:11434/api/embeddings", {
          model: "nomic-embed-text",
          prompt: combinedText
        });

        const vector = response.data.embedding;
        const vectorJson = JSON.stringify(vector);

    
        await dbOperations.updateData(
          "tbl_treatments",
          { embeddings: vectorJson },
          `WHERE treatment_id = '${row.treatment_id}'`
        );

        console.log(`✅ Embedding updated for Treatment ID: ${row.treatment_id}`);
      } catch (embedErr) {
        console.error(`❌ Error generating embedding for ID ${row.treatment_id}:`, embedErr.message);
      }
    }

    return handleSuccess(res, 200, "en", "All Treatment embeddings updated successfully");
  } catch (err) {
    console.error("Error generating embeddings:", err);
    return handleError(res, 500, "en", "Internal Server Error");
  }
};
export const generateProductsEmbedding = async (req, res) => {
  try {
    const rows = await dbOperations.getProductsWithTreatments();

    if (!rows || rows.length === 0) {
      return handleError(res, 404, "en", "No data found");
    }

    for (const row of rows) {
      
      const combinedText = [
        row.product_name ? `Product Name: ${row.product_name}` : "",
        row.description_en ? `Description: ${row.description_en}` : "",
        row.treatments_en ? `Treats (EN): ${row.treatments_en}` : "",
        row.treatments_sv ? `Treats (SV): ${row.treatments_sv}` : ""
      ]
        .filter(Boolean) 
        .join(". "); 

      if (!combinedText.trim()) continue; 

      console.log(combinedText);

      try {
        const response = await axios.post("http://localhost:11434/api/embeddings", {
          model: "nomic-embed-text",
          prompt: combinedText
        });

        const vector = response.data.embedding;
        const vectorJson = JSON.stringify(vector);

        await dbOperations.updateData(
          "tbl_products",
          { embeddings: vectorJson },
          `WHERE product_id = '${row.product_id}'`
        );

        console.log(` Embedding updated for product ID: ${row.product_id}`);
      } catch (embedErr) {
        console.error(`Error generating embedding for ID ${row.product_id}:`, embedErr.message);
      }
    }

    return handleSuccess(res, 200, "en", "All product embeddings updated successfully");
  } catch (err) {
    console.error("Error generating embeddings:", err);
    return handleError(res, 500, "en", "Internal Server Error");
  }
};

export const generateDoctorsEmbedding = async (req, res) => {
  try {
    const rows = await dbOperations.getDoctorsWithTreatments();

    if (!rows || rows.length === 0) {
      return handleError(res, 404, "en", "No data found");
    }

    for (const row of rows) {
     
      const combinedText = [
        row.expert_name ? `Expert Name: ${row.expert_name}` : "",
        row.treatments_en ? `Treats (EN): ${row.treatments_en}` : "",
        row.treatments_sv ? `Treats (SV): ${row.treatments_sv}` : ""
      ]
        .filter(Boolean)
        .join(". ");

      if (!combinedText.trim()) continue;

      console.log(combinedText);

      try {
        const response = await axios.post("http://localhost:11434/api/embeddings", {
          model: "nomic-embed-text",
          prompt: combinedText
        });

        const vector = response.data.embedding;
        const vectorJson = JSON.stringify(vector);

        await dbOperations.updateData(
          "tbl_doctors",
          { embeddings: vectorJson },
          `WHERE doctor_id = '${row.doctor_id}'`
        );

        console.log(`✅ Embedding updated for doctor ID: ${row.doctor_id}`);
      } catch (embedErr) {
        console.error(`❌ Error generating embedding for ID ${row.doctor_id}:`, embedErr.message);
      }
    }

    return handleSuccess(res, 200, "en", "All doctor embeddings updated successfully");
  } catch (err) {
    console.error("Error generating embeddings:", err);
    return handleError(res, 500, "en", "Internal Server Error");
  }
};

export const generateClinicEmbedding = async (req, res) => {
  try {
    // Fetch clinics with treatments
    const rows = await dbOperations.getClinicWithTreatments();
    console.log(rows);
    if (!rows || rows.length === 0) {
      return handleError(res, 404,'en', "No Data found");
    }

    for (const row of rows) {
      
      const fields = [
        row.clinic_name ? `Clinic Name: ${row.clinic_name}` : "",
        row.treatments_en ? `Treats (EN): ${row.treatments_en}` : "",
        row.treatments_sv ? `Treats (SV): ${row.treatments_sv}` : "",
      ];

      
      const combinedText = fields.filter(Boolean).join(". ") + ".";

      
      if (!combinedText.trim() || combinedText === ".") {
        console.log(`⏭️ Skipping clinic ID ${row.clinic_id} (no valid data)`);
        continue;
      }
console.log(combinedText);
      try {
        // Generate embedding from Ollama
        const response = await axios.post("http://localhost:11434/api/embeddings", {
          model: "nomic-embed-text",
          prompt: combinedText.trim(),
        });

        const vector = response.data.embedding;

        if (!Array.isArray(vector) || !vector.length) {
          console.warn(`⚠️ Empty embedding for clinic ID ${row.clinic_id}`);
          continue;
        }

       
        await dbOperations.updateData(
          "tbl_clinics",
          { embeddings: JSON.stringify(vector) },
          `WHERE clinic_id = '${row.clinic_id}'`
        );

        console.log(`✅ Embedding updated for clinic ID: ${row.clinic_id}`);
      } catch (embedErr) {
        console.error(`❌ Error generating embedding for ID ${row.clinic_id}:`, embedErr.message);
      }
    }

    return handleSuccess(res, 200, "en", "All clinic embeddings updated successfully");
  } catch (err) {
    console.error("Error generating embeddings:", err);
    return handleError(res, 500, "en", "Internal Server Error");
  }
};


export const getTreatmentsSuggestions = async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return handleError(res, 400, "Keyword is required");

    
    const response = await axios.post("http://localhost:11434/api/embeddings", {
      model: "nomic-embed-text",
      prompt: keyword,
    });
    const queryEmbedding = response.data.embedding;

    // 2️⃣ Fetch all treatments with embeddings
    const rows = await dbOperations.getData(
      "tbl_treatments",
      "WHERE embeddings IS NOT NULL"
    );
    if (!rows?.length) return handleError(res, 404, "No treatments found");

    // 3️⃣ Compute cosine similarity
    const results = [];
    for (const item of rows) {
      const dbEmbedding = Array.isArray(item.embeddings)
        ? item.embeddings
        : JSON.parse(item.embeddings); // parse if stored as JSON string

      const score = cosineSimilarity(queryEmbedding, dbEmbedding);
      if (score >= 0.4) results.push({ ...item, score });
    }

    // 4️⃣ Sort by similarity descending and take top 20
    results.sort((a, b) => b.score - a.score);
    const top = results.slice(0, 20);

    return res.json({ success: true, suggestions: top });
  } catch (err) {
    console.error("❌ Error generating treatment suggestions:", err);
    return handleError(res, 500, "EMBEDDINGS ERROR");
  }
};

export const getProductSuggestions = async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return handleError(res, 400, "Keyword is required");

    
    const response = await axios.post("http://localhost:11434/api/embeddings", {
      model: "nomic-embed-text",
      prompt: keyword,
    });
    const qEmbedding  = response.data.embedding;

    
    const rows = await dbOperations.getData(
      "tbl_products",
      "WHERE embeddings IS NOT NULL"
    );
    if (!rows?.length) return handleError(res, 404, "No Products found");

    
    const results = [];
    for (const item of rows) {
      const dbEmbedding = (item.embeddings);
      const score = cosineSimilarity(qEmbedding, dbEmbedding);
      if (score >= 0.4) results.push({ name: item.name, score });
    }

    
    results.sort((a, b) => b.score - a.score);
    const top = results.slice(0, 20);

    return res.json({ success: true, suggestions: top });

  } catch (err) {
    console.error("❌ Error generating suggestions:", err);
    return handleError(res, 500, "EMBEDDINGS ERROR");
  }
};
export const getDoctorSuggestions = async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return handleError(res, 400, "Keyword is required");

    
    const response = await axios.post("http://localhost:11434/api/embeddings", {
      model: "nomic-embed-text",
      prompt: keyword,
    });
    const qEmbedding  = response.data.embedding;

    
    const rows = await dbOperations.getData(
      "tbl_doctors",
      "WHERE embeddings IS NOT NULL"
    );
    if (!rows?.length) return handleError(res, 404, "No doctors found");

    
    const results = [];
    for (const item of rows) {
      const dbEmbedding = (item.embeddings);
      const score = cosineSimilarity(qEmbedding, dbEmbedding);
      if (score >= 0.45) results.push({ name: item.name, score });
    }

    
    results.sort((a, b) => b.score - a.score);
    const top = results.slice(0, 20);

    return res.json({ success: true, suggestions: top });

  } catch (err) {
    console.error("❌ Error generating suggestions:", err);
    return handleError(res, 500, "EMBEDDINGS ERROR");
  }
};
export const getClinicSuggestions = async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return handleError(res, 400, "Keyword is required");

    
    const response = await axios.post("http://localhost:11434/api/embeddings", {
      model: "nomic-embed-text",
      prompt: keyword,
    });
    const qEmbedding  = response.data.embedding;

    
    const rows = await dbOperations.getData(
      "tbl_clinics",
      "WHERE embeddings IS NOT NULL"
    );
  
    if (!rows?.length) return handleError(res, 404, "No doctors found");

    
    const results = [];
    for (const item of rows) {
      const dbEmbedding = (item.embeddings);
      const score = cosineSimilarity(qEmbedding, dbEmbedding);
      if (score >= 0.42) results.push({ name: item.clinic_name , score });
    }

    
    results.sort((a, b) => b.score - a.score);
    const top = results.slice(0, 20);

    return res.json({ success: true, suggestions: top });

  } catch (err) {
    console.error("❌ Error generating suggestions:", err);
    return handleError(res, 500, "EMBEDDINGS ERROR");
  }
};

