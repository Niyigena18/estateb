const { getPool } = require("../config/database");

class MaintenanceRequest {
  /**
   * Creates a new maintenance request.
   * @param {object} requestData - Object containing maintenance request data.
   * @returns {number} The ID of the newly created maintenance request.
   */
  static async create({
    house_id,
    tenant_id, // REVERTED: Back to tenant_id
    landlord_id, // This should ideally be derived in controller from house_id
    title,
    description,
    category,
    priority = "Medium", // Default priority
    status = "New", // Default status
    scheduled_date, // Can be undefined
    resolution_notes, // Can be undefined
    media_urls, // Can be undefined
  }) {
    const pool = getPool();

    // Ensure undefined values are explicitly converted to null for SQL
    const finalLandlordId = landlord_id || null;
    const finalScheduledDate = scheduled_date || null;
    const finalResolutionNotes = resolution_notes || null;
    const finalMediaUrls = media_urls ? JSON.stringify(media_urls) : null; // Stringify array, or null if undefined/empty

    const [result] = await pool.execute(
      `INSERT INTO maintenance_requests 
               (house_id, tenant_id, landlord_id, title, description, category, priority, status, scheduled_date, resolution_notes, media_urls) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // REVERTED: Back to tenant_id in column list
      [
        house_id,
        tenant_id, // REVERTED: Back to tenant_id
        finalLandlordId,
        title,
        description,
        category,
        priority,
        status,
        finalScheduledDate,
        finalResolutionNotes,
        finalMediaUrls,
      ]
    );
    return result.insertId;
  }

  /**
   * Finds a maintenance request by its ID.
   * @param {number} id - The ID of the maintenance request.
   * @returns {object|null} The maintenance request object or null if not found.
   */
  static async findById(id) {
    const pool = getPool();
    // Keep: Removed JSON_UNQUOTE - The `JSON` type in MySQL will return a JSON string, which JSON.parse expects.
    const [rows] = await pool.execute(
      "SELECT *, media_urls FROM maintenance_requests WHERE id = ?",
      [id]
    );
    if (rows[0] && rows[0].media_urls) {
      rows[0].media_urls = JSON.parse(rows[0].media_urls); // Parse back to array
    }
    return rows[0] || null;
  }

  /**
   * Finds all maintenance requests.
   * @returns {Array} An array of all maintenance request objects.
   */
  static async getAll() {
    const pool = getPool();
    // Keep: Removed JSON_UNQUOTE
    const [rows] = await pool.execute(
      "SELECT *, media_urls FROM maintenance_requests"
    );
    return rows.map((row) => {
      if (row.media_urls) {
        row.media_urls = JSON.parse(row.media_urls);
      }
      return row;
    });
  }

  /**
   * Finds all maintenance requests for a specific house.
   * @param {number} houseId - The ID of the house.
   * @returns {Array} An array of maintenance request objects.
   */
  static async findByHouseId(houseId) {
    const pool = getPool();
    // Keep: Removed JSON_UNQUOTE
    const [rows] = await pool.execute(
      "SELECT *, media_urls FROM maintenance_requests WHERE house_id = ?",
      [houseId]
    );
    return rows.map((row) => {
      if (row.media_urls) {
        row.media_urls = JSON.parse(row.media_urls);
      }
      return row;
    });
  }

  /**
   * Finds all maintenance requests submitted by a specific tenant.
   * @param {number} tenantId - The ID of the tenant.
   * @returns {Array} An array of maintenance request objects.
   */
  static async findByTenantId(tenantId) {
    // REVERTED: Back to findByTenantId
    const pool = getPool();
    // REVERTED: Back to tenant_id in WHERE clause; Keep: Removed JSON_UNQUOTE
    const [rows] = await pool.execute(
      "SELECT *, media_urls FROM maintenance_requests WHERE tenant_id = ?",
      [tenantId]
    );
    return rows.map((row) => {
      if (row.media_urls) {
        row.media_urls = JSON.parse(row.media_urls);
      }
      return row;
    });
  }

  /**
   * Finds all maintenance requests relevant to a specific landlord.
   * @param {number} landlordId - The ID of the landlord.
   * @returns {Array} An array of maintenance request objects.
   */
  static async findByLandlordId(landlordId) {
    const pool = getPool();
    // Keep: Removed JSON_UNQUOTE
    const [rows] = await pool.execute(
      "SELECT *, media_urls FROM maintenance_requests WHERE landlord_id = ?",
      [landlordId]
    );
    return rows.map((row) => {
      if (row.media_urls) {
        row.media_urls = JSON.parse(row.media_urls);
      }
      return row;
    });
  }

  /**
   * Updates an existing maintenance request.
   * @param {number} id - The ID of the request to update.
   * @param {object} updateData - Object containing fields to update.
   * @returns {boolean} True if the update was successful, false otherwise.
   */
  static async update(id, updateData) {
    const pool = getPool();
    const fields = [];
    const values = [];

    // Ensure updated_at is explicitly added and updated
    fields.push("updated_at = CURRENT_TIMESTAMP()");

    for (const key in updateData) {
      if (
        Object.hasOwnProperty.call(updateData, key) &&
        updateData[key] !== undefined
      ) {
        if (key === "media_urls") {
          fields.push(`${key} = ?`);
          values.push(updateData[key] ? JSON.stringify(updateData[key]) : null);
        } else if (key === "scheduled_date" || key === "resolution_notes") {
          fields.push(`${key} = ?`);
          values.push(updateData[key] || null); // Convert undefined to null
        } else {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      }
    }

    if (fields.length === 0) {
      return false; // Nothing to update (though updated_at should always be there now)
    }

    values.push(id); // Add the ID for the WHERE clause
    const [result] = await pool.execute(
      `UPDATE maintenance_requests SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  /**
   * Deletes a maintenance request by its ID.
   * @param {number} id - The ID of the request to delete.
   * @returns {boolean} True if the deletion was successful, false otherwise.
   */
  static async delete(id) {
    const pool = getPool();
    const [result] = await pool.execute(
      "DELETE FROM maintenance_requests WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = MaintenanceRequest;
