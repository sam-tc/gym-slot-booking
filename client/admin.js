const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'index.html';
}

const pageMessage =
    document.getElementById('pageMessage');

const logoutButton =
    document.getElementById('logoutButton');

const createSessionForm =
    document.getElementById('createSessionForm');

const adminSessionsContainer =
    document.getElementById('adminSessionsContainer');

const checkInForm =
    document.getElementById('checkInForm');

const checkInResult =
    document.getElementById('checkInResult');

const selectedSessionContainer =
    document.getElementById('selectedSessionContainer');

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }

    return data;
}

function formatDateTime(startTime) {
    return new Date(startTime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

async function verifyAdmin() {
    try {
        const data = await apiRequest('/users/me');

        if (data.user.role !== 'ADMIN') {
            window.location.href = 'sessions.html';
            return false;
        }

        return true;
    } catch (error) {
        localStorage.removeItem('token');
        window.location.href = 'index.html';

        return false;
    }
}

async function loadSessions() {
    try {
        adminSessionsContainer.innerHTML =
            '<p>Loading sessions...</p>';

        const data = await apiRequest('/sessions');

        if (data.sessions.length === 0) {
            adminSessionsContainer.innerHTML = `
                <div class="empty-state">
                    <h2>No upcoming sessions</h2>
                    <p>Create a session to get started.</p>
                </div>
            `;

            return;
        }

        adminSessionsContainer.innerHTML =
            data.sessions.map((session) => `
                <article class="session-card">
                    <h2>
                        ${formatDateTime(session.startTime)}
                    </h2>

                    <p>
                        Capacity:
                        <strong>${session.capacity}</strong>
                    </p>

                    <p>
                        Seats remaining:
                        <strong>${session.seatsRemaining}</strong>
                    </p>

                    <button
                        class="primary-button view-bookings-button"
                        data-session-id="${session.id}"
                    >
                        View bookings
                    </button>
                </article>
            `).join('');
    } catch (error) {
        console.error(error);

        adminSessionsContainer.innerHTML = `
            <p class="form-message">
                ${error.message}
            </p>
        `;
    }
}

async function createSession(event) {
    event.preventDefault();

    const input =
        document.getElementById('startTime');

    const startTime = input.value;

    pageMessage.textContent =
        'Creating session...';

    try {
        const date = new Date(startTime);

        const isoStartTime = date.toISOString();

        await apiRequest('/sessions', {
            method: 'POST',
            body: JSON.stringify({
                startTime: isoStartTime,
            }),
        });

        pageMessage.textContent =
            'Session created successfully.';

        createSessionForm.reset();

        await loadSessions();
    } catch (error) {
        console.error(error);

        pageMessage.textContent =
            error.message;
    }
}

async function loadSessionBookings(sessionId) {
    try {
        selectedSessionContainer.innerHTML =
            '<p>Loading bookings...</p>';

        const data =
            await apiRequest(
                `/bookings/session/${sessionId}`
            );

        if (data.bookings.length === 0) {
            selectedSessionContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No bookings</h3>
                    <p>
                        Nobody has booked this session yet.
                    </p>
                </div>
            `;

            return;
        }

        selectedSessionContainer.innerHTML = `
            <div class="admin-result">
                <h3>
                    ${formatDateTime(data.session.startTime)}
                </h3>

                <p>
                    ${data.bookings.length}
                    booking(s)
                </p>

                <div class="booking-list">
                    ${data.bookings.map((booking) => `
                        <article class="booking-row">
                            <div>
                                <strong>
                                    ${
                                        booking.user
                                            ? booking.user.name
                                            : 'Unknown member'
                                    }
                                </strong>

                                <span>
                                    ${
                                        booking.user
                                            ? booking.user.email
                                            : ''
                                    }
                                </span>
                            </div>

                            <strong>
                                ${booking.status}
                            </strong>
                        </article>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        console.error(error);

        selectedSessionContainer.innerHTML = `
            <p class="form-message">
                ${error.message}
            </p>
        `;
    }
}

async function checkInMember(event) {
    event.preventDefault();

    const input =
        document.getElementById('checkInCode');

    const code = input.value.trim();

    checkInResult.textContent =
        'Checking in member...';

    try {
        const data = await apiRequest(
            '/bookings/check-in',
            {
                method: 'POST',
                body: JSON.stringify({
                    code,
                }),
            }
        );

        const user = data.booking.user;

        checkInResult.innerHTML = `
            <h3>Check-in successful</h3>

            <p>
                Member:
                <strong>
                    ${user ? user.name : 'Unknown member'}
                </strong>
            </p>

            <p>
                Email:
                <strong>
                    ${user ? user.email : 'Unknown'}
                </strong>
            </p>

            <p>
                Checked in at:
                <strong>
                    ${formatDateTime(
                        data.booking.checkedInAt
                    )}
                </strong>
            </p>
        `;

        checkInForm.reset();
    } catch (error) {
        console.error(error);

        checkInResult.innerHTML = `
            <p class="form-message">
                ${error.message}
            </p>
        `;
    }
}

adminSessionsContainer.addEventListener(
    'click',
    async (event) => {
        const button =
            event.target.closest(
                '.view-bookings-button'
            );

        if (!button) {
            return;
        }

        await loadSessionBookings(
            button.dataset.sessionId
        );
    }
);

createSessionForm.addEventListener(
    'submit',
    createSession
);

checkInForm.addEventListener(
    'submit',
    checkInMember
);

logoutButton.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

async function startPage() {
    const isAdmin = await verifyAdmin();

    if (!isAdmin) {
        return;
    }

    await loadSessions();
}

startPage();