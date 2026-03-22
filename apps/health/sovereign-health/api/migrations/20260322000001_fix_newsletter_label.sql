-- Remove "monthly" from newsletter signup label
-- EN: "Send me the monthly newsletter" -> "Subscribe to newsletter"
-- DE: "Monatlichen Newsletter erhalten" -> "Newsletter erhalten"
UPDATE content_strings
SET value_en = 'Subscribe to newsletter',
    value_de = 'Newsletter erhalten'
WHERE section = 'app'
  AND key = 'auth.signup.newsletter';
