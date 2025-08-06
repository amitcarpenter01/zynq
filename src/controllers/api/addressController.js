import { deleteAddressByAddressId, getSingleAddressByAddressId, getAddressesByUserId, addAddressByUserId, updateAddressByAddressId } from "../../models/address.js";
import { asyncHandler, handleError, handleSuccess, } from "../../utils/responseHandler.js";
import { formatImagePath, isEmpty } from "../../utils/user_helper.js";

export const addEditAddress = asyncHandler(async (req, res) => {
    const { user_id, language = "en" } = req.user;
    const data = req.body;
    if (data.address_id) {
        const address_id = data.address_id;
        delete data.address_id;
        await updateAddressByAddressId(address_id, data);
    } else {
        await addAddressByUserId(user_id, data);
    }
    return handleSuccess(res, 200, language, "ADDRESS_UPDATED_SUCCESSFULLY");
});

export const getSingleAddress = asyncHandler(async (req, res) => {
    const { language = "en" } = req.user;
    const { address_id } = req.params;
    const addressData = await getSingleAddressByAddressId(address_id);
    if (isEmpty(addressData)) return handleError(res, 404, language, "ADDRESS_NOT_FOUND");
    return handleSuccess(res, 200, language, "ADDRESS_FETCHED_SUCCESSFULLY", addressData[0]);
});

export const getAddresses = asyncHandler(async (req, res) => {
    const { user_id, language = "en" } = req.user;
    const addressData = await getAddressesByUserId(user_id);
    return handleSuccess(res, 200, language, "ADDRESS_FETCHED_SUCCESSFULLY", addressData);
});

export const deleteAddress = asyncHandler(async (req, res) => {
    const { address_id } = req.params;
    const { user_id, language = "en" } = req.user;
    await deleteAddressByAddressId(address_id, user_id);
    return handleSuccess(res, 200, language, "ADDRESS_DELETED_SUCCESSFULLY");
});