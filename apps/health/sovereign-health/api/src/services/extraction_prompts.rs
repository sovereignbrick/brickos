// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Category-based extraction prompts for the import pipeline.
// Each category gets a focused prompt instead of one monolithic prompt.
// The classifier (doctor_chat::classify_document) determines which prompt to use.

/// Return the extraction system prompt for a given document category and language.
pub fn prompt_for_category(category: &str, language: &str) -> String {
    let base = match category {
        "lab_report" => LAB_REPORT_PROMPT,
        "body_composition" => BODY_COMPOSITION_PROMPT,
        "glucose_meter" => GLUCOSE_METER_PROMPT,
        "blood_pressure" => BLOOD_PRESSURE_PROMPT,
        _ => GENERAL_HEALTH_PROMPT,
    };
    format!("{}\n\n{}", base, language_guidance(language))
}

fn language_guidance(language: &str) -> &'static str {
    match language {
        "de" => LANG_DE,
        "fr" => LANG_FR,
        "es" => LANG_ES,
        "it" => LANG_IT,
        _ => LANG_EN,
    }
}

const LAB_REPORT_PROMPT: &str = r#"You are a clinical lab report data extractor. Extract all health markers and their values from this lab report.

Rules:
- Extract every marker visible in the report with its value, unit, and reference range
- Set confidence 0.0-1.0 based on how clearly you can read the value
- Flag: normal, high, low, critical (as indicated on the report)
- If a value is unclear, set confidence below 0.7. Do not invent values.
- Extract lab metadata: lab_date (YYYY-MM-DD), lab_provider, lab_address, lab_postal_code, lab_city, lab_country

Abbreviation disambiguation (use full marker name, not abbreviation):
  BG/BZ/GLU = Glucose (NOT SHBG), HB/HGB = Hemoglobin, HCT/HKT = Hematocrit,
  TC/TCH/CHOL = Total Cholesterol, TG/TRIG = Triglycerides, UA/HS = Uric Acid,
  CREA/KREA = Creatinine, ALB = Albumin, FE = Iron, PLT/THRO = Platelets,
  GOT/AST = AST, GPT/ALT = ALT, GGT = GGT, AP/ALP = Alkaline Phosphatase,
  BILI = Bilirubin, TP = Total Protein, CRP/hsCRP = C-Reactive Protein,
  HbA1c (HPLC) = HbA1c in % (DCCT), HbA1c (IFCC) = HbA1c in mmol/mol — extract BOTH with correct units,
  GFR (MDRD-kurz) / GFR (MDRD) = eGFR,
  CLD-E / GLU-E = abbreviations for Chloride / Glucose on short lab reports,
  Cholesterin Ges. = Total Cholesterol, Alkal. Phosphatase = Alkaline Phosphatase,
  Bilirubin Ges. = Bilirubin Total, Calprotectin i.St. = Calprotectin"#;

const BODY_COMPOSITION_PROMPT: &str = r#"You are a body composition data extractor. Extract all measurements from this smart scale app screenshot or body composition display.

Rules:
- Extract every visible metric: weight, BMI, body fat %, body water %, muscle mass, skeletal muscle, bone mass, visceral fat, subcutaneous fat, BMR, metabolic age, body protein, fat-free mass
- CRITICAL: Distinguish kg vs % carefully by reading the unit next to the value:
  "Knochenmasse 2.04 kg" → marker_name: "Bone Mass", unit: "kg"
  "Knochenmasse 6%" → marker_name: "Bone Mass %", unit: "%"
  "Muskelmasse 25.3 kg" → marker_name: "Muscle Mass", unit: "kg"
  "Muskelmasse 38%" → marker_name: "Muscle %", unit: "%"
- If the unit is ambiguous or missing, set confidence below 0.6
- Visceral fat level is unitless (1-59 scale), use unit: "level"
- BMR in kcal, Metabolic Age in years
- Grid layouts: parse each cell as a separate marker, associating value with its label
- Comparison views (before/after): extract the most recent values
- If dates are visible, include measured_at per marker (YYYY-MM-DD)
- Set confidence 0.0-1.0 based on OCR clarity"#;

const GLUCOSE_METER_PROMPT: &str = r#"You are a blood glucose data extractor. Extract all glucose readings from this glucose meter or CGM app screenshot.

Rules:
- Each reading should be a separate marker entry with its own measured_at timestamp
- Extract: value (glucose), unit (mg/dL or mmol/L), date, time
- Look for meal context: fasting, before meal, after meal, bedtime — include as flag
- If multiple readings are visible, extract ALL of them
- Date formats vary: "Freitag, 20. Februar 2026" → "2026-02-20", "03/15/26" → "2026-03-15"
- Time should be in HH:MM format (24h)
- marker_name should always be "Glucose"
- Set confidence 0.0-1.0 based on OCR clarity
- CGM trend data: extract individual readings, not trend summaries"#;

const BLOOD_PRESSURE_PROMPT: &str = r#"You are a blood pressure data extractor. Extract all BP readings from this blood pressure monitor app or device screenshot.

Rules:
- Extract systolic and diastolic as separate markers for each reading
- Include pulse/heart rate if visible
- Each reading should have a measured_at timestamp if dates/times are visible
- marker_name: "Systolic Blood Pressure" for systolic, "Diastolic Blood Pressure" for diastolic, "Heart Rate" for pulse
- unit: "mmHg" for BP, "bpm" for heart rate
- If morning/evening labels are shown, include as flag
- If irregular heartbeat is flagged, note in flag field as "critical"
- Set confidence 0.0-1.0 based on OCR clarity"#;

const GENERAL_HEALTH_PROMPT: &str = r#"You are a health data extractor. Extract all health markers and their values from this image.

Rules:
- Extract every marker visible with its value, unit, and reference range if shown
- Use the full marker name, not abbreviations
- Set confidence 0.0-1.0 based on how clearly you can read the value
- If a value is unclear, set confidence below 0.7. Do not invent values.
- Extract dates if visible (YYYY-MM-DD format)
- Extract provider/source name if visible
- For unknown or unusual markers, still extract them with the name as printed"#;

// ── Language-specific guidance ──

const LANG_EN: &str = r#"Language: English
- Decimal format: dot notation (95.5)
- Date formats: MM/DD/YYYY, YYYY-MM-DD, Month DD, YYYY
- Output all dates as YYYY-MM-DD"#;

const LANG_DE: &str = r#"Language: German (Deutsch)
- Decimal format: comma notation "69,20" means 69.20 — convert to dot notation in values
- Date formats: DD.MM.YYYY, DD.MM.YY, "20. März 2026" — output as YYYY-MM-DD
- Common German abbreviations: Ges. = gesamt (total), Alkal. = alkalische, i.St. = im Stuhl
- GFR (MDRD-kurz), HbA1c (HPLC/IFCC) — use the base marker name without method suffix
- Calprotectin i.St. = fecal Calprotectin"#;

const LANG_FR: &str = r#"Language: French (Français)
- Decimal format: comma notation "69,20" means 69.20 — convert to dot notation in values
- Date formats: DD/MM/YYYY, "20 mars 2026" — output as YYYY-MM-DD
- Common terms: glycémie = glucose, cholestérol = cholesterol, créatinine = creatinine"#;

const LANG_ES: &str = r#"Language: Spanish (Español)
- Decimal format: comma notation "69,20" means 69.20 — convert to dot notation in values
- Date formats: DD/MM/YYYY, "20 de marzo de 2026" — output as YYYY-MM-DD
- Common terms: glucosa = glucose, colesterol = cholesterol, creatinina = creatinine"#;

const LANG_IT: &str = r#"Language: Italian (Italiano)
- Decimal format: comma notation "69,20" means 69.20 — convert to dot notation in values
- Date formats: DD/MM/YYYY, "20 marzo 2026" — output as YYYY-MM-DD
- Common terms: glicemia = glucose, colesterolo = cholesterol, creatinina = creatinine"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_prompt_for_each_category() {
        let categories = [
            "lab_report",
            "body_composition",
            "glucose_meter",
            "blood_pressure",
            "general_health",
        ];
        for cat in &categories {
            let prompt = prompt_for_category(cat, "en");
            assert!(!prompt.is_empty(), "Prompt for {} should not be empty", cat);
            assert!(
                prompt.len() < 3000,
                "Prompt for {} should be under 3000 chars (was {})",
                cat,
                prompt.len()
            );
        }
    }

    #[test]
    fn test_prompts_are_distinct() {
        let lab = prompt_for_category("lab_report", "en");
        let body = prompt_for_category("body_composition", "en");
        let glucose = prompt_for_category("glucose_meter", "en");
        assert_ne!(lab, body);
        assert_ne!(body, glucose);
        assert_ne!(lab, glucose);
    }

    #[test]
    fn test_language_guidance_injected() {
        let de = prompt_for_category("lab_report", "de");
        assert!(
            de.contains("comma notation"),
            "German prompt should mention comma decimals"
        );
        assert!(
            de.contains("DD.MM.YYYY"),
            "German prompt should mention German date format"
        );

        let fr = prompt_for_category("lab_report", "fr");
        assert!(
            fr.contains("glycémie"),
            "French prompt should include French terms"
        );
    }

    #[test]
    fn test_unknown_category_falls_back() {
        let prompt = prompt_for_category("unknown_format", "en");
        let general = prompt_for_category("general_health", "en");
        assert_eq!(prompt, general);
    }

    #[test]
    fn test_unknown_language_falls_back_to_english() {
        let prompt = prompt_for_category("lab_report", "zh");
        assert!(
            prompt.contains("dot notation"),
            "Unknown language should fall back to English"
        );
    }

    #[test]
    fn test_spanish_language_support() {
        let prompt = prompt_for_category("lab_report", "es");
        assert!(prompt.contains("glucosa"));
    }

    #[test]
    fn test_italian_language_support() {
        let prompt = prompt_for_category("lab_report", "it");
        assert!(prompt.contains("glicemia"));
    }

    #[test]
    fn test_body_composition_prompt_contains_kg_pct_rules() {
        let prompt = prompt_for_category("body_composition", "de");
        assert!(prompt.contains("kg"));
        assert!(prompt.contains("%"));
        assert!(prompt.contains("Knochenmasse"));
    }

    #[test]
    fn test_glucose_meter_prompt_contains_timestamp_rules() {
        let prompt = prompt_for_category("glucose_meter", "en");
        assert!(prompt.contains("measured_at"));
        assert!(prompt.contains("fasting"));
    }
}
