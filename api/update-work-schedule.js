import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { job_name, hours_per_month, hours_per_day_shift, work_days_week, start_time, end_time } = req.body;

    // Basic validation
    if (!job_name) {
        return res.status(400).json({ error: 'Job name is required' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Check if a record for this job_name already exists
        const { data: existingSchedule, error: fetchError } = await supabase
            .from('user_work_schedule')
            .select('id')
            .eq('job_name', job_name)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
            console.error('Error fetching existing schedule:', fetchError);
            return res.status(500).json({ error: fetchError.message });
        }

        let dataToSave = {
            job_name,
            hours_per_month: hours_per_month || null,
            hours_per_day_shift: hours_per_day_shift || null,
            work_days_week: work_days_week || null,
            start_time: start_time || null,
            end_time: end_time || null,
        };

        let result;
        if (existingSchedule) {
            // Update existing record
            result = await supabase
                .from('user_work_schedule')
                .update(dataToSave)
                .eq('id', existingSchedule.id)
                .select();
        } else {
            // Insert new record
            result = await supabase
                .from('user_work_schedule')
                .insert([dataToSave])
                .select();
        }

        const { data, error } = result;

        if (error) {
            console.error('Error saving work schedule:', error);
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ message: 'Work schedule saved successfully', data: data[0] });

    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
