-- Fix Clarity and Horizon tiers to have unlimited quotas for ALL features
-- Previously chat_lab_import_monthly and chat_med_import_monthly were not set to NULL

UPDATE license_tiers SET
    chat_general_monthly = NULL,
    chat_trends_monthly = NULL,
    chat_labs_monthly = NULL,
    chat_diet_monthly = NULL,
    chat_supplements_monthly = NULL,
    chat_protocols_monthly = NULL,
    chat_lab_import_monthly = NULL,
    chat_med_import_monthly = NULL,
    updated_at = NOW()
WHERE slug IN ('clarity', 'horizon');
