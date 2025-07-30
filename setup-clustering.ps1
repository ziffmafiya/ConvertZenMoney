# Скрипт для настройки системы кластеризации транзакций (PowerShell)
# Автор: AI Assistant
# Версия: 1.0

param(
    [switch]$SkipSupabaseCheck
)

# Функция для вывода цветного текста
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Функция для проверки команды
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

Write-ColorOutput "🚀 Настройка системы кластеризации транзакций" "Cyan"
Write-ColorOutput "==============================================" "Cyan"

# Проверка наличия Node.js
if (-not (Test-Command "node")) {
    Write-ColorOutput "❌ Node.js не найден. Установите Node.js с https://nodejs.org/" "Red"
    exit 1
} else {
    Write-ColorOutput "✅ Node.js найден" "Green"
}

# Проверка наличия Supabase CLI
if (-not (Test-Command "supabase")) {
    Write-ColorOutput "❌ Supabase CLI не найден. Устанавливаем..." "Yellow"
    npm install -g supabase
} else {
    Write-ColorOutput "✅ Supabase CLI уже установлен" "Green"
}

# Проверка авторизации в Supabase (если не пропущена)
if (-not $SkipSupabaseCheck) {
    Write-ColorOutput "🔐 Проверка авторизации в Supabase..." "Yellow"
    try {
        supabase status | Out-Null
        Write-ColorOutput "✅ Уже авторизован в Supabase" "Green"
    }
    catch {
        Write-ColorOutput "🔐 Требуется авторизация в Supabase" "Yellow"
        supabase login
    }
}

# Создание структуры папок
Write-ColorOutput "📁 Создание структуры папок..." "Yellow"
if (-not (Test-Path "supabase/functions/cluster_embeddings")) {
    New-Item -ItemType Directory -Path "supabase/functions/cluster_embeddings" -Force | Out-Null
}

# Проверка наличия файлов
Write-ColorOutput "📄 Проверка файлов..." "Yellow"

$requiredFiles = @(
    "supabase/functions/cluster_embeddings/index.ts",
    "api/cluster-transactions.js",
    "api/get-clustered-transactions.js",
    "cluster-visualization.js",
    "add_cluster_column_function.sql",
    "create_transaction_clusters_table.sql"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-ColorOutput "✅ $file" "Green"
    } else {
        Write-ColorOutput "❌ $file - НЕ НАЙДЕН" "Red"
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-ColorOutput "❌ Некоторые файлы отсутствуют. Проверьте структуру проекта." "Red"
    exit 1
}

# Развертывание Edge Function
Write-ColorOutput "🚀 Развертывание Edge Function..." "Yellow"
try {
    supabase functions deploy cluster_embeddings
    Write-ColorOutput "✅ Edge Function успешно развернута" "Green"
}
catch {
    Write-ColorOutput "❌ Ошибка развертывания Edge Function" "Red"
    Write-ColorOutput "Проверьте логи выше для деталей" "Yellow"
    exit 1
}

# Проверка развертывания
Write-ColorOutput "🔍 Проверка развертывания..." "Yellow"
try {
    $functions = supabase functions list
    if ($functions -match "cluster_embeddings") {
        Write-ColorOutput "✅ Edge Function найдена в списке" "Green"
    } else {
        Write-ColorOutput "❌ Edge Function не найдена в списке" "Red"
        exit 1
    }
}
catch {
    Write-ColorOutput "⚠️ Не удалось проверить список функций" "Yellow"
}

# Выполнение SQL скриптов
Write-ColorOutput "🗄️ Выполнение SQL скриптов..." "Yellow"
Write-ColorOutput "⚠️  ВНИМАНИЕ: Выполните следующие SQL команды в Supabase SQL Editor:" "Yellow"
Write-Host ""
Write-ColorOutput "1. Добавление функции для создания колонки:" "Cyan"
Write-ColorOutput "   \i add_cluster_column_function.sql" "White"
Write-Host ""
Write-ColorOutput "2. Создание таблицы кластеров (если не существует):" "Cyan"
Write-ColorOutput "   \i create_transaction_clusters_table.sql" "White"
Write-Host ""
Write-ColorOutput "3. Добавление колонки cluster_id в таблицу transactions:" "Cyan"
Write-ColorOutput "   SELECT add_cluster_column_if_not_exists();" "White"
Write-Host ""

# Проверка переменных окружения
Write-ColorOutput "🔧 Проверка переменных окружения..." "Yellow"
$envVars = @("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY")

foreach ($var in $envVars) {
    if ([string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable($var))) {
        Write-ColorOutput "⚠️  $var не установлен" "Yellow"
    } else {
        Write-ColorOutput "✅ $var установлен" "Green"
    }
}

Write-Host ""
Write-ColorOutput "📋 Следующие шаги:" "Cyan"
Write-ColorOutput "1. Установите переменные окружения в Supabase Dashboard" "White"
Write-ColorOutput "2. Выполните SQL скрипты в Supabase SQL Editor" "White"
Write-ColorOutput "3. Перезапустите приложение" "White"
Write-ColorOutput "4. Откройте веб-интерфейс и проверьте секцию 'Анализ паттернов транзакций'" "White"
Write-Host ""

Write-ColorOutput "✅ Настройка завершена!" "Green"
Write-Host ""
Write-ColorOutput "📚 Дополнительная документация: CLUSTERING_README.md" "Cyan" 