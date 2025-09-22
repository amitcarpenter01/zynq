import { stripe } from "../../app.js";
import db from "../config/db.js";
import { NOTIFICATION_MESSAGES, sendNotification } from "../services/notifications.service.js";
import { getSinglePurchasedProductsModel } from "./api.js";

export const insertPayment = async (
  amount,
  type,
  type_id,
  session_id,
  metadata
) => {
  const query = `
    INSERT INTO tbl_payments (
      amount,
      status,
      type,
      type_id,
      session_id,
      metadata
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  const params = [
    amount,
    "PENDING",
    type,
    type_id,
    session_id,
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
        c.cart_status,
        c.clinic_id,
        cl.clinic_name,
        cl.address AS clinic_address,
        zu.email AS clinic_email,
        zu.fcm_token AS token,
        p.stock,
        cp.quantity as cart_quantity,
        ROUND(p.price * cp.quantity, 2) AS total_price
      FROM tbl_cart_products cp
      LEFT JOIN tbl_products p ON cp.product_id = p.product_id
      LEFT JOIN tbl_carts c ON cp.cart_id = c.cart_id
      LEFT JOIN tbl_clinics cl ON c.clinic_id = cl.clinic_id
      LEFT JOIN tbl_zqnq_users zu ON cl.zynq_user_id = zu.id
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
        p.*, cp.quantity as cart_quantity
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

export const updateLatestAddress = async (user_id, address_id) => {
  try {
    const unselectQuery = `UPDATE tbl_address SET is_selected = 0 WHERE user_id = ?`;
    await db.query(unselectQuery, [user_id]);

    const selectQuery = `UPDATE tbl_address SET is_selected = 1 WHERE address_id = ?`;
    const results = await db.query(selectQuery, [address_id]);

    return results;
  } catch (error) {
    console.error("Failed to update address data:", error);
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
  productDetails,
  address_id = null
) => (
  await db.query(
    `
      INSERT INTO tbl_product_purchase (
        user_id,
        cart_id,
        total_price,
        admin_earnings,
        clinic_earnings,
        product_details,
        address_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [user_id,
      cart_id,
      total_price,
      admin_earnings,
      clinic_earnings,
      productDetails,
      address_id
    ]
  )
)

export const updateShipmentStatusModel = async (purchase_id, shipment_status, userData) => {
  try {
    let dateColumn = null;

    const [purchaseData] = await getSinglePurchasedProductsModel(purchase_id);

    if (purchaseData) {
      if (shipment_status === "SHIPPED") {
        dateColumn = "shipped_date";

        sendNotification({
          userData: userData,
          type: "SHIPMENT",
          type_id: purchase_id,
          notification_type: NOTIFICATION_MESSAGES.shipment_shipped,
          receiver_type: "USER",
          receiver_id: purchaseData.user_id
        })

      } else if (shipment_status === "DELIVERED") {
        dateColumn = "delivered_date";
        sendNotification({
          userData: userData,
          type: "SHIPMENT",
          type_id: purchase_id,
          notification_type: NOTIFICATION_MESSAGES.shipment_delivered,
          receiver_type: "USER",
          receiver_id: purchaseData.user_id
        })
      }

      // Base query
      let query = `UPDATE tbl_product_purchase SET shipment_status = ?`;
      const params = [shipment_status];

      // Add date update if applicable
      if (dateColumn) {
        query += `, ${dateColumn} = CURRENT_TIMESTAMP`;
      }

      query += ` WHERE purchase_id = ?`;
      params.push(purchase_id);

      await db.query(query, params);
    }


  } catch (error) {
    console.error("Failed to update shipment status:", error);
    throw error;
  }
};

export const processKlarnaMetadata = (metadata) => {
  let order_lines = [];

  order_lines.push({
    name: `Order #${metadata.type_data[0].type_id}`,
    quantity: 1,
    unit_amount: Math.round(metadata.order_amount * 100),
    total_amount: Math.round(metadata.order_amount * 100),
  });



  const order_amount_minor = order_lines.reduce(
    (sum, item) => sum + item.total_amount,
    0
  );

  const order_amount = order_amount_minor / 100;

  return {
    ...metadata,
    cart_id: metadata.type_data[0].type_id,
    order_lines,
    order_amount, // for DB clarity (major units)
    order_amount_minor, // for Stripe/Klarna (minor units)
  };
};

export const processPaymentMetadata = ({ payment_gateway, metadata }) => {
  try {
    switch (payment_gateway) {
      case "KLARNA":
        return processKlarnaMetadata(metadata);

      case "SWISH":
        break;

      default:
        break;
    }
  } catch (error) {
    console.error("Failed to process payment metadata:", error);
    throw error;
  }
}

const payment_types = ["card", "alipay", "bancontact", "blik", "eps", "giropay", "ideal",
  "klarna", "link", "multibanco", "p24", "paypal", "sepa_debit", "sofort", "us_bank_account",
  "revolut_pay", "mobilepay", "amazon_pay", "twint", "kr_card", "naver_pay", "kakao_pay", "payco",
  "samsung_pay", "billie",
]

export const createPaymentSession = async ({ payment_gateway, metadata, redirect_url, cancel_url }) => {
  try {
    switch (payment_gateway) {
      case "KLARNA": {
        const line_items = metadata.order_lines.map((line) => ({
          price_data: {
            currency: metadata.currency || "sek",
            product_data: { name: line.name },
            unit_amount: line.unit_amount,
          },
          quantity: line.quantity,
        }));

        const success_url = `https://getzynq.io/payment-success/?session_id={CHECKOUT_SESSION_ID}&redirect_url=${redirect_url}`;
        const redirect_cancel_url = `https://getzynq.io/payment-cancel/?redirect_url=${cancel_url}`;

        return await stripe.checkout.sessions.create({
          payment_method_types : ["klarna"],
          mode: "payment",
          line_items,
          success_url,
          cancel_url: redirect_cancel_url,
          metadata: {
            cart_id: metadata.cart_id,
            user_id: metadata.user_id,
            type: metadata.type,
          },
        });
      }

      default:
        throw new Error(`Unsupported payment gateway: ${payment_gateway}`);
    }
  } catch (error) {
    console.error("Failed to create payment session:", error);
    throw error;
  }
};


export const updatePaymentStatusModel = async (session_id, status) => {
  try {
    await db.query(
      `
        UPDATE tbl_payments
        SET status = ?
        WHERE session_id = ?
      `,
      [status, session_id]
    );
  } catch (error) {
    console.error("Failed to update payment status:", error);
    throw error;
  }
}

export const updateCartMetadata = async (cart_id, metadata) => {
  try {
    await db.query(
      `
        UPDATE tbl_carts
        SET metadata = ?
        WHERE cart_id = ?
      `,
      [JSON.stringify(metadata), cart_id]
    );
  } catch (error) {
    console.error("Failed to update cart metadata:", error);
    throw error;
  }
}


export const getCartMetadataAndStatusByCartId = async (cart_id) => {
  try {
    const [result] = await db.query(
      `SELECT metadata, cart_status FROM tbl_carts WHERE cart_id = ?
             `,
      [cart_id]
    );

    return result;
  } catch (error) {
    console.error("Database Error in getUserCarts:", error);
    throw new Error("Failed to get user carts.");
  }
}
export const createPaymentSessionForAppointment = async ({ payment_gateway, metadata }) => {
  try {
    switch (payment_gateway) {
      case "KLARNA": {
        const line_items = metadata.order_lines.map((line) => ({
          price_data: {
            currency: metadata.currency || "sek",
            product_data: { name: line.name },
            unit_amount: line.unit_amount,
          },
          quantity: line.quantity,
        }));

        return await stripe.checkout.sessions.create({
          payment_method_types: ["klarna"],
          mode: "payment",
          line_items,
          success_url: `https://getzynq.io/payment-success/?appointment_id=${metadata.appointment_id}&redirect_url=${metadata.redirect_url}`,
          cancel_url: `https://getzynq.io/payment-cancel/?&redirect_url=${metadata.cancel_url}`,
          metadata: {
          },
        });
      }

      default:
        throw new Error(`Unsupported payment gateway: ${payment_gateway}`);
    }
  } catch (error) {
    console.error("Failed to create payment session:", error);
    throw error;
  }
};
