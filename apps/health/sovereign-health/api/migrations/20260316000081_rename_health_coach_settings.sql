-- Migration 081: Rename dr_alex_* admin settings to health_coach_* for the website public chatbot.
-- The app's Dr. Alex (doctor_chat) settings are unchanged.

UPDATE app_settings SET key = 'health_coach_web_enabled' WHERE key = 'dr_alex_web_enabled';
UPDATE app_settings SET key = 'health_coach_daily_limit' WHERE key = 'dr_alex_daily_limit';
UPDATE app_settings SET key = 'health_coach_session_limit' WHERE key = 'dr_alex_session_limit';
UPDATE app_settings SET key = 'health_coach_model' WHERE key = 'dr_alex_model';
UPDATE app_settings SET key = 'health_coach_max_tokens' WHERE key = 'dr_alex_max_tokens';
