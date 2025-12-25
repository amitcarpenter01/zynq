import Joi from "joi";
import ejs from "ejs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import * as clinicModels from "../../models/clinic.js";
import * as webModels from "../../models/web_user.js";
import { sendEmail } from "../../services/send_email.js";
import {
  generateAccessToken,
  generateVerificationLink,
  isEmpty,
} from "../../utils/user_helper.js";
import {
  asyncHandler,
  handleError,
  handleSuccess,
  joiErrorHandle,
} from "../../utils/responseHandler.js";
import axios from "axios";
import { generateClinicsEmbeddingsV2 } from "../api/embeddingsController.js";
import { applyLanguageOverwrite } from "../../utils/misc.util.js";

dotenv.config();

const APP_URL = process.env.APP_URL;
const image_logo = process.env.LOGO_URL;
const WEB_JWT_SECRET = process.env.WEB_JWT_SECRET;

const daySchema = Joi.object({
  open: Joi.string().allow("").optional().allow("", null),
  close: Joi.string().allow("").optional().allow("", null),
  is_closed: Joi.boolean().optional().allow("", null),
});

export const getProfile = async (req, res) => {
  try {
    const language = req.user.language;
    const [clinic] = await clinicModels.get_clinic_by_zynq_user_id(req.user.id);
    if (!clinic) {
      return handleError(res, 404, "en", "CLINIC_NOT_FOUND");
    }
    const [clinicLocation] = await clinicModels.getClinicLocation(
      clinic.clinic_id
    );
    clinic.location = clinicLocation;

    const treatments = await clinicModels.getClinicMappedTreatments(clinic.clinic_id);
    clinic.treatments = treatments;

    const operationHours = await clinicModels.getClinicOperationHours(
      clinic.clinic_id
    );
    clinic.operation_hours = operationHours;

    const equipments = await clinicModels.getClinicEquipments(clinic.clinic_id);
    clinic.equipments = equipments;

    const skinTypes = await clinicModels.getClinicSkinTypes(clinic.clinic_id);
    clinic.skin_types = skinTypes;

    const severityLevels = await clinicModels.getClinicSeverityLevels(
      clinic.clinic_id
    );
    clinic.severity_levels = severityLevels;

    const surgeries = await clinicModels.getClinicSurgeriesLevels(
      clinic.clinic_id
    );
    clinic.surgeries_level = surgeries;

    const aestheticDevices = await clinicModels.getClinicAestheticDevicesLevel(
      clinic.clinic_id
    );
    clinic.aestheticDevices = aestheticDevices;

    const skin_Conditions = await clinicModels.getClinicSkinConditionsLevel(
      clinic.clinic_id
    );
    clinic.skin_Conditions = skin_Conditions;

    const documents = await clinicModels.getClinicDocumentsLevel(
      clinic.clinic_id
    );
    documents.forEach((document) => {
      if (document.file_url && !document.file_url.startsWith("http")) {
        document.file_url = `${APP_URL}${document.file_url}`;
      }
    });
    clinic.documents = documents;

    if (clinic.clinic_logo && !clinic.clinic_logo.startsWith("http")) {
      clinic.clinic_logo = `${APP_URL}clinic/logo/${clinic.clinic_logo}`;
    }

    const images = await clinicModels.getClinicImages(clinic.clinic_id);
    clinic.images = images
      .filter((img) => img?.image_url)
      .map((img) => ({
        clinic_image_id: img.clinic_image_id,
        url: img.image_url.startsWith("http")
          ? img.image_url
          : `${APP_URL}clinic/files/${img.image_url}`,
      }));

    // clinic.profile_completion_percentage = await clinicModels.calculateAndUpdateClinicProfileCompletion(clinic);

    return handleSuccess(res, 200, language, "CLINIC_PROFILE_FETCHED", clinic);
  } catch (error) {
    console.error("Error in getProfile:", error);
    return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
  }
};

const calculateProfileCompletion = (data) => {
  const fields = [
    "zynq_user_id",
    "clinic_name",
    "email",
    "mobile_number",
    "clinic_description",
    "city",
  ];
  const percentPerField = 100 / fields.length;
  return fields.reduce(
    (total, field) => total + (data[field] ? percentPerField : 0),
    0
  );
};

export const buildClinicData = ({
  zynq_user_id,
  clinic_name,
  org_number,
  email,
  mobile_number,
  address,
  fee_range,
  website_url,
  clinic_description,
  clinic_logo,
  form_stage,
  ivo_registration_number,
  hsa_id,
  is_onboarded,
  profile_status,
  city
}) => {
  const data = {
    zynq_user_id,
    clinic_name,
    org_number,
    email,
    mobile_number,
    address,
    is_invited: 0,
    is_active: 1,
    onboarding_token: null,
    email_sent_count: 0,
    fee_range,
    website_url,
    clinic_description,
    clinic_logo,
    form_stage,
    ivo_registration_number,
    hsa_id,
    is_onboarded,
    city
  };

  if (!isEmpty(profile_status)) {
    data.profile_status = profile_status;
  }

  data.profile_completion_percentage = Math.round(
    calculateProfileCompletion(data)
  );

  return data;
};

export const onboardClinic = async (req, res) => {
  try {
    const clinicSchema = Joi.object({
      zynq_user_id: Joi.string().required(),
      slot_time: Joi.string().optional().allow("", null),
      clinic_name: Joi.string().optional().allow("", null),
      clinic_description: Joi.string().optional().allow("", null),
      org_number: Joi.string().optional().allow("", null),
      language: Joi.string().valid("en", "sv").optional().allow("", null),
      mobile_number: Joi.string().optional().allow("", null),
      address: Joi.string().optional().allow("", null),
      street_address: Joi.string().optional().allow("", null),
      city: Joi.string().optional().allow("", null),
      state: Joi.string().optional().allow("", null),
      zip_code: Joi.string().optional().allow("", null),
      latitude: Joi.number().optional().allow("", null),
      longitude: Joi.number().optional().allow("", null),
      website_url: Joi.string().optional().allow("", null),
      fee_range: Joi.string().optional().allow("", null),
      clinic_timing: Joi.object({
        monday: daySchema.optional().allow("", null),
        tuesday: daySchema.optional().allow("", null),
        wednesday: daySchema.optional().allow("", null),
        thursday: daySchema.optional().allow("", null),
        friday: daySchema.optional().allow("", null),
        saturday: daySchema.optional().allow("", null),
        sunday: daySchema.optional().allow("", null),
      }).optional(),
      // equipments: Joi.array().items(Joi.string()).optional().allow('', null),
      skin_types: Joi.array().items(Joi.string()).optional().allow("", null),
      severity_levels: Joi.array()
        .items(Joi.string())
        .optional()
        .allow("", null),
      form_stage: Joi.number().optional().allow("", null),
      ivo_registration_number: Joi.string().optional().allow("", null),
      hsa_id: Joi.string().optional().allow("", null),
      is_onboarded: Joi.boolean().optional().allow("", null),
      surgeries: Joi.array().items(Joi.string()).optional().allow("", null),
      aestheticDevices: Joi.array()
        .items(Joi.string())
        .optional()
        .allow("", null),
      skin_Conditions: Joi.array()
        .items(Joi.string())
        .optional()
        .allow("", null),
      treatments: Joi.array()
        .items(
          Joi.object({
            treatment_id: Joi.string().uuid().required(),
            total_price: Joi.number().precision(2).required(),

            sub_treatments: Joi.array()
              .items(
                Joi.object({
                  sub_treatment_id: Joi.string().uuid().required(),
                  price: Joi.number().precision(2).required(),
                })
              )
              .optional()
              .allow(null)
          })
        )
        .optional()
        .allow(null),
    });

    if (typeof req.body.clinic_timing === "string") {
      try {
        req.body.clinic_timing = JSON.parse(req.body.clinic_timing);
      } catch (err) {
        return handleError(res, 400, "en", "INVALID_JSON_FOR_CLINIC_TIMING");
      }
    }

    if (typeof req.body.treatments === "string") {
      try {
        req.body.treatments = JSON.parse(req.body.treatments);
      } catch (err) {
        return handleError(res, 400, "en", "INVALID_JSON_FOR_TREATMENTS");
      }
    }

    if (typeof req.body.surgeries === "string") {
      try {
        req.body.surgeries = JSON.parse(req.body.surgeries);
      } catch (err) {
        return handleError(res, 400, "en", "INVALID_JSON_FOR_SURGERIES");
      }
    }

    if (typeof req.body.skin_Conditions === "string") {
      try {
        req.body.skin_Conditions = JSON.parse(req.body.skin_Conditions);
      } catch (err) {
        return handleError(res, 400, "en", "INVALID_JSON_FOR_SKIN_CONDITIONS");
      }
    }

    if (typeof req.body.aestheticDevices === "string") {
      try {
        req.body.aestheticDevices = JSON.parse(req.body.aestheticDevices);
      } catch (err) {
        return handleError(res, 400, "en", "INVALID_JSON_FOR_ASTHETIC_DEVICES");
      }
    }

    if (typeof req.body.equipments === "string") {
      try {
        req.body.equipments = JSON.parse(req.body.equipments);
      } catch (err) {
        return handleError(res, 400, "en", "INVALID_JSON_FOR_EQUIPMENTS");
      }
    }

    if (typeof req.body.skin_types === "string") {
      try {
        req.body.skin_types = JSON.parse(req.body.skin_types);
      } catch (err) {
        return handleError(res, 400, "en", "INVALID_JSON_FOR_SKIN_TYPES");
      }
    }

    if (typeof req.body.severity_levels === "string") {
      try {
        req.body.severity_levels = JSON.parse(req.body.severity_levels);
      } catch (err) {
        return handleError(res, 400, "en", "INVALID_JSON_FOR_SEVERITY_LEVELS");
      }
    }

    const { error, value } = clinicSchema.validate(req.body);
    if (error) return joiErrorHandle(res, error);

    let {
      zynq_user_id,
      clinic_name,
      org_number,
      email,
      mobile_number,
      address,
      street_address,
      city,
      state,
      zip_code,
      latitude,
      longitude,
      treatments,
      clinic_timing,
      website_url,
      clinic_description,
      equipments,
      skin_types,
      severity_levels,
      fee_range,
      language,
      form_stage,
      ivo_registration_number,
      hsa_id,
      is_onboarded,
      surgeries,
      aestheticDevices,
      skin_Conditions,
      slot_time
    } = value;

    language = language || "en";

    const uploadedFiles = req.files;
    const clinic_logo = uploadedFiles.find(
      (file) => file.fieldname === "logo"
    )?.filename;

    const [clinic_data] = await clinicModels.get_clinic_by_zynq_user_id(
      zynq_user_id
    );

    const clinicData = {
      zynq_user_id:
        zynq_user_id === "" ? null : zynq_user_id || clinic_data.zynq_user_id,
      clinic_name:
        clinic_name === "" ? null : clinic_name || clinic_data.clinic_name,
      org_number:
        org_number === "" ? null : org_number || clinic_data.org_number,
      email: email === "" ? null : email || clinic_data?.email || null,
      // email: email === "" ? null : email || clinic_data.email,
      mobile_number:
        mobile_number === ""
          ? null
          : mobile_number || clinic_data.mobile_number,
      address: address === "" ? null : address || clinic_data.address,
      fee_range: fee_range === "" ? null : fee_range || clinic_data.fee_range,
      website_url:
        website_url === "" ? null : website_url || clinic_data.website_url,
      clinic_description:
        clinic_description === ""
          ? null
          : clinic_description || clinic_data.clinic_description,
      language: language === "" ? null : language || clinic_data.language,
      clinic_logo:
        clinic_logo === "" ? null : clinic_logo || clinic_data.clinic_logo,
      form_stage:
        form_stage === "" ? null : form_stage || clinic_data.form_stage,
      ivo_registration_number:
        ivo_registration_number === ""
          ? null
          : ivo_registration_number || clinic_data.ivo_registration_number,
      hsa_id: hsa_id === "" ? null : hsa_id || clinic_data.hsa_id,
      is_onboarded:
        is_onboarded === "" ? null : is_onboarded || clinic_data.is_onboarded,
      city: city === "" ? null : city || clinic_data.city,
      state: state === "" ? null : state || clinic_data.state,
    };

    let profile_status = "ONBOARDING";

    if (!isEmpty(form_stage)) {
      clinicData.profile_status = profile_status;
    }

    const clinicDataV2 = buildClinicData(clinicData);

    // REMOVE city/state before update or insert
    delete clinicDataV2.city;
    delete clinicDataV2.state;

    clinicDataV2.slot_time = slot_time || null;

    if (clinic_data) {
      await clinicModels.updateClinicData(clinicDataV2, clinic_data.clinic_id);
    } else {
      await clinicModels.insertClinicData(clinicDataV2);
    }

    const [clinic] = await clinicModels.get_clinic_by_zynq_user_id(
      zynq_user_id
    );
    const clinic_id = clinic.clinic_id;
    const clinicImageFiles = [];

    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        const fileName = file.filename;

        if (file.fieldname === "files") {
          clinicImageFiles.push(fileName);
          continue;
        }

        const [certificationType] =
          await clinicModels.getCertificateTypeByFileName(file.fieldname);
        const certification_type_id =
          certificationType?.certification_type_id || null;

        if (certification_type_id) {
          await clinicModels.insertClinicDocuments(
            clinic_id,
            certification_type_id,
            file.fieldname,
            fileName
          );
        }
      }

      if (clinicImageFiles.length > 0) {
        await clinicModels.insertClinicImages(clinic_id, clinicImageFiles);
      }
    }

    const [clinicLocation] = await clinicModels.getClinicLocation(clinic_id);
    if (clinicLocation) {
      const update_data = {
        clinic_id: clinic_id,
        street_address:
          street_address === ""
            ? null
            : street_address || clinicLocation.street_address,
        city: city === "" ? null : city || clinicLocation.city,
        state: state === "" ? null : state || clinicLocation.state,
        zip_code: zip_code === "" ? null : zip_code || clinicLocation.zip_code,
        latitude: latitude || clinicLocation.latitude,
        longitude: longitude || clinicLocation.longitude,
      };

      await clinicModels.updateClinicLocation(update_data, clinic_id);
    } else {
      const insert_data = {
        clinic_id: clinic_id,
        street_address: street_address,
        city: city,
        state: state,
        zip_code: zip_code,
        latitude: latitude,
        longitude: longitude,
      };
      await clinicModels.insertClinicLocation(insert_data);
    }

    if (Array.isArray(treatments) && treatments.length > 0) {
      const treatmentsData = await clinicModels.updateClinicMappedTreatments(clinic_id, treatments);
    }

    if (surgeries) {
      const surgeriesData = await clinicModels.getClinicSurgeries(clinic_id);
      if (surgeriesData && surgeriesData.length > 0) {
        await clinicModels.updateClinicSurgeries(surgeries, clinic_id);
      } else {
        await clinicModels.insertClinicSurgeries(surgeries, clinic_id);
      }
    }

    if (skin_Conditions) {
      const skinConditionData = await clinicModels.getClinicSkinConditions(
        clinic_id
      );
      if (skinConditionData && skinConditionData.length > 0) {
        await clinicModels.updateClinicSkinConditions(
          skin_Conditions,
          clinic_id
        );
      } else {
        await clinicModels.insertClinicSkinConditions(
          skin_Conditions,
          clinic_id
        );
      }
    }

    if (aestheticDevices) {
      const devicesData = await clinicModels.getClinicAestheticDevices(
        clinic_id
      );
      if (devicesData && devicesData.length > 0) {
        await clinicModels.updateClinicAestheticDevices(
          aestheticDevices,
          clinic_id
        );
      } else {
        await clinicModels.insertClinicAestheticDevices(
          aestheticDevices,
          clinic_id
        );
      }
    }

    if (clinic_timing) {
      const clinicTimingData = await clinicModels.getClinicOperationHours(
        clinic_id
      );
      if (clinicTimingData) {
        if (!clinic_timing) {
          return;
        }
        await clinicModels.updateClinicOperationHours(clinic_timing, clinic_id);
      } else {
        if (!clinic_timing) {
          return;
        }
        await clinicModels.insertClinicOperationHours(clinic_timing, clinic_id);
      }
    }

    if (equipments) {
      const equipmentsData = await clinicModels.getClinicEquipments(clinic_id);
      if (equipmentsData) {
        await clinicModels.updateClinicEquipments(equipments, clinic_id);
      } else {
        await clinicModels.insertClinicEquipments(equipments, clinic_id);
      }
    }

    if (skin_types) {
      const skinTypesData = await clinicModels.getClinicSkinTypes(clinic_id);
      if (skinTypesData) {
        await clinicModels.updateClinicSkinTypes(skin_types, clinic_id);
      } else {
        await clinicModels.insertClinicSkinTypes(skin_types, clinic_id);
      }
    }

    if (severity_levels) {
      const severityLevelsData = await clinicModels.getClinicSeverityLevels(
        clinic_id
      );
      if (severityLevelsData) {
        await clinicModels.updateClinicSeverityLevels(
          severity_levels,
          clinic_id
        );
      } else {
        await clinicModels.insertClinicSeverityLevels(
          severity_levels,
          clinic_id
        );
      }
    }

    return handleSuccess(res, 201, language, "CLINIC_ONBOARDED_SUCCESSFULLY");
  } catch (error) {
    console.error("Error in onboardClinic:", error);
    return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
  }
};

export const updateClinic = async (req, res) => {
  try {
    const schema = Joi.object({
      clinic_name: Joi.string().optional(),
      org_number: Joi.string().optional(),
      email: Joi.string().email().optional(),
      mobile_number: Joi.string().optional(),
      address: Joi.string().optional(),
      fee_range: Joi.string().optional(),
      website_url: Joi.string().uri().allow("").optional(),
      clinic_description: Joi.string().allow("").optional(),
      street_address: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zip_code: Joi.string().optional(),
      latitude: Joi.number().optional(),
      longitude: Joi.number().optional(),
      treatments: Joi.array().items(Joi.string()).optional(),
      clinic_timing: Joi.object({
        monday: daySchema.required(),
        tuesday: daySchema.required(),
        wednesday: daySchema.required(),
        thursday: daySchema.required(),
        friday: daySchema.required(),
        saturday: daySchema.required(),
        sunday: daySchema.required(),
      }).optional(),
      equipments: Joi.array().items(Joi.string()).optional(),
      skin_types: Joi.array().items(Joi.string()).optional(),
      skin_Conditions: Joi.array().items(Joi.string()).optional(),
      surgeries: Joi.array().items(Joi.string()).optional(),
      aestheticDevices: Joi.array().items(Joi.string()).optional(),
      severity_levels: Joi.array().items(Joi.string()).optional(),
      language: Joi.string().valid("en", "sv").optional(),
      ivo_registration_number: Joi.string().optional(),
      hsa_id: Joi.string().optional(),
    });

    if (typeof req.body.clinic_timing === "string") {
      try {
        req.body.clinic_timing = JSON.parse(req.body.clinic_timing);
      } catch (err) {
        return handleError(res, 400, "en", "INVALID_JSON_FOR_CLINIC_TIMING");
      }
    }

    const { error, value } = schema.validate(req.body);
    if (error) return joiErrorHandle(res, error);

    const {
      clinic_name,
      org_number,
      email,
      mobile_number,
      address,
      fee_range,
      website_url,
      clinic_description,
      street_address,
      city,
      state,
      zip_code,
      latitude,
      longitude,
      treatments,
      clinic_timing,
      equipments,
      skin_types,
      severity_levels,
      language,
      ivo_registration_number,
      hsa_id,
      skin_Conditions,
      surgeries,
      aestheticDevices,
    } = value;

    const uploadedFiles = req.files;
    const logoFile = uploadedFiles.find((file) => file.fieldname === "logo");
    const clinic_logo = logoFile?.filename;

    const zynq_user_id = req.user.id;

    const [clinic] = await clinicModels.get_clinic_by_zynq_user_id(
      zynq_user_id
    );
    if (!clinic) {
      return handleError(res, 404, language, "CLINIC_NOT_FOUND");
    }

    const clinic_id = clinic.clinic_id;

    const clinicData = buildClinicData({
      zynq_user_id,
      clinic_name,
      org_number,
      email,
      mobile_number,
      address,
      fee_range,
      website_url,
      clinic_description,
      language,
      clinic_logo,
      ivo_registration_number,
      hsa_id,
      is_onboarded: true,
    });

    await clinicModels.updateClinicData(clinicData, clinic_id);

    await clinicModels.updateClinicLocation({
      clinic_id,
      street_address,
      city,
      state,
      zip_code,
      latitude,
      longitude,
    });

    await Promise.all([
      clinicModels.updateClinicTreatments(treatments, clinic_id),
      clinicModels.updateClinicOperationHours(clinic_timing, clinic_id),
      clinicModels.updateClinicEquipments(equipments, clinic_id),
      clinicModels.updateClinicSkinTypes(skin_types, clinic_id),
      clinicModels.updateClinicSeverityLevels(severity_levels, clinic_id),
      clinicModels.updateClinicSkinConditionsLevel(skin_Conditions, clinic_id),
      clinicModels.updateClinicSurgeriesLevel(surgeries, clinic_id),
      clinicModels.updateClinicAestheticDevicesLevel(
        aestheticDevices,
        clinic_id
      ),
    ]);

    if (uploadedFiles.length > 0) {
      uploadedFiles.forEach(async (file) => {
        const [certificationType] =
          await clinicModels.getCertificateTypeByFileName(file.fieldname);
        let certification_type_id = certificationType
          ? certificationType.certification_type_id
          : null;
        if (certification_type_id) {
          const fileName = file.filename;
          await clinicModels.updateClinicDocuments(
            clinic_id,
            certification_type_id,
            file.fieldname,
            fileName
          );
        }
      });
    }
    await generateClinicsEmbeddingsV2(zynq_user_id);
    return handleSuccess(
      res,
      200,
      language,
      "CLINIC_PROFILE_UPDATED_SUCCESSFULLY"
    );
  } catch (error) {
    console.error("Error in updateClinic:", error);
    return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
  }
};

export const getAllTreatments = async (req, res) => {
  try {
    let { language = "en" } = req.query;
    const treatments = await clinicModels.getAllTreatments();
    if (!treatments.length) {
      return handleError(res, 404, language, "NO_TREATMENTS_FOUND");
    }
    return handleSuccess(
      res,
      200,
      language,
      "TREATMENTS_FETCHED_SUCCESSFULLY",
      applyLanguageOverwrite(treatments, language)
    );
  } catch (error) {
    console.error("Error in getAllTreatments:", error);
    return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
  }
};

export const getClinicEquipments = async (req, res) => {
  try {
    const language = "en";
    const equipments = await clinicModels.getAllClinicEquipments();
    if (!equipments.length) {
      return handleError(res, 404, language, "NO_EQUIPMENTS_FOUND");
    }
    return handleSuccess(
      res,
      200,
      language,
      "EQUIPMENTS_FETCHED_SUCCESSFULLY",
      equipments
    );
  } catch (error) {
    console.error("Error in getClinicEquipments:", error);
    return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
  }
};

export const getAllRoles = async (req, res) => {
  try {
    const language = "en";
    const roles = await clinicModels.getAllRoles();
    if (!roles.length) {
      return handleError(res, 404, language, "NO_ROLES_FOUND");
    }
    return handleSuccess(
      res,
      200,
      language,
      "ROLES_FETCHED_SUCCESSFULLY",
      roles
    );
  } catch (error) {
    console.error("Error in getAllRoles:", error);
    return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
  }
};

export const getClinicSkinTypes = async (req, res) => {
  try {
    const language = req.user.language || "en";
    const skinTypes = await clinicModels.getAllSkinTypes(language);
    if (!skinTypes.length) {
      return handleError(res, 404, language, "NO_SKIN_TYPES_FOUND");
    }
    return handleSuccess(
      res,
      200,
      language,
      "SKIN_TYPES_FETCHED_SUCCESSFULLY",
      skinTypes
    );
  } catch (error) {
    console.error("Error in getClinicSkinTypes:", error);
    return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
  }
};

export const getClinicSeverityLevels = async (req, res) => {
  try {
    const language = "en";
    const severityLevels = await clinicModels.getAllSeverityLevels();
    if (!severityLevels.length) {
      return handleError(res, 404, language, "NO_SEVERITY_LEVELS_FOUND");
    }
    return handleSuccess(
      res,
      200,
      language,
      "SEVERITY_LEVELS_FETCHED_SUCCESSFULLY",
      severityLevels
    );
  } catch (error) {
    console.error("Error in getClinicSeverityLevels:", error);
    return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
  }
};

export const getCertificateType = async (req, res) => {
  try {
    const language = "en";
    const documents = await clinicModels.getCertificateType();
    if (!documents.length) {
      return handleError(res, 404, language, "NO_CERTIFICATE_TYPE_FOUND");
    }
    return handleSuccess(
      res,
      200,
      language,
      "CERTIFICATE_TYPE_FETCHED_SUCCESSFULLY",
      documents
    );
  } catch (error) {
    console.error("Error in getCertificateType:", error);
    return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
  }
};

export const searchLocation = async (req, res) => {
  try {
    const schema = Joi.object({
      input: Joi.string().required(),
    });

    const { error, value } = schema.validate(req.query);
    if (error) return joiErrorHandle(res, error);

    const { input } = value;
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?key=${googleApiKey}&input=${input}`;

    const response = await axios.get(apiUrl);
    return handleSuccess(
      res,
      200,
      "en",
      "LOCATION_SEARCH_SUCCESS",
      response.data.predictions
    );
  } catch (error) {
    console.error("Error in searchLocationRequest:", error);
    return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
  }
};

export const getLatLong = (req, res) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { address } = req.query;
      const googleApiKey = process.env.GOOGLE_API_KEY;
      const apiUrl = "https://maps.googleapis.com/maps/api/geocode/json";
      const response = await axios.get(apiUrl, {
        params: {
          address,
          key: googleApiKey,
        },
      });
      const { results } = response.data;
      if (results && results.length > 0) {
        const { lat, lng } = results[0].geometry.location;
        let data = {
          lat,
          lng,
        };
        return handleSuccess(
          res,
          200,
          "en",
          "LAT_LONG_FETCHED_SUCCESSFULLY",
          data
        );
      } else {
        return handleError(res, 404, "en", "NO_RESULT_FOUND");
      }
    } catch (error) {
      handleError(res, 500, "en", error.message);
      reject(error);
    }
  });
};

export const getAllSkinConditions = async (req, res) => {
  try {
    const language = "en";
    const skinCondition = await clinicModels.getAllSkinCondition();
    if (!skinCondition.length) {
      return handleError(res, 404, language, "NO_SKIN_CONDITION_FOUND");
    }
    return handleSuccess(
      res,
      200,
      language,
      "SKIN_CONDITION_FETCHED_SUCCESSFULLY",
      skinCondition
    );
  } catch (error) {
    console.error("Error in getAllTreatments:", error);
    return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
  }
};

export const getAllSurgery = async (req, res) => {
  try {
    const language = req?.user?.language || "en";
    const surgery = await clinicModels.getAllsurgery(language);
    if (!surgery.length) {
      return handleError(res, 400, language, "NO_SURGERY_FOUND");
    }
    return handleSuccess(
      res,
      200,
      language,
      "SURGERY_FETCHED_SUCCESSFULLY",
      surgery
    );
  } catch (error) {
    console.error("Error in getAllSurgery:", error);
    return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
  }
};

export const getAllDevices = async (req, res) => {
  try {
    const language = "en";
    const { treatment_ids } = req.query;
    const ids = treatment_ids ? treatment_ids.split(',') : [];
    const devices = await clinicModels.getAllDevices(ids);
    if (!devices.length) {
      return handleError(res, 400, language, "NO_DEVICES_FOUND");
    }
    return handleSuccess(
      res,
      200,
      language,
      "DEVICES_FETCHED_SUCCESSFULLY",
      devices
    );
  } catch (error) {
    return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
  }
};

export const deleteClinicImage = asyncHandler(async (req, res) => {
  const { clinic_image_id } = req.params;
  const result = await clinicModels.deleteClinicImageById(
    clinic_image_id,
    req?.user?.clinicData?.clinic_id
  );
  if (result?.affectedRows === 0)
    return handleSuccess(res, 200, "en", "IMAGE_NOT_FOUND");
  return handleSuccess(res, 200, "en", "IMAGE_DELETED_SUCCESSFULLY");
});

export const updateClinicAdmin = async (req, res) => {
  try {
    const schema = Joi.object({
      clinic_name: Joi.string().required(),
      org_number: Joi.string().required(),
      mobile_number: Joi.string().required(),
      address: Joi.string().required(),
      city: Joi.string().required(),
      zip_code: Joi.string().required(),
      latitude: Joi.number().optional(),
      longitude: Joi.number().optional(),
      zynq_user_id: Joi.string().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return joiErrorHandle(res, error);

    const {
      clinic_name,
      org_number,
      mobile_number,
      address,
      city,
      zip_code,
      latitude,
      longitude,
      zynq_user_id,
    } = value;

    const language = req?.user?.language || "en";

    // ✅ Fetch clinic by zynq_user_id
    const [clinic] = await clinicModels.get_clinic_by_zynq_user_id(
      zynq_user_id
    );
    if (!clinic) return handleError(res, 404, language, "CLINIC_NOT_FOUND");

    const clinic_id = clinic.clinic_id;

    // ✅ Build updated clinic data
    const clinicData = {
      clinic_name: clinic_name ? clinic_name : clinic.clinic_name,
      org_number: org_number ? org_number : clinic.org_number,
      mobile_number: mobile_number ? mobile_number : clinic.mobile_number,
      address: address ? address : clinic.address,
    };

    // ✅ Update clinic record
    await clinicModels.updateClinicData(clinicData, clinic_id);
    // Update clinic location
    await clinicModels.updateClinicLocation({ city, zip_code, latitude, longitude }, clinic_id);

    // ✅ Regenerate embeddings
    await generateClinicsEmbeddingsV2(zynq_user_id);

    return handleSuccess(
      res,
      200,
      language,
      "CLINIC_PROFILE_UPDATED_SUCCESSFULLY"
    );
  } catch (error) {
    console.error("Error in updateClinicAdmin:", error);
    return handleError(res, 500, "en", "INTERNAL_SERVER_ERROR");
  }
};

// export const updateClinicAdmin = async (req, res) => {
//     try {
//         const schema = Joi.object({
//             clinic_name: Joi.string().optional(),
//             org_number: Joi.string().optional(),
//             mobile_number: Joi.string().optional(),
//             address: Joi.string().optional(),
//             fee_range: Joi.string().optional(),
//             website_url: Joi.string().uri().allow('').optional(),
//             clinic_description: Joi.string().allow('').optional(),
//             street_address: Joi.string().optional(),
//             city: Joi.string().optional(),
//             state: Joi.string().optional(),
//             zip_code: Joi.string().optional(),
//             latitude: Joi.number().optional(),
//             longitude: Joi.number().optional(),
//             treatments: Joi.array().items(Joi.string()).optional(),
//             clinic_timing: Joi.object({
//                 monday: daySchema.required(),
//                 tuesday: daySchema.required(),
//                 wednesday: daySchema.required(),
//                 thursday: daySchema.required(),
//                 friday: daySchema.required(),
//                 saturday: daySchema.required(),
//                 sunday: daySchema.required(),
//             }).optional(),
//             equipments: Joi.array().items(Joi.string()).optional(),
//             skin_types: Joi.array().items(Joi.string()).optional(),
//             skin_Conditions: Joi.array().items(Joi.string()).optional(),
//             surgeries: Joi.array().items(Joi.string()).optional(),
//             aestheticDevices: Joi.array().items(Joi.string()).optional(),
//             severity_levels: Joi.array().items(Joi.string()).optional(),
//             language: Joi.string().valid('en', 'sv').optional(),
//             ivo_registration_number: Joi.string().optional(),
//             hsa_id: Joi.string().optional(),
//             zynq_user_id: Joi.string().required()
//         });

//         if (typeof req.body.clinic_timing === 'string') {
//             try {
//                 req.body.clinic_timing = JSON.parse(req.body.clinic_timing);
//             } catch (err) {
//                 return handleError(res, 400, "en", "INVALID_JSON_FOR_CLINIC_TIMING");
//             }
//         }

//         const { error, value } = schema.validate(req.body);
//         if (error) return joiErrorHandle(res, error);

//         const {
//             clinic_name, org_number,  mobile_number,
//             address, fee_range, website_url, clinic_description,
//             street_address, city, state, zip_code, latitude, longitude,
//              language,
//             ivo_registration_number, hsa_id,
//             zynq_user_id
//         } = value;

//         const uploadedFiles = req.files;
//         const logoFile = uploadedFiles.find(file => file.fieldname === 'logo');
//         const clinic_logo = logoFile?.filename;

//         const [clinic] = await clinicModels.get_clinic_by_zynq_user_id(zynq_user_id);
//         if (!clinic) {
//             return handleError(res, 404, language, "CLINIC_NOT_FOUND");
//         }

//         const clinic_id = clinic.clinic_id;

//         const clinicData = buildClinicData({
//             zynq_user_id, clinic_name, org_number,  mobile_number,
//             address, fee_range, website_url, clinic_description, language,
//             clinic_logo : clinic_logo ? clinic_logo : clinic.clinic_logo,
//             email : clinic.email,
//             ivo_registration_number,
//             hsa_id,
//             is_onboarded: true // ✅ Add this line
//         });

//         await clinicModels.updateClinicData(clinicData, clinic_id);

//         await clinicModels.updateClinicLocation({
//             clinic_id, street_address, city, state,
//             zip_code, latitude, longitude
//         });

//         // await Promise.all([
//         //     clinicModels.updateClinicTreatments(treatments, clinic_id),
//         //     clinicModels.updateClinicOperationHours(clinic_timing, clinic_id),
//         //     clinicModels.updateClinicEquipments(equipments, clinic_id),
//         //     clinicModels.updateClinicSkinTypes(skin_types, clinic_id),
//         //     clinicModels.updateClinicSeverityLevels(severity_levels, clinic_id),
//         //     clinicModels.updateClinicSkinConditionsLevel(skin_Conditions, clinic_id),
//         //     clinicModels.updateClinicSurgeriesLevel(surgeries, clinic_id),
//         //     clinicModels.updateClinicAestheticDevicesLevel(aestheticDevices, clinic_id)
//         // ]);

//         // if (uploadedFiles.length > 0) {
//         //     uploadedFiles.forEach(async (file) => {
//         //         const [certificationType] = await clinicModels.getCertificateTypeByFileName(file.fieldname);
//         //         let certification_type_id = certificationType ? certificationType.certification_type_id : null;
//         //         if (certification_type_id) {
//         //             const fileName = file.filename;
//         //             await clinicModels.updateClinicDocuments(clinic_id, certification_type_id, file.fieldname, fileName);
//         //         }
//         //     });
//         // }
//         // await generateClinicsEmbeddingsV2(zynq_user_id)
//         return handleSuccess(res, 200, language, "CLINIC_PROFILE_UPDATED_SUCCESSFULLY");
//     }
//     catch (error) {
//         console.error("Error in updateClinic:", error);
//         return handleError(res, 500, "en", 'INTERNAL_SERVER_ERROR');
//     }
// };
