-- Add days_of_week column to bookeo_classes
-- Stores which days of the week a class meets as an array of lowercase day names
-- e.g. {'monday','wednesday','friday'}
ALTER TABLE bookeo_classes
ADD COLUMN IF NOT EXISTS days_of_week text[] DEFAULT '{}';

-- Add a comment for documentation
COMMENT ON COLUMN bookeo_classes.days_of_week IS 'Days of the week this class meets. Values: monday, tuesday, wednesday, thursday, friday, saturday, sunday';
