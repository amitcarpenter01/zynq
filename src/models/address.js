import db from "../config/db.js";

export const addAddressByUserId = async (user_id, data) => {
    try {
        const result = await db.query(
            'INSERT INTO `tbl_address`(`user_id`, `address`, `city`, `state`, `name`, `zip_code`, `phone_number`, `email`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [user_id, data.address, data.city, data.state, data.name, data.zip_code, data.phone_number, data.email]
        );
        return result;
    } catch (error) {
        console.error("Failed to add address:", error);
        throw error;
    }
};

export const updateAddressByAddressId = async (address_id, data) => {
    try {
        const result = await db.query(
            'UPDATE `tbl_address` SET `address` = ?, `city` = ?, `state` = ?, `name` = ?, `zip_code` = ?, `phone_number` = ?, `email` = ? WHERE `address_id` = ?',
            [data.address, data.city, data.state, data.name, data.zip_code, data.phone_number, data.email, address_id]
        );
        return result;
    } catch (error) {
        console.error("Failed to update address:", error);
        throw error;
    }
};

export const getSingleAddressByAddressId = async (address_id) => {
    try {
        const result = await db.query('SELECT * FROM `tbl_address` WHERE address_id = ?', [address_id]);
        return result;
    } catch (error) {
        console.error("Failed to get address:", error);
        throw error;
    }
}

export const getAddressesByUserId = async (user_id) => {
    try {
        const result = await db.query(
            'SELECT * FROM `tbl_address` WHERE user_id = ? ORDER BY updated_at DESC',
            [user_id]
        );
        return result;
    } catch (error) {
        console.error("Failed to get address:", error);
        throw error;
    }
};

export const deleteAddressByAddressId = async (address_id, user_id) => {
    try {
        const result = await db.query('DELETE FROM `tbl_address` WHERE address_id = ? AND user_id = ?', [address_id, user_id]);
        return result;
    } catch (error) {
        console.error("Failed to delete address:", error);
        throw error;
    }
}