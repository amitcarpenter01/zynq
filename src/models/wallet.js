import db from "../config/db.js";

export const getOrCreateWalletByUserId = async (user_id) => {
  const rows = await db.query(`SELECT * FROM tbl_wallet WHERE user_id = ?`, [user_id]);
  if (rows.length) return rows[0];
  await db.query(`INSERT INTO tbl_wallet (user_id) VALUES (?)`, [user_id]);
  const rows2 = await db.query(`SELECT * FROM tbl_wallet WHERE user_id = ?`, [user_id]);
  return rows2[0];
};

export const adjustBalance = (wallet_id, delta) =>
  db.query(`UPDATE tbl_wallet SET balance = balance + ? WHERE wallet_id = ?`, [delta, wallet_id]);

export const insertWalletTx = (data) =>
  db.query(`INSERT INTO tbl_wallet_transactions SET ?`, data);

export const getWalletWithTx = async (user_id, limit = 25, offset = 0) => {
  const walletRows = await db.query(`SELECT * FROM tbl_wallet WHERE user_id = ?`, [user_id]);
  const wallet = walletRows[0] || null;
  if (!wallet) return { wallet: null, transactions: [] };
  const txRows = await db.query(
    `SELECT 
            wt.amount as refund_amount,
            wt.type as refund_type,
            wt.description as refund_description,
            wt.created_at as refund_date_time,
            a.*,
            d.*,
            zu.email,
            c.clinic_name,
            cl.latitude,
            cl.longitude
        FROM tbl_wallet_transactions wt
        INNER JOIN tbl_appointments a ON a.appointment_id = wt.appointment_id
        INNER JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
        INNER JOIN tbl_zqnq_users zu ON d.zynq_user_id = zu.id
        LEFT JOIN tbl_clinic_locations cl ON cl.clinic_id = a.clinic_id
        INNER JOIN tbl_clinics c ON c.clinic_id = a.clinic_id
       WHERE wt.wallet_id = ? ORDER BY wt.created_at DESC `,
    [wallet.wallet_id,]
  );
  return { wallet, transactions: txRows };
};

export const updatePaymentStatus = (appointment_id, status) =>
  db.query(`UPDATE tbl_appointments SET payment_status = ? WHERE appointment_id = ?`, [status, appointment_id]);


export const checkAlreadyRefunded = async (appointment_id) => {
  const rows = await db.query(`SELECT * FROM tbl_wallet_transactions WHERE appointment_id = ?`, [appointment_id]);

  return rows[0];
};


export const getRefundHistory = async () => {
  const txRows = await db.query(
    `SELECT 
            wt.amount as refund_amount,
            wt.type as refund_type,
            wt.description as refund_description,
            wt.created_at as refund_date_time,
            u.full_name as user_full_name,
            u.mobile_number as user_mobile_number,
            a.*,
            d.*,
            zu.email,
            c.clinic_name,
            cl.latitude,
            cl.longitude
        FROM tbl_wallet_transactions wt
        INNER JOIN tbl_appointments a ON a.appointment_id = wt.appointment_id
        INNER JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
        INNER JOIN tbl_zqnq_users zu ON d.zynq_user_id = zu.id
        LEFT JOIN tbl_clinic_locations cl ON cl.clinic_id = a.clinic_id
        INNER JOIN tbl_clinics c ON c.clinic_id = a.clinic_id
        INNER JOIN tbl_users u ON u.user_id = a.user_id
      ORDER BY wt.created_at DESC `,
    []
  );
  return { transactions: txRows };
};