-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO FIX THE MISSING NOTES COLUMN

-- 1. Safely add the 'notes' column to the 'patients' table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='notes') THEN
        ALTER TABLE patients ADD COLUMN notes text;
    END IF;
END $$;

-- 2. Verify the column exists (Check the 'Results' tab after running)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients' AND column_name = 'notes';
