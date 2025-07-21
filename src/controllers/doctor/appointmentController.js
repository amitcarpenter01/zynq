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
const { RRule } = pkg;
const APP_URL = process.env.APP_URL;
export const getMyAppointmentsDoctor = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const doctorId = req.user.doctorData.doctor_id;

        const now = dayjs.utc();

        const appointments = await appointmentModel.getAppointmentsByDoctorId(doctorId);

        const result = await Promise.all(appointments.map(async (app) => {

            const doctor = await getDocterByDocterId(app.doctor_id);
            let chatId = await getChatBetweenUsers(userId, doctor[0].zynq_user_id);
            app.chatId = chatId.length > 0 ? chatId[0].id : null;
            // Convert local Date object (from MySQL) to local string
            const localFormattedStart = dayjs(app.start_time).format("YYYY-MM-DD HH:mm:ss");
            const localFormattedEnd = dayjs(app.end_time).format("YYYY-MM-DD HH:mm:ss");

            if (app.profile_image && !app.profile_image.startsWith('http')) {
                app.profile_image = `${APP_URL}${app.profile_image}`;
            }


            const startUTC = dayjs.utc(localFormattedStart);
            const endUTC = dayjs.utc(localFormattedEnd);
            const videoCallOn = now.isAfter(startUTC) && now.isBefore(endUTC);

            return {
                ...app,
                start_time: dayjs.utc(localFormattedStart).toISOString(),
                end_time: dayjs.utc(localFormattedEnd).toISOString(),
                videoCallOn
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
            const videoCallOn = now.isAfter(startUTC) && now.isBefore(endUTC);

            const doctor = await doctorModel.getDocterByDocterId(app.doctor_id);
            console.log("doctor", doctor)
            let chatId = await chatModel.getChatBetweenUsers(app.user_id, doctor[0].zynq_user_id);
            // console.log('chatId', chatId);


            return {
                ...app,
                start_time: dayjs.utc(localFormattedStart).toISOString(),
                end_time: dayjs.utc(localFormattedEnd).toISOString(),
                chatId: chatId.length > 0 ? chatId : null,
                videoCallOn
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
    const today = dayjs();
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

            const slots = generateSlots(
                availability.start_time,
                availability.end_time,
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

    if (allSlotData.length === 0) {
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

    const resultWithStatus = allSlotData.map(slot => {
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

export const getReviewsAndRatings = asyncHandler(async (req, res) => {
    const reviews = await appointmentModel.getRatings(req.user);
    return handleSuccess(res, 200, 'en', "REVIEWS_FETCHED", reviews);
});
