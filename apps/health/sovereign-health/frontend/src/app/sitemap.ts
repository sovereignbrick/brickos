import type { MetadataRoute } from 'next'

const BASE_URL = 'https://app.sovereignhealth.io'

const ZONE_SLUGS = [
  'energy_metabolic',
  'structural',
  'cardiovascular',
  'cognitive',
  'immune',
  'nutritional',
  'hormonal',
  'detoxification',
]

const MARKER_SLUGS = [
  // Standard markers
  'glucose', 'ketones', 'total_cholesterol', 'uric_acid', 'hemoglobin', 'hematocrit',
  'bp_systolic', 'bp_diastolic', 'heart_rate', 'weight', 'waist_circumference', 'insulin',
  'hba1c', 'tsh', 'ft4', 'ft3', 'ldl_c', 'hdl_c', 'triglycerides', 'apob', 'lpa',
  'hs_crp', 'non_hdl_c', 'albumin', 'total_protein', 'calcium', 'magnesium', 'potassium',
  'phosphate', 'creatinine', 'egfr', 'cystatin_c', 'alt', 'ast', 'ggt', 'alp', 'ldh',
  'bilirubin_total', 'bilirubin_direct', 'testosterone', 'free_testosterone',
  'free_androgen_index', 'shbg', 'estradiol', 'progesterone', 'prolactin', 'fsh', 'lh',
  'dheas', 'iron', 'ferritin', 'transferrin', 'transferrin_sat', 'vitamin_d', 'vitamin_b12',
  'holo_tc', 'vitamin_b1', 'vitamin_b2', 'vitamin_b3', 'vitamin_b5', 'vitamin_b6',
  'folate', 'vitamin_a', 'vitamin_e', 'sodium', 'zinc', 'selenium', 'homocysteine',
  'epa', 'dha', 'omega3_index', 'wbc', 'rbc', 'platelets', 'neutrophils_pct',
  'neutrophils_abs', 'lymphocytes_pct', 'lymphocytes_abs', 'monocytes_pct', 'monocytes_abs',
  'eosinophils_pct', 'eosinophils_abs', 'basophils_pct', 'basophils_abs',
  // Body composition
  'body_fat_pct', 'body_water_pct', 'muscle_pct', 'bone_mass_pct',
  // Calculated markers
  'gki', 'dr_boz_ratio', 'whtr', 'bmi', 'hct_hb_ratio', 'tg_hdl_ratio', 'homa_ir', 'tyg_index',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/dashboard`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const zonePages: MetadataRoute.Sitemap = ZONE_SLUGS.map(slug => ({
    url: `${BASE_URL}/zones/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const markerPages: MetadataRoute.Sitemap = MARKER_SLUGS.map(slug => ({
    url: `${BASE_URL}/markers/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...zonePages, ...markerPages]
}
