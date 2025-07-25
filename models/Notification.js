// backend/models/Notification.js
const { getPool } = require("../config/database");

class Notification {
  /**
   * Creates a new notification.
   * @param {object} notificationData - Object containing user_id, type, source_id (optional), and message.
   * @returns {number} The ID of the newly created notification.
   */
  static async create({ user_id, type, source_id, message }) {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO notifications (user_id, type, source_id, message)
               VALUES (?, ?, ?, ?)`,
      [user_id, type, source_id || null, message] // source_id is optional, ensure null if undefined
    );
    return result.insertId;
  }

  /**
   * Finds notifications for a specific user.
   * Can be filtered by read status and paginated.
   * @param {number} user_id - The ID of the user.
   * @param {boolean} [is_read=false] - Optional: Filter by read status. If undefined, gets all.
   * @param {number} [limit=10] - Optional: Number of notifications per page.
   * @param {number} [offset=0] - Optional: Offset for pagination.
   * @returns {Array} An array of notification objects.
   */
  static async findByUserId(
    user_id,
    is_read = undefined,
    limit = 10,
    offset = 0
  ) {
    const pool = getPool();
    let query = `SELECT * FROM notifications WHERE user_id = ?`;
    const params = [user_id];

    if (is_read !== undefined) {
      query += ` AND is_read = ?`;
      params.push(is_read);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  /**
   * Finds a single notification by its ID.
   * @param {number} id - The ID of the notification.
   * @returns {object|null} The notification object or null if not found.
   */
  static async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT * FROM notifications WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Marks one or more notifications as read.
   * @param {number|number[]} notificationIds - Single ID or array of IDs to mark as read.
   * @returns {boolean} True if update was successful, false otherwise.
   */
  static async markAsRead(notificationIds) {
    const pool = getPool();
    const ids = Array.isArray(notificationIds)
      ? notificationIds
      : [notificationIds];
    if (ids.length === 0) return false;

    // Create placeholders for the IN clause: (?), (?), (?)
    const placeholders = ids.map(() => "?").join(", ");

    const [result] = await pool.execute(
      `UPDATE notifications SET is_read = TRUE, created_at = CURRENT_TIMESTAMP() WHERE id IN (${placeholders})`, // Note: updated_at not in schema, using created_at here. Consider adding an 'updated_at' column to notifications table for this purpose.
      ids
    );
    return result.affectedRows > 0;
  }

  /**
   * Deletes one or more notifications.
   * @param {number|number[]} notificationIds - Single ID or array of IDs to delete.
   * @returns {boolean} True if deletion was successful, false otherwise.
   */
  static async delete(notificationIds) {
    const pool = getPool();
    const ids = Array.isArray(notificationIds)
      ? notificationIds
      : [notificationIds];
    if (ids.length === 0) return false;

    const placeholders = ids.map(() => "?").join(", ");

    const [result] = await pool.execute(
      `DELETE FROM notifications WHERE id IN (${placeholders})`,
      ids
    );
    return result.affectedRows > 0;
  }

  /**
   * Deletes all notifications for a given user.
   * @param {number} user_id - The ID of the user.
   * @returns {boolean} True if deletion was successful, false otherwise.
   */
  static async deleteAllForUser(user_id) {
    const pool = getPool();
    const [result] = await pool.execute(
      `DELETE FROM notifications WHERE user_id = ?`,
      [user_id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Notification;
