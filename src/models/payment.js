import db from "../config/db.js";

export const insertPayment = async (
  payment_id,
  user_id,
  doctor_id,
  clinic_id,
  provider,
  amount,
  currency,
  provider_reference_id,
  order_id,
  metadata
) => {
  const query = `
    INSERT INTO tbl_payments (
      payment_id,
      user_id,
      doctor_id,
      clinic_id,
      provider,
      amount,
      currency,
      status,
      provider_reference_id,
      metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `;

  const params = [
    payment_id,
    user_id,
    doctor_id,
    clinic_id,
    provider,
    amount,
    currency,
    provider_reference_id,
    JSON.stringify(metadata),
  ];

  try {
    await db.query(query, params);
  } catch (err) {
    console.error("Failed to insert payment:", err);
    throw err;
  }
};

export const getAppointmentsData = async (appointment_ids) => {
  try {
    const query = `
      SELECT 
        a.appointment_id,
        CONCAT(d.name, ' ', 'Appointment') AS name, 
        d.fee_per_session AS unit_price
      FROM tbl_appointments a
      LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
      WHERE a.appointment_id IN (?)
    `;
    const results = await db.query(query, [appointment_ids]);
    return results;
  } catch (error) {
    console.error("Failed to fetch appointments data:", error);
    throw error;
  }
};

export const getTreatmentsData = async (treatment_ids, doctor_id) => {
  try {
    const query = `
      SELECT 
        t.treatment_id,
        t.name AS name, 
        dt.price AS unit_price
      FROM tbl_treatments t
      LEFT JOIN tbl_doctor_treatments dt ON dt.treatment_id = t.treatment_id
      WHERE t.treatment_id IN (?) AND dt.doctor_id = ?
    `;
    const results = await db.query(query, [treatment_ids, doctor_id]);
    return results;
  } catch (error) {
    console.error("Failed to fetch appointments data:", error);
    throw error;
  }
};

export const getClinicDoctorWallets = async () => {
  try {
    const clinicQuery = `
      SELECT 
        c.clinic_id AS id,
        c.clinic_name AS name,
        c.wallet_balance,
        c.due_status,
        'CLINIC' AS type
      FROM tbl_clinics c
      WHERE c.due_status = ?
    `;

    const doctorQuery = `
      SELECT 
        d.doctor_id AS id,
        d.name,
        d.wallet_balance,
        d.due_status,
        'DOCTOR' AS type
      FROM tbl_doctors d
      WHERE d.due_status = ?
    `;

    const [clinicWallets, doctorWallets] = await Promise.all([
      db.query(clinicQuery, ["DUE_PENDING"]),
      db.query(doctorQuery, ["DUE_PENDING"]),
    ]);

    return [...clinicWallets, ...doctorWallets];
  } catch (error) {
    console.error("Failed to fetch wallet data:", error);
    throw error;
  }
};

export const updatePaymentStatus = async (order_id, status) => {
  try {
    const query = `UPDATE tbl_payments SET status = ? WHERE order_id = ?`;
    await db.query(query, [status, order_id]);
  } catch (error) {
    console.error("Failed to update payment status:", error);
    throw error;
  }
};

export const getProductsData = async (cart_id) => {
  try {
    const query = `
      SELECT
        cp.product_id,
        p.name AS name,
        p.price AS unit_price,
        p.stock,cp.quantity as cart_quantity
      FROM tbl_cart_products cp
      LEFT JOIN tbl_products p ON cp.product_id = p.product_id
      WHERE cp.cart_id = ?
    `;
    const results = await db.query(query, [cart_id]);
    return results;
  } catch (error) {
    console.error("Failed to fetch appointments data:", error);
    throw error;
  }
};

export const getProductsByCartId = async (cart_id) => {
  try {
    const query = `
      SELECT
        p.*
      FROM tbl_cart_products cp
      LEFT JOIN tbl_products p ON cp.product_id = p.product_id
      WHERE cp.cart_id = ?
    `;
    const results = await db.query(query, [cart_id]);
    return results;
  } catch (error) {
    console.error("Failed to fetch appointments data:", error);
    throw error;
  }
};

export const updateProductsStock = async (product_id, stock) => {
  try {
    const query = `
      UPDATE tbl_products SET stock = ? WHERE  product_id = ?
    `;
    const results = await db.query(query, [stock, product_id]);
    return results;
  } catch (error) {
    console.error("Failed to fetch appointments data:", error);
    throw error;
  }
};

export const updateProductsStockBulk = async (items) => {
  if (!items.length) return;

  try {
    const cases = items
      .map(
        (item) =>
          `WHEN '${item.product_id}' THEN ${item.stock - item.cart_quantity}`
      )
      .join(" ");

    const productIds = items.map((item) => `'${item.product_id}'`).join(",");

    const query = `
      UPDATE tbl_products
      SET stock = CASE product_id
        ${cases}
      END
      WHERE product_id IN (${productIds})
    `;

    return await db.query(query);
  } catch (error) {
    console.error("❌ Failed to bulk update product stock:", error);
    throw error;
  }
};


export const updateCartPurchasedStatus = async (cart_id) => {
  try {
    const query = `
      UPDATE tbl_carts SET cart_status = "PURCHASED" WHERE  cart_id = ?
    `;
    const results = await db.query(query, [cart_id]);
    return results;
  } catch (error) {
    console.error("Failed to fetch appointments data:", error);
    throw error;
  }
};

export const getCartsTotalPrice = async (cart_id) => {
  try {
    const query = `
      SELECT
    SUM(cp.quantity * p.price) AS total_price
FROM tbl_cart_products cp
LEFT JOIN tbl_products p ON cp.product_id = p.product_id
WHERE cp.cart_id = ?
    `;
    const results = await db.query(query, [cart_id]);
    return results;
  } catch (error) {
    console.error("Failed to fetch appointments data:", error);
    throw error;
  }
};

export const insertProductPurchase = async (
  user_id,
  cart_id,
  total_price,
  admin_earnings,
  clinic_earnings,
  productDetails
) => (
  db.query(
    `
      INSERT INTO tbl_product_purchase (
        user_id,
        cart_id,
        total_price,
        admin_earnings,
        clinic_earnings,
        product_details
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [user_id,
      cart_id,
      total_price,
      admin_earnings,
      clinic_earnings,
      productDetails]
  )
)
