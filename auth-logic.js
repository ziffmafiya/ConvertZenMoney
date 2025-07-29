// A small delay or check might be needed if supabaseClient.js isn't guaranteed to load first.
// For now, assuming it loads before this script executes.

// Re-declare supabase if it's not globally available in this context
// (though it should be if index.html loads supabaseClient.js as a module)
let supabase;
if (window.supabase && window.supabase.auth) {
    supabase = window.supabase;
} else {
    // Fallback or error handling if supabase is not yet available
    console.error('Supabase client not found on window object. Ensure supabaseClient.js is loaded correctly.');
    // You might want to add a retry mechanism or display an error to the user.
}

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    errorMessage.classList.add('hidden'); // Скрываем предыдущие ошибки

    if (!supabase) {
        errorMessage.textContent = 'Ошибка: Supabase клиент не инициализирован.';
        errorMessage.classList.remove('hidden');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            if (error.message.includes('Email not confirmed')) {
                // Если пользователь не подтвердил почту, попробуем зарегистрировать
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                });

                if (signUpError) {
                    errorMessage.textContent = `Ошибка регистрации: ${signUpError.message}`;
                    errorMessage.classList.remove('hidden');
                } else {
                    alert('На ваш email отправлено письмо для подтверждения. Пожалуйста, подтвердите свой аккаунт.');
                    // Можно перенаправить пользователя или показать сообщение
                }
            } else {
                errorMessage.textContent = `Ошибка входа: ${error.message}`;
                errorMessage.classList.remove('hidden');
            }
        } else {
            // Успешный вход
            console.log('User logged in:', data.user);
            // Instead of direct redirect, notify parent to re-check auth
            window.parent.postMessage({ type: 'authSuccess' }, '*');
        }
    } catch (err) {
        errorMessage.textContent = `Неизвестная ошибка: ${err.message}`;
        errorMessage.classList.remove('hidden');
    }
});

// Проверяем сессию при загрузке страницы
async function checkSession() {
    if (!supabase) {
        console.error('Supabase client not available for session check.');
        return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.parent.postMessage({ type: 'authSuccess' }, '*'); // Notify parent
    }
}

checkSession();

// Listen for messages from the parent (index.html) if needed
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'checkAuth') {
        checkSession();
    }
});
