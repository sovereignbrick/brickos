// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use sqlx::Row;
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
            "hba1c (hplc)",
            "hba1c (ifcc)",
            "hba1c hplc",
            "hba1c ifcc",
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
            "cholesterin ges.",
            "cholesterin ges",
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
        for a in [
            "uric acid",
            "uric acid, serum",
            "harnsaure",
            "harnsäure",
            "ua",
        ] {
            m.insert(a, "uric_acid");
        }
        // ── Creatinine ──
        for a in [
            "creatinine",
            "creatinine, serum",
            "serum creatinine",
            "creat",
            "kreatinin",
            "crea",
            "krea",
        ] {
            m.insert(a, "creatinine");
        }
        // ── Iron ──
        for a in ["iron", "iron, serum", "serum iron", "eisen", "fe"] {
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
            "bpm",
            "beats per minute",
            "beats/min",
            "resting heart rate",
            "herzfrequenz",
            "puls",
            "schläge pro minute",
            "schläge/min",
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
        for a in [
            "ast",
            "got",
            "aspartate aminotransferase",
            "sgot",
            "asat",
            "aspartat-aminotransferase",
        ] {
            m.insert(a, "ast");
        }
        for a in [
            "alt",
            "gpt",
            "alanine aminotransferase",
            "sgpt",
            "alat",
            "alanin-aminotransferase",
        ] {
            m.insert(a, "alt");
        }
        for a in [
            "ggt",
            "gamma-gt",
            "gamma-glutamyl transferase",
            "gamma glutamyl transferase",
            "gamma gt",
            "gamma-glutamyltransferase",
            "gamma-glutamyltranspeptidase",
            "ggt (gamma-glutamyltranspeptidase)",
        ] {
            m.insert(a, "ggt");
        }
        for a in [
            "alp",
            "alkaline phosphatase",
            "alkalische phosphatase",
            "ap",
            "alkal. phosphatase",
            "alkal phosphatase",
        ] {
            m.insert(a, "alp");
        }
        for a in [
            "bilirubin",
            "bilirubin total",
            "bilirubin gesamt",
            "total bilirubin",
            "gesamtbilirubin",
            "bilirubin ges.",
            "bilirubin ges",
        ] {
            m.insert(a, "bilirubin_total");
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
        for a in [
            "shbg",
            "sex hormone-binding globulin",
            "sex hormone binding globulin",
            "sexualhormon-bindendes globulin",
            "sexualhormonbindendes globulin",
        ] {
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
        for a in ["muscle %", "muscle percentage", "muskelanteil"] {
            m.insert(a, "muscle_pct");
        }
        for a in ["bone mass %", "bone mineral", "knochenmasse %"] {
            m.insert(a, "bone_mass_pct");
        }
        // ── Skeletal Muscle % ──
        for a in [
            "skeletal muscle",
            "skeletal muscle %",
            "skeletal muscle percentage",
            "skelettmuskel",
            "skelettmuskelanteil",
        ] {
            m.insert(a, "skeletal_muscle_pct");
        }
        // ── Muscle Mass (kg) ──
        for a in [
            "muscle mass",
            "muscle mass kg",
            "muskelmasse",
            "muskelmasse kg",
        ] {
            m.insert(a, "muscle_mass_kg");
        }
        // ── Subcutaneous Fat ──
        for a in [
            "subcutaneous fat",
            "subcutaneous fat %",
            "subkutanes fett",
            "subkutan",
            "unterhautfett",
        ] {
            m.insert(a, "subcutaneous_fat_pct");
        }
        // ── Visceral Fat ──
        for a in [
            "visceral fat",
            "visceral fat level",
            "viszeralfett",
            "viszerales fett",
        ] {
            m.insert(a, "visceral_fat");
        }
        // ── Fat-Free Mass ──
        for a in [
            "fat-free mass",
            "fat free mass",
            "lean mass",
            "lean body mass",
            "fettfreie masse",
            "fettfreies körpergewicht",
            "fettfreies korpergewicht",
        ] {
            m.insert(a, "fat_free_mass");
        }
        // ── BMR ──
        for a in [
            "bmr",
            "basal metabolic rate",
            "grundumsatz",
            "resting metabolic rate",
        ] {
            m.insert(a, "bmr");
        }
        // ── Metabolic Age ──
        for a in ["metabolic age", "stoffwechselalter"] {
            m.insert(a, "metabolic_age");
        }
        // ── Body Protein % ──
        for a in [
            "body protein",
            "body protein %",
            "body protein percentage",
            "körperprotein",
            "korperprotein",
            "protein %",
        ] {
            m.insert(a, "body_protein_pct");
        }
        // ── Bone Mass (kg) ──
        for a in [
            "bone mass",
            "bone mass kg",
            "knochenmasse",
            "knochenmasse kg",
        ] {
            m.insert(a, "bone_mass_kg");
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
        // ── Calcium ──
        for a in ["calcium", "ca", "kalzium", "calcium gesamt"] {
            m.insert(a, "calcium");
        }
        // ── Magnesium ──
        for a in ["magnesium", "mg"] {
            m.insert(a, "magnesium");
        }
        // ── Potassium ──
        for a in ["potassium", "kalium"] {
            m.insert(a, "potassium");
        }
        // ── Sodium ──
        for a in ["sodium", "natrium"] {
            m.insert(a, "sodium");
        }
        // ── eGFR ──
        for a in [
            "egfr",
            "gfr",
            "estimated gfr",
            "gfr (ckd-epi)",
            "egfr (ckd-epi)",
            "gfr ckd-epi",
            "gfr (ckd-epi-formel)",
            "glomerulare filtrationsrate",
            "glomeruläre filtrationsrate",
            "gfr (mdrd-kurz)",
            "gfr (mdrd)",
            "gfr mdrd",
        ] {
            m.insert(a, "egfr");
        }
        // ── Chloride ──
        for a in ["chloride", "chlorid", "cld-e", "cl", "serum chloride"] {
            m.insert(a, "chloride");
        }
        // ── LDH ──
        for a in ["ldh", "lactate dehydrogenase", "laktatdehydrogenase"] {
            m.insert(a, "ldh");
        }
        // ── Free Testosterone ──
        for a in [
            "free testosterone",
            "freies testosteron",
            "testosteron frei",
            "ftest",
        ] {
            m.insert(a, "free_testosterone");
        }
        // ── Progesterone ──
        for a in ["progesterone", "progesteron", "prog"] {
            m.insert(a, "progesterone");
        }
        // ── Prolactin ──
        for a in ["prolactin", "prolaktin", "prl", "prol"] {
            m.insert(a, "prolactin");
        }
        // ── FSH ──
        for a in [
            "fsh",
            "follitropin",
            "follikelstimulierendes hormon",
            "follikelstim. hormon",
            "follikelstim. hormon (fsh)",
            "follicle-stimulating hormone",
            "follicle stimulating hormone",
        ] {
            m.insert(a, "fsh");
        }
        // ── LH ──
        for a in [
            "lh",
            "lutropin",
            "luteinisierendes hormon",
            "luteinizing hormone",
        ] {
            m.insert(a, "lh");
        }
        // ── DHA ──
        for a in [
            "dha",
            "docosahexaenoic acid",
            "docosahexaensaure",
            "docosahexaensäure",
        ] {
            m.insert(a, "dha");
        }
        // ── EPA ──
        for a in [
            "epa",
            "eicosapentaenoic acid",
            "eicosapentaensaure",
            "eicosapentaensäure",
        ] {
            m.insert(a, "epa");
        }
        // ── Omega-3 Index ──
        for a in [
            "omega-3 index",
            "omega3 index",
            "omega 3 index",
            "omega-3-index",
            "omega-3-index (epa und dha)",
        ] {
            m.insert(a, "omega3_index");
        }
        // ── Transferrin (aliases for existing slug) ──
        for a in ["transferrin", "tf", "trfe"] {
            m.insert(a, "transferrin");
        }
        // ── Transferrin Saturation ──
        for a in [
            "transferrin saturation",
            "transferrinsattigung",
            "transferrinsättigung",
            "tsat",
            "tfs",
        ] {
            m.insert(a, "transferrin_sat");
        }
        // ── Non-HDL Cholesterol ──
        for a in [
            "non-hdl cholesterol",
            "non-hdl-cholesterin",
            "nicht-hdl-cholesterin",
            "non hdl cholesterol",
            "non-hdl-cholesterol",
        ] {
            m.insert(a, "non_hdl_c");
        }
        // ── Vitamin B2 ──
        for a in ["vitamin b2", "riboflavin"] {
            m.insert(a, "vitamin_b2");
        }
        // ── Vitamin B6 ──
        for a in [
            "vitamin b6",
            "pyridoxal phosphate",
            "pyridoxalphosphat",
            "plp",
        ] {
            m.insert(a, "vitamin_b6");
        }
        // ── Free Androgen Index ──
        for a in [
            "free androgen index",
            "fai",
            "fti",
            "free testosterone index",
        ] {
            m.insert(a, "free_androgen_index");
        }
        // ── Amylase ──
        for a in [
            "amylase",
            "pankreas-amylase",
            "pamy",
            "p-amylase",
            "pancreatic amylase",
        ] {
            m.insert(a, "amylase");
        }
        // ── Lipase ──
        for a in ["lipase", "pankreas-lipase", "lip"] {
            m.insert(a, "lipase");
        }
        // ── BUN / Urea ──
        for a in ["bun", "urea", "harnstoff", "hst", "blood urea nitrogen"] {
            m.insert(a, "bun");
        }
        // ── IgG ──
        for a in ["igg", "immunoglobulin g", "immunglobulin g"] {
            m.insert(a, "igg");
        }
        // ── VLDL Cholesterol ──
        for a in ["vldl", "vldl-c", "vldl cholesterol", "vldl-cholesterin"] {
            m.insert(a, "vldl_c");
        }
        // ── Calprotectin ──
        for a in [
            "calprotectin",
            "calprotectin i.st.",
            "calprotectin (clia)",
            "fäkales calprotectin",
            "fecal calprotectin",
            "calprotectin i. st.",
            "calprotectin im stuhl",
        ] {
            m.insert(a, "calprotectin");
        }
        // ── Total Fatty Acids ──
        for a in [
            "total fatty acids",
            "fatty acids total",
            "fettsäuren gesamt",
            "fettsäuren, gesamt",
            "fettsauren gesamt",
            "fettsauren, gesamt",
            "gesamtfettsäuren",
            "gesamtfettsauren",
        ] {
            m.insert(a, "total_fatty_acids");
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

/// Match tier for detailed matching results.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MatchTier {
    Exact,
    Contains,
    ReverseContains,
    Fuzzy,
}

/// Detailed match result with tier and slug.
#[derive(Debug, Clone)]
pub struct MatchResult {
    pub slug: &'static str,
    pub tier: MatchTier,
}

/// Match an AI-extracted marker name to a system marker slug.
pub fn match_marker(ai_name: &str) -> Option<&'static str> {
    match_marker_detailed(ai_name).map(|r| r.slug)
}

/// Match with detailed tier information for confidence scoring.
pub fn match_marker_detailed(ai_name: &str) -> Option<MatchResult> {
    let normalized = ai_name.trim().to_lowercase();
    let map = alias_map();

    // 1. Exact match — always preferred
    if let Some(slug) = map.get(normalized.as_str()) {
        return Some(MatchResult {
            slug,
            tier: MatchTier::Exact,
        });
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
        return Some(MatchResult {
            slug,
            tier: MatchTier::Contains,
        });
    }

    // 3. A known alias contains the normalized name — only if input is long enough
    //    to avoid short abbreviations matching unrelated markers (e.g., "bg" in "shbg").
    if normalized.len() >= 4 {
        for (alias, slug) in map.iter() {
            if alias.contains(normalized.as_str()) {
                return Some(MatchResult {
                    slug,
                    tier: MatchTier::ReverseContains,
                });
            }
        }
    }

    // 4. Fuzzy match — Levenshtein distance ≤ 2, only for inputs ≥ 6 chars
    if normalized.len() >= 6 {
        let mut best_fuzzy: Option<(&str, usize)> = None;
        for (alias, slug) in map.iter() {
            if alias.len() >= 6 {
                let dist = strsim::levenshtein(&normalized, alias);
                // Max distance 2, and distance must be < input_len / 3 to avoid wild matches
                if dist <= 2
                    && dist < normalized.len() / 3
                    && (best_fuzzy.is_none() || dist < best_fuzzy.unwrap().1)
                {
                    best_fuzzy = Some((slug, dist));
                }
            }
        }
        if let Some((slug, _)) = best_fuzzy {
            return Some(MatchResult {
                slug,
                tier: MatchTier::Fuzzy,
            });
        }
    }

    None
}

/// Unit conversion: convert a value from one unit to canonical.
/// Returns (converted_value, canonical_unit) or None if no conversion needed/possible.
/// Try matching via learned aliases from the database (promoted corrections).
/// Falls back to static match_marker_detailed if no learned alias found.
pub async fn match_marker_with_learned(pool: &sqlx::PgPool, ai_name: &str) -> Option<MatchResult> {
    // 1. Try static alias map first (always takes priority)
    if let Some(result) = match_marker_detailed(ai_name) {
        return Some(result);
    }

    // 2. Check learned aliases (promoted only)
    let normalized = ai_name.trim().to_lowercase();
    let row = sqlx::query(
        "SELECT target_slug FROM learned_aliases WHERE alias_text = $1 AND promoted_at IS NOT NULL",
    )
    .bind(&normalized)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    if let Some(row) = row {
        if let Ok(slug) = row.try_get::<String, _>("target_slug") {
            // Leak the string to get a 'static reference (safe: small, finite set of learned aliases)
            let leaked: &'static str = Box::leak(slug.into_boxed_str());
            return Some(MatchResult {
                slug: leaked,
                tier: MatchTier::Exact, // Learned aliases are user-verified, treat as high confidence
            });
        }
    }

    None
}

/// Log a user correction and update the learned_aliases table.
pub async fn log_correction(
    pool: &sqlx::PgPool,
    user_id: uuid::Uuid,
    original_name: &str,
    original_match: Option<&str>,
    corrected_slug: &str,
    session_id: Option<uuid::Uuid>,
) {
    let normalized = original_name.trim().to_lowercase();

    // Log the individual correction
    let _ = sqlx::query(
        r#"INSERT INTO marker_corrections (user_id, original_name, original_match, corrected_slug, import_session_id)
           VALUES ($1, $2, $3, $4, $5)"#,
    )
    .bind(user_id)
    .bind(&normalized)
    .bind(original_match)
    .bind(corrected_slug)
    .bind(session_id)
    .execute(pool)
    .await;

    // Upsert learned_aliases with aggregated counts
    let _ = sqlx::query(
        r#"INSERT INTO learned_aliases (alias_text, target_slug, correction_count, distinct_users)
           VALUES ($1, $2, 1, 1)
           ON CONFLICT (alias_text) DO UPDATE SET
               target_slug = CASE
                   WHEN learned_aliases.correction_count >= (
                       SELECT COUNT(*) FROM marker_corrections
                       WHERE lower(original_name) = $1 AND corrected_slug = $2
                   ) THEN learned_aliases.target_slug
                   ELSE $2
               END,
               correction_count = (
                   SELECT COUNT(*) FROM marker_corrections WHERE lower(original_name) = $1 AND corrected_slug = $2
               ),
               distinct_users = (
                   SELECT COUNT(DISTINCT user_id) FROM marker_corrections WHERE lower(original_name) = $1 AND corrected_slug = $2
               ),
               promoted_at = CASE
                   WHEN (SELECT COUNT(DISTINCT user_id) FROM marker_corrections WHERE lower(original_name) = $1 AND corrected_slug = $2) >= 5
                   THEN COALESCE(learned_aliases.promoted_at, NOW())
                   ELSE learned_aliases.promoted_at
               END,
               updated_at = NOW()"#,
    )
    .bind(&normalized)
    .bind(corrected_slug)
    .execute(pool)
    .await;
}

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
        "hba1c" => {
            if from.contains("mmol") {
                // IFCC mmol/mol → DCCT %: % = mmol/mol × 0.0915 + 2.15
                Some((value * 0.0915 + 2.15, "%"))
            } else {
                None // already %
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
        // Sex Hormone Binding Globulin (lab PDF format, no hyphen)
        assert_eq!(match_marker("Sex Hormone Binding Globulin"), Some("shbg"));
        // German lab format
        assert_eq!(
            match_marker("Sexualhormon-bindendes Globulin"),
            Some("shbg")
        );
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
    fn test_match_european_naming() {
        // ALAT/ASAT are IFCC-standard European names
        assert_eq!(match_marker("ALAT"), Some("alt"));
        assert_eq!(match_marker("ASAT"), Some("ast"));
        assert_eq!(match_marker("Alanin-Aminotransferase"), Some("alt"));
        assert_eq!(match_marker("Aspartat-Aminotransferase"), Some("ast"));
        // CREA/Krea
        assert_eq!(match_marker("CREA"), Some("creatinine"));
        assert_eq!(match_marker("Krea"), Some("creatinine"));
        // Fe
        assert_eq!(match_marker("Fe"), Some("iron"));
    }

    #[test]
    fn test_match_structural_minerals() {
        assert_eq!(match_marker("Calcium"), Some("calcium"));
        assert_eq!(match_marker("Kalzium"), Some("calcium"));
        assert_eq!(match_marker("Magnesium"), Some("magnesium"));
        assert_eq!(match_marker("Potassium"), Some("potassium"));
        assert_eq!(match_marker("Kalium"), Some("potassium"));
        assert_eq!(match_marker("Sodium"), Some("sodium"));
        assert_eq!(match_marker("Natrium"), Some("sodium"));
    }

    #[test]
    fn test_match_detoxification_new() {
        assert_eq!(match_marker("eGFR"), Some("egfr"));
        assert_eq!(match_marker("Glomeruläre Filtrationsrate"), Some("egfr"));
        assert_eq!(match_marker("LDH"), Some("ldh"));
        assert_eq!(match_marker("Laktatdehydrogenase"), Some("ldh"));
        assert_eq!(match_marker("Amylase"), Some("amylase"));
        assert_eq!(match_marker("Pankreas-Amylase"), Some("amylase"));
        assert_eq!(match_marker("Lipase"), Some("lipase"));
        assert_eq!(match_marker("Harnstoff"), Some("bun"));
        assert_eq!(match_marker("BUN"), Some("bun"));
        assert_eq!(match_marker("Urea"), Some("bun"));
    }

    #[test]
    fn test_match_hormonal_new() {
        assert_eq!(match_marker("Free Testosterone"), Some("free_testosterone"));
        assert_eq!(
            match_marker("Freies Testosteron"),
            Some("free_testosterone")
        );
        assert_eq!(match_marker("Progesterone"), Some("progesterone"));
        assert_eq!(match_marker("Progesteron"), Some("progesterone"));
        assert_eq!(match_marker("Prolactin"), Some("prolactin"));
        assert_eq!(match_marker("Prolaktin"), Some("prolactin"));
        assert_eq!(match_marker("FSH"), Some("fsh"));
        assert_eq!(match_marker("Follikelstimulierendes Hormon"), Some("fsh"));
        assert_eq!(match_marker("LH"), Some("lh"));
        assert_eq!(match_marker("Luteinisierendes Hormon"), Some("lh"));
    }

    #[test]
    fn test_match_nutritional_new() {
        assert_eq!(match_marker("DHA"), Some("dha"));
        assert_eq!(match_marker("Docosahexaensäure"), Some("dha"));
        assert_eq!(match_marker("EPA"), Some("epa"));
        assert_eq!(match_marker("Eicosapentaensäure"), Some("epa"));
        assert_eq!(match_marker("Omega-3 Index"), Some("omega3_index"));
        assert_eq!(match_marker("Transferrin"), Some("transferrin"));
        assert_eq!(
            match_marker("Transferrinsättigung"),
            Some("transferrin_sat")
        );
        assert_eq!(match_marker("TSAT"), Some("transferrin_sat"));
        assert_eq!(match_marker("Vitamin B2"), Some("vitamin_b2"));
        assert_eq!(match_marker("Riboflavin"), Some("vitamin_b2"));
        assert_eq!(match_marker("Vitamin B6"), Some("vitamin_b6"));
        assert_eq!(match_marker("Pyridoxalphosphat"), Some("vitamin_b6"));
    }

    #[test]
    fn test_match_cardiovascular_new() {
        assert_eq!(match_marker("Non-HDL-Cholesterin"), Some("non_hdl_c"));
        assert_eq!(match_marker("Non-HDL Cholesterol"), Some("non_hdl_c"));
        assert_eq!(match_marker("VLDL"), Some("vldl_c"));
        assert_eq!(match_marker("VLDL-Cholesterin"), Some("vldl_c"));
    }

    #[test]
    fn test_match_immune_new() {
        assert_eq!(match_marker("IgG"), Some("igg"));
        assert_eq!(match_marker("Immunoglobulin G"), Some("igg"));
    }

    #[test]
    fn test_bilirubin_maps_to_total() {
        assert_eq!(match_marker("Bilirubin"), Some("bilirubin_total"));
        assert_eq!(match_marker("Bilirubin gesamt"), Some("bilirubin_total"));
        assert_eq!(match_marker("Total Bilirubin"), Some("bilirubin_total"));
    }

    #[test]
    fn test_free_androgen_index_aliases() {
        assert_eq!(match_marker("FTI"), Some("free_androgen_index"));
        assert_eq!(
            match_marker("Free Testosterone Index"),
            Some("free_androgen_index")
        );
        assert_eq!(
            match_marker("Free Androgen Index"),
            Some("free_androgen_index")
        );
    }

    #[test]
    fn test_match_german_lab_abbreviations() {
        // GFR MDRD variants → egfr
        assert_eq!(match_marker("GFR (MDRD-kurz)"), Some("egfr"));
        assert_eq!(match_marker("GFR (MDRD)"), Some("egfr"));
        assert_eq!(match_marker("GFR MDRD"), Some("egfr"));
        // HbA1c with method suffix
        assert_eq!(match_marker("HbA1c (HPLC)"), Some("hba1c"));
        assert_eq!(match_marker("HbA1c (IFCC)"), Some("hba1c"));
        assert_eq!(match_marker("HbA1c HPLC"), Some("hba1c"));
        // German abbreviations
        assert_eq!(match_marker("Cholesterin Ges."), Some("total_cholesterol"));
        assert_eq!(match_marker("Cholesterin ges"), Some("total_cholesterol"));
        assert_eq!(match_marker("Alkal. Phosphatase"), Some("alp"));
        assert_eq!(match_marker("Bilirubin Ges."), Some("bilirubin_total"));
        assert_eq!(match_marker("Bilirubin ges"), Some("bilirubin_total"));
    }

    #[test]
    fn test_match_body_composition_new() {
        // Skeletal muscle
        assert_eq!(match_marker("Skeletal Muscle"), Some("skeletal_muscle_pct"));
        assert_eq!(match_marker("Skelettmuskel"), Some("skeletal_muscle_pct"));
        // Muscle mass (kg) vs muscle % disambiguation
        assert_eq!(match_marker("Muscle Mass"), Some("muscle_mass_kg"));
        assert_eq!(match_marker("Muskelmasse"), Some("muscle_mass_kg"));
        assert_eq!(match_marker("Muscle %"), Some("muscle_pct"));
        assert_eq!(match_marker("Muskelanteil"), Some("muscle_pct"));
        // Subcutaneous fat
        assert_eq!(
            match_marker("Subcutaneous Fat"),
            Some("subcutaneous_fat_pct")
        );
        assert_eq!(
            match_marker("Subkutanes Fett"),
            Some("subcutaneous_fat_pct")
        );
        // Visceral fat
        assert_eq!(match_marker("Visceral Fat"), Some("visceral_fat"));
        assert_eq!(match_marker("Viszeralfett"), Some("visceral_fat"));
        // Fat-free mass
        assert_eq!(match_marker("Fat-Free Mass"), Some("fat_free_mass"));
        assert_eq!(match_marker("Lean Mass"), Some("fat_free_mass"));
        assert_eq!(match_marker("Fettfreie Masse"), Some("fat_free_mass"));
        // BMR
        assert_eq!(match_marker("BMR"), Some("bmr"));
        assert_eq!(match_marker("Grundumsatz"), Some("bmr"));
        assert_eq!(match_marker("Basal Metabolic Rate"), Some("bmr"));
        // Metabolic age
        assert_eq!(match_marker("Metabolic Age"), Some("metabolic_age"));
        assert_eq!(match_marker("Stoffwechselalter"), Some("metabolic_age"));
        // Body protein
        assert_eq!(match_marker("Body Protein"), Some("body_protein_pct"));
        assert_eq!(match_marker("Körperprotein"), Some("body_protein_pct"));
        // Bone mass (kg) vs bone mass (%)
        assert_eq!(match_marker("Bone Mass"), Some("bone_mass_kg"));
        assert_eq!(match_marker("Knochenmasse"), Some("bone_mass_kg"));
        assert_eq!(match_marker("Bone Mass %"), Some("bone_mass_pct"));
        assert_eq!(match_marker("Knochenmasse %"), Some("bone_mass_pct"));
    }

    #[test]
    fn test_match_calprotectin() {
        assert_eq!(match_marker("Calprotectin"), Some("calprotectin"));
        assert_eq!(match_marker("Calprotectin i.St."), Some("calprotectin"));
        assert_eq!(match_marker("Fäkales Calprotectin"), Some("calprotectin"));
        assert_eq!(match_marker("Fecal Calprotectin"), Some("calprotectin"));
        assert_eq!(match_marker("Calprotectin (CLIA)"), Some("calprotectin"));
    }

    #[test]
    fn test_body_comp_kg_vs_pct_no_cross_contamination() {
        // "muscle mass kg" must NOT match muscle_pct
        assert_eq!(match_marker("Muscle Mass kg"), Some("muscle_mass_kg"));
        assert_ne!(match_marker("Muscle Mass kg"), Some("muscle_pct"));
        // "Muskelmasse kg" must NOT match muscle_pct
        assert_eq!(match_marker("Muskelmasse kg"), Some("muscle_mass_kg"));
        // "bone mass kg" must NOT match bone_mass_pct
        assert_eq!(match_marker("Bone Mass kg"), Some("bone_mass_kg"));
        assert_ne!(match_marker("Bone Mass kg"), Some("bone_mass_pct"));
        // Existing % markers still work
        assert_eq!(match_marker("Body Fat %"), Some("body_fat_pct"));
        assert_eq!(match_marker("Body Water %"), Some("body_water_pct"));
    }

    #[test]
    fn test_renpho_smart_scale_labels() {
        // Labels as they appear in Renpho app screenshots (German)
        assert_eq!(match_marker("Gewicht"), Some("weight"));
        assert_eq!(match_marker("Körperfett"), Some("body_fat_pct"));
        assert_eq!(match_marker("Körperwasser"), Some("body_water_pct"));
        assert_eq!(match_marker("Skelettmuskel"), Some("skeletal_muscle_pct"));
        assert_eq!(match_marker("Viszeralfett"), Some("visceral_fat"));
        assert_eq!(match_marker("Grundumsatz"), Some("bmr"));
        assert_eq!(match_marker("Stoffwechselalter"), Some("metabolic_age"));
        assert_eq!(
            match_marker("Subkutanes Fett"),
            Some("subcutaneous_fat_pct")
        );
        assert_eq!(match_marker("Fettfreie Masse"), Some("fat_free_mass"));
        assert_eq!(match_marker("Körperprotein"), Some("body_protein_pct"));
    }

    #[test]
    fn test_german_lab_report_real_world() {
        // Real strings from German lab reports (Laborbefund)
        assert_eq!(match_marker("GFR (MDRD-kurz)"), Some("egfr"));
        assert_eq!(match_marker("HbA1c (HPLC)"), Some("hba1c"));
        assert_eq!(match_marker("Cholesterin Ges."), Some("total_cholesterol"));
        assert_eq!(match_marker("Alkal. Phosphatase"), Some("alp"));
        assert_eq!(match_marker("Bilirubin Ges."), Some("bilirubin_total"));
        assert_eq!(match_marker("Calprotectin i.St."), Some("calprotectin"));
        // These should NOT match the wrong marker
        assert_ne!(match_marker("Calprotectin i.St."), Some("calcium"));
        assert_ne!(match_marker("GFR (MDRD)"), Some("ggt"));
    }

    #[test]
    fn test_chloride_aliases() {
        assert_eq!(match_marker("Chloride"), Some("chloride"));
        assert_eq!(match_marker("Chlorid"), Some("chloride"));
        assert_eq!(match_marker("CLD-E"), Some("chloride"));
    }

    #[test]
    fn test_protein_disambiguation() {
        // "Body Protein" → body_protein_pct (scale), NOT total_protein (blood test)
        assert_eq!(match_marker("Body Protein"), Some("body_protein_pct"));
        assert_eq!(match_marker("Protein %"), Some("body_protein_pct"));
        // "Total Protein" → total_protein (blood test)
        assert_eq!(match_marker("Total Protein"), Some("total_protein"));
        assert_eq!(match_marker("Gesamtprotein"), Some("total_protein"));
    }

    #[test]
    fn test_aliases_by_slug_includes_new_markers() {
        let grouped = aliases_by_slug();
        // New body comp markers should have aliases
        assert!(grouped.contains_key("skeletal_muscle_pct"));
        assert!(grouped.contains_key("visceral_fat"));
        assert!(grouped.contains_key("bmr"));
        assert!(grouped.contains_key("metabolic_age"));
        assert!(grouped.contains_key("calprotectin"));
        // Each should have at least 1 alias
        assert!(!grouped["skeletal_muscle_pct"].is_empty());
        assert!(!grouped["visceral_fat"].is_empty());
        assert!(!grouped["calprotectin"].is_empty());
    }

    #[test]
    fn test_fuzzy_match_typos() {
        // 1-char typos should match
        assert_eq!(match_marker("Glucoss"), Some("glucose")); // extra s
        assert_eq!(match_marker("Hemoglobn"), Some("hemoglobin")); // missing i
        assert_eq!(match_marker("Creatinin"), Some("creatinine")); // missing e
        assert_eq!(match_marker("Triglyzerid"), Some("triglycerides")); // close to triglyzeride alias
    }

    #[test]
    fn test_fuzzy_match_returns_correct_tier() {
        let result = match_marker_detailed("Glucoss");
        assert!(result.is_some());
        assert_eq!(result.unwrap().tier, MatchTier::Fuzzy);

        let result = match_marker_detailed("Glucose");
        assert!(result.is_some());
        assert_eq!(result.unwrap().tier, MatchTier::Exact);
    }

    #[test]
    fn test_fuzzy_no_false_positive_short() {
        // Short inputs (< 6 chars) should NOT trigger fuzzy
        // "Glu" matches via exact/contains, not fuzzy
        let result = match_marker_detailed("Glu");
        assert!(result.is_some());
        assert_ne!(result.unwrap().tier, MatchTier::Fuzzy);
    }

    #[test]
    fn test_fuzzy_no_wild_matches() {
        // Very different strings should NOT match
        assert_eq!(match_marker("RandomTestMarker"), None);
        assert_eq!(match_marker("XYZABC"), None);
    }

    #[test]
    fn test_convert_glucose() {
        let (val, unit) = convert_unit("glucose", 90.0, "mg/dL").unwrap();
        assert!((val - 5.0).abs() < 0.01);
        assert_eq!(unit, "mmol/L");
    }

    // ── Sprint 020 regression suite: comprehensive marker coverage ──

    #[test]
    fn test_regression_all_common_english_lab_markers() {
        let cases = [
            ("Glucose", "glucose"),
            ("Fasting Glucose", "glucose"),
            ("HbA1c", "hba1c"),
            ("Hemoglobin A1c", "hba1c"),
            ("Total Cholesterol", "total_cholesterol"),
            ("LDL Cholesterol", "ldl_c"),
            ("HDL Cholesterol", "hdl_c"),
            ("Triglycerides", "triglycerides"),
            ("Creatinine", "creatinine"),
            ("Uric Acid", "uric_acid"),
            ("Iron", "iron"),
            ("Ferritin", "ferritin"),
            ("Hemoglobin", "hemoglobin"),
            ("Hematocrit", "hematocrit"),
            ("White Blood Cells", "wbc"),
            ("Red Blood Cells", "rbc"),
            ("Platelets", "platelets"),
            ("TSH", "tsh"),
            ("Free T4", "free_t4"),
            ("Free T3", "free_t3"),
            ("Vitamin D", "vitamin_d"),
            ("Vitamin B12", "vitamin_b12"),
            ("Folate", "folate"),
            ("AST", "ast"),
            ("ALT", "alt"),
            ("GGT", "ggt"),
            ("Alkaline Phosphatase", "alp"),
            ("Bilirubin Total", "bilirubin_total"),
            ("Total Protein", "total_protein"),
            ("Albumin", "albumin"),
            ("C-Reactive Protein", "hs_crp"),
            ("Testosterone", "testosterone"),
            ("Cortisol", "cortisol"),
            ("Insulin", "insulin"),
        ];
        for (input, expected) in &cases {
            assert_eq!(
                match_marker(input),
                Some(*expected),
                "Failed: '{}' should match '{}'",
                input,
                expected
            );
        }
    }

    #[test]
    fn test_regression_all_common_german_lab_markers() {
        let cases = [
            ("Blutzucker", "glucose"),
            ("Nüchternglukose", "glucose"),
            ("Harnsäure", "uric_acid"),
            ("Kreatinin", "creatinine"),
            ("Eisen", "iron"),
            ("Hämoglobin", "hemoglobin"),
            ("Hämatokrit", "hematocrit"),
            ("Leukozyten", "wbc"),
            ("Erythrozyten", "rbc"),
            ("Thrombozyten", "platelets"),
            ("Cholesterin gesamt", "total_cholesterol"),
            ("Folsäure", "folate"),
            ("Kalzium", "calcium"),
            ("Kalium", "potassium"),
            ("Natrium", "sodium"),
            ("Harnstoff", "bun"),
            ("Testosteron", "testosterone"),
            ("Progesteron", "progesterone"),
            ("Prolaktin", "prolactin"),
            ("Homocystein", "homocysteine"),
        ];
        for (input, expected) in &cases {
            assert_eq!(
                match_marker(input),
                Some(*expected),
                "Failed: '{}' should match '{}'",
                input,
                expected
            );
        }
    }

    #[test]
    fn test_regression_unit_conversions() {
        // Glucose mg/dL → mmol/L
        let (v, u) = convert_unit("glucose", 100.0, "mg/dL").unwrap();
        assert!((v - 5.556).abs() < 0.01);
        assert_eq!(u, "mmol/L");

        // Cholesterol mg/dL → mmol/L
        let (v, u) = convert_unit("total_cholesterol", 200.0, "mg/dL").unwrap();
        assert!((v - 5.174).abs() < 0.01);
        assert_eq!(u, "mmol/L");

        // Triglycerides mg/dL → mmol/L
        let (v, u) = convert_unit("triglycerides", 150.0, "mg/dL").unwrap();
        assert!((v - 1.693).abs() < 0.01);
        assert_eq!(u, "mmol/L");

        // Vitamin D ng/mL → nmol/L
        let (v, u) = convert_unit("vitamin_d", 30.0, "ng/mL").unwrap();
        assert!((v - 74.88).abs() < 0.1);
        assert_eq!(u, "nmol/L");

        // HbA1c mmol/mol → %
        let (v, u) = convert_unit("hba1c", 37.0, "mmol/mol").unwrap();
        assert!((v - 5.54).abs() < 0.1);
        assert_eq!(u, "%");

        // HbA1c already in % — no conversion
        assert!(convert_unit("hba1c", 5.5, "%").is_none());

        // No conversion needed (already canonical)
        assert!(convert_unit("glucose", 5.5, "mmol/L").is_none());
        assert!(convert_unit("weight", 70.0, "kg").is_none());
    }

    #[test]
    fn test_regression_no_false_positives_short_strings() {
        // 2-char inputs should match via exact only, not reverse-contains
        // "Fe" → iron (exact match)
        assert_eq!(match_marker("Fe"), Some("iron"));
        // "Ca" → calcium (exact match)
        assert_eq!(match_marker("Ca"), Some("calcium"));
        // "Mg" → magnesium (exact match)
        assert_eq!(match_marker("Mg"), Some("magnesium"));
    }

    #[test]
    fn test_regression_whitespace_handling() {
        assert_eq!(match_marker("  Glucose  "), Some("glucose"));
        assert_eq!(match_marker("\tHbA1c\n"), Some("hba1c"));
        assert_eq!(match_marker("Total Cholesterol"), Some("total_cholesterol"));
    }

    #[test]
    fn test_regression_case_insensitivity() {
        assert_eq!(match_marker("GLUCOSE"), Some("glucose"));
        assert_eq!(match_marker("glucose"), Some("glucose"));
        assert_eq!(match_marker("Glucose"), Some("glucose"));
        assert_eq!(match_marker("HBA1C"), Some("hba1c"));
        assert_eq!(match_marker("hba1c"), Some("hba1c"));
    }
}
