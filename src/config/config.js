const configs = {
    faq_categories: [
        { en: "General", sv: null },
        { en: "Account", sv: null },
        { en: "Billing", sv: null },
        { en: "Product", sv: null },
        { en: "Payment", sv: null },
        { en: "Security", sv: null },
        { en: "Other", sv: null }
    ],
    skinConcernMap: {
        Pigmentation: "90529b1e-bee1-11f0-8dff-0e8e5d906eef",
        Wrinkles: "a42f44b8-bee1-11f0-8dff-0e8e5d906eef",
        Elasticity: "460874fc-bee0-11f0-8dff-0e8e5d906eef",
        PoreVisibility: "90364cac-bee1-11f0-8dff-0e8e5d906eef",
        RednessInflammation: "5a191f37-bee1-11f0-8dff-0e8e5d906eef",
        ToneUniformity: "59e268df-bee1-11f0-8dff-0e8e5d906eef",
        DarkCircles: "59db6843-bee1-11f0-8dff-0e8e5d906eef",
        Dryness: "59e634ea-bee1-11f0-8dff-0e8e5d906eef",
        Tension: "a3cd5104-bee1-11f0-8dff-0e8e5d906eef",
        OilyIntensity: "90364cac-bee1-11f0-8dff-0e8e5d906eef",
        Blackhead: "3cfd4002-bee1-11f0-8dff-0e8e5d906eef",
        Rough: "a40afe62-bee1-11f0-8dff-0e8e5d906eef",
        Acne: "ad78c7fe-bedf-11f0-8dff-0e8e5d906eef",
        PoresForehead: "3cfd4002-bee1-11f0-8dff-0e8e5d906eef",
        PoresLeftCheek: "3cfd4002-bee1-11f0-8dff-0e8e5d906eef",
        PoresRightCheek: "3cfd4002-bee1-11f0-8dff-0e8e5d906eef",
        PoresJaw: "3cfd4002-bee1-11f0-8dff-0e8e5d906eef",
        LeftDarkCircle: "53f2ecb4-5caf-11f0-9e07-0e8e5d906eef",
        RightDarkCircle: "53f2ecb4-5caf-11f0-9e07-0e8e5d906eef"
    },
    mapping: {
        pigmentation: "Pigmentation",
        wrinkles: "Wrinkles",
        elasticity: "Elasticity",
        pore_visibility: "PoreVisibility",
        redness_inflammation: "RednessInflammation",
        tone_uniformity: "ToneUniformity",
        muscle_activity_tension: "Tension",
        dark_circles_fatigue: "DarkCircles",
        dryness_moisture_balance: "Dryness",
        oily_intensity_score: "OilyIntensity",
        blackheads: "Blackhead",
        roughness_texture: "Rough",
        acne: "Acne",
        pores_forehead_score: "PoresForehead",
        pores_left_cheek_score: "PoresLeftCheek",
        pores_right_cheek_score: "PoresRightCheek",
        pores_jaw_score: "PoresJaw",
        left_dark_circle: "LeftDarkCircle",
        right_dark_circle: "RightDarkCircle"
    },
    openaiKey: process.env.OPENAI_API_KEY,
    legalTeamMail :"support@getzynq.io",
    VAT : 25
}

export default configs
