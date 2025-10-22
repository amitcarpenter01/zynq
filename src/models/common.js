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
          'Product Name: ', p.name,
          ', Price: ', IFNULL(p.price, ''),
          ', Short Description: ', IFNULL(p.short_description, ''),
          ', Full Description: ', IFNULL(p.full_description, ''),
          ', Feature Text: ', IFNULL(p.feature_text, ''),
          ', Benefit Text: ', IFNULL(p.benefit_text, ''),
          ', How To Use: ', IFNULL(p.how_to_use, ''),
          ', Ingredients: ', IFNULL(p.ingredients, ''),
          '; Treatments: ',
          IFNULL(tagg.treatments_text, 'None')
        ) AS embedding_text
      FROM tbl_products p
      LEFT JOIN (
          SELECT pt.product_id,
                 GROUP_CONCAT(
                   DISTINCT CONCAT(
                     t.name, ' / ', t.swedish,
                     ' [Classification: ', t.classification_type,
                     ', Benefits EN: ', t.benefits_en,
                     ', Benefits SV: ', t.benefits_sv,
                     ', Description EN: ', t.description_en,
                     ', Description SV: ', t.description_sv,
                     ', Concerns: ', IFNULL(tc.concerns_text, 'None'),
                     ']'
                   ) SEPARATOR '; '
                 ) AS treatments_text
          FROM tbl_product_treatments pt
          JOIN tbl_treatments t ON pt.treatment_id = t.treatment_id
          LEFT JOIN (
              SELECT tc.treatment_id,
                     GROUP_CONCAT(
                       DISTINCT CONCAT(
                         c.name,
                         ' [EN: ', tc.indications_en,
                         ', SV: ', tc.indications_sv,
                         ', Likewise: ', tc.likewise_terms,
                         ']'
                       ) SEPARATOR ', '
                     ) AS concerns_text
              FROM tbl_treatment_concerns tc
              LEFT JOIN tbl_concerns c ON tc.concern_id = c.concern_id
              GROUP BY tc.treatment_id
          ) tc ON t.treatment_id = tc.treatment_id
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
          'Name: ', d.name,
          ', Address: ', IFNULL(d.address, ''),
          ', Biography: ', IFNULL(d.biography, ''),
          ', Gender: ', IFNULL(d.gender, ''),
          ', Age: ', IFNULL(d.age, ''),
          ', Fee per session: ', IFNULL(d.fee_per_session, ''),
          '; Treatments: ',
          GROUP_CONCAT(
            DISTINCT CONCAT(
              t.name, ' / ', t.swedish,
              ' [Classification: ', t.classification_type,
              ', Benefits EN: ', t.benefits_en,
              ', Benefits SV: ', t.benefits_sv,
              ', Description EN: ', t.description_en,
              ', Description SV: ', t.description_sv,
              ', Concerns: ', 
                GROUP_CONCAT(DISTINCT CONCAT(
                  c.name,
                  ' [EN: ', tc_agg.indications_en,
                  ', SV: ', tc_agg.indications_sv,
                  ', Likewise: ', tc_agg.likewise_terms,
                  ']'
                ) SEPARATOR ', ')
              ,']'
            ) SEPARATOR '; '
          ),
          '; Skin Types: ',
          GROUP_CONCAT(
            DISTINCT CONCAT(
              st.name, ' / ', st.Swedish,
              ' [English: ', st.English,
              ', Description EN: ', st.description,
              ', Description SV: ', st.desc_sv,
              ', Who can do: ', st.who_can_do,
              ', Areas: ', st.areas,
              ', Synonyms EN: ', st.syn_en,
              ', Synonyms SV: ', st.syn_sv,
              ']'
            ) SEPARATOR '; '
          ),
          '; Certifications: ',
          GROUP_CONCAT(DISTINCT CONCAT(ct.name, ' / ', ct.swedish) SEPARATOR '; '),
          '; Devices: ',
          GROUP_CONCAT(DISTINCT CONCAT(
            ad.name, ' [Category: ', ad.category,
            ', Manufacturer: ', ad.manufacturer,
            ', Distributor: ', ad.swedish_distributor,
            ', Application: ', ad.main_application,
            ']'
          ) SEPARATOR '; '),
          '; Education: ',
          GROUP_CONCAT(DISTINCT CONCAT(degree, ' - ', institution) SEPARATOR '; '),
          '; Experience: ',
          GROUP_CONCAT(DISTINCT CONCAT(organization, ' - ', designation) SEPARATOR '; ')
        ) AS embedding_text
      FROM tbl_doctors d
      LEFT JOIN tbl_doctor_treatments dt ON d.doctor_id = dt.doctor_id
      LEFT JOIN tbl_treatments t ON dt.treatment_id = t.treatment_id
      LEFT JOIN (
          SELECT treatment_id, concern_id,
                 GROUP_CONCAT(DISTINCT indications_en SEPARATOR ', ') AS indications_en,
                 GROUP_CONCAT(DISTINCT indications_sv SEPARATOR ', ') AS indications_sv,
                 GROUP_CONCAT(DISTINCT likewise_terms SEPARATOR ', ') AS likewise_terms
          FROM tbl_treatment_concerns
          GROUP BY treatment_id, concern_id
      ) tc_agg ON t.treatment_id = tc_agg.treatment_id
      LEFT JOIN tbl_concerns c ON tc_agg.concern_id = c.concern_id
      LEFT JOIN tbl_doctor_skin_types dst ON d.doctor_id = dst.doctor_id
      LEFT JOIN tbl_skin_types st ON dst.skin_type_id = st.skin_type_id
      LEFT JOIN tbl_doctor_certification dc ON d.doctor_id = dc.doctor_id
      LEFT JOIN tbl_certification_type ct ON dc.certification_type_id = ct.certification_type_id
      LEFT JOIN tbl_doctor_aesthetic_devices dad ON d.doctor_id = dad.doctor_id
      LEFT JOIN tbl_aesthetic_devices ad ON dad.aesthetic_device_id = ad.aesthetic_device_id
      LEFT JOIN tbl_doctor_educations de ON d.doctor_id = de.doctor_id
      LEFT JOIN tbl_doctor_experiences dex ON d.doctor_id = dex.doctor_id
      WHERE d.profile_status = 'VERIFIED' AND d.embeddings IS NULL
      GROUP BY d.doctor_id
      ORDER BY d.doctor_id DESC
    `);
    } catch (err) {
      console.error("❌ Error fetching doctor embeddings:", err.message);
    }
  },
  getClinicsEmbeddingText: async () => {
    try {
      return await db.query(`
      SELECT 
        c.clinic_id,
        CONCAT(
          'Clinic Name: ', c.clinic_name,
          ', Email: ', IFNULL(c.email, ''),
          ', Mobile: ', IFNULL(c.mobile_number, ''),
          ', Address: ', IFNULL(c.address, ''),
          ', Website: ', IFNULL(c.website_url, ''),
          '; Locations: ',
          GROUP_CONCAT(
            DISTINCT CONCAT(
              cl.street_address, ', ', cl.city, ', ', cl.state, ', ', cl.zip_code
            ) SEPARATOR '; '
          ),
          '; Treatments: ',
          GROUP_CONCAT(
            DISTINCT CONCAT(
              t.name, ' / ', t.swedish,
              ' [Classification: ', t.classification_type,
              ', Benefits EN: ', t.benefits_en,
              ', Benefits SV: ', t.benefits_sv,
              ', Description EN: ', t.description_en,
              ', Description SV: ', t.description_sv,
              ', Concerns: ',
                GROUP_CONCAT(DISTINCT CONCAT(
                  co.name,
                  ' [EN: ', tc_agg.indications_en,
                  ', SV: ', tc_agg.indications_sv,
                  ', Likewise: ', tc_agg.likewise_terms,
                  ']'
                ) SEPARATOR ', ')
              ,']'
            ) SEPARATOR '; '
          ),
          '; Skin Types: ',
          GROUP_CONCAT(
            DISTINCT CONCAT(
              st.name, ' / ', st.Swedish,
              ' [English: ', st.English,
              ', Description EN: ', st.description,
              ', Description SV: ', st.desc_sv,
              ', Who can do: ', st.who_can_do,
              ', Areas: ', st.areas,
              ', Synonyms EN: ', st.syn_en,
              ', Synonyms SV: ', st.syn_sv,
              ']'
            ) SEPARATOR '; '
          ),
          '; Devices: ',
          GROUP_CONCAT(
            DISTINCT CONCAT(
              ad.name, ' [Category: ', ad.category,
              ', Manufacturer: ', ad.manufacturer,
              ', Distributor: ', ad.swedish_distributor,
              ', Application: ', ad.main_application,
              ']'
            ) SEPARATOR '; '
          )
        ) AS embedding_text
      FROM tbl_clinics c
      LEFT JOIN tbl_clinic_locations cl ON c.clinic_id = cl.clinic_id
      LEFT JOIN tbl_clinic_treatments ct ON c.clinic_id = ct.clinic_id
      LEFT JOIN tbl_treatments t ON ct.treatment_id = t.treatment_id
      LEFT JOIN (
          SELECT treatment_id, concern_id,
                 GROUP_CONCAT(DISTINCT indications_en SEPARATOR ', ') AS indications_en,
                 GROUP_CONCAT(DISTINCT indications_sv SEPARATOR ', ') AS indications_sv,
                 GROUP_CONCAT(DISTINCT likewise_terms SEPARATOR ', ') AS likewise_terms
          FROM tbl_treatment_concerns
          GROUP BY treatment_id, concern_id
      ) tc_agg ON t.treatment_id = tc_agg.treatment_id
      LEFT JOIN tbl_concerns co ON tc_agg.concern_id = co.concern_id
      LEFT JOIN tbl_clinic_skin_types cst ON c.clinic_id = cst.clinic_id
      LEFT JOIN tbl_skin_types st ON cst.skin_type_id = st.skin_type_id
      LEFT JOIN tbl_clinic_aesthetic_devices cad ON c.clinic_id = cad.clinic_id
      LEFT JOIN tbl_aesthetic_devices ad ON cad.aesthetic_device_id = ad.aesthetic_device_id
      WHERE c.profile_status = 'VERIFIED' AND c.embeddings IS NULL
      GROUP BY c.clinic_id
      ORDER BY c.clinic_id DESC
    `);
    } catch (err) {
      console.error("❌ Error fetching clinic embeddings:", err.message);
    }
  }
}

export default dbOperations;
