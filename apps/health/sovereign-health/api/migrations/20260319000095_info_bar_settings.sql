-- Information Bar Settings
-- Two sets of settings: one for the app (app.sovereignhealth.io) and one
-- for the homepage (sovereignhealth.io). Admins can configure message,
-- color, optional CTA button, and on/off toggle from the admin panel.

INSERT INTO app_settings (key, value, description, category) VALUES
  -- App info bar
  ('app_infobar_enabled',    'false',                                   'Show info bar on the app',                      'infobar_app'),
  ('app_infobar_message',    '""',                                      'Message text displayed in the app info bar',     'infobar_app'),
  ('app_infobar_color',      '"blue"',                                  'Background color: blue, yellow, red, green, purple', 'infobar_app'),
  ('app_infobar_button',     'false',                                   'Show a CTA button in the info bar',             'infobar_app'),
  ('app_infobar_button_text','""',                                      'Button label text',                             'infobar_app'),
  ('app_infobar_button_url', '""',                                      'Button link URL',                               'infobar_app'),
  -- Homepage info bar
  ('web_infobar_enabled',    'false',                                   'Show info bar on the homepage',                 'infobar_web'),
  ('web_infobar_message',    '""',                                      'Message text displayed on the homepage info bar','infobar_web'),
  ('web_infobar_color',      '"blue"',                                  'Background color: blue, yellow, red, green, purple', 'infobar_web'),
  ('web_infobar_button',     'false',                                   'Show a CTA button in the info bar',             'infobar_web'),
  ('web_infobar_button_text','""',                                      'Button label text',                             'infobar_web'),
  ('web_infobar_button_url', '""',                                      'Button link URL',                               'infobar_web')
ON CONFLICT (key) DO NOTHING;
