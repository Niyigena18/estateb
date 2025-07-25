// models/RentReminder.js
const { getPool } = require("../config/database");
const { REMINDER_TYPE } = require("../utils/constants"); // Import reminder type constants

class RentReminder {
  /**
   * Creates a new rent reminder record.
   * @param {object} reminderData - Object containing tenant_id, house_id, payment_id (optional), reminder_date, type, message, and is_sent.
   * @returns {number} The ID of the newly created reminder.
   */
  static async create({
    tenant_id,
    house_id,
    payment_id = null,
    reminder_date, // This should be the date the reminder is due/to be sent
    type,
    message,
    is_sent = false, // Flag to indicate if the reminder has been sent
  }) {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO rent_reminders (tenant_id, house_id, payment_id, reminder_date, type, message, is_sent)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenant_id, house_id, payment_id, reminder_date, type, message, is_sent]
    );
    return result.insertId;
  }

  /**
   * Retrieves a single reminder record by its ID.
   * Includes tenant, house, landlord, and payment details.
   * @param {number} reminderId - The ID of the reminder record.
   * @returns {object|null} The reminder object or null if not found.
   */
  static async findById(reminderId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT rr.id, rr.landlord_id, -- Added landlord_id from rent_reminders table directly
                    rr.tenant_id, tu.username as tenant_username,
                    rr.house_id, h.title as house_title, h.address as house_address,
                    lu.username as landlord_username, -- Landlord username from houses.landlord_id
                    rr.payment_id, rp.due_date as payment_due_date, rp.amount as payment_amount,
                    rr.reminder_date, rr.type, rr.message, rr.is_sent,
                    rr.created_at, rr.updated_at
             FROM rent_reminders rr
             JOIN users tu ON rr.tenant_id = tu.id
             JOIN houses h ON rr.house_id = h.id
             JOIN users lu ON h.landlord_id = lu.id -- Join with users for landlord username based on house
             LEFT JOIN rent_payments rp ON rr.payment_id = rp.id
             WHERE rr.id = ?`,
      [reminderId]
    );
    return rows[0] || null;
  }

  /**
   * Retrieves all reminder records with pagination and optional filtering.
   * @param {object} options - Pagination and filter options.
   * @param {number} [options.limit=10] - Number of records to return.
   * @param {number} [options.offset=0] - Number of records to skip.
   * @param {string} [options.type] - Optional: Filter by reminder type (e.g., 'payment_due', 'payment_overdue').
   * @param {boolean} [options.isSent] - Optional: Filter by sent status (true/false).
   * @param {number} [options.landlordId] - Optional: Filter by landlord ID (from rent_reminders.landlord_id).
   * @param {number} [options.tenantId] - Optional: Filter by tenant ID.
   * @param {number} [options.houseId] - Optional: Filter by house ID.
   * @param {string} [options.reminderDateBefore] - Optional: Filter reminders with reminder_date before this date (YYYY-MM-DD).
   * @param {string} [options.reminderDateAfter] - Optional: Filter reminders with reminder_date after this date (YYYY-MM-DD).
   * @returns {{reminders: Array, total: number}} An object containing an array of reminder objects and the total count.
   */
  static async findAll({
    limit = 10,
    offset = 0,
    type,
    isSent,
    landlordId,
    tenantId,
    houseId,
    reminderDateBefore,
    reminderDateAfter,
  } = {}) {
    const pool = getPool();
    let query = `
            SELECT rr.id, rr.landlord_id,
                   rr.tenant_id, tu.username as tenant_username,
                   rr.house_id, h.title as house_title, h.address as house_address,
                   lu.username as landlord_username,
                   rr.payment_id, rp.due_date as payment_due_date, rp.amount as payment_amount,
                   rr.reminder_date, rr.type, rr.message, rr.is_sent,
                   rr.created_at, rr.updated_at
            FROM rent_reminders rr
            JOIN users tu ON rr.tenant_id = tu.id
            JOIN houses h ON rr.house_id = h.id
            JOIN users lu ON h.landlord_id = lu.id
            LEFT JOIN rent_payments rp ON rr.payment_id = rp.id
        `;
    const conditions = [];
    const params = [];

    if (type) {
      conditions.push("rr.type = ?");
      params.push(type);
    }
    if (typeof isSent === "boolean") {
      conditions.push("rr.is_sent = ?");
      params.push(isSent);
    }
    if (landlordId) {
      conditions.push("rr.landlord_id = ?"); // Using landlord_id directly from rent_reminders
      params.push(landlordId);
    }
    if (tenantId) {
      conditions.push("rr.tenant_id = ?");
      params.push(tenantId);
    }
    if (houseId) {
      conditions.push("rr.house_id = ?");
      params.push(houseId);
    }
    if (reminderDateBefore) {
      conditions.push("rr.reminder_date <= ?");
      params.push(reminderDateBefore);
    }
    if (reminderDateAfter) {
      conditions.push("rr.reminder_date >= ?");
      params.push(reminderDateAfter);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY rr.reminder_date DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);

    let countQuery = `SELECT COUNT(*) as total FROM rent_reminders rr`;
    const countParams = [];
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(" AND ")}`;
      countParams.push(...params.slice(0, params.length - 2)); // Use params without limit/offset
    }
    const [countRows] = await pool.execute(countQuery, countParams);

    return {
      reminders: rows,
      total: countRows[0].total,
    };
  }

  /**
   * Retrieves reminder records for a specific tenant with pagination and optional filtering.
   * @param {number} tenantId - The ID of the tenant.
   * @param {object} options - Pagination and filter options.
   * @param {number} [options.limit=10] - Number of records to return.
   * @param {number} [options.offset=0] - Number of records to skip.
   * @param {string} [options.type] - Optional: Filter by reminder type.
   * @param {boolean} [options.isSent] - Optional: Filter by sent status.
   * @param {number} [options.houseId] - Optional: Filter by house ID.
   * @param {string} [options.reminderDateBefore] - Optional: Filter reminders with reminder_date before this date.
   * @param {string} [options.reminderDateAfter] - Optional: Filter reminders with reminder_date after this date.
   * @returns {{reminders: Array, total: number}} An object containing an array of reminder objects and the total count.
   */
  static async findByTenantId(
    tenantId,
    {
      limit = 10,
      offset = 0,
      type,
      isSent,
      houseId,
      reminderDateBefore,
      reminderDateAfter,
    } = {}
  ) {
    const pool = getPool();
    let query = `
            SELECT rr.id, rr.landlord_id,
                   rr.tenant_id, tu.username as tenant_username,
                   rr.house_id, h.title as house_title, h.address as house_address,
                   lu.username as landlord_username,
                   rr.payment_id, rp.due_date as payment_due_date, rp.amount as payment_amount,
                   rr.reminder_date, rr.type, rr.message, rr.is_sent,
                   rr.created_at, rr.updated_at
            FROM rent_reminders rr
            JOIN users tu ON rr.tenant_id = tu.id
            JOIN houses h ON rr.house_id = h.id
            JOIN users lu ON h.landlord_id = lu.id
            LEFT JOIN rent_payments rp ON rr.payment_id = rp.id
            WHERE rr.tenant_id = ?
        `;
    const conditions = [];
    const params = [tenantId];

    if (type) {
      conditions.push("rr.type = ?");
      params.push(type);
    }
    if (typeof isSent === "boolean") {
      conditions.push("rr.is_sent = ?");
      params.push(isSent);
    }
    if (houseId) {
      conditions.push("rr.house_id = ?");
      params.push(houseId);
    }
    if (reminderDateBefore) {
      conditions.push("rr.reminder_date <= ?");
      params.push(reminderDateBefore);
    }
    if (reminderDateAfter) {
      conditions.push("rr.reminder_date >= ?");
      params.push(reminderDateAfter);
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY rr.reminder_date DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);

    let countQuery = `SELECT COUNT(*) as total FROM rent_reminders rr WHERE rr.tenant_id = ?`;
    const countParams = [tenantId];
    if (conditions.length > 0) {
      countQuery += ` AND ${conditions.join(" AND ")}`;
      countParams.push(...params.slice(1, params.length - 2)); // Exclude tenantId, limit, offset
    }
    const [countRows] = await pool.execute(countQuery, countParams);

    return {
      reminders: rows,
      total: countRows[0].total,
    };
  }

  /**
   * Retrieves reminder records for houses owned by a specific landlord with pagination and optional filtering.
   * @param {number} landlordId - The ID of the landlord.
   * @param {object} options - Pagination and filter options.
   * @param {number} [options.limit=10] - Number of records to return.
   * @param {number} [options.offset=0] - Number of records to skip.
   * @param {string} [options.type] - Optional: Filter by reminder type.
   * @param {boolean} [options.isSent] - Optional: Filter by sent status.
   * @param {number} [options.houseId] - Optional: Filter by house ID.
   * @param {number} [options.tenantId] - Optional: Filter by tenant ID.
   * @param {string} [options.reminderDateBefore] - Optional: Filter reminders with reminder_date before this date.
   * @param {string} [options.reminderDateAfter] - Optional: Filter reminders with reminder_date after this date.
   * @returns {{reminders: Array, total: number}} An object containing an array of reminder objects and the total count.
   */
  static async findByLandlordId(
    landlordId,
    {
      limit = 10,
      offset = 0,
      type,
      isSent,
      houseId,
      tenantId,
      reminderDateBefore,
      reminderDateAfter,
    } = {}
  ) {
    const pool = getPool();
    let query = `
            SELECT rr.id, rr.landlord_id,
                   rr.tenant_id, tu.username as tenant_username,
                   rr.house_id, h.title as house_title, h.address as house_address,
                   lu.username as landlord_username,
                   rr.payment_id, rp.due_date as payment_due_date, rp.amount as payment_amount,
                   rr.reminder_date, rr.type, rr.message, rr.is_sent,
                   rr.created_at, rr.updated_at
            FROM rent_reminders rr
            JOIN users tu ON rr.tenant_id = tu.id
            JOIN houses h ON rr.house_id = h.id
            JOIN users lu ON h.landlord_id = lu.id
            LEFT JOIN rent_payments rp ON rr.payment_id = rp.id
            WHERE rr.landlord_id = ? -- Using landlord_id from rent_reminders table directly
        `;
    const conditions = [];
    const params = [landlordId];

    if (type) {
      conditions.push("rr.type = ?");
      params.push(type);
    }
    if (typeof isSent === "boolean") {
      conditions.push("rr.is_sent = ?");
      params.push(isSent);
    }
    if (houseId) {
      conditions.push("rr.house_id = ?");
      params.push(houseId);
    }
    if (tenantId) {
      conditions.push("rr.tenant_id = ?");
      params.push(tenantId);
    }
    if (reminderDateBefore) {
      conditions.push("rr.reminder_date <= ?");
      params.push(reminderDateBefore);
    }
    if (reminderDateAfter) {
      conditions.push("rr.reminder_date >= ?");
      params.push(reminderDateAfter);
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY rr.reminder_date DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);

    let countQuery = `SELECT COUNT(*) as total FROM rent_reminders rr WHERE rr.landlord_id = ?`;
    const countParams = [landlordId];
    if (conditions.length > 0) {
      countQuery += ` AND ${conditions.join(" AND ")}`;
      countParams.push(...params.slice(1, params.length - 2)); // Exclude landlordId, limit, offset
    }
    const [countRows] = await pool.execute(countQuery, countParams);

    return {
      reminders: rows,
      total: countRows[0].total,
    };
  }

  /**
   * Updates an existing reminder record.
   * @param {number} reminderId - The ID of the reminder to update.
   * @param {object} updates - Object containing fields to update.
   * @returns {boolean} True if updated, false otherwise.
   */
  static async update(reminderId, updates) {
    const pool = getPool();
    const fields = [];
    const values = [];

    const allowedFields = [
      "landlord_id", // Allow updating if necessary, though often set at creation
      "tenant_id",
      "house_id",
      "payment_id",
      "reminder_date",
      "type",
      "message",
      "is_sent",
    ];

    for (const key in updates) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        // Special handling for boolean type if MySQL expects 0/1 for TINYINT(1)
        if (key === "is_sent" && typeof updates[key] === "boolean") {
          values.push(updates[key] ? 1 : 0);
        } else {
          values.push(updates[key]);
        }
      }
    }

    if (fields.length === 0) {
      return false; // No valid fields to update
    }

    values.push(reminderId); // Add ID for WHERE clause

    const [result] = await pool.execute(
      `UPDATE rent_reminders SET ${fields.join(
        ", "
      )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  /**
   * Deletes a reminder record by its ID.
   * @param {number} reminderId - The ID of the reminder to delete.
   * @returns {boolean} True if deleted, false otherwise.
   */
  static async delete(reminderId) {
    const pool = getPool();
    const [result] = await pool.execute(
      "DELETE FROM rent_reminders WHERE id = ?",
      [reminderId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Updates the `is_sent` status of a reminder.
   * This might be used by a cron job or background process after sending.
   * @param {number} reminderId - The ID of the reminder.
   * @param {boolean} isSent - True if sent, false otherwise.
   * @returns {boolean} True if updated, false otherwise.
   */
  static async updateIsSentStatus(reminderId, isSent) {
    const pool = getPool();
    const [result] = await pool.execute(
      `UPDATE rent_reminders SET is_sent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [isSent ? 1 : 0, reminderId] // Ensure boolean is converted to 1/0 for database
    );
    return result.affectedRows > 0;
  }
}

module.exports = RentReminder;
