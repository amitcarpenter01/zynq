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
