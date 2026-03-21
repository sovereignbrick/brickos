export interface User {
  id: string
  email: string
  display_name: string | null
  role: string
  tier: string
  created_at: string
  country_code?: string | null
  tier_info?: { slug: string; name: string }
}

export interface Zone {
  zone_slug: string
  zone_name: string
  zone_icon: string
  zone_color: string
  display_order: number
  marker_count: number
  markers_with_data: number
  status_summary: {
    green: number
    orange: number
    red: number
  }
}

export interface MeasurementValue {
  marker_slug: string
  value: number
}

export interface Measurement {
  id: string
  marker_slug: string
  marker_name: string
  timestamp: string
  value: number
  unit: string
  status: string | null
  protocol_tag: string
  fasting_protocol: string | null
  fasting_hours: number | null
  diet_protocol: string | null
  meal_timing_tag: string
  exercise_activity: string | null
  sleep_hours: number | null
  sleep_quality: string | null
  stress_level: number | null
  lifestyle_note: string | null
  device_id: string | null
  device_name: string | null
  created_at: string
}

export interface CalculatedMarker {
  marker_slug: string
  marker_name: string
  formula: string
  latest_value: number | null
  status: string | null
  measured_at: string | null
  protocol_tag: string | null
}

export interface TrendPoint {
  measured_at: string
  value: number
  status: string | null
  protocol_tag: string
}

export interface TrendData {
  marker_slug: string
  marker_name: string
  unit: string
  points: TrendPoint[]
}

export interface ApiResponse<T> {
  data: T | null
  error: { code: string; message: string } | null
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: { page: number; per_page: number; total: number }
  error: null
}

export interface MarkerLatest {
  marker_slug: string
  marker_name: string
  latest_value: number | null
  unit: string
  status: string | null
  measured_at: string | null
  source_type?: string
  device_name?: string | null
  device_archived?: boolean | null
  marker_type?: string
}

export interface ZoneDetail {
  zone_slug: string
  zone_name: string
  zone_icon: string
  zone_color: string
  markers: MarkerLatest[]
  markers_total: number
  markers_with_data: number
}

export interface DoctorChatResponse {
  conversation_id: string
  message_id: string
  answer: string
  remaining_quota: number
  monthly_limit: number
}

export interface Conversation {
  id: string
  title: string | null
  agent_type?: string | null
  created_at: string
  updated_at: string
  message_count: number
}

export interface ConversationDetail {
  id: string
  title: string | null
  created_at: string
  messages: ChatMessage[]
}

export interface ChatMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  tokens_used?: number
  created_at: string
}

export interface MarkerDef {
  marker_slug: string
  marker_name: string
  unit_canonical: string
  display_order: number
  zone_slug: string
}

export interface DeviceInfo {
  id: string
  device_name: string
  name: string
  manufacturer: string | null
  model: string | null
  device_type: string
  markers_measured: string[]
  status: string
  is_default: boolean
  notes: string | null
  measurement_location: string | null
  measurement_count: number
  last_used: string | null
  validation_date: string | null
  validation_notes: string | null
  validation_status: string | null
  lab_address?: string | null
  lab_postal_code?: string | null
  lab_city?: string | null
  lab_country?: string | null
}

export interface QuotaResponse {
  requests_used: number
  requests_limit: number
  remaining: number
  month: string
  resets_at: string
}

export interface MarkerReferenceRange {
  green_min: number | null
  green_max: number | null
  yellow_low_min: number | null
  yellow_low_max: number | null
  yellow_high_min: number | null
  yellow_high_max: number | null
  red_low_max: number | null
  red_high_min: number | null
  unit: string
}

export interface MarkerZone {
  slug: string
  name: string
  icon: string
}

export interface MarkerLatestValue {
  value: number
  unit: string
  timestamp: string
  status: string | null
  device_name?: string | null
}

export interface MarkerDetail {
  marker_id: string
  name: string
  unit: string
  source_type: string
  formula?: string
  zones: MarkerZone[]
  reference_range: MarkerReferenceRange | null
  fasting_range: MarkerReferenceRange | null
  latest: MarkerLatestValue | null
  is_calculated: boolean
  description?: string | null
  fasting_explanation?: string | null
  why_it_matters?: string | null
  when_to_worry?: string | null
  base_markers?: string[]
}

export interface MarkerMeasurement {
  id: string
  value: number
  unit: string
  timestamp: string
  status: string | null
  protocol_tag: string
  fasting_protocol: string | null
  fasting_hours: number | null
  diet_protocol: string | null
  meal_timing_tag: string
  exercise_activity: string | null
  sleep_hours: number | null
  sleep_quality: string | null
  stress_level: number | null
  lifestyle_note: string | null
  device_name: string | null
  lab_name: string | null
}

export interface MarkerContent {
  id: string
  content_type: string
  title: string
  body_text: string
  display_order: number
}

export interface MarkerFood {
  id: string
  food_name: string
  food_name_de: string | null
  food_category: string | null
  display_order: number
}

export interface MarkerSupplement {
  id: string
  supplement_name: string
  typical_dose: string | null
  notes: string | null
  display_order: number
}

export interface MarkerReference {
  id: string
  title: string
  source: string | null
  year: number | null
  url: string | null
  display_order: number
}

export interface MeasurementFilters {
  devices: { id: string; name: string; device_type?: string }[]
  markers: { slug: string; name: string; count: number }[]
  protocols: string[]
  source_types: string[]
  date_range: { earliest: string | null; latest: string | null }
}

export interface UserProfile {
  display_name: string | null
  email: string
  tier: string
  locale: string | null
  gender: string | null
  age: number | null
  height_cm: number | null
  default_waist_cm: number | null
  default_weight_kg: number | null
  country_code: string | null
  customer_type: string | null
  company_name: string | null
  vat_id: string | null
  billing_address_line1: string | null
  billing_address_line2: string | null
  billing_address_city: string | null
  billing_address_postal_code: string | null
  billing_address_state: string | null
  billing_address_country: string | null
}

export interface UnitPreferences {
  date_format: string
  time_format: string
  glucose_unit: string
  ketones_unit: string
  cholesterol_unit: string
  uric_acid_unit: string
  hemoglobin_unit: string
  weight_unit: string
  height_unit: string
  bp_unit: string
  waist_unit: string
  extended_entry_enabled: boolean
}

export interface LifestyleDefaults {
  show_extended_lifestyle: boolean
  default_diet_protocol: string | null
  default_fasting_protocol: string | null
  default_exercise: string | null
  default_sleep_hours: number | null
  default_sleep_quality: string | null
  default_stress_level: number | null
}

export interface CustomReferenceRange {
  marker_slug: string
  marker_name: string
  unit: string
  protocol_context: string
  orange_min: number | null
  green_min: number | null
  green_max: number | null
  orange_max: number | null
}

export interface MarkerWithZone {
  marker_slug: string
  marker_name: string
  display_name: string | null
  abbreviation: string | null
  what_is: string | null
  unit_canonical: string
  display_order: number
  zone_slug: string | null
  zone_name: string | null
  zone_icon: string | null
  zone_color: string | null
  zone_order: number
}

export interface CalculatedMarkerDef {
  marker_slug: string
  marker_name: string
  default_thresholds: {
    green_min?: number | null
    green_max?: number | null
    orange_min?: number | null
    orange_max?: number | null
  }
  zone_slug: string | null
  zone_name: string | null
  zone_icon: string | null
  zone_color: string | null
  zone_order: number
}

export interface TemplateDefaults {
  meal_timing?: string
  sleep_hours?: string
  sleep_quality?: string
  stress_level?: string
  protocol?: string
  fasting_protocol?: string
  fast_start?: string
  note?: string
}

export interface MeasurementTemplate {
  id: string
  name: string
  marker_slugs: string[]
  is_default: boolean
  display_order: number
  last_used_at: string | null
  defaults: TemplateDefaults | null
}

export interface UserSettings {
  profile: UserProfile
  units: UnitPreferences
  lifestyle_defaults: LifestyleDefaults
  custom_reference_ranges: CustomReferenceRange[]
  system_reference_ranges: CustomReferenceRange[]
  all_markers: MarkerWithZone[]
  calculated_markers: CalculatedMarkerDef[]
  share_anonymous_data: boolean
}

export interface MedicationCatalogItem {
  slug: string
  name: string
  category: string
  description: string | null
  common_dosages: string[]
  common_frequencies: string[]
  affected_markers: string[]
}

export interface UserMedication {
  id: string
  medication_slug: string | null
  name: string
  category: string
  dosage: string | null
  frequency: string | null
  timing: string | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  is_active: boolean
}

export interface MedicationInteraction {
  medication_a: string
  medication_b: string
  severity: string
  description: string
}

export interface LicenseTier {
  slug: string
  name: string
  tagline: string | null
  description: string | null
  price_monthly_eur: number | null
  price_annual_eur: number | null
  max_markers: number | null
  max_history_days: number | null
  max_calculated_markers: number | null
  max_templates: number | null
  max_medications: number | null
  chat_general_monthly: number | null
  chat_trends_monthly: number | null
  chat_labs_monthly: number | null
  chat_diet_monthly: number | null
  chat_supplements_monthly: number | null
  chat_protocols_monthly: number | null
  chat_lab_import_monthly: number | null
  chat_med_import_monthly: number | null
  pdf_reports_monthly: number | null
  csv_export: boolean
  json_export: boolean
  custom_thresholds: boolean
  lifestyle_presets: boolean
  protocol_comparison: boolean
  body_composition: boolean
  supplement_marker_impact: boolean
  ai_dashboard_insights: boolean
  cohort_comparison: boolean
  mfa_totp: boolean
  api_access: boolean
  self_hosted_hybrid: boolean
  team_sharing: boolean
  max_team_members: number | null
  support_level: string
  display_order: number
  highlight: boolean
}

export interface LicenseInfo {
  tier: {
    slug: string
    name: string
    tagline: string | null
    price_monthly_eur: number | null
  }
  status: string
  started_at: string
  expires_at: string | null
  is_grace_period: boolean
  limits: Record<string, unknown>
  chat_quota: Array<{
    agent_type: string
    used: number
    limit: number | null
    remaining: number | null
    resets_at: string
  }>
  downgrade_info: {
    previous_tier: string
    downgraded_at: string
    grace_period_ends: string
  } | null
}

// ── Import (Batch 28) ──

export interface ImportExtractedMarker {
  original_name: string
  matched_marker: string | null
  match_confidence: 'high' | 'medium' | 'low' | 'unmatched' | 'calculated_skip'
  value_original: number
  unit_original: string
  value_converted: number | null
  unit_converted: string | null
  reference_range: string
  flag: string
  extraction_confidence: number
}

export interface ImportSession {
  session_id: string
  file_name: string
  file_type?: string
  import_type?: string
  status: string
  extracted: ImportExtractedMarker[]
  unmatched_count?: number
  total_count?: number
  lab_date: string | null
  lab_provider: string | null
  lab_address: string | null
  lab_postal_code: string | null
  lab_city: string | null
  lab_country: string | null
  markers_extracted?: number
  markers_imported?: number
  error_message?: string | null
  created_at?: string
}

export interface ImportHistoryEntry {
  id: string
  import_type: string
  source_type: string
  markers_extracted: number
  markers_imported: number
  lab_date: string | null
  lab_provider: string | null
  file_name: string | null
  created_at: string
}

export interface ImportMedication {
  name: string
  dosage: string
  frequency: string
  form: string
  notes: string
}

export interface ExtractedMedication {
  name: string
  brand?: string | null
  type: string  // "medication" or "supplement"
  dosage: string | null
  frequency: string | null
  form: string | null
  ingredients: Array<{ name: string; amount: string | null; unit?: string; role: string; notes?: string }>
  prescriber?: string | null
}

export interface MedImportSession {
  session_id: string
  import_type: 'med_import'
  status: string
  medications: ExtractedMedication[]
  total_count: number
}

export interface MeasurementImportColumn {
  index: number
  source_name: string
  marker_slug: string | null
  abbreviation: string | null
  unit: string
  device_id: string | null
  device_name: string | null
  match_confidence: 'high' | 'medium' | 'low' | 'unmatched' | 'calculated_skip'
}

export interface MeasurementImportRow {
  date: string
  time: string
  protocol: string
  diet: string | null
  notes: string | null
  values: Record<string, number>
}

export interface MeasurementImportSession {
  session_id: string
  file_name: string
  import_type: 'measurement_import'
  status: string
  columns: MeasurementImportColumn[]
  protocols: Record<string, string> | null
  rows: MeasurementImportRow[]
  total_rows: number
  total_markers: number
}

export interface AdminUser {
  id: string
  email: string
  display_name: string | null
  role: string
  tier: string
  payment_method: string
  admin_override: boolean
  admin_override_note: string | null
  admin_override_by: string | null
  admin_override_at: string | null
  created_at: string
  last_login_at: string | null
}

export interface WebPage {
  id: string
  slug: string
  title: string
  sort_order: number
  sections: WebSection[]
}

export interface WebSection {
  id: string
  key: string
  section_type: string
  sort_order: number
  translations: Record<string, string>
}

export interface LicenseOverrideResult {
  user_id: string
  email: string
  previous_tier: string
  new_tier: string
  admin_override: boolean
  note: string | null
  changed_by: string
  changed_at: string
}

// ── Influence Factors ──

export interface InfluenceFactorIngredient {
  id: string
  name: string
  amount: string | null
  unit: string | null
  role: 'active' | 'auxiliary'
  sort_order: number
  notes: string | null
}

export interface InfluenceFactor {
  id: string
  user_id: string
  name: string
  factor_type: 'medication' | 'supplement'
  brand: string | null
  dosage: string | null
  frequency: string | null
  form: string | null
  prescriber: string | null
  start_date: string | null
  reason: string | null
  notes: string | null
  is_active: boolean
  source: string
  ingredients: InfluenceFactorIngredient[]
  created_at: string
  updated_at: string
}

export interface CreateInfluenceFactorInput {
  name: string
  factor_type: 'medication' | 'supplement'
  brand?: string
  dosage?: string
  frequency?: string
  form?: string
  prescriber?: string
  start_date?: string
  reason?: string
  notes?: string
  source?: string
  ingredients?: {
    name: string
    amount?: string
    role: 'active' | 'auxiliary'
    sort_order: number
  }[]
}

// ── User Medications (Settings) ──

export interface UserMedicationFull {
  id: string
  user_id: string
  name: string
  generic_name: string | null
  dosage: string | null
  frequency: string | null
  form: string | null
  prescriber: string | null
  start_date: string | null
  end_date: string | null
  reason: string | null
  notes: string | null
  is_active: boolean
  source: string
  factor_type: string | null
  original_images: unknown | null
  ai_extracted_data: unknown | null
  created_at: string
  updated_at: string
}

export interface CreateMedicationInput {
  name: string
  generic_name?: string
  dosage?: string
  frequency?: string
  form?: string
  prescriber?: string
  start_date?: string
  end_date?: string
  reason?: string
  notes?: string
  source?: string
  factor_type?: string
}

// ── AI Usage (Admin) ──

export interface AiUsageResponse {
  period: string
  date_range: { start: string; end: string }
  total_cost_eur: number
  total_input_tokens: number
  total_output_tokens: number
  total_calls: number
  by_user: Array<{
    user_id: string | null
    email: string
    display_name: string | null
    tier: string
    input_tokens: number
    output_tokens: number
    cost_eur: number
    calls: number
  }>
  by_model: Array<{
    model: string
    calls: number
    cost_eur: number
    input_tokens: number
    output_tokens: number
  }>
  by_type: Array<{
    session_type: string
    calls: number
    cost_eur: number
  }>
}
