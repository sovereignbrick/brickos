// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use std::collections::HashMap;
use std::sync::OnceLock;

/// Build the alias map: lowercase lab name -> marker_slug
fn alias_map() -> &'static HashMap<&'static str, &'static str> {
    static MAP: OnceLock<HashMap<&str, &str>> = OnceLock::new();
    MAP.get_or_init(|| {
        let mut m = HashMap::new();
        // ── Glucose ──
        for a in [
            "glucose",
            "blood glucose",
            "fasting glucose",
            "glucose, serum",
            "blood sugar",
            "glu",
            "bg",
            "glc",
            "glukose",
            "blutzucker",
            "glucose nuchtern",
            "glucose nüchtern",
            "nüchternglukose",
            "nüchternblutzucker",
        ] {
            m.insert(a, "glucose");
        }
        // ── Ketones ──
        for a in [
            "ketones",
            "blood ketones",
            "beta-hydroxybutyrate",
            "bhb",
            "ketone",
            "ketone bodies",
        ] {
            m.insert(a, "ketones");
        }
        // ── Insulin ──
        for a in [
            "insulin",
            "fasting insulin",
            "nuchterninsulin",
            "nüchterninsulin",
            "insulin, serum",
        ] {
            m.insert(a, "insulin");
        }
        // ── HbA1c ──
        for a in [
            "hba1c",
            "hemoglobin a1c",
            "glycated hemoglobin",
            "a1c",
            "glycated haemoglobin",
            "glykiertes hamoglobin",
            "glykiertes hämoglobin",
        ] {
            m.insert(a, "hba1c");
        }
        // ── HOMA-IR ──
        for a in ["homa-ir", "homa-index", "homa index", "homa ir"] {
            m.insert(a, "homa_ir");
        }
        // ── Cholesterol ──
        for a in [
            "total cholesterol",
            "cholesterol",
            "cholesterol total",
            "cholesterol, total",
            "chol",
            "tc",
            "tch",
            "cholesterin",
            "cholesterin gesamt",
            "gesamtcholesterin",
        ] {
            m.insert(a, "total_cholesterol");
        }
        // ── LDL ──
        for a in [
            "ldl",
            "ldl-c",
            "ldl cholesterol",
            "ldl-cholesterol",
            "ldl-cholesterin",
        ] {
            m.insert(a, "ldl_c");
        }
        // ── HDL ──
        for a in [
            "hdl",
            "hdl-c",
            "hdl cholesterol",
            "hdl-cholesterol",
            "hdl-cholesterin",
        ] {
            m.insert(a, "hdl_c");
        }
        // ── Triglycerides ──
        for a in [
            "triglycerides",
            "tg",
            "trigs",
            "triglyceride",
            "triglyzeride",
        ] {
            m.insert(a, "triglycerides");
        }
        // ── Uric Acid ──
        for a in ["uric acid", "uric acid, serum", "harnsaure", "harnsäure"] {
            m.insert(a, "uric_acid");
        }
        // ── Creatinine ──
        for a in [
            "creatinine",
            "creatinine, serum",
            "serum creatinine",
            "creat",
            "kreatinin",
        ] {
            m.insert(a, "creatinine");
        }
        // ── Iron ──
        for a in ["iron", "iron, serum", "serum iron", "eisen"] {
            m.insert(a, "iron");
        }
        // ── Ferritin ──
        for a in ["ferritin", "ferritin, serum"] {
            m.insert(a, "ferritin");
        }
        // ── Hemoglobin ──
        for a in [
            "hemoglobin",
            "haemoglobin",
            "hb",
            "hgb",
            "hamoglobin",
            "hämoglobin",
        ] {
            m.insert(a, "hemoglobin");
        }
        // ── Hematocrit ──
        for a in [
            "hematocrit",
            "haematocrit",
            "hct",
            "hkt",
            "hamatokrit",
            "hämatokrit",
        ] {
            m.insert(a, "hematocrit");
        }
        // ── WBC ──
        for a in [
            "wbc",
            "white blood cell count",
            "white blood cells",
            "leukocytes",
            "leukozyten",
        ] {
            m.insert(a, "wbc");
        }
        // ── RBC ──
        for a in [
            "rbc",
            "red blood cell count",
            "red blood cells",
            "erythrocytes",
            "erythrozyten",
        ] {
            m.insert(a, "rbc");
        }
        // ── Platelets ──
        for a in [
            "platelets",
            "platelet count",
            "thrombocytes",
            "thrombozyten",
            "plt",
        ] {
            m.insert(a, "platelets");
        }
        // ── BP ──
        for a in [
            "systolic bp",
            "systolic blood pressure",
            "bp systolic",
            "systolisch",
            "blutdruck systolisch",
            "blutdruck syst",
            "blutdruck syst.",
            "rr systolisch",
            "rr syst",
            "rr syst.",
            "systolischer blutdruck",
            "sys bp",
            "sys",
        ] {
            m.insert(a, "bp_systolic");
        }
        for a in [
            "diastolic bp",
            "diastolic blood pressure",
            "bp diastolic",
            "diastolisch",
            "blutdruck diastolisch",
            "blutdruck diast",
            "blutdruck diast.",
            "rr diastolisch",
            "rr diast",
            "rr diast.",
            "diastolischer blutdruck",
            "dia bp",
            "dia",
        ] {
            m.insert(a, "bp_diastolic");
        }
        // ── Heart Rate ──
        for a in [
            "heart rate",
            "pulse",
            "hr",
            "resting heart rate",
            "herzfrequenz",
            "puls",
        ] {
            m.insert(a, "heart_rate");
        }
        // ── Weight ──
        for a in [
            "weight",
            "body weight",
            "gewicht",
            "korpergewicht",
            "körpergewicht",
        ] {
            m.insert(a, "weight");
        }
        // ── Body Fat ──
        for a in [
            "body fat",
            "body fat %",
            "body fat percentage",
            "korperfett",
            "körperfett",
        ] {
            m.insert(a, "body_fat_pct");
        }
        // ── TSH ──
        for a in [
            "tsh",
            "tsh basal",
            "thyroid stimulating hormone",
            "schilddrusen-stimulierendes hormon",
            "schilddrüsen-stimulierendes hormon",
        ] {
            m.insert(a, "tsh");
        }
        // ── Free T4 ──
        for a in ["free t4", "ft4", "freies t4", "free thyroxine"] {
            m.insert(a, "free_t4");
        }
        // ── Free T3 ──
        for a in ["free t3", "ft3", "freies t3", "free triiodothyronine"] {
            m.insert(a, "free_t3");
        }
        // ── Vitamin D ──
        for a in [
            "vitamin d",
            "25-oh-vitamin d",
            "25-hydroxyvitamin d",
            "vitamin d3",
            "25(oh)d",
            "calcidiol",
        ] {
            m.insert(a, "vitamin_d");
        }
        // ── Vitamin B12 ──
        for a in ["vitamin b12", "b12", "cobalamin"] {
            m.insert(a, "vitamin_b12");
        }
        // ── Folate ──
        for a in ["folate", "folic acid", "folsaure", "folsäure"] {
            m.insert(a, "folate");
        }
        // ── Liver enzymes ──
        for a in ["ast", "got", "aspartate aminotransferase", "sgot"] {
            m.insert(a, "ast");
        }
        for a in ["alt", "gpt", "alanine aminotransferase", "sgpt"] {
            m.insert(a, "alt");
        }
        for a in ["ggt", "gamma-gt", "gamma-glutamyl transferase", "gamma gt"] {
            m.insert(a, "ggt");
        }
        for a in [
            "alp",
            "alkaline phosphatase",
            "alkalische phosphatase",
            "ap",
        ] {
            m.insert(a, "alp");
        }
        for a in [
            "bilirubin",
            "bilirubin total",
            "bilirubin gesamt",
            "total bilirubin",
            "gesamtbilirubin",
        ] {
            m.insert(a, "bilirubin");
        }
        // ── Protein ──
        for a in [
            "total protein",
            "protein total",
            "eiweiss gesamt",
            "gesamtprotein",
            "eiweiß gesamt",
            "gesamteiweiß",
        ] {
            m.insert(a, "total_protein");
        }
        for a in ["albumin", "serum albumin"] {
            m.insert(a, "albumin");
        }
        // ── CRP ──
        for a in [
            "crp",
            "c-reactive protein",
            "hs-crp",
            "hscrp",
            "high-sensitivity crp",
        ] {
            m.insert(a, "hs_crp");
        }
        // ── Hormones ──
        for a in ["testosterone", "testosteron", "total testosterone"] {
            m.insert(a, "testosterone");
        }
        for a in ["estradiol", "ostradiol", "östradiol", "e2"] {
            m.insert(a, "estradiol");
        }
        for a in ["shbg", "sex hormone-binding globulin"] {
            m.insert(a, "shbg");
        }
        for a in ["dhea-s", "dheas", "dhea sulfate", "dhea-sulfat"] {
            m.insert(a, "dhea_s");
        }
        for a in ["cortisol", "serum cortisol"] {
            m.insert(a, "cortisol");
        }
        for a in [
            "psa",
            "prostate-specific antigen",
            "prostataspezifisches antigen",
        ] {
            m.insert(a, "psa");
        }
        // ── Cardiovascular ──
        for a in ["homocysteine", "homocystein"] {
            m.insert(a, "homocysteine");
        }
        for a in ["apolipoprotein b", "apo b", "apob"] {
            m.insert(a, "apob");
        }
        for a in ["lipoprotein(a)", "lp(a)", "lpa", "lipoprotein a"] {
            m.insert(a, "lpa");
        }
        // ── Body Composition ──
        for a in [
            "body water",
            "body water %",
            "body water percentage",
            "korperwasser",
            "körperwasser",
        ] {
            m.insert(a, "body_water_pct");
        }
        for a in [
            "muscle mass",
            "muscle %",
            "muscle percentage",
            "muskelmasse",
            "muskelanteil",
        ] {
            m.insert(a, "muscle_pct");
        }
        for a in ["bone mass", "bone mass %", "bone mineral", "knochenmasse"] {
            m.insert(a, "bone_mass_pct");
        }
        for a in [
            "waist circumference",
            "waist",
            "taillenumfang",
            "bauchumfang",
        ] {
            m.insert(a, "waist_circumference");
        }
        // ── MCV ──
        for a in [
            "mcv",
            "mean corpuscular volume",
            "mittleres zellvolumen",
            "mittleres korpuskularvolumen",
        ] {
            m.insert(a, "mcv");
        }
        // ── MCH ──
        for a in [
            "mch",
            "mean corpuscular hemoglobin",
            "mittleres zellhämoglobin",
            "mittleres zellhamoglobin",
        ] {
            m.insert(a, "mch");
        }
        // ── MCHC ──
        for a in [
            "mchc",
            "mean corpuscular hb concentration",
            "mittlere hämoglobinkonzentration",
            "mittlere hamoglobinkonzentration",
        ] {
            m.insert(a, "mchc");
        }
        // ── RDW ──
        for a in [
            "rdw",
            "red cell distribution width",
            "erythrozytenverteilungsbreite",
            "evb",
        ] {
            m.insert(a, "rdw");
        }
        // ── Neutrophils ──
        for a in [
            "neutrophils",
            "neutrophils %",
            "neutrophils pct",
            "neut",
            "neut%",
            "segmentkernige",
            "segmentkernige %",
            "neutrophile",
            "neutrophile granulozyten",
            "segmentkernige granulozyten",
        ] {
            m.insert(a, "neutrophils_pct");
        }
        for a in [
            "neutrophils abs",
            "neutrophils absolute",
            "segmentkernige absolut",
            "segmentkernige, absolut",
            "neutrophile absolut",
            "neut#",
        ] {
            m.insert(a, "neutrophils_abs");
        }
        // ── Lymphocytes ──
        for a in [
            "lymphocytes",
            "lymphocytes %",
            "lymphocytes pct",
            "lymph",
            "lymph%",
            "lymphozyten",
            "lymphozyten %",
        ] {
            m.insert(a, "lymphocytes_pct");
        }
        for a in [
            "lymphocytes abs",
            "lymphocytes absolute",
            "lymphozyten absolut",
            "lymphozyten, absolut",
            "lymph#",
        ] {
            m.insert(a, "lymphocytes_abs");
        }
        // ── Monocytes ──
        for a in [
            "monocytes",
            "monocytes %",
            "monocytes pct",
            "mono",
            "mono%",
            "monozyten",
            "monozyten %",
        ] {
            m.insert(a, "monocytes_pct");
        }
        for a in [
            "monocytes abs",
            "monocytes absolute",
            "monozyten absolut",
            "monozyten, absolut",
            "mono#",
        ] {
            m.insert(a, "monocytes_abs");
        }
        // ── Eosinophils ──
        for a in [
            "eosinophils",
            "eosinophils %",
            "eosinophils pct",
            "eos",
            "eos%",
            "eosinophile",
            "eosinophile %",
        ] {
            m.insert(a, "eosinophils_pct");
        }
        for a in [
            "eosinophils abs",
            "eosinophils absolute",
            "eosinophile absolut",
            "eosinophile, absolut",
            "eos#",
        ] {
            m.insert(a, "eosinophils_abs");
        }
        // ── Basophils ──
        for a in [
            "basophils",
            "basophils %",
            "basophils pct",
            "baso",
            "baso%",
            "basophile",
            "basophile %",
        ] {
            m.insert(a, "basophils_pct");
        }
        for a in [
            "basophils abs",
            "basophils absolute",
            "basophile absolut",
            "basophile, absolut",
            "baso#",
        ] {
            m.insert(a, "basophils_abs");
        }
        m
    })
}

/// Return aliases grouped by marker slug for AI prompt context.
/// Only includes aliases that differ from the slug itself (i.e. human-readable names).
pub fn aliases_by_slug() -> HashMap<&'static str, Vec<&'static str>> {
    let map = alias_map();
    let mut grouped: HashMap<&str, Vec<&str>> = HashMap::new();
    for (alias, slug) in map.iter() {
        // Skip very short abbreviations and the slug itself
        if alias.len() >= 4 && *alias != *slug {
            grouped.entry(slug).or_default().push(alias);
        }
    }
    // Sort aliases by length descending so the most descriptive appear first
    for v in grouped.values_mut() {
        v.sort_by_key(|b| std::cmp::Reverse(b.len()));
        v.truncate(5); // keep at most 5 per marker
    }
    grouped
}

/// Match an AI-extracted marker name to a system marker slug.
pub fn match_marker(ai_name: &str) -> Option<&'static str> {
    let normalized = ai_name.trim().to_lowercase();
    let map = alias_map();

    // 1. Exact match — always preferred
    if let Some(slug) = map.get(normalized.as_str()) {
        return Some(slug);
    }

    // 2. The normalized name contains a known alias (e.g., "fasting glucose level" contains "glucose")
    //    Prefer longer alias matches to avoid false positives.
    let mut best: Option<(&str, usize)> = None;
    for (alias, slug) in map.iter() {
        if alias.len() >= 4
            && normalized.contains(alias)
            && (best.is_none() || alias.len() > best.unwrap().1)
        {
            best = Some((slug, alias.len()));
        }
    }
    if let Some((slug, _)) = best {
        return Some(slug);
    }

    // 3. A known alias contains the normalized name — only if input is long enough
    //    to avoid short abbreviations matching unrelated markers (e.g., "bg" in "shbg").
    if normalized.len() >= 4 {
        for (alias, slug) in map.iter() {
            if alias.contains(normalized.as_str()) {
                return Some(slug);
            }
        }
    }

    None
}

/// Unit conversion: convert a value from one unit to canonical.
/// Returns (converted_value, canonical_unit) or None if no conversion needed/possible.
pub fn convert_unit(marker_slug: &str, value: f64, from_unit: &str) -> Option<(f64, &'static str)> {
    let from = from_unit.trim().to_lowercase();

    match marker_slug {
        "glucose" => {
            if from.contains("mg") {
                Some((value / 18.0, "mmol/L"))
            } else {
                None // already mmol/L or unknown
            }
        }
        "total_cholesterol" | "ldl_c" | "hdl_c" => {
            if from.contains("mg") {
                Some((value / 38.67, "mmol/L"))
            } else {
                None
            }
        }
        "triglycerides" => {
            if from.contains("mg") {
                Some((value / 88.57, "mmol/L"))
            } else {
                None
            }
        }
        "uric_acid" => {
            if from.contains("mg") {
                Some((value * 59.48, "µmol/L"))
            } else {
                None
            }
        }
        "hemoglobin" => {
            if from.contains("g/dl") || from == "g/dl" {
                Some((value / 1.61, "mmol/L"))
            } else {
                None
            }
        }
        "creatinine" => {
            if from.contains("mg") {
                Some((value * 88.4, "µmol/L"))
            } else {
                None
            }
        }
        "iron" => {
            if from.contains("ug") || from.contains("µg") || from.contains("mcg") {
                Some((value * 0.179, "µmol/L"))
            } else {
                None
            }
        }
        "vitamin_d" => {
            if from.contains("ng") {
                Some((value * 2.496, "nmol/L"))
            } else {
                None
            }
        }
        "testosterone" => {
            if from.contains("ng/dl") {
                Some((value * 0.0347, "nmol/L"))
            } else {
                None
            }
        }
        "cortisol" => {
            if from.contains("ug") || from.contains("µg") || from.contains("mcg") {
                Some((value * 27.59, "nmol/L"))
            } else {
                None
            }
        }
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_match_exact() {
        assert_eq!(match_marker("Glucose"), Some("glucose"));
        assert_eq!(match_marker("HbA1c"), Some("hba1c"));
        assert_eq!(match_marker("Total Cholesterol"), Some("total_cholesterol"));
    }

    #[test]
    fn test_match_german() {
        assert_eq!(match_marker("Blutzucker"), Some("glucose"));
        assert_eq!(match_marker("Harnsäure"), Some("uric_acid"));
        assert_eq!(
            match_marker("Cholesterin gesamt"),
            Some("total_cholesterol")
        );
    }

    #[test]
    fn test_abbreviation_priority() {
        // BG must resolve to glucose, NOT shbg
        assert_eq!(match_marker("BG"), Some("glucose"));
        assert_eq!(match_marker("bg"), Some("glucose"));
        // TCH must resolve to total_cholesterol
        assert_eq!(match_marker("TCH"), Some("total_cholesterol"));
        // HB must resolve to hemoglobin
        assert_eq!(match_marker("HB"), Some("hemoglobin"));
        // HCT must resolve to hematocrit
        assert_eq!(match_marker("HCT"), Some("hematocrit"));
        // SHBG still works
        assert_eq!(match_marker("SHBG"), Some("shbg"));
    }

    #[test]
    fn test_match_blood_pressure_german() {
        assert_eq!(match_marker("Blutdruck syst."), Some("bp_systolic"));
        assert_eq!(match_marker("Blutdruck diast."), Some("bp_diastolic"));
        assert_eq!(match_marker("Blutdruck systolisch"), Some("bp_systolic"));
        assert_eq!(match_marker("Blutdruck diastolisch"), Some("bp_diastolic"));
        assert_eq!(match_marker("RR syst."), Some("bp_systolic"));
        assert_eq!(match_marker("RR diast."), Some("bp_diastolic"));
    }

    #[test]
    fn test_no_false_positive_ast_in_diast() {
        // "Blutdruck diast." must NOT match AST
        assert_ne!(match_marker("Blutdruck diast."), Some("ast"));
    }

    #[test]
    fn test_convert_glucose() {
        let (val, unit) = convert_unit("glucose", 90.0, "mg/dL").unwrap();
        assert!((val - 5.0).abs() < 0.01);
        assert_eq!(unit, "mmol/L");
    }
}
