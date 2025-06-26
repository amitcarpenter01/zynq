import db from "../config/db.js";

//======================================= Auth =========================================

export const get_web_user_by_id = async (id) => {
    try {
        return await db.query(`SELECT
            u.*, 
            r.role AS role_name
        FROM
            tbl_zqnq_users u
        JOIN
            tbl_roles r ON u.role_id = r.id
        WHERE
            u.id = ?`, [id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch web user data.");
    }
};

export const get_web_user_by_email = async (email) => {
    try {
        return await db.query(`SELECT
            u.*, 
            r.role AS role_name
        FROM
            tbl_zqnq_users u
        JOIN
            tbl_roles r ON u.role_id = r.id
        WHERE
            u.email = ?`, [email]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic data.");
    }
};

export const update_reset_token = async (reset_token, reset_token_expiry, email) => {
    try {
        return await db.query(`UPDATE tbl_zqnq_users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?`, [reset_token, reset_token_expiry, email]);
    } catch (error) {
        console.error("Database Error:", error.message);

    }
}

export const get_web_user_by_reset_token = async (reset_token) => {
    try {
        return await db.query(`SELECT * FROM tbl_zqnq_users WHERE reset_token = ?`, [reset_token]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch web user data.");
    }
}

export const update_jwt_token = async (token, id) => {
    try {
        return await db.query(`UPDATE tbl_zqnq_users SET jwt_token = ? WHERE id = ?`, [token, id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update jwt token.");
    }
}

export const update_web_user_password = async (password, show_password, reset_token, reset_token_expiry, id) => {
    try {
        return await db.query(`UPDATE tbl_zqnq_users SET password = ?, show_password = ?, reset_token = ?, reset_token_expiry = ? WHERE id = ?`, [password, show_password, reset_token, reset_token_expiry, id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update web user password.");
    }
}

export const update_onboarding_status = async (status, id) => {
    try {
        return await db.query(`UPDATE tbl_zqnq_users SET on_boarding_status = ? WHERE id = ?`, [status, id]);
    } catch (error) {
        console.error("Database Error:", error.message);

    }
}

export const update_web_user_password_set = async (password, show_password, id) => {
    try {
        return await db.query(`UPDATE tbl_zqnq_users SET password = ?, show_password = ?, is_password_set = 1 WHERE id = ?`, [password, show_password, id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update web user password.");
    }
}

export const create_web_user = async (userData) => {
    try {
        return await db.query('INSERT INTO tbl_zqnq_users SET ?', [userData]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to create web user.");
    }
}


export const getCallLogById = async (call_id) => {
    const [rows] = await db.query(
        `SELECT * FROM tbl_call_logs WHERE call_id = ?`,
        [call_id]
    );
    return rows;
};

export const updateCallLogStatus = async (call_id, status) => {
    return await db.query(
        `UPDATE tbl_call_logs SET status = ?, created_at = NOW() WHERE call_id = ?`,
        [status, call_id]
    );
};

export const createOrUpdateCallLog = async ({
  call_id,
  sender_user_id,
  sender_doctor_id,
  receiver_user_id,
  receiver_doctor_id,
  status,
  started_at
}) => {
  try {
    await db.query(`
      INSERT INTO tbl_call_logs (
        call_id, sender_user_id, sender_doctor_id,
        receiver_user_id, receiver_doctor_id, status, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        started_at = VALUES(started_at)
    `, [
      call_id,
      sender_user_id,
      sender_doctor_id,
      receiver_user_id,
      receiver_doctor_id,
      status,
      started_at
    ]);
  } catch (error) {
    console.error("Error in createOrUpdateCallLog:", error);
    throw error;
  }
};



export const getAllCallLogs = async () => {
  const [rows] = await db.query(`
    SELECT 
      call_id,
      caller_id,
      sender_user_id,
      sender_doctor_id,
      receiver_user_id,
      receiver_doctor_id,
      status,
      started_at
    FROM tbl_call_logs
    ORDER BY started_at DESC
  `);

  return rows;
};

