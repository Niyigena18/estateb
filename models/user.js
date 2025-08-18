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
      "SELECT id, username, email, phone, role FROM users WHERE id = ?", // Added 'status' to the select statement
      [id]
    );
    return rows[0] || null;
  }

  // --- New Method to Find Users by Role ---
  static async findByRole(role) {
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT id, username, email, phone, role FROM users WHERE role = ?", // Select users with the given role
      [role]
    );
    return rows;
  }

  // --- New Method to Update a User's Fields ---
  static async update(id, updates) {
    const pool = getPool();
    const fields = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(updates);
    values.push(id); // The ID is the last value for the WHERE clause

    const [result] = await pool.execute(
      `UPDATE users SET ${fields} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  // --- Existing Methods for Password Reset ---

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
}

module.exports = User;
