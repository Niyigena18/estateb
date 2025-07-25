const mysql = require("mysql2/promise");

// Load environment variables from .env file
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10, // Max number of connections in the pool
  queueLimit: 0, // Unlimited queue for connections
};

let pool;

const connectDB = async () => {
  try {
    pool = mysql.createPool(dbConfig);
    console.log(
      `MySQL DB Connected: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
    );
  } catch (err) {
    console.error("MySQL DB Connection Error:", err.message);
    // Exit process with failure
    process.exit(1);
  }
};

const getPool = () => {
  // <--- This function definition
  if (!pool) {
    console.warn("Database pool not initialized. Call connectDB() first.");
    throw new Error("Database pool not initialized.");
  }
  return pool;
};

module.exports = { connectDB, getPool }; // <--- AND THIS EXPORT LINE ARE CRUCIAL
