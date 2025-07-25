// models/RentRequest.js
const { getPool } = require("../config/database");
const { RENT_REQUEST_STATUS } = require("../utils/constants"); // Ensure this constant is imported

class RentRequest {
  /**
   * Creates a new rent request.
   * @param {object} requestData - Object containing user_id, house_id, message.
   * @returns {number} The ID of the newly created rent request.
   */
  static async create({ user_id, house_id, message }) {
    // CHANGED: tenant_id -> user_id
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO rent_requests (user_id, house_id, message, status)
               VALUES (?, ?, ?, ?)`, // CHANGED: tenant_id -> user_id
      [user_id, house_id, message, RENT_REQUEST_STATUS.PENDING] // CHANGED: tenant_id -> user_id
    );
    return result.insertId;
  }

  /**
   * Finds a rent request by its ID.
   * @param {number} id - The ID of the rent request.
   * @returns {object|null} The rent request object or null if not found.
   */
  static async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT rr.id, rr.user_id, tu.username AS user_username, -- CHANGED: rr.tenant_id -> rr.user_id, tenant_username -> user_username
                     rr.house_id, h.title AS house_title,
                     h.landlord_id, lu.username AS landlord_username,
                     rr.message, rr.status, rr.created_at, rr.updated_at
               FROM rent_requests rr
               JOIN users tu ON rr.user_id = tu.id -- CHANGED: rr.tenant_id -> rr.user_id
               JOIN houses h ON rr.house_id = h.id
               JOIN users lu ON h.landlord_id = lu.id
               WHERE rr.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Retrieves all rent requests with pagination and optional filtering.
   * Accessible by landlords to see all requests or by admin (if you add one).
   * @param {object} options - Pagination and filter options.
   * @param {number} [options.limit=10] - Number of records to return.
   * @param {number} [options.offset=0] - Number of records to skip.
   * @param {string} [options.status] - Optional: Filter by request status.
   * @param {number} [options.houseId] - Optional: Filter by house ID.
   * @param {number} [options.userId] - Optional: Filter by user ID (tenant who made request). -- CHANGED: tenantId -> userId
   * @returns {{requests: Array, total: number}} An object containing an array of rent request objects and the total count.
   */
  static async findAll({
    limit = 10,
    offset = 0,
    status,
    houseId,
    userId, // CHANGED: tenantId -> userId
  } = {}) {
    const pool = getPool();
    let query = `
             SELECT rr.id, rr.user_id, tu.username AS user_username, -- CHANGED: rr.tenant_id -> rr.user_id, tenant_username -> user_username
                    rr.house_id, h.title AS house_title,
                    h.landlord_id, lu.username AS landlord_username,
                    rr.message, rr.status, rr.created_at, rr.updated_at
             FROM rent_requests rr
             JOIN users tu ON rr.user_id = tu.id -- CHANGED: rr.tenant_id -> rr.user_id
             JOIN houses h ON rr.house_id = h.id
             JOIN users lu ON h.landlord_id = lu.id
        `;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push("rr.status = ?");
      params.push(status);
    }
    if (houseId) {
      conditions.push("rr.house_id = ?");
      params.push(houseId);
    }
    if (userId) {
      // CHANGED: tenantId -> userId
      conditions.push("rr.user_id = ?"); // CHANGED: rr.tenant_id -> rr.user_id
      params.push(userId); // CHANGED: tenantId -> userId
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY rr.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);

    let countQuery = `SELECT COUNT(*) as total FROM rent_requests rr`;
    const countParams = [];
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(" AND ")}`;
      countParams.push(...params.slice(0, params.length - 2)); // Use params without limit/offset
    }
    const [countRows] = await pool.execute(countQuery, countParams);

    return {
      requests: rows,
      total: countRows[0].total,
    };
  }

  /**
   * Retrieves rent requests made by a specific user with pagination and optional filtering.
   * @param {number} userId - The ID of the user (tenant) who made the request. -- CHANGED: tenantId -> userId
   * @param {object} options - Pagination and filter options.
   * @param {number} [options.limit=10] - Number of records to return.
   * @param {number} [options.offset=0] - Number of records to skip.
   * @param {string} [options.status] - Optional: Filter by request status.
   * @param {number} [options.houseId] - Optional: Filter by house ID.
   * @returns {{requests: Array, total: number}} An object containing an array of rent request objects and the total count.
   */
  static async findByUserId( // CHANGED: findByTenantId -> findByUserId
    userId, // CHANGED: tenantId -> userId
    { limit = 10, offset = 0, status, houseId } = {}
  ) {
    const pool = getPool();
    let query = `
             SELECT rr.id, rr.user_id, tu.username AS user_username, -- CHANGED: rr.tenant_id -> rr.user_id, tenant_username -> user_username
                    rr.house_id, h.title AS house_title,
                    h.landlord_id, lu.username AS landlord_username,
                    rr.message, rr.status, rr.created_at, rr.updated_at
             FROM rent_requests rr
             JOIN users tu ON rr.user_id = tu.id -- CHANGED: rr.tenant_id -> rr.user_id
             JOIN houses h ON rr.house_id = h.id
             JOIN users lu ON h.landlord_id = lu.id
             WHERE rr.user_id = ? -- CHANGED: rr.tenant_id -> rr.user_id
        `;
    const conditions = [];
    const params = [userId]; // CHANGED: tenantId -> userId

    if (status) {
      conditions.push("rr.status = ?");
      params.push(status);
    }
    if (houseId) {
      conditions.push("rr.house_id = ?");
      params.push(houseId);
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY rr.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);

    let countQuery = `SELECT COUNT(*) as total FROM rent_requests rr WHERE rr.user_id = ?`; // CHANGED: rr.tenant_id -> rr.user_id
    const countParams = [userId]; // CHANGED: tenantId -> userId
    if (conditions.length > 0) {
      countQuery += ` AND ${conditions.join(" AND ")}`;
      countParams.push(...params.slice(1, params.length - 2)); // Exclude userId, limit, offset
    }
    const [countRows] = await pool.execute(countQuery, countParams);

    return {
      requests: rows,
      total: countRows[0].total,
    };
  }

  /**
   * Retrieves rent requests for houses owned by a specific landlord with pagination and optional filtering.
   * @param {number} landlordId - The ID of the landlord.
   * @param {object} options - Pagination and filter options.
   * @param {number} [options.limit=10] - Number of records to return.
   * @param {number} [options.offset=0] - Number of records to skip.
   * @param {string} [options.status] - Optional: Filter by request status.
   * @param {number} [options.houseId] - Optional: Filter by house ID.
   * @param {number} [options.userId] - Optional: Filter by user ID (tenant who made request). -- CHANGED: tenantId -> userId
   * @returns {{requests: Array, total: number}} An object containing an array of rent request objects and the total count.
   */
  static async findByLandlordId(
    landlordId,
    { limit = 10, offset = 0, status, houseId, userId } = {} // CHANGED: tenantId -> userId
  ) {
    const pool = getPool();
    let query = `
             SELECT rr.id, rr.user_id, tu.username AS user_username, -- CHANGED: rr.tenant_id -> rr.user_id, tenant_username -> user_username
                    rr.house_id, h.title AS house_title,
                    h.landlord_id, lu.username AS landlord_username,
                    rr.message, rr.status, rr.created_at, rr.updated_at
             FROM rent_requests rr
             JOIN users tu ON rr.user_id = tu.id -- CHANGED: rr.tenant_id -> rr.user_id
             JOIN houses h ON rr.house_id = h.id
             JOIN users lu ON h.landlord_id = lu.id
             WHERE h.landlord_id = ?
        `;
    const conditions = [];
    const params = [landlordId];

    if (status) {
      conditions.push("rr.status = ?");
      params.push(status);
    }
    if (houseId) {
      conditions.push("rr.house_id = ?");
      params.push(houseId);
    }
    if (userId) {
      // CHANGED: tenantId -> userId
      conditions.push("rr.user_id = ?"); // CHANGED: rr.tenant_id -> rr.user_id
      params.push(userId); // CHANGED: tenantId -> userId
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY rr.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);

    let countQuery = `SELECT COUNT(*) as total
                              FROM rent_requests rr
                              JOIN houses h ON rr.house_id = h.id
                              WHERE h.landlord_id = ?`;
    const countParams = [landlordId];
    if (conditions.length > 0) {
      countQuery += ` AND ${conditions.join(" AND ")}`;
      countParams.push(...params.slice(1, params.length - 2)); // Exclude landlordId, limit, offset
    }
    const [countRows] = await pool.execute(countQuery, countParams);

    return {
      requests: rows,
      total: countRows[0].total,
    };
  }

  /**
   * Updates the status of a rent request.
   * @param {number} id - The ID of the rent request.
   * @param {string} newStatus - The new status (e.g., 'accepted', 'rejected', 'cancelled').
   * @returns {boolean} True if updated, false otherwise.
   */
  static async updateStatus(id, newStatus) {
    const pool = getPool();
    const [result] = await pool.execute(
      `UPDATE rent_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newStatus, id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Deletes a rent request.
   * @param {number} id - The ID of the rent request.
   * @returns {boolean} True if deleted, false otherwise.
   */
  static async delete(id) {
    const pool = getPool();
    const [result] = await pool.execute(
      "DELETE FROM rent_requests WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = RentRequest;
