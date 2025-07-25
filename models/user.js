const { getPool } = require("../config/database");

class User {
  static async create({ username, email, password, phone, role = "tenant" }) {
    const pool = getPool();
    const [result] = await pool.execute(
      "INSERT INTO users (username, email, password, phone, role) VALUES (?, ?, ?, ?, ?)",
      [username, email, password, phone, role]
    );
    return result.insertId;
  }

  static async findByEmail(email) {
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT id, username, email, password, phone, role, password_reset_token, password_reset_expires FROM users WHERE email = ?",
      [email]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT id, username, email, phone, role FROM users WHERE id = ?", // Do not return password hash here for general public access
      [id]
    );
    return rows[0] || null;
  }

  // --- New Methods for Password Reset ---

  static async updateResetToken(userId, token, expires) {
    const pool = getPool();
    const [result] = await pool.execute(
      "UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?",
      [token, expires, userId]
    );
    return result.affectedRows > 0;
  }

  static async findByResetToken(token) {
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT id, username, email, password, password_reset_token, password_reset_expires FROM users WHERE password_reset_token = ?",
      [token]
    );
    return rows[0] || null;
  }

  static async updatePassword(userId, newHashedPassword) {
    const pool = getPool();
    const [result] = await pool.execute(
      "UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?",
      [newHashedPassword, userId]
    );
    return result.affectedRows > 0;
  }

  // Add other user-related queries here (e.g., update, delete)
}

module.exports = User;
