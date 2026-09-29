const API_URL = 'http://localhost:3000/api';

const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const nameField = document.getElementById('nameField');
const authForm = document.getElementById('authForm');
const submitButton = document.getElementById('submitButton');

let isRegistering = false;

function setMode(registerMode) {
    isRegistering = registerMode;

    nameField.classList.toggle('hidden', !isRegistering);

    loginTab.classList.toggle('active', !isRegistering);
    registerTab.classList.toggle('active', isRegistering);

    submitButton.textContent = isRegistering
        ? 'Register'
        : 'Login';

    document.getElementById('password').autocomplete =
        isRegistering ? 'new-password' : 'current-password';
}

loginTab.addEventListener('click', () => {
    setMode(false);
});

registerTab.addEventListener('click', () => {
    setMode(true);
});

authForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const formMessage = document.getElementById('formMessage');

    formMessage.textContent = 'Please wait...';

    try {
        const endpoint = isRegistering
            ? '/auth/register'
            : '/auth/login';

        const body = isRegistering
            ? { name, email, password }
            : { email, password };

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            formMessage.textContent =
                data.error || 'Something went wrong.';

            return;
        }

        if (isRegistering) {
            formMessage.textContent =
                'Registration successful. You can now log in.';

            setMode(false);
            authForm.reset();

            return;
        }

        localStorage.setItem('token', data.token);

        formMessage.textContent = 'Login successful!';

        window.location.href = 'sessions.html';
    } catch (error) {
        console.error(error);

        formMessage.textContent =
            'Unable to connect to the server.';
    }
});