import mysql from "mysql2";
import util from "util";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  timezone: "Z",
  connectionLimit: 10,
});

export async function connectDB() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error("❌ Database pool connection failed:", err.message);
        return reject(err);
      }
      console.log("✅ MySQL pool connected successfully");
      connection.release();
      resolve();
    });
  });
}

export function makeDb() {
  return {
    async query(sql, args) {
      const query = util.promisify(pool.query).bind(pool);
      return query(sql, args);
    },
    close() {
      return util.promisify(pool.end).call(pool);
    },
  };
}

export const db = makeDb();
export default db;
