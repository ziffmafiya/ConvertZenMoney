-- Создание таблицы для хранения уведомлений пользователя
-- Эта таблица используется для системы уведомлений в приложении
CREATE TABLE notifications (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY, -- Уникальный идентификатор уведомления (автоинкремент)
    user_id UUID REFERENCES auth.users(id),             -- Ссылка на пользователя (из системы аутентификации Supabase)
    message TEXT NOT NULL,                              -- Текст уведомления
    type TEXT NOT NULL,                                 -- Тип уведомления (например: 'warning', 'info', 'success')
    created_at TIMESTAMPTZ DEFAULT now(),               -- Дата и время создания уведомления
    is_read BOOLEAN DEFAULT FALSE                       -- Флаг прочтения уведомления (по умолчанию не прочитано)
);
