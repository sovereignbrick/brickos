-- Replace em-dashes with regular dashes in marker translation content
UPDATE marker_translations
SET why_it_matters = REPLACE(why_it_matters, E'\u2014', ' - '),
    when_to_worry = REPLACE(when_to_worry, E'\u2014', ' - '),
    updated_at = NOW()
WHERE why_it_matters LIKE E'%\u2014%'
   OR when_to_worry LIKE E'%\u2014%';
