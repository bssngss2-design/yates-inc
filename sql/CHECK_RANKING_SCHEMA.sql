-- Check the actual schema of ranking_periods table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ranking_periods'
ORDER BY ordinal_position;
