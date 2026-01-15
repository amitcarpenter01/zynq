import db from "../config/db.js";

const dbOperations = {
  insertData: async (table, data, where = "") => {
    return db.query(`INSERT INTO \`${table}\` SET ? ${where}`, [data]);
  },
  updateData: async (table, data, where = "") => {
    return db.query(`UPDATE \`${table}\` SET ? ${where}`, [data]);
  },
  getData: async (table, where = "") => {
    return db.query(`SELECT * FROM \`${table}\` ${where}`);
  },
  getDistinctData: async (column, table, where = "") => {
    return db.query(`SELECT DISTINCT ${column} FROM \`${table}\` ${where}`);
  },
  deleteData: async (table, where = "") => {
    return db.query(`DELETE FROM \`${table}\` ${where}`);
  },
  fetchCount: async (table, where = "") => {
    return db.query(`SELECT COUNT(*) AS total FROM \`${table}\` ${where}`);
  },
  getSelectedColumn: async (column, table, where = "") => {
    return db.query(`SELECT ${column} FROM \`${table}\` ${where}`);
  },
  getTreatmentsEmbeddingText: async () => {
    try {
      return await db.query(`
        SELECT 
          t.treatment_id,
          CONCAT(
            'Treatment Name: ', IFNULL(t.name, ''),
            ' / ', IFNULL(t.swedish, ''),
            ', Classification: ', IFNULL(t.classification_type, ''),
            ', Benefits EN: ', IFNULL(t.benefits_en, ''),
            ', Benefits SV: ', IFNULL(t.benefits_sv, ''),
            ', Description EN: ', IFNULL(t.description_en, ''),
            ', Description SV: ', IFNULL(t.description_sv, ''),
            '; Concerns: ',
            IFNULL(
              GROUP_CONCAT(
                DISTINCT CONCAT(
                  c.name,
                  ' [EN: ', IFNULL(tc.indications_en, ''),
                  ', SV: ', IFNULL(tc.indications_sv, ''),
                  ', Likewise: ', IFNULL(tc.likewise_terms, ''),
                  ']'
                ) SEPARATOR '; '
              ), 'None'
            )
          ) AS embedding_text
        FROM tbl_treatments t
        LEFT JOIN tbl_treatment_concerns tc ON t.treatment_id = tc.treatment_id
        LEFT JOIN tbl_concerns c ON tc.concern_id = c.concern_id
        WHERE t.embeddings IS NULL
        GROUP BY t.treatment_id
        ORDER BY t.treatment_id DESC;
    `);
    } catch (err) {
      console.error("❌ Error fetching treatment embeddings:", err.message);
      console.error(err); // full error stack for debugging
      throw err; // re-throw so the calling function knows it failed
    }
  },

  getProductsWithTreatments: async () => {
    try {
      return await db.query(`
      SELECT 
        p.product_id,
        CONCAT(
          'Product Name: ', IFNULL(p.name,''),
          ', Price: ', IFNULL(p.price,''),
          ', Short Description: ', IFNULL(p.short_description,''),
          ', Full Description: ', IFNULL(p.full_description,''),
          ', Feature Text: ', IFNULL(p.feature_text,''),
          ', Benefit Text: ', IFNULL(p.benefit_text,''),
          ', How To Use: ', IFNULL(p.how_to_use,''),
          ', Ingredients: ', IFNULL(p.ingredients,''),
          '; Treatments: ', IFNULL(tagg.treatments_text,'None')
        ) AS embedding_text
      FROM tbl_products p
      LEFT JOIN (
        SELECT pt.product_id,
               GROUP_CONCAT(
                 DISTINCT CONCAT(
                   IFNULL(t.name,'N/A'), ' / ', IFNULL(t.swedish,''),
                   ' [Classification: ', IFNULL(t.classification_type,''),
                   ', Benefits EN: ', IFNULL(t.benefits_en,''),
                   ', Benefits SV: ', IFNULL(t.benefits_sv,''),
                   ', Description EN: ', IFNULL(t.description_en,''),
                   ', Description SV: ', IFNULL(t.description_sv,''),
                   ', Concerns: ', IFNULL(tcagg.concerns_text,'None'),
                   ']'
                 ) SEPARATOR '; '
               ) AS treatments_text
        FROM tbl_product_treatments pt
        JOIN tbl_treatments t ON pt.treatment_id = t.treatment_id
        LEFT JOIN (
          SELECT tc.treatment_id,
                 GROUP_CONCAT(
                   DISTINCT CONCAT(
                     IFNULL(c.name,'N/A'),
                     ' [EN: ', IFNULL(tc.indications_en,''),
                     ', SV: ', IFNULL(tc.indications_sv,''),
                     ', Likewise: ', IFNULL(tc.likewise_terms,''),
                     ']'
                   ) SEPARATOR ', '
                 ) AS concerns_text
          FROM tbl_treatment_concerns tc
          LEFT JOIN tbl_concerns c ON tc.concern_id = c.concern_id
          GROUP BY tc.treatment_id
        ) tcagg ON t.treatment_id = tcagg.treatment_id
        GROUP BY pt.product_id
      ) tagg ON p.product_id = tagg.product_id
      WHERE p.embeddings IS NULL
      ORDER BY p.product_id DESC;
    `);
    } catch (err) {
      console.error("❌ Error fetching product embeddings:", err);
      throw err; // re-throw so calling code can handle
    }
  },

  getDoctorsEmbeddingText: async () => {
    try {
      return await db.query(`
      SELECT 
        d.doctor_id,
        CONCAT(
          'Name: ', IFNULL(d.name, ''),
          ', Address: ', IFNULL(d.address, ''),
          ', Biography: ', IFNULL(d.biography, ''),
          ', Gender: ', IFNULL(d.gender, ''),
          ', Age: ', IFNULL(d.age, ''),
          ', Fee per session: ', IFNULL(d.fee_per_session, ''),
          '; Treatments: ', IFNULL(tagg.treatments_text, 'None'),
          '; Skin Types: ', IFNULL(stagg.skin_types_text, 'None'),
          '; Certifications: ', IFNULL(cagg.certifications_text, 'None'),
          '; Devices: ', IFNULL(dagg.devices_text, 'None'),
          '; Education: ', IFNULL(eagg.education_text, 'None'),
          '; Experience: ', IFNULL(exagg.experience_text, 'None')
        ) AS embedding_text
      FROM tbl_doctors d

      -- Treatments + Concerns
      LEFT JOIN (
        SELECT dt.doctor_id,
               GROUP_CONCAT(DISTINCT CONCAT(
                 IFNULL(t.name, 'N/A'), ' / ', IFNULL(t.swedish, ''),
                 ' [Classification: ', IFNULL(t.classification_type, ''),
                 ', Benefits EN: ', IFNULL(t.benefits_en, ''),
                 ', Benefits SV: ', IFNULL(t.benefits_sv, ''),
                 ', Description EN: ', IFNULL(t.description_en, ''),
                 ', Description SV: ', IFNULL(t.description_sv, ''),
                 ', Concerns: ', IFNULL(tcagg.concerns_text, 'None'),
                 ']'
               ) SEPARATOR '; ') AS treatments_text
        FROM tbl_doctor_treatments dt
        JOIN tbl_treatments t ON dt.treatment_id = t.treatment_id
        LEFT JOIN (
          SELECT tc.treatment_id,
                 GROUP_CONCAT(DISTINCT CONCAT(
                   IFNULL(c.name,'N/A'),
                   ' [EN: ', IFNULL(tc.indications_en,''),
                   ', SV: ', IFNULL(tc.indications_sv,''),
                   ', Likewise: ', IFNULL(tc.likewise_terms,''),
                   ']'
                 ) SEPARATOR ', ') AS concerns_text
          FROM tbl_treatment_concerns tc
          LEFT JOIN tbl_concerns c ON tc.concern_id = c.concern_id
          GROUP BY tc.treatment_id
        ) tcagg ON t.treatment_id = tcagg.treatment_id
        GROUP BY dt.doctor_id
      ) tagg ON d.doctor_id = tagg.doctor_id

      -- Skin Types
      LEFT JOIN (
        SELECT dst.doctor_id,
               GROUP_CONCAT(DISTINCT CONCAT(
                 IFNULL(st.name,'N/A'), ' / ', IFNULL(st.Swedish,''),
                 ' [English: ', IFNULL(st.English,''),
                 ', Description EN: ', IFNULL(st.description,''),
                 ', Description SV: ', IFNULL(st.desc_sv,''),
                 ', Who can do: ', IFNULL(st.who_can_do,''),
                 ', Areas: ', IFNULL(st.areas,''),
                 ', Synonyms EN: ', IFNULL(st.syn_en,''),
                 ', Synonyms SV: ', IFNULL(st.syn_sv,''),
                 ']'
               ) SEPARATOR '; ') AS skin_types_text
        FROM tbl_doctor_skin_types dst
        JOIN tbl_skin_types st ON dst.skin_type_id = st.skin_type_id
        GROUP BY dst.doctor_id
      ) stagg ON d.doctor_id = stagg.doctor_id

      -- Certifications
      LEFT JOIN (
        SELECT dc.doctor_id,
               GROUP_CONCAT(DISTINCT CONCAT(IFNULL(ct.name,'N/A'), ' / ', IFNULL(ct.swedish,'')) SEPARATOR '; ') AS certifications_text
        FROM tbl_doctor_certification dc
        JOIN tbl_certification_type ct ON dc.certification_type_id = ct.certification_type_id
        GROUP BY dc.doctor_id
      ) cagg ON d.doctor_id = cagg.doctor_id

      -- Devices
      LEFT JOIN (
        SELECT dad.doctor_id,
               GROUP_CONCAT(DISTINCT CONCAT(
                 IFNULL(ad.device,'N/A'), ' [Category: ', IFNULL(ad.category,''),
                 ', Manufacturer: ', IFNULL(ad.manufacturer,''),
                 ', Distributor: ', IFNULL(ad.swedish_distributor,''),
                 ', Application: ', IFNULL(ad.main_application,''),
                 ']'
               ) SEPARATOR '; ') AS devices_text
        FROM tbl_doctor_aesthetic_devices dad
        JOIN tbl_aesthetic_devices ad ON dad.aesthetic_devices_id = ad.aesthetic_device_id
        GROUP BY dad.doctor_id
      ) dagg ON d.doctor_id = dagg.doctor_id

      -- Education
      LEFT JOIN (
        SELECT doctor_id,
               GROUP_CONCAT(DISTINCT CONCAT(IFNULL(degree,'N/A'), ' - ', IFNULL(institution,'')) SEPARATOR '; ') AS education_text
        FROM tbl_doctor_educations
        GROUP BY doctor_id
      ) eagg ON d.doctor_id = eagg.doctor_id

      -- Experience
      LEFT JOIN (
        SELECT doctor_id,
               GROUP_CONCAT(DISTINCT CONCAT(IFNULL(organization,'N/A'), ' - ', IFNULL(designation,'')) SEPARATOR '; ') AS experience_text
        FROM tbl_doctor_experiences
        GROUP BY doctor_id
      ) exagg ON d.doctor_id = exagg.doctor_id

      WHERE d.profile_status = 'VERIFIED' AND d.embeddings IS NULL
      ORDER BY d.doctor_id DESC;
    `);
    } catch (err) {
      console.error("❌ Error fetching doctor embeddings:", err);
      throw err;
    }
  },

}

export default dbOperations;
