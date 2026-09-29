// The API is served by this app, so deployments use their own origin.
const API_URL = `${window.location.origin}/api`;

const authForm = document.getElementById('authForm');

let isRegistering = false;

function setMode(registerMode) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const nameField = document.getElementById('nameField');
    const submitButton = document.getElementById('submitButton');

    if (!authForm || !loginTab || !registerTab || !nameField || !submitButton) {
        return;
    }

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

if (authForm) {
    document.getElementById('loginTab')?.addEventListener('click', () => {
        setMode(false);
    });

    document.getElementById('registerTab')?.addEventListener('click', () => {
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

        const data = await response.json().catch(() => ({}));

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
}
