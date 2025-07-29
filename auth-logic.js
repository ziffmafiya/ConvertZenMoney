import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    if (!authForm || !emailInput || !passwordInput || !errorMessage) {
        console.error('Auth form elements not found. Ensure auth.html is fully loaded.');
        return;
    }

    console.log('Supabase client in auth-logic.js:', supabase); // Log Supabase client initialization status

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        errorMessage.classList.add('hidden'); // Скрываем предыдущие ошибки

        if (!supabase) {
            errorMessage.textContent = 'Ошибка: Supabase клиент не инициализирован.';
            errorMessage.classList.remove('hidden');
            console.error('Supabase client is null or undefined when attempting auth.');
            return;
        }

        console.log('Attempting to sign in/sign up with:', { email, password });

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                console.error('Supabase signInWithPassword error:', error); // Log sign-in error object
                if (error.message.includes('Email not confirmed')) {
                    console.log('Email not confirmed, attempting to sign up...');
                    // Если пользователь не подтвердил почту, попробуем зарегистрировать
                    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                        email: email,
                        password: password,
                    });

                    if (signUpError) {
                        console.error('Supabase signUp error:', signUpError); // Log sign-up error object
                        errorMessage.textContent = `Ошибка регистрации: ${signUpError.message}`;
                        errorMessage.classList.remove('hidden');
                    } else {
                        console.log('Sign up successful, data:', signUpData);
                        alert('На ваш email отправлено письмо для подтверждения. Пожалуйста, подтвердите свой аккаунт.');
                        // Можно перенаправить пользователя или показать сообщение
                    }
                } else {
                    errorMessage.textContent = `Ошибка входа: ${error.message}`;
                    errorMessage.classList.remove('hidden');
                }
            } else {
                // Успешный вход
                console.log('User logged in successfully, data:', data.user);
                // Instead of direct redirect, notify parent to re-check auth
                window.parent.postMessage({ type: 'authSuccess' }, '*');
            }
        } catch (err) {
            console.error('Unknown error during auth process:', err); // Log unknown errors
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
});
