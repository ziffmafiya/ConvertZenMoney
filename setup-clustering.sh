#!/bin/bash

# Скрипт для настройки системы кластеризации транзакций
# Автор: AI Assistant
# Версия: 1.0

set -e  # Остановка при ошибке

echo "🚀 Настройка системы кластеризации транзакций"
echo "=============================================="

# Проверка наличия Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI не найден. Устанавливаем..."
    npm install -g supabase
else
    echo "✅ Supabase CLI уже установлен"
fi

# Проверка авторизации в Supabase
if ! supabase status &> /dev/null; then
    echo "🔐 Требуется авторизация в Supabase"
    supabase login
else
    echo "✅ Уже авторизован в Supabase"
fi

# Создание структуры папок
echo "📁 Создание структуры папок..."
mkdir -p supabase/functions/cluster_embeddings

# Проверка наличия файлов
echo "📄 Проверка файлов..."

required_files=(
    "supabase/functions/cluster_embeddings/index.ts"
    "api/cluster-transactions.js"
    "api/get-clustered-transactions.js"
    "cluster-visualization.js"
    "add_cluster_column_function.sql"
    "create_transaction_clusters_table.sql"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - НЕ НАЙДЕН"
        exit 1
    fi
done

# Развертывание Edge Function
echo "🚀 Развертывание Edge Function..."
supabase functions deploy cluster_embeddings

# Проверка развертывания
echo "🔍 Проверка развертывания..."
if supabase functions list | grep -q "cluster_embeddings"; then
    echo "✅ Edge Function успешно развернута"
else
    echo "❌ Ошибка развертывания Edge Function"
    exit 1
fi

# Выполнение SQL скриптов
echo "🗄️ Выполнение SQL скриптов..."
echo "⚠️  ВНИМАНИЕ: Выполните следующие SQL команды в Supabase SQL Editor:"
echo ""
echo "1. Добавление функции для создания колонки:"
echo "   \i add_cluster_column_function.sql"
echo ""
echo "2. Создание таблицы кластеров (если не существует):"
echo "   \i create_transaction_clusters_table.sql"
echo ""
echo "3. Добавление колонки cluster_id в таблицу transactions:"
echo "   SELECT add_cluster_column_if_not_exists();"
echo ""

# Проверка переменных окружения
echo "🔧 Проверка переменных окружения..."
if [ -z "$SUPABASE_URL" ]; then
    echo "⚠️  SUPABASE_URL не установлен"
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "⚠️  SUPABASE_ANON_KEY не установлен"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  SUPABASE_SERVICE_ROLE_KEY не установлен"
fi

echo ""
echo "📋 Следующие шаги:"
echo "1. Установите переменные окружения в Supabase Dashboard"
echo "2. Выполните SQL скрипты в Supabase SQL Editor"
echo "3. Перезапустите приложение"
echo "4. Откройте веб-интерфейс и проверьте секцию 'Анализ паттернов транзакций'"
echo ""

echo "✅ Настройка завершена!"
echo ""
echo "📚 Дополнительная документация: CLUSTERING_README.md" 