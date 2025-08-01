-- Drop the policy on the "entries" table
DROP POLICY "Allow users to manage their own entries" ON public.entries;

-- Drop the policy on the "jobs" table
DROP POLICY "Allow users to manage their own jobs" ON public.jobs;

-- Drop the user_id column from the "entries" table
ALTER TABLE public.entries DROP COLUMN user_id;

-- Drop the user_id column from the "jobs" table
ALTER TABLE public.jobs DROP COLUMN user_id;
