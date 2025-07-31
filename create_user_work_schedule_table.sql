-- Создание таблицы для хранения расписания работы пользователя
-- Эта таблица содержит информацию о рабочем графике для контекстного анализа трат
CREATE TABLE IF NOT EXISTS user_work_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),    -- Уникальный идентификатор записи (UUID)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Ссылка на пользователя с каскадным удалением
    job_name TEXT NOT NULL,                            -- Название работы/должности
    hours_per_month INTEGER,                           -- Количество рабочих часов в месяц
    hours_per_day_shift INTEGER,                       -- Количество часов в смену
    work_days_week TEXT,                               -- Рабочие дни недели (например: "Пн,Вт,Ср,Чт,Пт")
    start_time TIME,                                   -- Время начала работы
    end_time TIME,                                     -- Время окончания работы
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Дата и время создания записи
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  -- Дата и время последнего обновления
);

-- Включение Row Level Security (RLS) для обеспечения безопасности данных
-- RLS позволяет контролировать доступ к строкам на уровне пользователя
ALTER TABLE user_work_schedule ENABLE ROW LEVEL SECURITY;

-- Политика безопасности: пользователи могут просматривать только свои расписания
CREATE POLICY "Users can view their own work schedules."
ON user_work_schedule FOR SELECT
USING (auth.uid() = user_id);

-- Политика безопасности: пользователи могут создавать только свои расписания
CREATE POLICY "Users can insert their own work schedules."
ON user_work_schedule FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Политика безопасности: пользователи могут обновлять только свои расписания
CREATE POLICY "Users can update their own work schedules."
ON user_work_schedule FOR UPDATE
USING (auth.uid() = user_id);

-- Политика безопасности: пользователи могут удалять только свои расписания
CREATE POLICY "Users can delete their own work schedules."
ON user_work_schedule FOR DELETE
USING (auth.uid() = user_id);
