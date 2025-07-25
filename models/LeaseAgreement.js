const { getPool } = require("../config/database");

class LeaseAgreement {
  /**
   * Creates a new lease agreement.
   * @param {object} leaseData - Object containing lease agreement data.
   * @returns {number} The ID of the newly created lease agreement.
   */
  static async create({
    house_id,
    tenant_id,
    landlord_id,
    start_date,
    end_date,
    rent_amount,
    deposit_amount,
    terms,
    status = "pending", // Default status
    document_url,
  }) {
    const pool = getPool();
    const [result] = await pool.execute(
      "INSERT INTO lease_agreements (house_id, tenant_id, landlord_id, start_date, end_date, rent_amount, deposit_amount, terms, status, document_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        house_id,
        tenant_id,
        landlord_id,
        start_date,
        end_date,
        rent_amount,
        deposit_amount,
        terms,
        status,
        document_url,
      ]
    );
    return result.insertId;
  }

  /**
   * Finds a lease agreement by its ID.
   * @param {number} id - The ID of the lease agreement.
   * @returns {object|null} The lease agreement object or null if not found.
   */
  static async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM lease_agreements WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Finds all lease agreements for a specific house.
   * @param {number} houseId - The ID of the house.
   * @returns {Array} An array of lease agreement objects.
   */
  static async findByHouseId(houseId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM lease_agreements WHERE house_id = ?",
      [houseId]
    );
    return rows;
  }

  /**
   * Finds all lease agreements for a specific tenant.
   * @param {number} tenantId - The ID of the tenant.
   * @returns {Array} An array of lease agreement objects.
   */
  static async findByTenantId(tenantId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM lease_agreements WHERE tenant_id = ?",
      [tenantId]
    );
    return rows;
  }

  /**
   * Finds all lease agreements managed by a specific landlord.
   * @param {number} landlordId - The ID of the landlord.
   * @returns {Array} An array of lease agreement objects.
   */
  static async findByLandlordId(landlordId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM lease_agreements WHERE landlord_id = ?",
      [landlordId]
    );
    return rows;
  }

  /**
   * Updates an existing lease agreement.
   * @param {number} id - The ID of the lease agreement to update.
   * @param {object} updateData - Object containing fields to update (e.g., status, end_date, terms).
   * @returns {boolean} True if the update was successful, false otherwise.
   */
  static async update(id, updateData) {
    const pool = getPool();
    const fields = [];
    const values = [];

    for (const key in updateData) {
      if (
        Object.hasOwnProperty.call(updateData, key) &&
        updateData[key] !== undefined
      ) {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    }

    if (fields.length === 0) {
      return false; // Nothing to update
    }

    values.push(id); // Add the ID for the WHERE clause
    const [result] = await pool.execute(
      `UPDATE lease_agreements SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  /**
   * Deletes a lease agreement by its ID.
   * @param {number} id - The ID of the lease agreement to delete.
   * @returns {boolean} True if the deletion was successful, false otherwise.
   */
  static async delete(id) {
    const pool = getPool();
    const [result] = await pool.execute(
      "DELETE FROM lease_agreements WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  }
  // In models/LeaseAgreement.js, inside the LeaseAgreement class:
  static async getAll() {
    const pool = getPool();
    const [rows] = await pool.execute("SELECT * FROM lease_agreements");
    return rows;
  }
}

module.exports = LeaseAgreement;
