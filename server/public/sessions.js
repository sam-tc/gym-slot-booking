const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'index.html';
}

const sessionsContainer =
    document.getElementById('sessionsContainer');

const pageMessage =
    document.getElementById('pageMessage');

const dateFilter =
    document.getElementById('dateFilter');

const clearDateButton =
    document.getElementById('clearDateButton');

const logoutButton =
    document.getElementById('logoutButton');

const adminLink =
    document.getElementById('adminLink');

let currentSessions = [];
let myBookings = [];
let myWaitlists = [];
const pendingSessionIds = new Set();

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }

    return data;
}

async function loadCurrentUser() {
    try {
        const data = await apiRequest('/users/me');

        if (data.user.role === 'ADMIN') {
            adminLink.classList.remove('hidden');
        }
    } catch (error) {
        console.error(error);
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }
}

async function loadMyBookings() {
    const data = await apiRequest('/bookings/mine');

    myBookings = data.bookings;
}

async function loadMyWaitlists() {
    const data = await apiRequest('/waitlist/mine');

    myWaitlists = data.waitlists;
}

function formatDateTime(startTime) {
    return new Date(startTime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function getBookingForSession(sessionId) {
    return myBookings.find(
        (booking) =>
            booking.sessionId === sessionId &&
            booking.status === 'BOOKED'
    );
}

function getWaitlistForSession(sessionId) {
    return myWaitlists.find(
        (waitlist) =>
            waitlist.sessionId === sessionId
    );
}

function renderSessions() {
    if (currentSessions.length === 0) {
        sessionsContainer.innerHTML = `
            <div class="empty-state">
                <h2>No sessions found</h2>
                <p>
                    There are no upcoming gym sessions
                    for this date.
                </p>
            </div>
        `;

        return;
    }

    sessionsContainer.innerHTML =
        currentSessions.map((session) => {
            const booking =
                getBookingForSession(session.id);

            const waitlist =
                getWaitlistForSession(session.id);

            let action = '';

            if (booking) {
                action = `
                    <button
                        class="secondary-button"
                        disabled
                    >
                        Already booked
                    </button>
                `;
            } else if (waitlist) {
                action = `
                    <button
                        class="secondary-button leave-waitlist-button"
                        data-waitlist-id="${waitlist.id}"
                    >
                        Leave waitlist
                    </button>
                `;
            } else if (session.seatsRemaining > 0) {
                action = `
                    <button
                        class="primary-button book-button"
                        data-session-id="${session.id}"
                        ${pendingSessionIds.has(session.id) ? 'disabled' : ''}
                    >
                        ${pendingSessionIds.has(session.id) ? 'Booking...' : 'Book session'}
                    </button>
                `;
            } else {
                action = `
                    <button
                        class="primary-button waitlist-button"
                        data-session-id="${session.id}"
                    >
                        Join waitlist
                    </button>
                `;
            }

            return `
                <article class="session-card">
                    <h2>
                        ${formatDateTime(session.startTime)}
                    </h2>

                    <p>
                        Capacity:
                        <strong>
                            ${session.capacity}
                        </strong>
                    </p>

                    <p>
                        Seats remaining:
                        <strong>
                            ${Math.max(
                                0,
                                session.seatsRemaining
                            )}
                        </strong>
                    </p>

                    ${action}

                    <p
                        id="session-message-${session.id}"
                        class="form-message"
                        role="status"
                        aria-live="polite"
                    ></p>
                </article>
            `;
        }).join('');
}

async function loadSessions() {
    try {
        pageMessage.textContent =
            'Loading sessions...';

        const date = dateFilter.value;

        let endpoint = '/sessions';
        if (date) {
            const [year, month, day] = date.split('-').map(Number);
            const start = new Date(year, month - 1, day);
            const end = new Date(year, month - 1, day + 1);
            const params = new URLSearchParams({
                from: start.toISOString(),
                to: end.toISOString(),
            });
            endpoint += `?${params}`;
        }

        const data =
            await apiRequest(endpoint);

        currentSessions = data.sessions;

        renderSessions();

        pageMessage.textContent = '';
    } catch (error) {
        console.error(error);

        pageMessage.textContent =
            error.message;

        sessionsContainer.innerHTML = '';
    }
}

async function refreshPage() {
    try {
        await Promise.all([
            loadMyBookings(),
            loadMyWaitlists(),
        ]);

        await loadSessions();
    } catch (error) {
        console.error(error);

        pageMessage.textContent =
            error.message;
    }
}

async function bookSession(sessionId, button) {
    const session =
        currentSessions.find(
            (item) =>
                item.id === sessionId
        );

    if (!session) {
        return;
    }

    const oldSeatsRemaining =
        session.seatsRemaining;

    if (oldSeatsRemaining <= 0) {
        return;
    }

    // Optimistic update:
    // immediately show one fewer seat.
    session.seatsRemaining =
        Math.max(
            0,
            session.seatsRemaining - 1
        );

    pendingSessionIds.add(sessionId);
    renderSessions();

    try {
        const data =
            await apiRequest('/bookings', {
                method: 'POST',
                body: JSON.stringify({
                    sessionId,
                }),
            });

        await refreshPage();

        pageMessage.textContent =
            `Booking successful! Your check-in code is ${data.booking.checkInCode}`;
    } catch (error) {
        // Roll back the optimistic update
        // if the server rejects the booking.
        session.seatsRemaining =
            oldSeatsRemaining;

        pageMessage.textContent =
            error.message;
    } finally {
        pendingSessionIds.delete(sessionId);
        renderSessions();
    }
}

async function joinWaitlist(
    sessionId,
    button
) {
    button.disabled = true;

    try {
        await apiRequest('/waitlist', {
            method: 'POST',
            body: JSON.stringify({
                sessionId,
            }),
        });

        await refreshPage();

        pageMessage.textContent =
            'You have been added to the waitlist.';
    } catch (error) {
        console.error(error);

        button.disabled = false;

        pageMessage.textContent =
            error.message;
    }
}

async function leaveWaitlist(
    waitlistId,
    button
) {
    button.disabled = true;

    try {
        await apiRequest(
            `/waitlist/${waitlistId}`,
            {
                method: 'DELETE',
            }
        );

        await refreshPage();

        pageMessage.textContent =
            'You have been removed from the waitlist.';
    } catch (error) {
        console.error(error);

        button.disabled = false;

        pageMessage.textContent =
            error.message;
    }
}

sessionsContainer.addEventListener(
    'click',
    async (event) => {
        const bookButton =
            event.target.closest(
                '.book-button'
            );

        if (bookButton) {
            await bookSession(
                bookButton.dataset.sessionId,
                bookButton
            );

            return;
        }

        const waitlistButton =
            event.target.closest(
                '.waitlist-button'
            );

        if (waitlistButton) {
            await joinWaitlist(
                waitlistButton.dataset.sessionId,
                waitlistButton
            );

            return;
        }

        const leaveWaitlistButton =
            event.target.closest(
                '.leave-waitlist-button'
            );

        if (leaveWaitlistButton) {
            await leaveWaitlist(
                leaveWaitlistButton.dataset.waitlistId,
                leaveWaitlistButton
            );
        }
    }
);

dateFilter.addEventListener(
    'change',
    loadSessions
);

clearDateButton.addEventListener(
    'click',
    () => {
        dateFilter.value = '';
        loadSessions();
    }
);

logoutButton.addEventListener(
    'click',
    () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }
);

async function startPage() {
    await loadCurrentUser();

    await refreshPage();

    // Refresh seat counts and waitlist state
    // every 10 seconds.
    setInterval(
        refreshPage,
        10000
    );
}

startPage();
