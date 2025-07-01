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
  }
};

export default dbOperations;
