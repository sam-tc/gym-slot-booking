const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'index.html';
}

const bookingsContainer =
    document.getElementById('bookingsContainer');

const pageMessage =
    document.getElementById('pageMessage');

const logoutButton =
    document.getElementById('logoutButton');

const adminLink =
    document.getElementById('adminLink');

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
    }
}

function formatDateTime(startTime) {
    return new Date(startTime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function renderBookings(bookings) {
    if (bookings.length === 0) {
        bookingsContainer.innerHTML = `
            <div class="empty-state">
                <h2>No bookings yet</h2>
                <p>
                    You have not booked a gym session yet.
                </p>
                <a href="sessions.html" class="primary-button">
                    Browse sessions
                </a>
            </div>
        `;

        return;
    }

    bookingsContainer.innerHTML = bookings.map((booking) => {
        const isCancelled =
            booking.status === 'CANCELLED';

        return `
            <article class="session-card">
                <h2>
                    ${formatDateTime(booking.session.startTime)}
                </h2>

                <p>
                    Status:
                    <strong>${booking.status}</strong>
                </p>

                ${
                    booking.status === 'BOOKED' && booking.checkInCode
                        ? `
                            <p>
                                Check-in code:
                                <strong>${booking.checkInCode}</strong>
                            </p>
                        `
                        : ''
                }

                ${
                    !isCancelled
                        ? `
                            <button
                                class="primary-button cancel-booking-button"
                                data-booking-id="${booking.id}"
                            >
                                Cancel booking
                            </button>
                        `
                        : `
                            <p>
                                This booking has been cancelled.
                            </p>
                        `
                }
            </article>
        `;
    }).join('');
}

async function loadBookings() {
    try {
        pageMessage.textContent = 'Loading bookings...';

        const data = await apiRequest('/bookings/mine');

        renderBookings(data.bookings);

        pageMessage.textContent = '';
    } catch (error) {
        console.error(error);

        pageMessage.textContent = error.message;

        bookingsContainer.innerHTML = '';
    }
}

async function cancelBooking(bookingId, button) {
    const confirmed = window.confirm(
        'Are you sure you want to cancel this booking?'
    );

    if (!confirmed) {
        return;
    }

    button.disabled = true;
    button.textContent = 'Cancelling...';

    try {
        await apiRequest(`/bookings/${bookingId}`, {
            method: 'DELETE',
        });

        pageMessage.textContent =
            'Booking cancelled successfully.';

        await loadBookings();
    } catch (error) {
        console.error(error);

        pageMessage.textContent = error.message;

        button.disabled = false;
        button.textContent = 'Cancel booking';
    }
}

bookingsContainer.addEventListener('click', async (event) => {
    const button =
        event.target.closest('.cancel-booking-button');

    if (!button) {
        return;
    }

    await cancelBooking(
        button.dataset.bookingId,
        button
    );
});

logoutButton.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

async function startPage() {
    await loadCurrentUser();
    await loadBookings();
}

startPage();
