import * as adminModels from "../../models/admin.js";
import { handleError, handleSuccess } from "../../utils/responseHandler.js";

export const get_appointments = async (req, res) => {
    try {
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const search = req.query.search || "";

        const offset = (limit && page) ? (page - 1) * limit : undefined;

        const { appointments, total } = await adminModels.get_appointments_management(limit, offset, search);

        const data = {
            appointments,
            ...(limit && page && {
                pagination: {
                    totalAppointments: total,
                    totalPages: Math.ceil(total / limit),
                    currentPage: page,
                    appointmentsPerPage: limit,
                }
            })
        };

        return handleSuccess(res, 200, 'en', "Fetch appointments successfully", data);
    } catch (error) {
        console.error("internal E", error);
        return handleError(res, 500, 'en', "INTERNAL_SERVER_ERROR " + error.message);
    }
};
