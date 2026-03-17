-- Add lab-specific address fields to devices (for device_type = 'lab')
ALTER TABLE devices ADD COLUMN IF NOT EXISTS lab_address TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS lab_postal_code TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS lab_city TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS lab_country TEXT;
