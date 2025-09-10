import configs from '../../config/config.js';
import { addFAQModel, deleteFAQModel, getAllFAQCategoriesModel, getAllFAQsModel, getSingleFAQModel, updateFAQModel } from '../../models/FAQ.js';
import { translateFAQ } from '../../utils/misc.util.js';
import { asyncHandler, handleError, handleSuccess } from '../../utils/responseHandler.js';

import { isEmpty } from "../../utils/user_helper.js";

// import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

export const getAllFAQs = asyncHandler(async (req, res) => {
    const { filters } = req.body;
    let faqData = await getAllFAQsModel(filters);

    if (req?.user?.role !== "ADMIN") {
        const lang = req?.user?.language || "en";

        faqData = faqData.map(faq => {
            return {
                faq_id: faq.faq_id,
                category: faq.category,
                question: faq[`ques_${lang}`],
                answer: faq[`ans_${lang}`]
            }
        })
    }

    return handleSuccess(res, 200, 'en', "FAQ_FETCHED_SUCCESSFULLY", faqData);
});

export const getSingleFAQ = asyncHandler(async (req, res) => {
    const { faq_id } = req.params;
    const faqData = await getSingleFAQModel(faq_id);
    if (isEmpty(faqData)) return handleError(res, 404, "en", "FAQ_NOT_FOUND");
    return handleSuccess(res, 200, 'en', "FAQ_FETCHED_SUCCESSFULLY", faqData[0]);
});

const prepareFAQData = async (data) => {
    const { is_manual, question, answer, question_sv, answer_sv, category } = data;

    if (is_manual) {
        return { ques_en: question, ans_en: answer, ques_sv: question_sv, ans_sv: answer_sv, category };
    }

    const translated = await translateFAQ(question, answer);
    if (!translated.ans_sv) console.warn("Translation failed for:", question);

    return {
        ques_en: translated.ques_en,
        ans_en: translated.ans_en,
        ques_sv: translated.ques_sv,
        ans_sv: translated.ans_sv,
        category
    };
};

export const addEditFAQ = asyncHandler(async (req, res) => {
    const language = req.user?.language || "en";
    const { faq_id } = req.body;
    const data = await prepareFAQData(req.body);

    if (!faq_id) {
        await addFAQModel(data);
    } else {
        await updateFAQModel(faq_id, data);
    }

    return handleSuccess(res, 200, language, "FAQ_UPDATED_SUCCESSFULLY");
});


export const deleteFAQ = asyncHandler(async (req, res) => {
    const { faq_id } = req.params;
    await deleteFAQModel(faq_id);
    return handleSuccess(res, 200, 'en', "FAQ_DELETED_SUCCESSFULLY");
});

export const getAllFAQCategories = asyncHandler(async (req, res) => {
    const lang = req?.user?.language || "en";
    const data = await getAllFAQCategoriesModel(lang);
    return handleSuccess(res, 200, lang, "FAQ_CATEGORIES_FETCHED_SUCCESSFULLY", data);
});