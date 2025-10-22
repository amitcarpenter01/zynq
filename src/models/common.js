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
  getTreatmentsWithConcerns: async () => {
    return db.query(` 
      SELECT 
        t.treatment_id,
        t.name,
        t.swedish,
        t.classification_type,
        t.benefits_en,
        t.benefits_sv,
        t.description_en,
        t.description_sv,
        GROUP_CONCAT(
        CONCAT(
        c.name, ' [EN: ', tc.indications_en, 
                ', SV: ', tc.indications_sv, 
                ', Likewise: ', tc.likewise_terms, 
                ']'
    ) SEPARATOR '; '
  ) AS concerns
      FROM tbl_treatments t
      LEFT JOIN tbl_treatment_concerns tc ON t.treatment_id = tc.treatment_id
      LEFT JOIN tbl_concerns c ON tc.concern_id = c.concern_id
      WHERE t.embeddings IS NULL
      GROUP BY t.treatment_id`);
  },
  getProductsWithTreatments: async () => {
    return db.query(`  SELECT 
      p.product_id,
      p.name AS product_name,
      p.short_description AS description_en ,
      GROUP_CONCAT(DISTINCT t.name SEPARATOR ', ') AS treatments_en,
      GROUP_CONCAT(DISTINCT t.swedish SEPARATOR ', ') AS treatments_sv
  FROM 
      tbl_products p
  LEFT JOIN 
      tbl_product_treatments pt ON p.product_id = pt.product_id
  LEFT JOIN 
      tbl_treatments t ON pt.treatment_id = t.treatment_id
  WHERE 
      p.embeddings IS NULL
  GROUP BY 
      p.product_id, p.name,p.short_description
  ORDER BY 
      p.product_id DESC`);
  },
  
  getDoctorsWithTreatments: async () => {
    return db.query(`
      SELECT 
        d.doctor_id,
        d.name AS expert_name,
        GROUP_CONCAT(DISTINCT t.name SEPARATOR ', ') AS treatments_en,
        GROUP_CONCAT(DISTINCT t.swedish SEPARATOR ', ') AS treatments_sv
      FROM 
        tbl_doctors d
      LEFT JOIN 
        tbl_doctor_treatments dt ON d.doctor_id = dt.doctor_id
      LEFT JOIN 
        tbl_treatments t ON dt.treatment_id = t.treatment_id
      WHERE 
        d.profile_status = 'VERIFIED' and d.embeddings IS NULL
      GROUP BY 
        d.doctor_id, d.name
      ORDER BY 
        d.doctor_id DESC
    `);
  },
  getClinicWithTreatments: async () => {
    return db.query(`
      SELECT 
        c.clinic_id ,
        c.clinic_name  AS clinic_name,
        GROUP_CONCAT(DISTINCT t.name SEPARATOR ', ') AS treatments_en,
        GROUP_CONCAT(DISTINCT t.swedish SEPARATOR ', ') AS treatments_sv
      FROM 
        tbl_clinics c
      LEFT JOIN 
        tbl_clinic_treatments ct ON c.clinic_id  = ct.clinic_id 
      LEFT JOIN 
        tbl_treatments t ON ct.treatment_id = t.treatment_id
      WHERE 
        c.profile_status = 'VERIFIED' and c.embeddings IS NULL
      GROUP BY 
        c.clinic_id 
      ORDER BY 
        c.clinic_id  DESC
    `);
  },
}  

export default dbOperations;
