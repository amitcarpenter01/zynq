import { get_clinics, get_doctors, get_users, get_latest_clinic, getAdminBookedAppointmentsModel, getAdminReviewsModel, getAdminPurchasedProductModel, getAdminCartProductModel, getAdminCommissionRatesModel, updateAdminCommissionRatesModel, getSingleAdminPurchasedProductModel, getSingleAdminCartProductModel } from '../../models/admin.js';
import { get_product_images_by_product_ids } from '../../models/api.js';
import { getClinicDoctorWallets } from '../../models/payment.js';
import { asyncHandler, handleError, handleSuccess } from '../../utils/responseHandler.js';
import { groupProductsByCartAndClinic } from '../api/productController.js';
const APP_URL = process.env.APP_URL;
export const get_dashboard = async (req, res) => {
    try {
        const [get_clinic, get_doctor, get_user, latest_clinic] = await Promise.all([
            get_clinics(),
            get_doctors(),
            get_users(),
            get_latest_clinic()
        ])

        const data = {
            get_clinics: get_clinic.length,
            get_doctors: get_doctor.length,
            get_users: get_user.length,
            get_earnings: 0,
            latest_clinic
        }

        return handleSuccess(res, 200, "en", "Get dashboard data retriev", data);
    } catch (error) {
        console.error("Failed dashboard:", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR");
    }
};

export const get_wallets = asyncHandler(async (req, res) => {
    const wallets = await getClinicDoctorWallets();
    return handleSuccess(res, 200, 'en', "WALLETS_FETCHED", wallets);
})

export const getBookedAppointments = asyncHandler(async (req, res) => {
    const language = req?.user?.language || 'en';
    const appointments = await getAdminBookedAppointmentsModel();
    const {
        total_clinic_earnings,
        total_admin_earnings,
        total_appointments_earnings
    } = appointments.reduce(
        (acc, appointment) => {
            const clinicEarning = Number(appointment.clinic_earnings) || 0;
            const adminEarning = Number(appointment.admin_earnings) || 0;
            const appointmentEarning = Number(appointment.total_price) || 0;

            acc.total_clinic_earnings += clinicEarning;
            acc.total_admin_earnings += adminEarning;
            acc.total_appointments_earnings += appointmentEarning;

            return acc;
        },
        {
            total_clinic_earnings: 0,
            total_admin_earnings: 0,
            total_appointments_earnings: 0
        }
    );

    const data = {
        total_clinic_earnings: total_clinic_earnings,
        total_admin_earnings: total_admin_earnings,
        total_appointments_earnings: total_appointments_earnings,
        appointments: appointments,
    }
    return handleSuccess(res, 200, language, "APPOINTMENTS_FETCHED", data);
});

export const getPurchasedProducts = asyncHandler(async (req, res) => {
    const language = req?.user?.language || 'en';

    // 1️⃣ Fetch purchases with enriched products (including live stock and images)
    const purchases = await getAdminPurchasedProductModel();

    // 2️⃣ Fetch cart earnings info
    const carts = await getAdminCartProductModel();

    // 3️⃣ Calculate totals
    const {
        total_clinic_earnings,
        total_admin_earnings,
        total_carts_earnings
    } = carts.reduce(
        (acc, cart) => {
            acc.total_clinic_earnings += Number(cart.clinic_earnings) || 0;
            acc.total_admin_earnings += Number(cart.admin_earnings) || 0;
            acc.total_carts_earnings += Number(cart.total_price) || 0;
            return acc;
        },
        {
            total_clinic_earnings: 0,
            total_admin_earnings: 0,
            total_carts_earnings: 0
        }
    );

    // 4️⃣ Send response
    const data = {
        total_clinic_earnings,
        total_admin_earnings,
        total_carts_earnings,
        purchases,  // renamed for clarity
    };

    return handleSuccess(res, 200, language, "PURCHASED_PRODUCTS_FETCHED", data);
});

export const getSinglePurchasedProducts = asyncHandler(async (req, res) => {
    const language = req?.user?.language || 'en';

    const purchase_id = req.params.purchase_id

    // 1️⃣ Fetch purchases with enriched products (including live stock and images)
    const purchases = await getSingleAdminPurchasedProductModel(purchase_id);

    // 2️⃣ Fetch cart earnings info
    const carts = await getSingleAdminCartProductModel(purchase_id);

    // 3️⃣ Calculate totals
    const {
        total_clinic_earnings,
        total_admin_earnings,
        total_carts_earnings
    } = carts.reduce(
        (acc, cart) => {
            acc.total_clinic_earnings += Number(cart.clinic_earnings) || 0;
            acc.total_admin_earnings += Number(cart.admin_earnings) || 0;
            acc.total_carts_earnings += Number(cart.total_price) || 0;
            return acc;
        },
        {
            total_clinic_earnings: 0,
            total_admin_earnings: 0,
            total_carts_earnings: 0
        }
    );

    // 4️⃣ Send response
    const data = {
        total_clinic_earnings,
        total_admin_earnings,
        total_carts_earnings,
        purchases,  // renamed for clarity
    };

    return handleSuccess(res, 200, language, "PURCHASED_PRODUCTS_FETCHED", data);
});

export const getPaymentHistory = asyncHandler(async (req, res) => {
    const language = req?.user?.language || 'en';

    const [
        purchases,
        appointments
    ] = await Promise.all([
        getAdminPurchasedProductModel(),
        getAdminBookedAppointmentsModel()
    ])

    const data = {
        products: purchases,
        appointments: appointments
    }

    return handleSuccess(res, 200, language, "PURCHASED_PRODUCTS_FETCHED", data);
});


export const getAdminReviewsRatings = asyncHandler(async (req, res) => {
    const language = req?.user?.language || 'en';
    const reviews = await getAdminReviewsModel();
    return handleSuccess(res, 200, language, "REVIEWS_FETCHED", reviews);
})

export const getAdminCommissionRates = asyncHandler(async (req, res) => {
    const language = req?.user?.language || 'en';
    const commissionRates = await getAdminCommissionRatesModel();
    return handleSuccess(res, 200, language, "COMMISSION_RATES_FETCHED", commissionRates[0]);
})

export const updateAdminCommissionRates = asyncHandler(async (req, res) => {
    const language = req?.user?.language || 'en';
    const { APPOINTMENT_COMMISSION, PRODUCT_COMMISSION } = req.body;
    await updateAdminCommissionRatesModel({ APPOINTMENT_COMMISSION, PRODUCT_COMMISSION });
    return handleSuccess(res, 200, language, "COMMISSION_RATES_UPDATED",);
})