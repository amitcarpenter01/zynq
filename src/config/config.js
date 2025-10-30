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
        Pigmentation: "53f2e6d9-5caf-11f0-9e07-0e8e5d906eef",
        Wrinkles: "53f2e9ec-5caf-11f0-9e07-0e8e5d906eef",
        Elasticity: "eba4ce6f-9208-11f0-a300-0e8e5d906eef",
        PoreVisibility: "eba56cb9-9208-11f0-a300-0e8e5d906eef",
        RednessInflammation: "eba2e867-9208-11f0-a300-0e8e5d906eef",
        ToneUniformity: "53f2e6d9-5caf-11f0-9e07-0e8e5d906eef",
        DarkCircles: "53f2ecb4-5caf-11f0-9e07-0e8e5d906eef",
        Dryness: "53f2ed0d-5caf-11f0-9e07-0e8e5d906eef",
        Tension: "eba2ebed-9208-11f0-a300-0e8e5d906eef",
        OilyIntensity: "eba4377e-9208-11f0-a300-0e8e5d906eef",
        Blackhead: "eba56cb9-9208-11f0-a300-0e8e5d906eef",
        Rough: "eba1a2fc-9208-11f0-a300-0e8e5d906eef",
        Acne: "53f2eee3-5caf-11f0-9e07-0e8e5d906eef",
        PoresForehead: "eba56cb9-9208-11f0-a300-0e8e5d906eef",
        PoresLeftCheek: "eba56cb9-9208-11f0-a300-0e8e5d906eef",
        PoresRightCheek: "eba56cb9-9208-11f0-a300-0e8e5d906eef",
        PoresJaw: "eba56cb9-9208-11f0-a300-0e8e5d906eef",
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
