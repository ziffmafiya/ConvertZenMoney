// Импорт Supabase клиента для работы с базой данных
import { createClient } from '@supabase/supabase-js';

/**
 * Основной обработчик для обновления расписания работы пользователя
 * Позволяет сохранять или обновлять информацию о рабочем графике
 * @param {object} req - Объект запроса
 * @param {object} res - Объект ответа
 */
export default async function handler(req, res) {
    // Принимаем только POST-запросы для создания/обновления данных
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Извлекаем данные о работе из тела запроса
    const { job_name, hours_per_month, hours_per_day_shift, work_days_week, start_time, end_time } = req.body;

    // Базовая валидация - название работы обязательно
    if (!job_name) {
        return res.status(400).json({ error: 'Job name is required' });
    }

    // Получаем ключи доступа к Supabase из переменных окружения
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Проверяем наличие обязательных ключей конфигурации
    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    // Создаем клиент Supabase для работы с базой данных
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Проверяем, существует ли уже запись для данной работы
        const { data: existingSchedule, error: fetchError } = await supabase
            .from('user_work_schedule')
            .select('id')
            .eq('job_name', job_name)
            .single();

        // Обрабатываем ошибку, если она не связана с отсутствием записей
        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 означает "записи не найдены"
            console.error('Error fetching existing schedule:', fetchError);
            return res.status(500).json({ error: fetchError.message });
        }

        // Подготавливаем данные для сохранения
        let dataToSave = {
            job_name,
            hours_per_month: hours_per_month || null,        // Часов в месяц
            hours_per_day_shift: hours_per_day_shift || null, // Часов в смену
            work_days_week: work_days_week || null,          // Рабочих дней в неделю
            start_time: start_time || null,                  // Время начала работы
            end_time: end_time || null,                      // Время окончания работы
        };

        let result;
        if (existingSchedule) {
            // Обновляем существующую запись
            result = await supabase
                .from('user_work_schedule')
                .update(dataToSave)
                .eq('id', existingSchedule.id)
                .select();
        } else {
            // Создаем новую запись
            result = await supabase
                .from('user_work_schedule')
                .insert([dataToSave])
                .select();
        }

        const { data, error } = result;

        // Обрабатываем ошибки при сохранении
        if (error) {
            console.error('Error saving work schedule:', error);
            return res.status(500).json({ error: error.message });
        }

        // Отправляем успешный ответ с сохраненными данными
        res.status(200).json({ message: 'Work schedule saved successfully', data: data[0] });

    } catch (error) {
        // Обработка непредвиденных ошибок сервера
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
