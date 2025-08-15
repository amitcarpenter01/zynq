import Joi from 'joi';
import { asyncHandler, handleError, handleSuccess, joiErrorHandle } from '../../utils/responseHandler.js';
import * as appointmentModel from '../../models/appointment.js';
import * as doctorModel from '../../models/doctor.js';
import * as chatModel from '../../models/chat.js';
import dayjs from 'dayjs';
import { getDocterByDocterId } from '../../models/doctor.js';
import { getChatBetweenUsers } from '../../models/chat.js';
import { NOTIFICATION_MESSAGES, sendNotification } from '../../services/notifications.service.js';
import pkg from 'rrule';
import { generateSlots, weekdayMap } from '../api/authController.js';
import { extractUserData } from '../../utils/misc.util.js';
const { RRule } = pkg;
const APP_URL = process.env.APP_URL;
export const getMyAppointmentsDoctor = async (req, res) => {
    try {
        await appointmentModel.updateMissedAppointmentStatusModel();
        const userId = req.user.user_id;
        const doctorId = req.user.doctorData.doctor_id;

        const now = dayjs.utc();

        const appointments = await appointmentModel.getAppointmentsByDoctorId(doctorId, 'booked');

        const result = await Promise.all(appointments.map(async (app) => {
            const doctor = await getDocterByDocterId(app.doctor_id);
            let chatId = await getChatBetweenUsers(userId, doctor[0]?.zynq_user_id);
            app.chatId = chatId.length > 0 ? chatId[0].id : null;

            // Ensure profile image is fully qualified
            if (app.profile_image && !app.profile_image.startsWith('http')) {
                app.profile_image = `${APP_URL}${app.profile_image}`;
            }

            let start_time_iso = null;
            let end_time_iso = null;
            let videoCallOn = false;

            if (app.start_time && app.end_time) {
                const localFormattedStart = dayjs(app.start_time).format("YYYY-MM-DD HH:mm:ss");
                const localFormattedEnd = dayjs(app.end_time).format("YYYY-MM-DD HH:mm:ss");

                const startUTC = dayjs.utc(localFormattedStart);
                const endUTC = dayjs.utc(localFormattedEnd);

                start_time_iso = startUTC.toISOString();
                end_time_iso = endUTC.toISOString();

                // Check if current time is between start and end
                videoCallOn = app.status !== 'Completed' && dayjs().isAfter(startUTC) && dayjs().isBefore(endUTC);
            }

            return {
                ...app,
                start_time: start_time_iso,
                end_time: end_time_iso,
                videoCallOn,
            };
        }));


        return handleSuccess(res, 200, "en", "APPOINTMENTS_FETCHED", result);
    } catch (error) {
        console.error("Error fetching doctor appointments:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const getMyAppointmentById = async (req, res) => {
    console.log('true')
    try {
        const doctorId = req.user.doctorData.doctor_id;

        const schema = Joi.object({
            appointment_id: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) return joiErrorHandle(res, error);

        let { appointment_id } = value;

        const now = dayjs.utc();

        const appointments = await appointmentModel.getAppointmentByIdForDoctor(doctorId, appointment_id);

        const result = await Promise.all(appointments.map(async app => {
            console.log(app)
            // Convert local Date object (from MySQL) to local string
            const localFormattedStart = dayjs(app.start_time).format("YYYY-MM-DD HH:mm:ss");
            const localFormattedEnd = dayjs(app.end_time).format("YYYY-MM-DD HH:mm:ss");

            if (app.profile_image && !app.profile_image.startsWith('http')) {
                app.profile_image = `${APP_URL}${app.profile_image}`;
            }

            if (app.pdf && !app.pdf.startsWith('http')) {
                app.pdf = `${APP_URL}${app.pdf}`;
            }


            const startUTC = dayjs.utc(localFormattedStart);
            const endUTC = dayjs.utc(localFormattedEnd);
            const videoCallOn = app.status !== 'Completed' && now.isAfter(startUTC) && now.isBefore(endUTC);

            const doctor = await doctorModel.getDocterByDocterId(app.doctor_id);
            console.log("doctor", doctor)
            let chatId = await chatModel.getChatBetweenUsers(app.user_id, doctor[0].zynq_user_id);
            // console.log('chatId', chatId);

            const treatments = await appointmentModel.getAppointmentTreatments(appointment_id);

            return {
                ...app,
                start_time: dayjs.utc(localFormattedStart).toISOString(),
                end_time: dayjs.utc(localFormattedEnd).toISOString(),
                chatId: chatId.length > 0 ? chatId : null,
                videoCallOn,
                treatments
            };
        }));
        console.log("result", result)

        return handleSuccess(res, 200, "en", "APPOINTMENTS_FETCHED", result[0]);
    } catch (error) {
        console.error("Error fetching doctor appointments:", error);
        return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
    }
};

export const rescheduleAppointment = asyncHandler(async (req, res) => {
    const { doctor_id, appointment_id, start_time, end_time } = req.body;
    const language = req?.user?.language || 'en';
    const existing = await appointmentModel.checkIfSlotAlreadyBooked(doctor_id, start_time);

    if (existing.length > 0) {
        return handleError(res, 400, language, "SLOT_ALREADY_BOOKED");
    }

    const now = new Date();
    const originalStartTime = new Date(start_time);
    // if ((originalStartTime - now) < (60 * 60 * 1000)) {
    //     return handleError(res, 400, "en", "RESCHEDULE_WINDOW_EXPIRED");
    // }


    const normalizedStart = dayjs.utc(start_time).format("YYYY-MM-DD HH:mm:ss");
    const normalizedEnd = dayjs.utc(end_time).format("YYYY-MM-DD HH:mm:ss");
    const result = await appointmentModel.rescheduleAppointment(
        appointment_id,
        normalizedStart,
        normalizedEnd
    );

    if (result.affectedRows === 0) {
        return handleError(res, 404, language, "APPOINTMENT_NOT_FOUND");
    }

    const [appointmentData] = await appointmentModel.getAppointmentDataByAppointmentID(appointment_id)

    await sendNotification({
        userData: req.user,
        type: "APPOINTMENT",
        type_id: appointment_id,
        notification_type: NOTIFICATION_MESSAGES.appointment_rescheduled,
        receiver_id: appointmentData.user_id,
        receiver_type: "USER"
    });

    return handleSuccess(res, 200, language, "APPOINTMENT_RESCHEDULED_SUCCESSFULLY");
});

export const getFutureDoctorSlots = asyncHandler(async (req, res) => {
    const doctor_id = req.user.doctorData.doctor_id;
    const today = dayjs().startOf('day'); // Include all of today
    const oneMonthLater = today.add(1, 'month');

    const availabilityRows = await doctorModel.fetchDoctorAvailabilityModel(doctor_id);

    if (!availabilityRows || availabilityRows.length === 0) {
        return handleError(res, 400, 'en', "NO_AVAILABILITY_FOUND", []);
    }

    let allSlotData = [];

    for (const availability of availabilityRows) {
        const rruleDay = weekdayMap[availability.day.toLowerCase()];
        if (!rruleDay) continue;

        const rule = new RRule({
            freq: RRule.WEEKLY,
            byweekday: [rruleDay],
            dtstart: today.toDate(),
            until: oneMonthLater.toDate()
        });

        const upcomingDates = rule.all();

        for (const dateObj of upcomingDates) {
            const formattedDate = dayjs.utc(dateObj).format('YYYY-MM-DD');

            const startTime = dayjs(availability.start_time_utc).utc().format('HH:mm');
            const endTime = dayjs(availability.end_time_utc).utc().format('HH:mm');

            const slots = generateSlots(
                startTime,
                endTime,
                availability.slot_duration,
                formattedDate
            );

            slots.forEach(slot => {
                allSlotData.push({
                    date: formattedDate,
                    day: availability.day.toLowerCase(),
                    ...slot
                });
            });
        }
    }

    const now = dayjs.utc();

    const filteredSlotData = allSlotData.filter(slot => {
        return dayjs.utc(slot.start_time).isAfter(now);
    });

    if (filteredSlotData.length === 0) {
        return handleError(res, 400, 'en', "NO_SLOTS_FOUND", []);
    }

    const bookedAppointmentsRaw = await doctorModel.fetchAppointmentsBulkModel(
        doctor_id,
        today.format('YYYY-MM-DD'),
        oneMonthLater.format('YYYY-MM-DD')
    );

    const bookedAppointments = (bookedAppointmentsRaw || []).map(app => {
        const localFormatted = dayjs(app.start_time).format("YYYY-MM-DD HH:mm:ss");
        const fixedUTC = dayjs.utc(localFormatted).toISOString();
        return {
            ...app,
            start_time: fixedUTC,
        };
    });

    const bookedMap = {};
    for (const app of bookedAppointments) {
        bookedMap[app.start_time] = app.count || 1;
    }

    const resultWithStatus = filteredSlotData.map(slot => {
        const status = bookedMap[slot.start_time] > 0 ? 'booked' : 'available';
        return {
            start_time: slot.start_time,
            end_time: slot.end_time,
            status
        };
    });

    return handleSuccess(res, 200, 'en', "FUTURE_DOCTOR_SLOTS", resultWithStatus);
});

export const getPatientRecords = asyncHandler(async (req, res) => {
    const patientRecords = await appointmentModel.getPatientRecords(req.user);
    return handleSuccess(res, 200, 'en', "PATIENT_RECORDS", patientRecords);
})

export const getSinglePatientRecord = asyncHandler(async (req, res) => {
    const patient_id = req.params.patient_id;
    const patientRecords = await appointmentModel.getSinglePatientRecord(req.user, patient_id);
    return handleSuccess(res, 200, 'en', "PATIENT_RECORD", patientRecords);
})

export const getReviewsAndRatings = asyncHandler(async (req, res) => {
    const reviews = await appointmentModel.getRatings(req.user);
    return handleSuccess(res, 200, 'en', "REVIEWS_FETCHED", reviews);
});

export const getDoctorBookedAppointments = asyncHandler(async (req, res) => {
    const language = req?.user?.language || 'en';
    const { user_id, role } = extractUserData(req.user)
    const appointments = await appointmentModel.getDoctorBookedAppointmentsModel(role, user_id);
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
        total_clinic_earnings: Number(total_clinic_earnings.toFixed(2)) || 0.00,
        total_admin_earnings: Number(total_admin_earnings.toFixed(2)) || 0.00,
        total_appointments_earnings: Number(total_appointments_earnings.toFixed(2)) || 0.00,
        appointments: appointments,
    }
    return handleSuccess(res, 200, language, "APPOINTMENTS_FETCHED", data);
});