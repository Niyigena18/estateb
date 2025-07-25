// models/RentPayment.js
const { getPool } = require("../config/database");
const { PAYMENT_STATUS } = require("../utils/constants"); // Import payment status constants

class RentPayment {
  /**
   * Creates a new rent payment record.
   * Typically, this might be initiated when a rent request is approved, or manually by a landlord.
   * @param {object} paymentData - Object containing tenant_id, house_id, due_date, amount, and optional fields.
   * @returns {number} The ID of the newly created payment record.
   */
  static async create({
    tenant_id,
    house_id,
    due_date,
    amount,
    paid_amount = 0,
    status = PAYMENT_STATUS.PENDING,
    payment_method = null,
    payment_date = null,
    receipt_url = null,
  }) {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO rent_payments (tenant_id, house_id, due_date, amount, paid_amount, status, payment_method, payment_date, receipt_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenant_id,
        house_id,
        due_date,
        amount,
        paid_amount,
        status,
        payment_method,
        payment_date,
        receipt_url,
      ]
    );
    return result.insertId;
  }

  /**
   * Retrieves all payment records. Could be filtered for admin use.
   * @returns {Array} An array of payment objects.
   */
  static async findAll() {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT rp.id, rp.tenant_id, tu.username as tenant_username,
                    rp.house_id, h.title as house_title, h.address as house_address,
                    rp.due_date, rp.amount, rp.paid_amount, rp.status,
                    rp.payment_method, rp.payment_date, rp.receipt_url,
                    rp.created_at, rp.updated_at
             FROM rent_payments rp
             JOIN users tu ON rp.tenant_id = tu.id
             JOIN houses h ON rp.house_id = h.id
             ORDER BY rp.due_date DESC`
    );
    return rows;
  }

  /**
   * Retrieves payment records for a specific tenant.
   * @param {number} tenantId - The ID of the tenant.
   * @returns {Array} An array of payment objects.
   */
  static async findByTenantId(tenantId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT rp.id, rp.tenant_id, tu.username as tenant_username,
                    rp.house_id, h.title as house_title, h.address as house_address,
                    rp.due_date, rp.amount, rp.paid_amount, rp.status,
                    rp.payment_method, rp.payment_date, rp.receipt_url,
                    rp.created_at, rp.updated_at
             FROM rent_payments rp
             JOIN users tu ON rp.tenant_id = tu.id
             JOIN houses h ON rp.house_id = h.id
             WHERE rp.tenant_id = ? ORDER BY rp.due_date DESC`,
      [tenantId]
    );
    return rows;
  }

  /**
   * Retrieves payment records for houses owned by a specific landlord.
   * @param {number} landlordId - The ID of the landlord.
   * @returns {Array} An array of payment objects.
   */
  static async findByLandlordId(landlordId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT rp.id, rp.tenant_id, tu.username as tenant_username,
                    rp.house_id, h.title as house_title, h.address as house_address,
                    rp.due_date, rp.amount, rp.paid_amount, rp.status,
                    rp.payment_method, rp.payment_date, rp.receipt_url,
                    rp.created_at, rp.updated_at
             FROM rent_payments rp
             JOIN users tu ON rp.tenant_id = tu.id
             JOIN houses h ON rp.house_id = h.id
             WHERE h.landlord_id = ? ORDER BY rp.due_date DESC`,
      [landlordId]
    );
    return rows;
  }

  /**
   * Retrieves a single payment record by its ID.
   * Includes tenant and house details.
   * @param {number} paymentId - The ID of the payment record.
   * @returns {object|null} The payment object or null if not found.
   */
  static async findById(paymentId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT rp.id, rp.tenant_id, tu.username as tenant_username,
                    rp.house_id, h.title as house_title, h.address as house_address,
                    h.landlord_id, lu.username as landlord_username,
                    rp.due_date, rp.amount, rp.paid_amount, rp.status,
                    rp.payment_method, rp.payment_date, rp.receipt_url,
                    rp.created_at, rp.updated_at
             FROM rent_payments rp
             JOIN users tu ON rp.tenant_id = tu.id
             JOIN houses h ON rp.house_id = h.id
             JOIN users lu ON h.landlord_id = lu.id
             WHERE rp.id = ?`,
      [paymentId]
    );
    return rows[0] || null;
  }

  /**
   * Updates an existing payment record.
   * @param {number} paymentId - The ID of the payment to update.
   * @param {object} updates - Object containing fields to update.
   * @returns {boolean} True if updated, false otherwise.
   */
  static async update(paymentId, updates) {
    const pool = getPool();
    const fields = [];
    const values = [];

    const allowedFields = [
      "tenant_id",
      "house_id",
      "due_date",
      "amount",
      "paid_amount",
      "status",
      "payment_method",
      "payment_date",
      "receipt_url",
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

    values.push(paymentId); // Add ID for WHERE clause

    const [result] = await pool.execute(
      `UPDATE rent_payments SET ${fields.join(
        ", "
      )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  /**
   * Deletes a payment record by its ID.
   * @param {number} paymentId - The ID of the payment to delete.
   * @returns {boolean} True if deleted, false otherwise.
   */
  static async delete(paymentId) {
    const pool = getPool();
    const [result] = await pool.execute(
      "DELETE FROM rent_payments WHERE id = ?",
      [paymentId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = RentPayment;
