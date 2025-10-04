import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306, // 👈 puerto MySQL
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test de conexión
pool.getConnection()
  .then(conn => {
    console.log("✅ Conexión a la base de datos exitosa");
    conn.release();
  })
  .catch(err => {
    console.error("❌ Error al conectar a la base de datos:", err);
  });

export default pool;
