import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../services/api'

import './SessionsPage.css'


function SessionsPage() {
  const { token, isAdmin } = useAuth()

  const [sessions, setSessions] = useState([])
  const [bookings, setBookings] = useState([])
  const [waitlistEntries, setWaitlistEntries] = useState([])

  const [selectedDate, setSelectedDate] = useState('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [pendingSessionId, setPendingSessionId] = useState(null)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')


  const loadSessions = useCallback(
    async (showMainLoader = false) => {
      if (showMainLoader) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setError('')

      try {
        const params = new URLSearchParams()

        params.set('include_full', 'true')

        if (selectedDate) {
          params.set('date', selectedDate)
        }

        const data = await apiRequest(
          `/sessions?${params.toString()}`,
          {},
          token,
        )

        setSessions(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [selectedDate, token],
  )


  const loadMemberState = useCallback(
    async () => {
      if (isAdmin) {
        setBookings([])
        setWaitlistEntries([])
        return
      }

      try {
        const [
          bookingData,
          waitlistData,
        ] = await Promise.all([
          apiRequest(
            '/bookings/me',
            {},
            token,
          ),

          apiRequest(
            '/waitlist/me',
            {},
            token,
          ),
        ])

        setBookings(bookingData)
        setWaitlistEntries(waitlistData)
      } catch (err) {
        setActionError(err.message)
      }
    },
    [isAdmin, token],
  )


  useEffect(() => {
    loadSessions(true)
    loadMemberState()
  }, [
    loadSessions,
    loadMemberState,
  ])


  useEffect(() => {
    const intervalId = setInterval(() => {
      loadSessions(false)
    }, 10000)

    return () => {
      clearInterval(intervalId)
    }
  }, [loadSessions])


  function formatDate(startTime) {
    return new Intl.DateTimeFormat(
      'en-IN',
      {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
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


  function hasConfirmedBooking(sessionId) {
    return bookings.some(
      (booking) =>
        booking.session_id === sessionId &&
        booking.status === 'confirmed',
    )
  }


  function isOnWaitlist(sessionId) {
    return waitlistEntries.some(
      (entry) =>
        entry.session_id === sessionId,
    )
  }


  async function handleBook(session) {
    setPendingSessionId(session.id)
    setActionMessage('')
    setActionError('')

    const previousSessions = sessions

    setSessions((currentSessions) =>
      currentSessions.map((item) =>
        item.id === session.id
          ? {
              ...item,
              seats_remaining:
                item.seats_remaining - 1,
            }
          : item,
      ),
    )

    try {
      await apiRequest(
        `/sessions/${session.id}/book`,
        {
          method: 'POST',
        },
        token,
      )

      setActionMessage(
        'Session booked successfully.',
      )

      await Promise.all([
        loadSessions(false),
        loadMemberState(),
      ])
    } catch (err) {
      setSessions(previousSessions)
      setActionError(err.message)
    } finally {
      setPendingSessionId(null)
    }
  }


  async function handleJoinWaitlist(session) {
    setPendingSessionId(session.id)
    setActionMessage('')
    setActionError('')

    try {
      await apiRequest(
        `/sessions/${session.id}/waitlist`,
        {
          method: 'POST',
        },
        token,
      )

      setActionMessage(
        'You joined the waitlist.',
      )

      await loadMemberState()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setPendingSessionId(null)
    }
  }


  async function handleLeaveWaitlist(session) {
    setPendingSessionId(session.id)
    setActionMessage('')
    setActionError('')

    try {
      await apiRequest(
        `/sessions/${session.id}/waitlist`,
        {
          method: 'DELETE',
        },
        token,
      )

      setActionMessage(
        'You left the waitlist.',
      )

      await loadMemberState()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setPendingSessionId(null)
    }
  }


  return (
    <main className="sessions-page">

      <section className="sessions-heading">
        <div>
          <p className="page-eyebrow">
            GYM SCHEDULE
          </p>

          <h1>
            Find your next session
          </h1>

          <p className="page-description">
            Browse upcoming sessions and check
            live seat availability.
          </p>
        </div>


        <div className="date-filter">
          <label htmlFor="session-date">
            Filter by date
          </label>

          <input
            id="session-date"
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(
                event.target.value,
              )

              setActionMessage('')
              setActionError('')
            }}
          />

          {selectedDate && (
            <button
              type="button"
              onClick={() => {
                setSelectedDate('')
                setActionMessage('')
                setActionError('')
              }}
            >
              Clear
            </button>
          )}
        </div>
      </section>


      <section className="sessions-status">
        <span>
          {sessions.length}
          {' '}
          {sessions.length === 1
            ? 'session'
            : 'sessions'}
        </span>

        {refreshing && (
          <span className="refreshing-text">
            Updating seats...
          </span>
        )}
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
          <h2>Loading sessions</h2>

          <p>
            Fetching the latest gym schedule...
          </p>
        </div>
      )}


      {!loading && error && (
        <div
          className="state-card error-state"
          role="alert"
        >
          <h2>
            We couldn't load the sessions
          </h2>

          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              loadSessions(true)
            }
          >
            Try again
          </button>
        </div>
      )}


      {!loading &&
        !error &&
        sessions.length === 0 && (
          <div className="state-card">
            <h2>No sessions found</h2>

            <p>
              There are no upcoming sessions
              matching this date.
            </p>
          </div>
        )}


      {!loading &&
        !error &&
        sessions.length > 0 && (
          <div className="sessions-grid">

            {sessions.map((session) => {
              const isFull =
                session.seats_remaining === 0

              const isBooked =
                hasConfirmedBooking(
                  session.id,
                )

              const waiting =
                isOnWaitlist(
                  session.id,
                )

              const occupancy =
                session.capacity -
                session.seats_remaining

              const occupancyPercent =
                (
                  occupancy /
                  session.capacity
                ) * 100

              const isThisSessionPending =
                pendingSessionId ===
                session.id


              function handleAction() {
                if (isBooked) {
                  return
                }

                if (waiting) {
                  handleLeaveWaitlist(
                    session,
                  )
                  return
                }

                if (isFull) {
                  handleJoinWaitlist(
                    session,
                  )
                  return
                }

                handleBook(session)
              }


              function getButtonText() {
                if (isThisSessionPending) {
                  return 'Please wait...'
                }

                if (isBooked) {
                  return 'Booked'
                }

                if (waiting) {
                  return 'Leave waitlist'
                }

                if (isFull) {
                  return 'Join waitlist'
                }

                return 'Book session'
              }


              return (
                <article
                  className="session-card"
                  key={session.id}
                >

                  <div className="session-card-top">

                    <div>
                      <p className="session-date">
                        {formatDate(
                          session.start_time,
                        )}
                      </p>

                      <h2>
                        {formatTime(
                          session.start_time,
                        )}
                      </h2>
                    </div>


                    <span
                      className={
                        isFull
                          ? 'availability full'
                          : 'availability open'
                      }
                    >
                      {isFull
                        ? 'Full'
                        : `${session.seats_remaining} left`}
                    </span>

                  </div>


                  <div className="capacity-block">

                    <div className="capacity-row">
                      <span>
                        {occupancy}
                        /
                        {session.capacity}
                        {' '}
                        booked
                      </span>

                      <span>
                        {session.seats_remaining}
                        {' '}
                        seats remaining
                      </span>
                    </div>


                    <div
                      className="capacity-track"
                      aria-label={
                        `${occupancy} of ${session.capacity} seats booked`
                      }
                    >
                      <div
                        className="capacity-fill"
                        style={{
                          width:
                            `${occupancyPercent}%`,
                        }}
                      />
                    </div>

                  </div>


                  <div className="session-card-footer">

                    <span>
                      1 hour
                    </span>


                    {!isAdmin && (
                      <button
                        type="button"
                        className={
                          waiting
                            ? 'waitlist-leave-button'
                            : ''
                        }
                        disabled={
                          pendingSessionId !== null ||
                          isBooked
                        }
                        onClick={handleAction}
                      >
                        {getButtonText()}
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


export default SessionsPage