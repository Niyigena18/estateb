// models/House.js
const { getPool } = require("../config/database");
const { HOUSE_STATUS } = require("../utils/constants"); // Ensure this is correctly imported

class House {
  /**
   * Creates a new house listing.
   * @param {object} houseData - Object containing title, description, address, rent_amount, bedrooms, bathrooms, landlord_id, image_url (optional), rental_start_date (optional).
   * @returns {number} The ID of the newly created house.
   */
  static async create({
    title,
    description,
    address,
    rent_amount,
    bedrooms,
    bathrooms,
    landlord_id,
    image_url = null,
    rental_start_date = null,
  }) {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO houses (landlord_id, title, description, address, rent_amount, bedrooms, bathrooms, status, is_active, image_url, rental_start_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        landlord_id,
        title,
        description,
        address,
        rent_amount,
        bedrooms,
        bathrooms,
        HOUSE_STATUS.AVAILABLE,
        true,
        image_url,
        rental_start_date,
      ]
    );
    return result.insertId;
  }

  /**
   * Retrieves all house listings with pagination and optional filtering.
   * @param {object} options - Pagination and filter options.
   * @param {number} [options.limit=10] - Number of records to return.
   * @param {number} [options.offset=0] - Number of records to skip.
   * @param {string} [options.status] - Optional: Filter by house status (e.g., 'available', 'rented').
   * @param {number} [options.minRent] - Optional: Filter by minimum rent amount.
   * @param {number} [options.maxRent] - Optional: Filter by maximum rent amount.
   * @param {number} [options.bedrooms] - Optional: Filter by number of bedrooms.
   * @param {number} [options.bathrooms] - Optional: Filter by number of bathrooms.
   * @param {boolean} [options.is_active] - Optional: Filter by active status.
   * @returns {{houses: Array, total: number}} An object containing an array of house objects and the total count.
   */
  static async findAll({
    limit = 10,
    offset = 0,
    status,
    minRent,
    maxRent,
    bedrooms,
    bathrooms,
    is_active,
  } = {}) {
    const pool = getPool();
    let query = `
            SELECT h.id, h.landlord_id, u.username as landlord_username,
                   h.title, h.description, h.address, h.rent_amount,
                   h.bedrooms, h.bathrooms, h.status, h.is_active,
                   h.tenant_id, tu.username as tenant_username,
                   h.image_url, h.rental_start_date,
                   h.created_at, h.updated_at
            FROM houses h
            JOIN users u ON h.landlord_id = u.id
            LEFT JOIN users tu ON h.tenant_id = tu.id
        `;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push("h.status = ?");
      params.push(status);
    }
    if (minRent !== undefined && minRent !== null) {
      conditions.push("h.rent_amount >= ?");
      params.push(minRent);
    }
    if (maxRent !== undefined && maxRent !== null) {
      conditions.push("h.rent_amount <= ?");
      params.push(maxRent);
    }
    if (bedrooms !== undefined && bedrooms !== null) {
      conditions.push("h.bedrooms = ?");
      params.push(bedrooms);
    }
    if (bathrooms !== undefined && bathrooms !== null) {
      conditions.push("h.bathrooms = ?");
      params.push(bathrooms);
    }
    if (is_active !== undefined && is_active !== null) {
      // Handle boolean filter
      conditions.push("h.is_active = ?");
      params.push(is_active);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY h.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);

    // For total count (needed for pagination metadata)
    let countQuery = `SELECT COUNT(*) as total FROM houses h`;
    const countParams = []; // Parameters for the count query
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(" AND ")}`;
      // Reuse parameters for conditions, but without limit/offset
      countParams.push(...params.slice(0, params.length - 2));
    }
    const [countRows] = await pool.execute(countQuery, countParams);

    return {
      houses: rows,
      total: countRows[0].total,
    };
  }

  /**
   * Retrieves a single house listing by its ID.
   * @param {number} id - The ID of the house.
   * @returns {object|null} The house object or null if not found.
   */
  static async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT h.id, h.landlord_id, u.username as landlord_username,
                    h.title, h.description, h.address, h.rent_amount,
                    h.bedrooms, h.bathrooms, h.status, h.is_active,
                    h.tenant_id, tu.username as tenant_username,
                    h.image_url, h.rental_start_date,
                    h.created_at, h.updated_at
             FROM houses h
             JOIN users u ON h.landlord_id = u.id
             LEFT JOIN users tu ON h.tenant_id = tu.id
             WHERE h.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Retrieves house listings for a specific landlord with pagination and optional filtering.
   * @param {number} landlordId - The ID of the landlord.
   * @param {object} options - Pagination and filter options.
   * @param {number} [options.limit=10] - Number of records to return.
   * @param {number} [options.offset=0] - Number of records to skip.
   * @param {string} [options.status] - Optional: Filter by house status.
   * @param {number} [options.minRent] - Optional: Filter by minimum rent amount.
   * @param {number} [options.maxRent] - Optional: Filter by maximum rent amount.
   * @param {number} [options.bedrooms] - Optional: Filter by number of bedrooms.
   * @param {number} [options.bathrooms] - Optional: Filter by number of bathrooms.
   * @param {boolean} [options.is_active] - Optional: Filter by active status.
   * @returns {{houses: Array, total: number}} An object containing an array of house objects and the total count.
   */
  static async findByLandlordId(
    landlordId,
    {
      limit = 10,
      offset = 0,
      status,
      minRent,
      maxRent,
      bedrooms,
      bathrooms,
      is_active,
    } = {}
  ) {
    const pool = getPool();
    let query = `
            SELECT h.id, h.landlord_id, u.username as landlord_username,
                   h.title, h.description, h.address, h.rent_amount,
                   h.bedrooms, h.bathrooms, h.status, h.is_active,
                   h.tenant_id, tu.username as tenant_username,
                   h.image_url, h.rental_start_date,
                   h.created_at, h.updated_at
            FROM houses h
            JOIN users u ON h.landlord_id = u.id
            LEFT JOIN users tu ON h.tenant_id = tu.id
            WHERE h.landlord_id = ?
        `;
    const conditions = [];
    const params = [landlordId]; // landlordId is the first parameter

    if (status) {
      conditions.push("h.status = ?");
      params.push(status);
    }
    if (minRent !== undefined && minRent !== null) {
      conditions.push("h.rent_amount >= ?");
      params.push(minRent);
    }
    if (maxRent !== undefined && maxRent !== null) {
      conditions.push("h.rent_amount <= ?");
      params.push(maxRent);
    }
    if (bedrooms !== undefined && bedrooms !== null) {
      conditions.push("h.bedrooms = ?");
      params.push(bedrooms);
    }
    if (bathrooms !== undefined && bathrooms !== null) {
      conditions.push("h.bathrooms = ?");
      params.push(bathrooms);
    }
    if (is_active !== undefined && is_active !== null) {
      conditions.push("h.is_active = ?");
      params.push(is_active);
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(" AND ")}`; // Use AND because WHERE h.landlord_id is already there
    }

    query += ` ORDER BY h.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);

    // For total count (needed for pagination metadata)
    let countQuery = `SELECT COUNT(*) as total FROM houses h WHERE h.landlord_id = ?`;
    const countParams = [landlordId];
    if (conditions.length > 0) {
      countQuery += ` AND ${conditions.join(" AND ")}`;
      // Reuse parameters for conditions, but skip the first (landlordId) and last two (limit/offset)
      countParams.push(...params.slice(1, params.length - 2));
    }
    const [countRows] = await pool.execute(countQuery, countParams);

    return {
      houses: rows,
      total: countRows[0].total,
    };
  }

  /**
   * Updates an existing house listing.
   * @param {number} id - The ID of the house to update.
   * @param {object} updates - Object containing fields to update.
   * @returns {boolean} True if updated, false otherwise.
   */
  static async update(id, updates) {
    const pool = getPool();
    const fields = [];
    const values = [];

    // Define allowed fields for update
    const allowedFields = [
      "title",
      "description",
      "address",
      "rent_amount",
      "bedrooms",
      "bathrooms",
      "status",
      "is_active",
      "tenant_id",
      "image_url",
      "rental_start_date", // Added image_url and rental_start_date
    ];

    for (const key in updates) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) {
      return false; // No valid fields to update
    }

    values.push(id); // Add ID for WHERE clause

    const [result] = await pool.execute(
      `UPDATE houses SET ${fields.join(
        ", "
      )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  /**
   * Deletes a house listing by its ID.
   * @param {number} id - The ID of the house to delete.
   * @returns {boolean} True if deleted, false otherwise.
   */
  static async delete(id) {
    const pool = getPool();
    const [result] = await pool.execute("DELETE FROM houses WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  }

  /**
   * Updates the status and optionally the tenant of a house.
   * This is typically used when a rent request is approved/rejected or a tenant moves out.
   * @param {number} houseId - The ID of the house.
   * @param {string} status - The new status (e.g., 'rented', 'available').
   * @param {number|null} tenantId - The ID of the tenant, or null if unassigning.
   * @returns {boolean} True if updated, false otherwise.
   */
  static async updateStatusAndTenant(houseId, status, tenantId = null) {
    const pool = getPool();
    const [result] = await pool.execute(
      `UPDATE houses SET status = ?, tenant_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, tenantId, houseId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = House;
