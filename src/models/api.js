import db from "../config/db.js";
import { formatBenefitsOnLang } from "../utils/misc.util.js";

//======================================= Auth =========================================

export const get_user_by_user_id = async (user_id) => {
    try {
        return await db.query(`SELECT * FROM tbl_users WHERE user_id = ?`, [user_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch user data.");
    }
};

export const get_user_by_mobile_number = async (mobile_number) => {
    try {
        return await db.query(`SELECT * FROM tbl_users WHERE mobile_number = ?`, [mobile_number]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch user data.");
    }
};

export const create_user = async (mobile_number, otp = '', language) => {
    try {
        const userData = {
            mobile_number,
            otp,
            language,
            is_verified: 0,
            is_active: 1
        };
        return await db.query(`INSERT INTO tbl_users SET ?`, userData);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to create user.");
    }
};

export const enroll_user = async (user_data) => {
    try {
        return await db.query(`INSERT INTO tbl_users SET ?`, user_data);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to create user.");
    }
};

export const update_user = async (user_data, user_id) => {
    try {
        return await db.query(
            `UPDATE tbl_users SET ? WHERE user_id = ?`,
            [user_data, user_id]
        );
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update user.");
    }
};

export const delete_user = async (user_id) => {
    try {
        return await db.query(
            `DELETE FROM tbl_users WHERE user_id = ?`,
            [user_id]
        );
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to delete user.");
    }
};


//======================================= Ai Prompt =========================================
export const get_prompt_data = async (prompt_type) => {
    try {
        return await db.query(`SELECT * FROM tbl_aiprompt WHERE prompt_type = ?`, [prompt_type]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch prompt data.");
    }
};

export const create_prompt = async (promptData) => {
    try {
        return await db.query(`INSERT INTO  tbl_aiprompt SET ?`, promptData);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to create prompt.");
    }
};

export const update_prompt = async (prompt_data, prompt_type) => {
    try {
        return await db.query(
            `UPDATE tbl_aiprompt SET ? WHERE prompt_type = ?`,
            [prompt_data, prompt_type]
        );
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to update prompt.");
    }
};


//======================================= Face Scan =========================================
export const add_face_scan_data = async (face_data) => {
    try {
        return await db.query(`INSERT INTO tbl_face_scan_results SET ?`, face_data);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to add face scan data.");
    }
};

export const get_face_scan_history = async (user_id) => {
    try {
        return await db.query(
            `SELECT * FROM tbl_face_scan_results WHERE user_id = ? ORDER BY created_at DESC`, [user_id]);
    } catch (error) {
        console.error("DB Error in get_prompt_data:", error);
        throw new Error("Failed to face scan historydata");
    }
};


//======================================= Doctor =========================================
export const getAllDoctors = async ({
    treatment_ids = [],
    skin_condition_ids = [],
    aesthetic_device_ids = [],
    skin_type_ids = [],
    surgery_ids = [],
    min_rating = null,
    sort = { by: 'default', order: 'desc' },
    limit,
    offset
}) => {
    try {
        const params = [];

        const needsRating = min_rating !== null || sort.by === 'rating';

        const selectFields = [
            'd.*',
            'zu.email',
            needsRating ? 'ROUND(AVG(ar.rating), 2) AS avg_rating' : null
        ].filter(Boolean).join(', ');

        let query = `
            SELECT ${selectFields}
            FROM tbl_doctors d
            LEFT JOIN tbl_zqnq_users zu ON d.zynq_user_id = zu.id
        `;

        if (needsRating) {
            query += ` LEFT JOIN tbl_appointment_ratings ar ON d.doctor_id = ar.doctor_id`;
        }

        const joins = [];
        const filters = [];

        const addJoinAndFilter = (ids, joinTable, joinAlias, joinField) => {
            if (ids.length > 0) {
                joins.push(`LEFT JOIN ${joinTable} ${joinAlias} ON d.doctor_id = ${joinAlias}.doctor_id`);
                filters.push(`${joinAlias}.${joinField} IN (${ids.map(() => '?').join(', ')})`);
                params.push(...ids);
            }
        };

        addJoinAndFilter(treatment_ids, 'tbl_doctor_treatments', 'dt', 'treatment_id');
        addJoinAndFilter(skin_condition_ids, 'tbl_doctor_skin_condition', 'dsc', 'skin_condition_id');
        addJoinAndFilter(aesthetic_device_ids, 'tbl_doctor_aesthetic_devices', 'dad', 'aesthetic_devices_id');
        addJoinAndFilter(skin_type_ids, 'tbl_doctor_skin_types', 'dst', 'skin_type_id');
        addJoinAndFilter(surgery_ids, 'tbl_doctor_surgery', 'ds', 'surgery_id');

        if (joins.length > 0) {
            query += ' ' + joins.join(' ');
        }

        query += ` WHERE d.profile_completion_percentage >= 0`;

        if (filters.length > 0) {
            query += ` AND ${filters.join(' AND ')}`;
        }

        if (needsRating) {
            query += ` GROUP BY d.doctor_id`;
        }

        if (min_rating !== null) {
            query += ` HAVING avg_rating >= ?`;
            params.push(min_rating);
        }

        if (sort.by === 'rating') {
            query += ` ORDER BY avg_rating ${sort.order.toUpperCase()}`;
        } else {
            query += ` ORDER BY d.created_at DESC`;
        }

        query += ` LIMIT ? OFFSET ?`;
        params.push(Number(limit), Number(offset));

        return await db.query(query, params);
    } catch (error) {
        console.error("Database Error in getAllDoctors:", error.message);
        throw new Error("Failed to fetch doctors.");
    }
};


export const getAllRecommendedDoctors = async ({
    treatment_ids = [],
    skin_condition_ids = [],
    aesthetic_device_ids = [],
    skin_type_ids = [],
    surgery_ids = [],
    distance = {},
    price = {},
    search = '',
    min_rating = null,
    sort = { by: 'default', order: 'desc' },
    userLatitude,
    userLongitude,
    limit,
    offset
}) => {
    try {
        const params = [];

        const needsDistance = userLatitude != null && userLongitude != null;
        const distanceSelect = needsDistance
            ? `ROUND(ST_Distance_Sphere(POINT(ANY_VALUE(cl.longitude), ANY_VALUE(cl.latitude)), POINT(?, ?)), 2) AS distance`
            : null;

        const selectFields = [
            'd.doctor_id',
            'd.name',
            'TIMESTAMPDIFF(YEAR, MIN(de.start_date), MAX(IFNULL(de.end_date, CURDATE()))) AS experience_years',
            'd.specialization',
            'ANY_VALUE(d.fee_per_session) AS fee_per_session',
            'd.profile_image',
            'dm.clinic_id',
            'c.clinic_name',
            'c.address AS clinic_address',
            'ROUND(AVG(ar.rating), 2) AS avg_rating',
            distanceSelect
        ].filter(Boolean).join(', ');

        if (needsDistance) {
            params.push(userLongitude, userLatitude); // long, lat
        }

        let query = `
            SELECT ${selectFields}
            FROM tbl_doctors d
            LEFT JOIN tbl_zqnq_users zu ON d.zynq_user_id = zu.id
            LEFT JOIN tbl_doctor_clinic_map dm ON d.doctor_id = dm.doctor_id
            LEFT JOIN tbl_clinics c ON dm.clinic_id = c.clinic_id
            LEFT JOIN tbl_clinic_locations cl ON c.clinic_id = cl.clinic_id
            LEFT JOIN tbl_appointment_ratings ar ON d.doctor_id = ar.doctor_id
            LEFT JOIN tbl_doctor_experiences de ON d.doctor_id = de.doctor_id
        `;

        const joins = [];
        const filters = [];

        const addJoinAndFilter = (ids, joinTable, joinAlias, joinField) => {
            if (ids.length > 0) {
                joins.push(`LEFT JOIN ${joinTable} ${joinAlias} ON d.doctor_id = ${joinAlias}.doctor_id`);
                filters.push(`${joinAlias}.${joinField} IN (${ids.map(() => '?').join(', ')})`);
                params.push(...ids);
            }
        };

        addJoinAndFilter(treatment_ids, 'tbl_doctor_treatments', 'dt', 'treatment_id');
        addJoinAndFilter(skin_condition_ids, 'tbl_doctor_skin_condition', 'dsc', 'skin_condition_id');
        addJoinAndFilter(aesthetic_device_ids, 'tbl_doctor_aesthetic_devices', 'dad', 'aesthetic_devices_id');
        addJoinAndFilter(skin_type_ids, 'tbl_doctor_skin_types', 'dst', 'skin_type_id');
        addJoinAndFilter(surgery_ids, 'tbl_doctor_surgery', 'ds', 'surgery_id');

        if (joins.length > 0) {
            query += ' ' + joins.join(' ');
        }

        query += ` WHERE d.profile_completion_percentage >= 0`;

        if (search && search.trim() !== '') {
            filters.push(`LOWER(d.name) LIKE ?`);
            params.push(`%${search.trim().toLowerCase()}%`);
        }

        // Fee per session
        if (typeof price.min === 'number') {
            filters.push('d.fee_per_session >= ?');
            params.push(price.min);
        }
        if (typeof price.max === 'number') {
            filters.push('d.fee_per_session <= ?');
            params.push(price.max);
        }

        // Distance (in meters)
        if (needsDistance) {
            if (typeof distance.min === 'number') {
                filters.push(`ST_Distance_Sphere(POINT(cl.longitude, cl.latitude), POINT(?, ?)) >= ?`);
                params.push(userLongitude, userLatitude, distance.min);
            }
            if (typeof distance.max === 'number') {
                filters.push(`ST_Distance_Sphere(POINT(cl.longitude, cl.latitude), POINT(?, ?)) <= ?`);
                params.push(userLongitude, userLatitude, distance.max);
            }
        }

        if (filters.length > 0) {
            query += ` AND ${filters.join(' AND ')}`;
        }

        query += ` GROUP BY d.doctor_id, dm.clinic_id`;

        // Rating range filter
        if (min_rating !== null) {
            const ratingCeiling = Math.min(min_rating + 1, 5.01); // include 5.0 if min_rating is 4
            query += ` HAVING CAST(avg_rating AS DECIMAL(10,2)) >= ? AND CAST(avg_rating AS DECIMAL(10,2)) <= ?`;
            params.push(min_rating, ratingCeiling);
        }

        // Sorting
        if (sort.by === 'rating') {
            query += ` ORDER BY avg_rating IS NULL, CAST(avg_rating AS DECIMAL(10,2)) ${sort.order.toUpperCase()}`;
        } else if (sort.by === 'nearest' && needsDistance) {
            query += ` ORDER BY distance IS NULL, CAST(distance AS DECIMAL(10,2)) ${sort.order.toUpperCase()}`;
        } else if (sort.by === 'price') {
            query += ` ORDER BY d.fee_per_session IS NULL, CAST(d.fee_per_session AS DECIMAL(10,2)) ${sort.order.toUpperCase()}`;
        } else {
            // default fallback (recently created doctors first)
            query += ` ORDER BY d.created_at DESC`;
        }

        query += ` LIMIT ? OFFSET ?`;
        params.push(Number(limit) || 10, Number(offset) || 0);
        console.log(query)
        return await db.query(query, params);
    } catch (error) {
        console.error("Database Error in getAllRecommendedDoctors:", error.message);
        throw new Error("Failed to fetch doctors.");
    }
};

export const getDoctorAvailability = async (doctor_id) => {
    try {
        const availability = await db.query('SELECT * FROM tbl_doctor_availability WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return availability;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor availability.");
    }
};

export const getDoctorCertifications = async (doctor_id) => {
    try {
        const certifications = await db.query(`
            SELECT c.*, ct.* 
            FROM tbl_doctor_certification c
            LEFT JOIN tbl_certification_type ct ON c.certification_type_id = ct.certification_type_id 
            WHERE c.doctor_id = ? ORDER BY c.created_at DESC`, [doctor_id]);
        return certifications;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor certifications.");
    }
};

export const getDoctorEducation = async (doctor_id) => {
    try {
        const education = await db.query('SELECT * FROM tbl_doctor_educations WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return education;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor education.");
    }
};

export const getDoctorExperience = async (doctor_id) => {
    try {
        const experience = await db.query('SELECT * FROM tbl_doctor_experiences WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return experience;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor experience.");
    }
};

export const getDoctorReviews = async (doctor_id) => {
    try {
        const reviews = await db.query('SELECT * FROM tbl_doctor_reviews WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return reviews;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor reviews.");
    }
};

export const getDoctorSeverityLevels = async (doctor_id) => {
    try {
        const severityLevels = await db.query('SELECT * FROM tbl_doctor_severity_levels WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return severityLevels;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor severity levels.");
    }
};

export const getDoctorSkinTypes = async (doctor_id) => {
    try {
        const skinTypes = await db.query('SELECT * FROM tbl_doctor_skin_types WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return skinTypes;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor skin types.");
    }
};

export const getDoctorTreatments = async (doctor_id) => {
    try {
        const treatments = await db.query('SELECT * FROM tbl_doctor_treatments WHERE doctor_id = ? ORDER BY created_at DESC', [doctor_id]);
        return treatments;
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch doctor treatments.");
    }
};

//======================================= Product =========================================
export const get_all_products_for_user = async ({
    treatment_ids = [],
    search = '',
    price = {},
    sort = { by: 'latest', order: 'desc' },
    limit = 20,
    offset = 0
}) => {
    try {
        let query = `
            SELECT 
                p.*, 
                IF(cp.product_id IS NOT NULL, TRUE, FALSE) AS added_in_cart
            FROM tbl_products AS p
            LEFT JOIN tbl_product_treatments AS pt ON pt.product_id = p.product_id
            LEFT JOIN tbl_treatments AS t ON t.treatment_id = pt.treatment_id
            LEFT JOIN tbl_cart_products AS cp ON cp.product_id = p.product_id
            WHERE 1=1
        `;

        const params = [];

        if (treatment_ids.length > 0) {
            query += ` AND pt.treatment_id IN (${treatment_ids.map(() => '?').join(', ')})`;
            params.push(...treatment_ids);
        }

        if (search && search.trim() !== '') {
            query += ` AND LOWER(p.name) LIKE ?`;
            params.push(`%${search.trim().toLowerCase()}%`);
        }

        if (typeof price?.min === 'number') {
            query += ` AND p.price >= ?`;
            params.push(price.min);
        }

        if (typeof price?.max === 'number') {
            query += ` AND p.price <= ?`;
            params.push(price.max);
        }

        let orderBy = 'ORDER BY';
        if (sort.by === 'price') {
            orderBy += ` p.price ${sort.order}`;
        } else {
            orderBy += ` p.created_at ${sort.order}`;
        }

        query += ` GROUP BY p.product_id ${orderBy} LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        return await db.query(query, params);
    } catch (error) {
        console.error("Database Error in getAllProductsForUser:", error.message);
        throw new Error("Failed to fetch products.");
    }
};

export const getUserCartProduct = async (
    user_id
) => {
    try {
        let query = `
            SELECT 
                pt.product_id
                
            FROM tbl_carts AS ct
            LEFT JOIN tbl_cart_products AS pt ON ct.cart_id  = pt.cart_id
           
            WHERE ct.cart_status = 'CART' And ct.user_id  = '${user_id}'
        `;
        console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', query);

        return await db.query(query);
    } catch (error) {
        console.error("Database Error in getAllProductsForUser:", error.message);
        throw new Error("Failed to fetch products.");
    }
};

export const get_single_product_for_user = async (product_id) => {
    try {
        const query = `
SELECT 
    p.*,
    IF(COUNT(t.treatment_id), JSON_ARRAYAGG(
        JSON_OBJECT(
            'treatment_id', t.treatment_id,
            'name',         t.name,
            'swedish',      t.swedish,
            'application',  t.application,
            'type',         t.type,
            'technology',   t.technology,
            'created_at',   t.created_at
        )
    ), JSON_ARRAY()) AS treatments,
    IF(cp.product_id IS NOT NULL, TRUE, FALSE) AS added_in_cart
FROM tbl_products AS p
LEFT JOIN tbl_product_treatments AS pt ON pt.product_id = p.product_id
LEFT JOIN tbl_treatments AS t ON t.treatment_id = pt.treatment_id
LEFT JOIN tbl_cart_products AS cp ON cp.product_id = p.product_id
WHERE p.product_id = ?
GROUP BY p.product_id;

        `;

        return await db.query(query, [product_id]);
    } catch (error) {
        console.error("Database Error in get_single_product_for_user:", error.message);
        throw new Error("Failed to fetch product details.");
    }
};

export const get_product_images = async (product_id) => {
    try {
        return await db.query(`SELECT * FROM tbl_product_images WHERE product_id = ? ORDER BY created_at DESC`, [product_id]);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch product images.");
    }
}


//======================================= Clinic =========================================


export const getAllClinicsForUser = async ({
    treatment_ids = [],
    skin_condition_ids = [],
    aesthetic_device_ids = [],
    skin_type_ids = [],
    surgery_ids = [],
    search = '',
    distance = {},
    price = {},
    min_rating = null,
    sort = { by: 'default', order: 'desc' },
    userLatitude,
    userLongitude,
    limit,
    offset
}) => {
    try {
        const params = [];

        const hasLatLong = userLatitude && userLongitude;
        const needsDistanceFilter = distance.min != null || distance.max != null;
        const needsDistanceSort = sort.by === 'nearest';

        const needsDistance = hasLatLong;
        const applyDistanceFilter = hasLatLong && needsDistanceFilter;
        const applyDistanceSort = hasLatLong && needsDistanceSort;

        const hasPriceFilter = price.min != null || price.max != null;
        const needsRating = min_rating !== null || sort.by === 'rating';

        const selectFields = [
            'c.clinic_id',
            'c.clinic_name',
            'c.clinic_logo',
            'c.address',
            'c.mobile_number',
            'MIN(CAST(d.fee_per_session AS DECIMAL(10,2))) AS doctor_lower_price_range',
            'MAX(CAST(d.fee_per_session AS DECIMAL(10,2))) AS doctor_higher_price_range',
            'ROUND(AVG(ar.rating), 2) AS avg_rating',
            needsDistance ? `ROUND(ST_Distance_Sphere(POINT(ANY_VALUE(cl.longitude), ANY_VALUE(cl.latitude)), POINT(?, ?)), 2) AS distance` : null
        ].filter(Boolean).join(', ');

        if (needsDistance) {
            params.push(userLongitude, userLatitude); // order: lon, lat
        }

        let query = `
            SELECT ${selectFields}
            FROM tbl_clinics c
            LEFT JOIN tbl_clinic_locations cl ON c.clinic_id = cl.clinic_id
            LEFT JOIN tbl_doctor_clinic_map dcm ON dcm.clinic_id = c.clinic_id
            LEFT JOIN tbl_doctors d ON d.doctor_id = dcm.doctor_id
            LEFT JOIN tbl_appointment_ratings ar ON c.clinic_id = ar.clinic_id
        `;

        const joins = [];
        const filters = [];

        const addJoinAndFilter = (ids, table, alias, column) => {
            if (ids.length > 0) {
                joins.push(`LEFT JOIN ${table} ${alias} ON c.clinic_id = ${alias}.clinic_id`);
                filters.push(`${alias}.${column} IN (${ids.map(() => '?').join(', ')})`);
                params.push(...ids);
            }
        };

        addJoinAndFilter(treatment_ids, 'tbl_clinic_treatments', 'ct', 'treatment_id');
        addJoinAndFilter(skin_condition_ids, 'tbl_clinic_skin_condition', 'csc', 'skin_condition_id');
        addJoinAndFilter(aesthetic_device_ids, 'tbl_clinic_aesthetic_devices', 'cad', 'aesthetic_devices_id');
        addJoinAndFilter(skin_type_ids, 'tbl_clinic_skin_types', 'cskt', 'skin_type_id');
        addJoinAndFilter(surgery_ids, 'tbl_clinic_surgery', 'cr', 'surgery_id');

        if (joins.length > 0) {
            query += ' ' + joins.join(' ');
        }

        query += ` WHERE c.profile_completion_percentage >= 50`;

        if (search.trim()) {
            filters.push(`LOWER(c.clinic_name) LIKE ?`);
            params.push(`%${search.trim().toLowerCase()}%`);
        }

        if (filters.length > 0) {
            query += ` AND ${filters.join(' AND ')}`;
        }

        query += ` GROUP BY c.clinic_id`;

        const havingConditions = [];

        if (min_rating !== null) {
            const ratingCeiling = Math.min(min_rating + 1, 5.01);
            console.log(`min_rating: ${min_rating}, ratingCeiling: ${ratingCeiling}`);
            havingConditions.push(`CAST(avg_rating AS DECIMAL(10,2)) >= ? AND CAST(avg_rating AS DECIMAL(10,2)) <= ?`);
            params.push(min_rating, ratingCeiling);
        }

        if (hasPriceFilter) {
            if (price.min != null) {
                havingConditions.push(`doctor_lower_price_range >= ?`);
                params.push(price.min);
            }
            if (price.max != null) {
                havingConditions.push(`doctor_higher_price_range <= ?`);
                params.push(price.max);
            }
        }

        if (applyDistanceFilter) {
            if (distance.min != null) {
                havingConditions.push(`distance >= ?`);
                params.push(distance.min);
            }
            if (distance.max != null) {
                havingConditions.push(`distance <= ?`);
                params.push(distance.max);
            }
        }

        if (havingConditions.length > 0) {
            query += ` HAVING ${havingConditions.join(' AND ')}`;
        }

        if (applyDistanceSort) {
            query += ` ORDER BY distance ${sort.order.toUpperCase()}`;
        } else if (sort.by === 'rating') {
            query += ` ORDER BY avg_rating ${sort.order.toUpperCase()}`;
        } else if (sort.by === 'price') {
            if (sort.order === 'asc') {
                query += ` ORDER BY doctor_lower_price_range ASC`;
            } else {
                query += ` ORDER BY doctor_lower_price_range DESC`;
            }
        } else if (sort.by === 'nearest') {
            if (sort.order === 'asc') {
                query += ` ORDER BY distance ASC`;
            } else {
                query += ` ORDER BY distance DESC`;
            }
        } else {
            query += ` ORDER BY c.created_at DESC`;
        }

        query += ` LIMIT ? OFFSET ?`;
        params.push(Number(limit), Number(offset));

        return await db.query(query, params);
    } catch (error) {
        console.error("Database Error in getAllClinicsForUser:", error.message);
        throw new Error("Failed to fetch clinics.");
    }
};

export const getNearbyClinicsForUser = async ({
    treatment_ids = [],
    skin_condition_ids = [],
    aesthetic_device_ids = [],
    skin_type_ids = [],
    surgery_ids = [],
    search = '',
    distance = {},
    price = {},
    min_rating = null,
    sort = { by: 'nearest', order: 'asc' },
    userLatitude,
    userLongitude,
    limit,
    offset
}) => {
    try {
        const params = [];

        const hasLatLong = userLatitude && userLongitude;
        const needsDistanceFilter = distance.min != null || distance.max != null;
        const needsDistanceSort = sort.by === 'nearest';

        const needsDistance = hasLatLong;
        const applyDistanceFilter = hasLatLong && needsDistanceFilter;
        const applyDistanceSort = hasLatLong && needsDistanceSort;

        const hasPriceFilter = price.min != null || price.max != null;
        const needsRating = min_rating !== null || sort.by === 'rating';

        const selectFields = [
            'c.clinic_id',
            'c.clinic_name',
            'c.clinic_logo',
            'c.address',
            'c.mobile_number',
            'MIN(CAST(d.fee_per_session AS DECIMAL(10,2))) AS doctor_lower_price_range',
            'MAX(CAST(d.fee_per_session AS DECIMAL(10,2))) AS doctor_higher_price_range',
            'ROUND(AVG(ar.rating), 2) AS avg_rating',
            needsDistance
                ? `ROUND(ST_Distance_Sphere(POINT(ANY_VALUE(cl.longitude), ANY_VALUE(cl.latitude)), POINT(?, ?)), 2) AS distance`
                : null
        ]
            .filter(Boolean)
            .join(', ');

        if (needsDistance) {
            params.push(userLongitude, userLatitude); // Order: lon, lat
        }

        let query = `
            SELECT ${selectFields}
            FROM tbl_clinics c
            LEFT JOIN tbl_clinic_locations cl ON c.clinic_id = cl.clinic_id
            LEFT JOIN tbl_doctor_clinic_map dcm ON dcm.clinic_id = c.clinic_id
            LEFT JOIN tbl_doctors d ON d.doctor_id = dcm.doctor_id
            LEFT JOIN tbl_appointment_ratings ar ON c.clinic_id = ar.clinic_id
        `;

        const joins = [];
        const filters = [];

        const addJoinAndFilter = (ids, joinTable, joinAlias, joinField) => {
            if (ids.length > 0) {
                joins.push(
                    `LEFT JOIN ${joinTable} ${joinAlias} ON c.clinic_id = ${joinAlias}.clinic_id`
                );
                filters.push(
                    `${joinAlias}.${joinField} IN (${ids.map(() => '?').join(', ')})`
                );
                params.push(...ids);
            }
        };

        addJoinAndFilter(treatment_ids, 'tbl_clinic_treatments', 'ct', 'treatment_id');
        addJoinAndFilter(skin_condition_ids, 'tbl_clinic_skin_condition', 'csc', 'skin_condition_id');
        addJoinAndFilter(aesthetic_device_ids, 'tbl_clinic_aesthetic_devices', 'cad', 'aesthetic_devices_id');
        addJoinAndFilter(skin_type_ids, 'tbl_clinic_skin_types', 'cskt', 'skin_type_id');
        addJoinAndFilter(surgery_ids, 'tbl_clinic_surgery', 'cr', 'surgery_id');

        if (joins.length > 0) {
            query += ' ' + joins.join(' ');
        }

        query += ` WHERE c.profile_completion_percentage >= 50`;

        if (search && search.trim() !== '') {
            filters.push(`LOWER(c.clinic_name) LIKE ?`);
            params.push(`%${search.trim().toLowerCase()}%`);
        }

        if (filters.length > 0) {
            query += ` AND ${filters.join(' AND ')}`;
        }

        query += ` GROUP BY c.clinic_id`;

        // HAVING Conditions
        const havingConditions = [];
        if (min_rating !== null) {
            const ratingCeiling = Math.min(min_rating + 1, 5.01);
            havingConditions.push(`CAST(avg_rating AS DECIMAL(10,2)) >= ? AND CAST(avg_rating AS DECIMAL(10,2)) <= ?`);
            params.push(min_rating, ratingCeiling);
        }

        if (hasPriceFilter) {
            if (price.min != null) {
                havingConditions.push(`doctor_lower_price_range >= ?`);
                params.push(price.min);
            }
            if (price.max != null) {
                havingConditions.push(`doctor_higher_price_range <= ?`);
                params.push(price.max);
            }
        }

        if (applyDistanceFilter) {
            if (distance.min != null) {
                havingConditions.push(`distance >= ?`);
                params.push(distance.min);
            }
            if (distance.max != null) {
                havingConditions.push(`distance <= ?`);
                params.push(distance.max);
            }
        }

        if (havingConditions.length > 0) {
            query += ` HAVING ${havingConditions.join(' AND ')}`;
        }

        // ORDER BY
        if (applyDistanceSort) {
            query += ` ORDER BY distance ${sort.order.toUpperCase()}`;
        } else if (sort.by === 'rating') {
            query += ` ORDER BY avg_rating ${sort.order.toUpperCase()}`;
        } else if (sort.by === 'price') {
            if (sort.order === 'asc') {
                query += ` ORDER BY doctor_lower_price_range ASC`;
            } else {
                query += ` ORDER BY doctor_lower_price_range DESC`;
            }
        } else {
            query += ` ORDER BY c.created_at DESC`;
        }

        // Pagination
        query += ` LIMIT ? OFFSET ?`;
        params.push(Number(limit), Number(offset));

        return await db.query(query, params);
    } catch (error) {
        console.error("Database Error in getNearbyClinicsForUser:", error.message);
        throw new Error("Failed to fetch nearby clinics.");
    }
};

export const getSingleClinicForUser = async (
    clinic_id,
) => {
    try {
        const params = [];

        const selectFields = [
            'c.*',
            'MIN(d.fee_per_session) AS doctor_lower_price_range',
            'MAX(d.fee_per_session) AS doctor_higher_price_range',
            'ROUND(AVG(ar.rating), 2) AS avg_rating'
        ].filter(Boolean).join(', ');

        let query = `
            SELECT ${selectFields}
            FROM tbl_clinics c
            LEFT JOIN tbl_clinic_locations cl ON c.clinic_id = cl.clinic_id
            LEFT JOIN tbl_doctor_clinic_map dcm ON dcm.clinic_id = c.clinic_id
            LEFT JOIN tbl_doctors d ON d.doctor_id = dcm.doctor_id
            LEFT JOIN tbl_appointment_ratings ar ON c.clinic_id = ar.clinic_id
            WHERE c.clinic_id = ?
        `;

        params.push(clinic_id);

        query += ` GROUP BY c.clinic_id`;
        return await db.query(query, params);
    } catch (error) {
        console.error("Database Error in getSingleClinicDetailsForUser:", error.message);
        throw new Error("Failed to fetch clinic details.");
    }
};

export const get_clinic_by_zynq_user_id = async (zynq_user_id) => {
    try {
        return await db.query(`SELECT * FROM tbl_clinics WHERE zynq_user_id = ?`, [zynq_user_id]);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic.");
    }
}


//======================================= Support =========================================
export const insert_support_ticket = async (support_ticket_data) => {
    try {
        return await db.query(`INSERT INTO tbl_support_tickets SET ?`, support_ticket_data);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to insert support ticket.");
    }
}

export const get_support_tickets_by_user_id = async (user_id) => {
    try {
        return await db.query(`SELECT * FROM tbl_support_tickets WHERE user_id = ? ORDER BY created_at DESC`, [user_id]);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch support tickets.");
    }
}


export const update_user_is_online = async (user_id, isOnline) => {
    return db.query("UPDATE tbl_users SET isOnline = ? WHERE user_id = ?", [isOnline, user_id]);
};

export const fetchAllCallLogsWithDetails = async () => {
    try {
        const result = await db.query(`
      SELECT
        cl.*,
 
        su.user_id AS su_id, su.full_name AS su_name, su.mobile_number AS su_mobile,
        ru.user_id AS ru_id, ru.full_name AS ru_name, ru.mobile_number AS ru_mobile,
 
        sd.doctor_id AS sd_id, sd.name AS sd_name, sd.specialization AS sd_specialization,
        rd.doctor_id AS rd_id, rd.name AS rd_name, rd.specialization AS rd_specialization
 
      FROM tbl_call_logs cl
      LEFT JOIN tbl_users su ON cl.sender_user_id = su.user_id
      LEFT JOIN tbl_users ru ON cl.receiver_user_id = ru.user_id
      LEFT JOIN tbl_doctors sd ON cl.sender_doctor_id = sd.doctor_id
      LEFT JOIN tbl_doctors rd ON cl.receiver_doctor_id = rd.doctor_id
 
      ORDER BY cl.created_at DESC
    `);

        return Array.isArray(result) ? result : result;
    } catch (error) {
        console.error('❌ SQL ERROR:', error);
        throw new Error("Database error while fetching call logs.");
    }
};

export const get_all_appointments = async () => {
    try {
        const result = await db.query(`
            SELECT
                a.appointment_id,
                a.start_time,
                a.end_time,
                a.type,
                a.status,
 
                u.user_id AS user_id,
                u.full_name AS user_name,
                u.mobile_number AS user_mobile,
                u.email AS email,
                u.age AS age,
                u.gender AS gender,
                u.profile_image AS user_profile_image,
 
                d.doctor_id AS doctor_id,
                d.name AS doctor_name,
                d.age AS age,
                d.address,
                d.biography,
                d.profile_image AS doctor_image,
                d.experience_years,
                IFNULL(ar.rating, 0) AS rating,
                d.phone,
                d.fee_per_session,
 
                c.clinic_id AS clinic_id,
                c.clinic_name,
                c.email AS clinic_email,
                c.mobile_number AS clinic_mobile,
                c.address,

                fcr.face_scan_result_id,
                fcr.pdf
 
            FROM tbl_appointments a
            LEFT JOIN tbl_users u ON a.user_id = u.user_id
            LEFT JOIN tbl_doctors d ON a.doctor_id = d.doctor_id
            LEFT JOIN tbl_clinics c ON a.clinic_id = c.clinic_id
            LEFT JOIN tbl_face_scan_results fcr ON fcr.face_scan_result_id = a.report_id
            LEFT JOIN tbl_appointment_ratings ar ON a.appointment_id = ar.appointment_id
            WHERE a.payment_status = 'paid'
            ORDER BY a.created_at DESC
        `);

        return Array.isArray(result) ? result : result;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch appointments");
    }
};


export const fetchZynqUserByUserId = async (user_id) => {
    try {
        return await db.query(`SELECT * FROM tbl_zqnq_users WHERE id = ?`, [user_id]);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic.");
    }
}

export const getAllConcerns = async (lang = "en") => {
    try {
        console.log("lang", lang);

        const concernData = await db.query(`SELECT * FROM tbl_concerns;`, []);

        const result = concernData.map((concern) => {
            let parsedTips = {};
            try {
                parsedTips = typeof concern.tips === "string"
                    ? JSON.parse(concern.tips)
                    : concern.tips || {};
            } catch (err) {
                console.warn(`Invalid JSON in tips for concern_id: ${concern.concern_id}`);
                parsedTips = {};
            }

            // Ensure tips is an array of trimmed strings
            const tipsString = parsedTips?.[lang] || "";
            const tipsArray = typeof tipsString === "string"
                ? tipsString.split(",").map((tip) => tip.trim()).filter(Boolean)
                : [];

            return {
                ...concern,
                tips: tipsArray,
            };
        });

        return result;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch concerns.");
    }
};

export const getTreatmentsByConcernId = async (concern_id) => {
    try {
        return await db.query(`SELECT t.*,c.name as concern_name FROM tbl_treatment_concerns tc INNER JOIN 
              tbl_treatments t ON tc.treatment_id = t.treatment_id INNER JOIN tbl_concerns c  ON  c.concern_id  = tc.concern_id
              WHERE tc.concern_id = ?;
                `, [concern_id]);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic.");
    }
}

export const enroll_user_data = async (user_data) => {
    try {
        return await db.query(`INSERT INTO  tbl_enrollments  SET?`, user_data);
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to create user.");
    }
};

export const get_all_enrollments = async () => {
    try {
        return await db.query(`SELECT * FROM tbl_enrollments
                ORDER BY created_at DESC`, []);
    }
    catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch clinic.");
    }
};

export const getTreatmentsByConcernIds = async (concern_ids = [], lang) => {
    if (!Array.isArray(concern_ids) || concern_ids.length === 0) {
        return [];
    }

    try {
        const placeholders = concern_ids.map(() => '?').join(', ');

        const query = `
            SELECT
                t.*,
                ANY_VALUE(c.name) AS concern_name,
                IFNULL(MIN(dt.price), 0) AS min_price,
                IFNULL(MAX(dt.price), 0) AS max_price
            FROM tbl_treatment_concerns tc
            INNER JOIN tbl_treatments t ON tc.treatment_id = t.treatment_id
            INNER JOIN tbl_concerns c ON c.concern_id = tc.concern_id
            LEFT JOIN tbl_doctor_treatments dt ON t.treatment_id = dt.treatment_id
            WHERE tc.concern_id IN (${placeholders})
            GROUP BY t.treatment_id
        `;

        const results = await db.query(query, concern_ids);

        // Format benefits based on language
        return formatBenefitsOnLang(results, lang);

    } catch (error) {
        console.error("Database Error in getTreatmentsByConcernIds:", error.message);
        throw new Error("Failed to fetch treatments by concern IDs.");
    }
};

export const getAllTreatments = async (lang) => {
    try {
        const query = `
            SELECT
                t.*,
                ANY_VALUE(c.name) AS concern_name,
                IFNULL(MIN(dt.price), 0) AS min_price,
                IFNULL(MAX(dt.price), 0) AS max_price
            FROM tbl_treatment_concerns tc
            INNER JOIN tbl_treatments t ON tc.treatment_id = t.treatment_id
            INNER JOIN tbl_concerns c ON c.concern_id = tc.concern_id
            LEFT JOIN tbl_doctor_treatments dt ON t.treatment_id = dt.treatment_id
            GROUP BY t.treatment_id
        `;

        const results = await db.query(query);

        // Format benefits based on language
        return formatBenefitsOnLang(results, lang);

    } catch (error) {
        console.error("Database Error in getTreatmentsByConcernIds:", error.message);
        throw new Error("Failed to fetch treatments by concern IDs.");
    }
};

export const getTreatmentsByTreatmentIds = async (treatment_ids = [], lang) => {
    try {
        let query = `
            SELECT
                t.*,
                ANY_VALUE(c.name) AS concern_name,
                IFNULL(MIN(dt.price), 0) AS min_price,
                IFNULL(MAX(dt.price), 0) AS max_price
            FROM tbl_treatment_concerns tc
            INNER JOIN tbl_treatments t ON tc.treatment_id = t.treatment_id
            INNER JOIN tbl_concerns c ON c.concern_id = tc.concern_id
            LEFT JOIN tbl_doctor_treatments dt ON t.treatment_id = dt.treatment_id
        `;

        let params = [];

        // Add WHERE clause only if treatment_ids is not empty
        if (Array.isArray(treatment_ids) && treatment_ids.length > 0) {
            const placeholders = treatment_ids.map(() => '?').join(', ');
            query += ` WHERE t.treatment_id IN (${placeholders})`;
            params = treatment_ids;
        }

        query += ` GROUP BY t.treatment_id`;

        const results = await db.query(query, params);

        return formatBenefitsOnLang(results, lang);
    } catch (error) {
        console.error("Database Error in getTreatmentsByTreatmentIds:", error.message);
        throw new Error("Failed to fetch treatments.");
    }
};


export const getTreatmentIdsByConcernIds = async (concern_ids = []) => {
    try {
        if (!Array.isArray(concern_ids) || concern_ids.length === 0) {
            return []; // Early return for empty input
        }

        const placeholders = concern_ids.map(() => '?').join(', ');
        const query = `
            SELECT DISTINCT treatment_id
            FROM tbl_treatment_concerns
            WHERE concern_id IN (${placeholders})
        `;

        const results = await db.query(query, concern_ids);
        return results.map(row => row.treatment_id).filter(Boolean);
    } catch (error) {
        console.error("Database Error in getTreatmentIdsByConcernIds:", error);
        throw new Error("Failed to fetch treatment IDs by concern IDs.");
    }
};


export const getLegalDocumentsForUsers = async () => {
    try {
        const rows = await db.query(`SELECT type, text FROM tbl_legal_documents`);

        const payload = {
            TERMS_CONDITIONS: null,
            PRIVACY_POLICY: null,
        };

        for (const doc of rows) {
            if (doc.type === 'TERMS_CONDITIONS') {
                payload.TERMS_CONDITIONS = doc.text;
            } else if (doc.type === 'PRIVACY_POLICY') {
                payload.PRIVACY_POLICY = doc.text;
            }
        }

        return payload;
    } catch (error) {
        console.error("❌ Database Error in getLegalDocumentsForUsers:", error.message);
        throw new Error("Failed to fetch legal documents");
    }
};


export const updateLegalDocumentsService = async ({ TERMS_CONDITIONS, PRIVACY_POLICY }) => {
    try {
        const queries = [];
        const values = [];

        if (TERMS_CONDITIONS !== undefined) {
            queries.push(`WHEN 'TERMS_CONDITIONS' THEN ?`);
            values.push(TERMS_CONDITIONS);
        }

        if (PRIVACY_POLICY !== undefined) {
            queries.push(`WHEN 'PRIVACY_POLICY' THEN ?`);
            values.push(PRIVACY_POLICY);
        }

        if (queries.length === 0) return { affectedRows: 0 }; // Nothing to update

        const query = `
            UPDATE tbl_legal_documents
            SET text = CASE type
                ${queries.join('\n')}
            END
            WHERE type IN (${queries.map((_, idx) =>
            idx === 0 && TERMS_CONDITIONS !== undefined ? `'TERMS_CONDITIONS'` :
                `'PRIVACY_POLICY'`
        ).join(', ')})
        `;

        const result = await db.query(query, values);
        return result;
    } catch (error) {
        console.error("❌ Database Error in updateLegalDocumentsService:", error.message);
        throw new Error("Failed to update legal documents");
    }
};

export const getTipsByConcernIds = async (concern_ids = [], lang = "en") => {
    if (!Array.isArray(concern_ids) || concern_ids.length === 0) {
        return [];
    }

    try {
        const placeholders = concern_ids.map(() => '?').join(', ');
        const query = `
            SELECT tips
            FROM tbl_concerns
            WHERE concern_id IN (${placeholders});
        `;

        const results = await db.query(query, concern_ids);

        const allTips = [];

        for (const row of results) {
            let parsedTips = {};
            try {
                parsedTips = typeof row.tips === 'string'
                    ? JSON.parse(row.tips)
                    : row.tips || {};
            } catch (err) {
                console.warn("Invalid tips JSON:", row.tips);
                continue;
            }

            const tipsString = parsedTips?.[lang] || "";
            const tipsArray = typeof tipsString === "string"
                ? tipsString.split(",").map(t => t.trim()).filter(Boolean)
                : [];

            allTips.push(...tipsArray);
        }

        return allTips;
    } catch (error) {
        console.error("Database Error:", error.message);
        throw new Error("Failed to fetch tips by concern IDs.");
    }
};


export const getWishlistForUser = async (user_id) => {
    try {
        const result = await db.query(`
            SELECT p.* 
            FROM tbl_wishlist w
            LEFT JOIN tbl_products p ON w.product_id = p.product_id
            WHERE w.user_id = ?`,
            [user_id]);
        return result;
    } catch (error) {
        console.error("Database Error in getWishlistForUser:", error);
        throw new Error("Failed to fetch wishlist for user.");
    }
};

export const toggleWishlistProductForUser = async (product_id, user_id) => {
    try {
        const deleteResult = await db.query(
            `DELETE FROM tbl_wishlist WHERE product_id = ? AND user_id = ?`,
            [product_id, user_id]
        );

        console.log('deleteResult', deleteResult)

        if (deleteResult.affectedRows === 0) {
            await db.query(
                `INSERT INTO tbl_wishlist (product_id, user_id) VALUES (?, ?)`,
                [product_id, user_id]
            );
            return { action: 'added_to_wishlist' };
        } else {
            return { action: 'removed_from_wishlist' };
        }
    } catch (error) {
        console.error("Database Error in toggleWishlistProductForUser:", error);
        throw new Error("Failed to toggle wishlist product for user.");
    }
};

export const get_product_images_by_product_ids = async (productIds = []) => {
    if (!Array.isArray(productIds) || productIds.length === 0) return [];

    try {
        const placeholders = productIds.map(() => '?').join(', ');
        const query = `
            SELECT product_id, image
            FROM tbl_product_images
            WHERE product_id IN (${placeholders})
        `;

        return await db.query(query, productIds);
    } catch (error) {
        console.error("Database Error in get_product_images_by_product_ids:", error.message);
        throw new Error("Failed to fetch product images.");
    }
};

//======================================= Carts =========================================

export const addOrGetUserCart = async (clinic_id, user_id) => {
    try {
        let cartData;
        const result = await db.query(
            `SELECT cart_id FROM tbl_carts WHERE clinic_id = ? AND user_id = ? And cart_status = 'CART'`,
            [clinic_id, user_id]
        );

        if (result.length !== 0) {
            cartData = result;
        } else {
            await db.query(
                `INSERT INTO tbl_carts (clinic_id, user_id) VALUES (?, ?)`,
                [clinic_id, user_id]
            );

            cartData = await db.query(
                `SELECT cart_id FROM tbl_carts WHERE clinic_id = ? AND user_id = ? And cart_status = 'CART'`,
                [clinic_id, user_id]
            );
        }

        return cartData[0];
    } catch (error) {
        console.error("Database Error in addOrGetUserCart:", error);
        throw new Error("Failed to add or get user cart.");
    }
};

export const addProductToUserCart = async (cart_id, product_id, quantity) => {
    try {
        await db.query(
            `INSERT INTO tbl_cart_products (cart_id, product_id, quantity) VALUES (?, ?, ?)`,
            [cart_id, product_id, quantity]
        );
    } catch (error) {
        console.error("Database Error in addProductToUserCart:", error);
        throw new Error("Failed to add product to user cart.");
    }
}

export const deleteProductBeforeInsertData = async (cart_id, product_id, quantity) => {
    console.log('delete called');

    try {
        await db.query(
            `DELETE FROM tbl_cart_products WHERE cart_id = ? AND product_id = ?`,
            [cart_id, product_id]
        );

    } catch (error) {
        console.error("Database Error in deleteProductFromUserCart:", error);
        throw new Error("Failed to delete product from user cart.");
    }
}

export const deleteProductFromUserCart = async (user_id, product_id) => {
    try {
        await db.query(
            `DELETE cp FROM tbl_cart_products cp
             INNER JOIN tbl_carts c ON cp.cart_id = c.cart_id
             WHERE c.user_id = ? AND cp.product_id = ? AND c.cart_status = 'CART'`,
            [user_id, product_id]
        );
    } catch (error) {
        console.error("Database Error in deleteProductFromUserCart:", error);
        throw new Error("Failed to delete product from user cart.");
    }
}

export const deleteCartByCartId = async (cart_id) => {
    try {
        await db.query(
            `
            DELETE cp, c FROM tbl_carts c
            LEFT JOIN tbl_cart_products cp ON cp.cart_id = c.cart_id
            WHERE c.cart_id = ? AND c.cart_status = 'CART'
            `,
            [cart_id]
        );
    } catch (error) {
        console.error("Database Error in deleteProductFromUserCart:", error);
        throw new Error("Failed to delete product from user cart.");
    }
}

export const getUserCarts = async (user_id) => {
    try {
        const result = await db.query(
            `SELECT ca.cart_id, cl.clinic_name, cl.address, cl.clinic_logo, ca.clinic_id, ca.user_id, cp.product_id, cp.quantity, p.name as product_name, p.price, p.short_description, p.stock
             FROM tbl_carts ca
             LEFT JOIN tbl_cart_products cp ON ca.cart_id = cp.cart_id
             LEFT JOIN tbl_products p ON cp.product_id = p.product_id
             LEFT JOIN tbl_clinics cl ON ca.clinic_id = cl.clinic_id
             WHERE ca.user_id = ? AND ca.cart_status = 'CART'
             ORDER BY ca.created_at DESC
             `,
            [user_id]
        );
        return result;
    } catch (error) {
        console.error("Database Error in getUserCarts:", error);
        throw new Error("Failed to get user carts.");
    }
}

export const getSingleCartByCartId = async (cart_id) => {
    try {
        const result = await db.query(
            `SELECT ca.cart_id, cl.clinic_name, cl.clinic_logo, ca.clinic_id, ca.user_id, cp.product_id, cp.quantity, p.name as product_name, p.price, p.short_description, p.stock
             FROM tbl_carts ca
             LEFT JOIN tbl_cart_products cp ON ca.cart_id = cp.cart_id
             LEFT JOIN tbl_products p ON cp.product_id = p.product_id
             LEFT JOIN tbl_clinics cl ON ca.clinic_id = cl.clinic_id
             WHERE ca.cart_id = ?
             ORDER BY ca.created_at DESC
             `,
            [cart_id]
        );
        return result;
    } catch (error) {
        console.error("Database Error in getUserCarts:", error);
        throw new Error("Failed to get user carts.");
    }
}

export const getSingleCartByClinicId = async (clinic_id, user_id) => {
    try {
        const result = await db.query(
            `SELECT ca.cart_id, cl.clinic_name, cl.clinic_logo, ca.clinic_id, ca.user_id, cp.product_id, cp.quantity, p.name as product_name, p.price, p.short_description, p.stock
             FROM tbl_carts ca
             LEFT JOIN tbl_cart_products cp ON ca.cart_id = cp.cart_id
             LEFT JOIN tbl_products p ON cp.product_id = p.product_id
             LEFT JOIN tbl_clinics cl ON ca.clinic_id = cl.clinic_id
             WHERE ca.clinic_id = ? AND ca.user_id = ?
             ORDER BY ca.created_at DESC
             `,
            [clinic_id, user_id]
        );
        return result;
    } catch (error) {
        console.error("Database Error in getUserCarts:", error);
        throw new Error("Failed to get user carts.");
    }
}


// export const getTreatmentsBySearchOnly = async ({ search = '', language = 'en', limit = 30, offset = 0 }) => {
//     try {
//         const searchField = language === 'sv' ? 'swedish' : 'name';
//         const query = `
//             SELECT *
//             FROM tbl_treatments
//             WHERE LOWER(${searchField}) LIKE ?
//             ORDER BY created_at DESC
//             LIMIT ? OFFSET ?
//         `;
//         const params = [`%${search.trim().toLowerCase()}%`, limit, offset];
//         const results = await db.query(query, params);

//         return formatBenefitsOnLang(results,language)
//     } catch (error) {
//         console.error("Database Error in getTreatmentsBySearchOnly:", error.message);
//         throw new Error("Failed to fetch treatments.");
//     }
// };
// export const getProductsByNameSearchOnly = async ({ search = '', offset = 0 }) => {
//     try {
//         let query = `
//             SELECT 
//                 p.*
//             FROM tbl_products AS p
//             WHERE 1=1
//         `;

//         const params = [];

//         if (search && search.trim() !== '') {
//             query += ` AND LOWER(p.name) LIKE ?`;
//             params.push(`${search.trim().toLowerCase()}%`);
//         }

//         query += ` GROUP BY p.product_id ORDER BY p.created_at DESC LIMIT 30 OFFSET ?`;
//         params.push(Number(offset) || 0);

//         console.log("Product search only query:", query);
//         return await db.query(query, params);
//     } catch (error) {
//         console.error("Database Error in getProductsByNameSearchOnly:", error.message);
//         throw new Error("Failed to fetch products by name.");
//     }
// };
// export const getClinicsByNameSearchOnly = async ({ search = '', offset = 0 }) => {
//     try {
//         const params = [];

//         const selectFields = [
//             'c.clinic_id',
//             'c.clinic_name',
//             'c.clinic_logo',
//             'c.address',
//             'c.mobile_number',
//             'MIN(CAST(d.fee_per_session AS DECIMAL(10,2))) AS doctor_lower_price_range',
//             'MAX(CAST(d.fee_per_session AS DECIMAL(10,2))) AS doctor_higher_price_range',
//             'ROUND(AVG(ar.rating), 2) AS avg_rating'
//         ].join(', ');

//         let query = `
//             SELECT ${selectFields}
//             FROM tbl_clinics c
//             LEFT JOIN tbl_clinic_locations cl ON c.clinic_id = cl.clinic_id
//             LEFT JOIN tbl_doctor_clinic_map dcm ON dcm.clinic_id = c.clinic_id
//             LEFT JOIN tbl_doctors d ON d.doctor_id = dcm.doctor_id
//             LEFT JOIN tbl_appointment_ratings ar ON c.clinic_id = ar.clinic_id
//             WHERE c.profile_completion_percentage >= 50
//         `;

//         if (search.trim()) {
//             query += ` AND LOWER(c.clinic_name) LIKE ?`;
//             params.push(`${search.trim().toLowerCase()}%`);
//         }

//         query += ` GROUP BY c.clinic_id`;
//         query += ` ORDER BY c.created_at DESC`; // default/fallback sort
//         query += ` LIMIT 30 OFFSET ?`;

//         params.push(Number(offset) || 0);

//         console.log("Clinic search query:", query);
//         return await db.query(query, params);
//     } catch (error) {
//         console.error("Database Error in getClinicsByNameSearchOnly:", error.message);
//         throw new Error("Failed to fetch clinics by name.");
//     }
// };
// export const getDoctorsByFirstNameSearchOnly = async ({ search = '', offset = 0 }) => {
//     try {
//         const params = [];

//         const selectFields = [
//             'd.doctor_id',
//             'd.name',
//             'TIMESTAMPDIFF(YEAR, MIN(de.start_date), MAX(IFNULL(de.end_date, CURDATE()))) AS experience_years',
//             'd.specialization',
//             'ANY_VALUE(d.fee_per_session) AS fee_per_session',
//             'd.profile_image',
//             'dm.clinic_id',
//             'c.clinic_name',
//             'c.address AS clinic_address',
//             'ROUND(AVG(ar.rating), 2) AS avg_rating'
//         ].join(', ');

//         let query = `
//             SELECT ${selectFields}
//             FROM tbl_doctors d
//             LEFT JOIN tbl_zqnq_users zu ON d.zynq_user_id = zu.id
//             LEFT JOIN tbl_doctor_clinic_map dm ON d.doctor_id = dm.doctor_id
//             LEFT JOIN tbl_clinics c ON dm.clinic_id = c.clinic_id
//             LEFT JOIN tbl_clinic_locations cl ON c.clinic_id = cl.clinic_id
//             LEFT JOIN tbl_appointment_ratings ar ON d.doctor_id = ar.doctor_id
//             LEFT JOIN tbl_doctor_experiences de ON d.doctor_id = de.doctor_id
//             WHERE d.profile_completion_percentage >= 0
//         `;

//         if (search && search.trim() !== '') {
//             query += ` AND LOWER(d.name) LIKE ?`;
//             params.push(`${search.trim().toLowerCase()}%`);
//         }

//         //query += ` GROUP BY d.doctor_id`;

//         query += ` GROUP BY d.doctor_id, dm.clinic_id`;

//         // No ORDER BY or SORTING
//         query += ` LIMIT 30 OFFSET ?`;
//         params.push(Number(offset) || 0);

//         console.log("Search Only Query:", query);
//         return await db.query(query, params);
//     } catch (error) {
//         console.error("Database Error in getDoctorsByFirstNameSearchOnly:", error.message);
//         throw new Error("Failed to fetch doctors.");
//     }
// };

// -------------------------------------Updated Code Okay ------------------------------------------------//
export const getDoctorsByFirstNameSearchOnly = async ({ search = '', offset = 0 }) => {
    try {
        const params = [];

        const selectFields = [
            'd.doctor_id',
            'd.name',
            'TIMESTAMPDIFF(YEAR, MIN(de.start_date), MAX(IFNULL(de.end_date, CURDATE()))) AS experience_years',
            'd.specialization',
            'ANY_VALUE(d.fee_per_session) AS fee_per_session',
            'd.profile_image',
            'dm.clinic_id',
            'c.clinic_name',
            'c.address AS clinic_address',
            'ROUND(AVG(ar.rating), 2) AS avg_rating'
        ].join(', ');

        let query = `
            SELECT ${selectFields}
            FROM tbl_doctors d
            LEFT JOIN tbl_zqnq_users zu ON d.zynq_user_id = zu.id
            LEFT JOIN tbl_doctor_clinic_map dm ON d.doctor_id = dm.doctor_id
            LEFT JOIN tbl_clinics c ON dm.clinic_id = c.clinic_id
            LEFT JOIN tbl_clinic_locations cl ON c.clinic_id = cl.clinic_id
            LEFT JOIN tbl_appointment_ratings ar ON d.doctor_id = ar.doctor_id
            LEFT JOIN tbl_doctor_experiences de ON d.doctor_id = de.doctor_id
            WHERE d.profile_completion_percentage >= 0
        `;

        if (search && search.trim() !== '') {
            query += `
                AND (
                    LOWER(d.name) LIKE ?
                    OR EXISTS (
                        SELECT 1 FROM tbl_doctor_treatments dt
                        JOIN tbl_treatments t ON dt.treatment_id = t.treatment_id
                        WHERE dt.doctor_id = d.doctor_id
                        AND (
                            LOWER(t.name) LIKE ? OR LOWER(t.swedish) LIKE ?
                        )
                    )
                )
            `;
            const s = `%${search.toLowerCase()}%`;
            params.push(s, s, s);
        }

        query += ` GROUP BY d.doctor_id, dm.clinic_id LIMIT 30 OFFSET ?`;
        params.push(Number(offset) || 0);

        return await db.query(query, params);
    } catch (error) {
        console.error("Database Error in getDoctorsByFirstNameSearchOnly:", error.message);
        throw new Error("Failed to fetch doctors.");
    }
};
export const getClinicsByNameSearchOnly = async ({ search = '', offset = 0 }) => {
    try {
        const params = [];

        const selectFields = [
            'c.clinic_id',
            'c.clinic_name',
            'c.clinic_logo',
            'c.address',
            'c.mobile_number',
            'MIN(CAST(d.fee_per_session AS DECIMAL(10,2))) AS doctor_lower_price_range',
            'MAX(CAST(d.fee_per_session AS DECIMAL(10,2))) AS doctor_higher_price_range',
            'ROUND(AVG(ar.rating), 2) AS avg_rating'
        ].join(', ');

        let query = `
            SELECT ${selectFields}
            FROM tbl_clinics c
            LEFT JOIN tbl_clinic_locations cl ON c.clinic_id = cl.clinic_id
            LEFT JOIN tbl_doctor_clinic_map dcm ON dcm.clinic_id = c.clinic_id
            LEFT JOIN tbl_doctors d ON d.doctor_id = dcm.doctor_id
            LEFT JOIN tbl_appointment_ratings ar ON c.clinic_id = ar.clinic_id
            WHERE c.profile_completion_percentage >= 50
        `;

        if (search.trim()) {
            query += `
                AND (
                    LOWER(c.clinic_name) LIKE ?
                    OR EXISTS (
                        SELECT 1 FROM tbl_clinic_treatments ct
                        JOIN tbl_treatments t ON ct.treatment_id = t.treatment_id
                        WHERE ct.clinic_id = c.clinic_id
                        AND (
                            LOWER(t.name) LIKE ? OR LOWER(t.swedish) LIKE ?
                        )
                    )
                )
            `;
            const s = `%${search.toLowerCase()}%`;
            params.push(s, s, s);
        }

        query += ` GROUP BY c.clinic_id ORDER BY c.created_at DESC LIMIT 30 OFFSET ?`;
        params.push(Number(offset) || 0);

        return await db.query(query, params);
    } catch (error) {
        console.error("Database Error in getClinicsByNameSearchOnly:", error.message);
        throw new Error("Failed to fetch clinics by name.");
    }
};
export const getProductsByNameSearchOnly = async ({ search = '', offset = 0 }) => {
    try {
        let query = `
            SELECT 
                p.*
            FROM tbl_products AS p
            WHERE 1=1
        `;

        const params = [];

        if (search && search.trim() !== '') {
            query += `
                AND (
                    LOWER(p.name) LIKE ?
                    OR EXISTS (
                        SELECT 1 FROM tbl_product_treatments pt
                        JOIN tbl_treatments t ON pt.treatment_id = t.treatment_id
                        WHERE pt.product_id = p.product_id
                        AND (
                            LOWER(t.name) LIKE ? OR LOWER(t.swedish) LIKE ?
                        )
                    )
                )
            `;
            const s = `%${search.toLowerCase()}%`;
            params.push(s, s, s);
        }

        query += ` GROUP BY p.product_id ORDER BY p.created_at DESC LIMIT 30 OFFSET ?`;
        params.push(Number(offset) || 0);

        return await db.query(query, params);
    } catch (error) {
        console.error("Database Error in getProductsByNameSearchOnly:", error.message);
        throw new Error("Failed to fetch products by name.");
    }
};
export const getTreatmentsBySearchOnly = async ({ search = '', language = 'en', limit = 30, offset = 0 }) => {
    try {
        const searchField = language === 'sv' ? 'swedish' : 'name';
        const query = `
            SELECT *
            FROM tbl_treatments
            WHERE LOWER(${searchField}) LIKE ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        const params = [`%${search.trim().toLowerCase()}%`, limit, offset];

        const results = await db.query(query, params);

        return formatBenefitsOnLang(results, language);
    } catch (error) {
        console.error("Database Error in getTreatmentsBySearchOnly:", error.message);
        throw new Error("Failed to fetch treatments.");
    }
};
const APP_URL = process.env.APP_URL;
export const getUserPurchasedProductModel = async (user_id) => {
    try {
        // 1️⃣ Fetch purchases + address in one go
        const purchaseRows = await db.query(
            `
            SELECT 
                pp.purchase_id,
                pp.cart_id,
                pp.product_details, 
                pp.total_price,
                pp.created_at AS purchase_date,
                pp.shipment_status,
                pp.shipped_date,
                pp.delivered_date,
                a.address
            FROM tbl_product_purchase pp
            LEFT JOIN tbl_address a ON pp.address_id = a.address_id
            WHERE pp.user_id = ?
            ORDER BY pp.created_at DESC
            `,
            [user_id]
        );

        if (!purchaseRows.length) return [];

        // 2️⃣ Gather all unique product IDs (flattened)
        const allProductIds = [
            ...new Set(
                purchaseRows.flatMap(row =>
                    Array.isArray(row.product_details)
                        ? row.product_details.map(p => p.product_id)
                        : []
                )
            ),
        ];

        // 3️⃣ Fetch product info & clinics in one query using JOIN
        let productInfoMap = {};
        let clinicMap = {};

        if (allProductIds.length) {
            const productRows = await db.query(
                `
                SELECT 
                    p.product_id, p.stock, p.clinic_id,
                    c.clinic_name, c.address AS clinic_address, c.clinic_logo
                FROM tbl_products p
                LEFT JOIN tbl_clinics c ON p.clinic_id = c.clinic_id
                WHERE p.product_id IN (?)
                `,
                [allProductIds]
            );

            for (const row of productRows) {
                productInfoMap[row.product_id] = {
                    product_id: row.product_id,
                    stock: row.stock,
                    clinic_id: row.clinic_id,
                };
                clinicMap[row.clinic_id] = {
                    clinic_id: row.clinic_id,
                    clinic_name: row.clinic_name,
                    address: row.clinic_address,
                    clinic_logo: row.clinic_logo,
                };
            }
        }

        // 4️⃣ Fetch all product images in one go
        let imagesMap = {};
        if (allProductIds.length) {
            const imageRows = await get_product_images_by_product_ids(allProductIds);
            for (const row of imageRows) {
                if (!imagesMap[row.product_id]) imagesMap[row.product_id] = [];
                imagesMap[row.product_id].push(
                    row.image.startsWith("http")
                        ? row.image
                        : `${APP_URL}clinic/product_image/${row.image}`
                );
            }
        }

        // 5️⃣ Build final purchases
        return purchaseRows.map(row => {
            const products = Array.isArray(row.product_details) ? row.product_details : [];

            const enrichedProducts = products.map(p => {
                const prodInfo = productInfoMap[p.product_id] || {};
                return {
                    ...p,
                    stock: prodInfo.stock ?? 0,
                    clinic_id: prodInfo.clinic_id ?? null,
                    product_images: imagesMap[p.product_id] || [],
                };
            });

            const clinic_id = enrichedProducts.length ? enrichedProducts[0].clinic_id : null;

            return {
                purchase_id: row.purchase_id,
                purchase_type: "PRODUCT",
                cart_id: row.cart_id,
                purchase_date: row.purchase_date,
                total_price: row.total_price,
                address: row.address,
                shipment_status: row.shipment_status,
                shipped_date: row.shipped_date || null,
                delivered_date: row.delivered_date || null,
                clinic: clinic_id ? clinicMap[clinic_id] || null : null,
                products: enrichedProducts,
            };
        });

    } catch (error) {
        console.error("Failed to fetch user purchased product data with clinic and images:", error);
        throw error;
    }
};


export const getUserCartProductModel = async (user_id) => {
    try {
        const query = `
      SELECT pp.* FROM tbl_product_purchase pp JOIN tbl_carts c ON pp.cart_id = c.cart_id WHERE pp.user_id = ? ORDER BY created_at DESC
    `;
        const results = await db.query(query, [user_id]);
        return results;
    } catch (error) {
        console.error("Failed to fetch purchase products data:", error);
        throw error;
    }
};

export const getSingleUserPurchasedProductModel = async (user_id, purchase_id) => {
    try {
        const query = `
      SELECT 
        pp.purchase_id,
        pp.cart_id,
        pp.product_details, 
        pp.total_price,
        pp.created_at AS purchase_date,
        pp.shipment_status,
        pp.shipped_date,
        pp.delivered_date,
        a.address
      FROM tbl_product_purchase pp
      LEFT JOIN tbl_address a ON pp.address_id = a.address_id
      WHERE pp.user_id = ? AND pp.purchase_id = ?
      ORDER BY pp.created_at DESC
    `;
        const purchaseRows = await db.query(query, [user_id, purchase_id]);

        // 1️⃣ Gather all product IDs
        let allProductIds = [];
        for (const row of purchaseRows) {
            const products = Array.isArray(row.product_details) ? row.product_details : [];
            allProductIds.push(...products.map(p => p.product_id));
        }
        allProductIds = [...new Set(allProductIds)];

        // 2️⃣ Fetch product info (stock, clinic_id)
        let productInfoMap = {};
        if (allProductIds.length) {
            const productRows = await db.query(
                `SELECT product_id, stock, clinic_id FROM tbl_products WHERE product_id IN (?)`,
                [allProductIds]
            );
            productInfoMap = productRows.reduce((map, p) => {
                map[p.product_id] = p;
                return map;
            }, {});
        }

        // 3️⃣ Gather clinic IDs and fetch clinic data
        const allClinicIds = [...new Set(Object.values(productInfoMap).map(p => p.clinic_id))];
        let clinicMap = {};
        if (allClinicIds.length) {
            const clinicRows = await db.query(
                `SELECT clinic_id, clinic_name, address, clinic_logo FROM tbl_clinics WHERE clinic_id IN (?)`,
                [allClinicIds]
            );
            clinicMap = clinicRows.reduce((map, c) => {
                map[c.clinic_id] = c;
                return map;
            }, {});
        }

        // 4️⃣ Fetch product images
        let imagesMap = {};
        if (allProductIds.length) {
            const imageRows = await get_product_images_by_product_ids(allProductIds);
            imagesMap = imageRows.reduce((map, row) => {
                if (!map[row.product_id]) map[row.product_id] = [];
                map[row.product_id].push(
                    row.image.startsWith("http")
                        ? row.image
                        : `${APP_URL}clinic/product_image/${row.image}`
                );
                return map;
            }, {});
        }

        // 5️⃣ Build enriched purchase list
        const purchases = {};
        for (const row of purchaseRows) {
            const products = Array.isArray(row.product_details) ? row.product_details : [];

            const enrichedProducts = products.map(p => {
                const prodInfo = productInfoMap[p.product_id] || {};
                return {
                    ...p,
                    stock: prodInfo.stock ?? 0,
                    clinic_id: prodInfo.clinic_id ?? null,
                    product_images: imagesMap[p.product_id] || [],
                };
            });

            const clinic_id = enrichedProducts.length ? enrichedProducts[0].clinic_id : null;
            const clinic = clinicMap[clinic_id] || null;

            purchases[row.purchase_id] = {
                purchase_id: row.purchase_id,
                purchase_type: "PRODUCT",
                cart_id: row.cart_id,
                purchase_date: row.purchase_date,
                total_price: row.total_price,
                address: row.address,
                shipment_status: row.shipment_status,
                shipped_date: row.shipped_date || null,
                delivered_date: row.delivered_date || null,
                clinic,
                products: enrichedProducts,
            };
        }

        return Object.values(purchases);

    } catch (error) {
        console.error("Failed to fetch user purchased product data with clinic and images:", error);
        throw error;
    }
};

export const getSingleUserCartProductModel = async (user_id, purchase_id) => {
    try {
        const query = `
      SELECT pp.* 
      FROM tbl_product_purchase pp 
      JOIN tbl_carts c ON pp.cart_id = c.cart_id 
      WHERE pp.user_id = ?  AND pp.purchase_id = ?
      ORDER BY created_at DESC
    `;
        const results = await db.query(query, [user_id, purchase_id]);
        return results;
    } catch (error) {
        console.error("Failed to fetch purchase products data:", error);
        throw error;
    }
};

export const getSinglePurchasedProductsModel = async (purchase_id) => {
    try {
        const query = `
      SELECT pp.* 
      FROM tbl_product_purchase pp 
      WHERE pp.purchase_id = ?
      ORDER BY created_at DESC
    `;
        return await db.query(query, [purchase_id]);
    } catch (error) {
        console.error("Failed to fetch purchase products data:", error);
        throw error;
    }
}

export const checkProductStock = async (product_id, quantity) => {
    try {
        const query = `SELECT stock FROM tbl_products WHERE product_id = ?`;
        const result = await db.query(query, [product_id]);
        const stock = result[0]?.stock || 0;
        return stock >= quantity;
    } catch (error) {
        console.error("Failed to fetch product stock:", error);
        throw error;
    }
};