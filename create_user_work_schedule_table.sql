CREATE TABLE IF NOT EXISTS user_work_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_name TEXT NOT NULL,
    hours_per_month INTEGER,
    hours_per_day_shift INTEGER,
    work_days_week TEXT,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_work_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own work schedules."
ON user_work_schedule FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own work schedules."
ON user_work_schedule FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own work schedules."
ON user_work_schedule FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own work schedules."
ON user_work_schedule FOR DELETE
USING (auth.uid() = user_id);
