import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../services/api'

import './MyBookingsPage.css'


function MyBookingsPage() {
  const { token } = useAuth()

  const [bookings, setBookings] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [pendingBookingId, setPendingBookingId] = useState(null)

  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')


  const loadBookings = useCallback(
    async () => {
      setLoading(true)
      setError('')

      try {
        const data = await apiRequest(
          '/bookings/me',
          {},
          token,
        )

        setBookings(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [token],
  )


  useEffect(() => {
    loadBookings()
  }, [loadBookings])


  function formatDate(startTime) {
    return new Intl.DateTimeFormat(
      'en-IN',
      {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      },
    ).format(new Date(startTime))
  }


  function formatTime(startTime) {
    return new Intl.DateTimeFormat(
      'en-IN',
      {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      },
    ).format(new Date(startTime))
  }


  function sessionHasStarted(startTime) {
    return (
      new Date(startTime).getTime() <=
      Date.now()
    )
  }


  async function handleCancel(booking) {
    setPendingBookingId(booking.id)
    setActionMessage('')
    setActionError('')

    try {
      await apiRequest(
        `/bookings/${booking.id}/cancel`,
        {
          method: 'POST',
        },
        token,
      )

      setActionMessage(
        'Booking cancelled successfully.',
      )

      await loadBookings()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setPendingBookingId(null)
    }
  }


  return (
    <main className="bookings-page">

      <section className="bookings-heading">
        <div>
          <p className="page-eyebrow">
            YOUR SCHEDULE
          </p>

          <h1>
            My bookings
          </h1>

          <p className="page-description">
            View your session details,
            check-in codes and booking history.
          </p>
        </div>
      </section>


      {actionMessage && (
        <p
          className="action-message success"
          role="status"
        >
          {actionMessage}
        </p>
      )}


      {actionError && (
        <p
          className="action-message error"
          role="alert"
        >
          {actionError}
        </p>
      )}


      {loading && (
        <div
          className="state-card"
          role="status"
        >
          <h2>
            Loading your bookings
          </h2>

          <p>
            Fetching your latest booking
            information...
          </p>
        </div>
      )}


      {!loading && error && (
        <div
          className="state-card error-state"
          role="alert"
        >
          <h2>
            We couldn't load your bookings
          </h2>

          <p>{error}</p>

          <button
            type="button"
            onClick={loadBookings}
          >
            Try again
          </button>
        </div>
      )}


      {!loading &&
        !error &&
        bookings.length === 0 && (
          <div className="state-card">
            <h2>
              No bookings yet
            </h2>

            <p>
              Book a session and it will
              appear here.
            </p>
          </div>
        )}


      {!loading &&
        !error &&
        bookings.length > 0 && (
          <div className="bookings-list">

            {bookings.map((booking) => {
              const confirmed =
                booking.status === 'confirmed'

              const started =
                sessionHasStarted(
                  booking.session_start_time,
                )

              const canCancel =
                confirmed && !started

              const pending =
                pendingBookingId === booking.id


              return (
                <article
                  className="booking-card"
                  key={booking.id}
                >

                  <div className="booking-main">

                    <div>
                      <p className="booking-date">
                        {formatDate(
                          booking.session_start_time,
                        )}
                      </p>

                      <h2>
                        {formatTime(
                          booking.session_start_time,
                        )}
                      </h2>
                    </div>


                    <span
                      className={
                        confirmed
                          ? 'booking-status confirmed'
                          : 'booking-status cancelled'
                      }
                    >
                      {confirmed
                        ? 'Confirmed'
                        : 'Cancelled'}
                    </span>

                  </div>


                  <div className="booking-details">

                    <div className="booking-detail">
                      <span>
                        Session
                      </span>

                      <strong>
                        #{booking.session_id}
                      </strong>
                    </div>


                    <div className="booking-detail">
                      <span>
                        Duration
                      </span>

                      <strong>
                        1 hour
                      </strong>
                    </div>


                    <div className="booking-detail">
                      <span>
                        Check-in
                      </span>

                      {confirmed &&
                      booking.check_in_code ? (
                        <code className="checkin-code">
                          {
                            booking.check_in_code
                          }
                        </code>
                      ) : (
                        <strong className="muted-value">
                          Not available
                        </strong>
                      )}
                    </div>

                  </div>


                  <div className="booking-footer">

                    <div>
                      {booking.checked_in_at ? (
                        <p className="checked-in-text">
                          Checked in
                        </p>
                      ) : confirmed ? (
                        <p className="booking-note">
                          Show your code to staff
                          during the session.
                        </p>
                      ) : (
                        <p className="booking-note">
                          This booking was cancelled.
                        </p>
                      )}
                    </div>


                    {canCancel && (
                      <button
                        type="button"
                        className="cancel-booking-button"
                        disabled={
                          pendingBookingId !== null
                        }
                        onClick={() =>
                          handleCancel(booking)
                        }
                      >
                        {pending
                          ? 'Cancelling...'
                          : 'Cancel booking'}
                      </button>
                    )}

                  </div>

                </article>
              )
            })}

          </div>
        )}

    </main>
  )
}


export default MyBookingsPage