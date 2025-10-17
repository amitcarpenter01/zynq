import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  timezone: "Z",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function connectDB() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ MySQL pool connected successfully");
    connection.release();
  } catch (err) {
    console.error("❌ Database pool connection failed:", err.message);
    throw err;
  }
}

export const db = {
  query: async (sql, params) => {
    try {
      const [rows] = await pool.query(sql, params);
      return rows || []; // ensures it always returns an array
    } catch (err) {
      console.error("DB Query Error:", err.message);
      return []; // return empty array on error if you want to avoid crashes
    }
  },
  getConnection: () => pool.getConnection(),
  close: () => pool.end(),
};

export default db;

