import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../services/api'

import './AdminPage.css'

import useRealtime from '../hooks/useRealtime'


function AdminPage() {
  const { token } = useAuth()

  const [sessions, setSessions] = useState([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [sessionBookings, setSessionBookings] = useState([])

  const [startTime, setStartTime] = useState('')
  const [checkInCode, setCheckInCode] = useState('')

  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [bookingsLoading, setBookingsLoading] = useState(false)

  const [createLoading, setCreateLoading] = useState(false)
  const [checkInLoading, setCheckInLoading] = useState(false)

  const [pageError, setPageError] = useState('')
  const [bookingError, setBookingError] = useState('')

  const [createMessage, setCreateMessage] = useState('')
  const [createError, setCreateError] = useState('')

  const [checkInMessage, setCheckInMessage] = useState('')
  const [checkInError, setCheckInError] = useState('')
  const [checkInResult, setCheckInResult] = useState(null)


  const loadSessions = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setSessionsLoading(true)
      }

      setPageError('')

      try {
        const data = await apiRequest(
          '/admin/sessions',
          {},
          token,
        )

        setSessions(data)
      } catch (err) {
        setPageError(err.message)
      } finally {
        if (showLoading) {
          setSessionsLoading(false)
        }
      }
    },
    [token],
  )


  const loadSessionBookings = useCallback(
    async (
      sessionId,
      showLoading = true,
    ) => {
      if (!sessionId) {
        setSessionBookings([])
        return
      }

      if (showLoading) {
        setBookingsLoading(true)
      }

      setBookingError('')

      try {
        const data = await apiRequest(
          `/admin/sessions/${sessionId}/bookings`,
          {},
          token,
        )

        setSessionBookings(data)
      } catch (err) {
        setBookingError(err.message)
      } finally {
        if (showLoading) {
          setBookingsLoading(false)
        }
      }
    },
    [token],
  )


  useEffect(() => {
    loadSessions()
  }, [loadSessions])


  useEffect(() => {
    if (selectedSessionId) {
      loadSessionBookings(selectedSessionId)
    } else {
      setSessionBookings([])
    }
  }, [
    selectedSessionId,
    loadSessionBookings,
  ])

  useRealtime(
    token,
    (event) => {
      if (
        event.type === 'sessions_changed'
      ) {
        loadSessions(false)
      }

      if (
        event.type === 'session_changed'
      ) {
        loadSessions(false)

        if (
          selectedSessionId &&
          String(event.session_id) ===
            String(selectedSessionId)
        ) {
          loadSessionBookings(
            selectedSessionId,
            false,
          )
        }
      }
    },
  )


  function formatDateTime(startTimeValue) {
    return new Intl.DateTimeFormat(
      'en-IN',
      {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      },
    ).format(new Date(startTimeValue))
  }


  function toGymDateTime(value) {
    const [
      datePart,
      timePart,
    ] = value.split('T')

    const [
      hour,
      minute,
    ] = timePart.split(':')

    return (
      `${datePart}T${hour}:${minute}:00+05:30`
    )
  }


  async function handleCreateSession(event) {
    event.preventDefault()

    setCreateMessage('')
    setCreateError('')

    if (!startTime) {
      setCreateError(
        'Please choose a session date and time.',
      )
      return
    }

    const timePart =
      startTime.split('T')[1]

    const minute =
      timePart?.split(':')[1]

    if (minute !== '00') {
      setCreateError(
        'Sessions must start exactly on the hour.',
      )
      return
    }

    setCreateLoading(true)

    try {
      const createdSession =
        await apiRequest(
          '/sessions',
          {
            method: 'POST',
            body: JSON.stringify({
              start_time:
                toGymDateTime(startTime),
            }),
          },
          token,
        )

      setCreateMessage(
        'Session created successfully.',
      )

      setStartTime('')

      await loadSessions()

      setSelectedSessionId(
        String(createdSession.id),
      )
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreateLoading(false)
    }
  }


  async function handleCheckIn(event) {
    event.preventDefault()

    setCheckInMessage('')
    setCheckInError('')
    setCheckInResult(null)

    const code =
      checkInCode.trim().toUpperCase()

    if (!code) {
      setCheckInError(
        'Please enter a check-in code.',
      )
      return
    }

    setCheckInLoading(true)

    try {
      const result =
        await apiRequest(
          '/admin/check-in',
          {
            method: 'POST',
            body: JSON.stringify({
              code,
            }),
          },
          token,
        )

      setCheckInMessage(
        'Member checked in successfully.',
      )

      setCheckInResult(result)
      setCheckInCode('')

      if (
        String(result.session_id) ===
        selectedSessionId
      ) {
        await loadSessionBookings(
          selectedSessionId,
        )
      }
    } catch (err) {
      setCheckInError(err.message)
    } finally {
      setCheckInLoading(false)
    }
  }


  return (
    <main className="admin-page">

      <section className="admin-heading">
        <div>
          <p className="admin-eyebrow">
            GYM OPERATIONS
          </p>

          <h1>
            Admin dashboard
          </h1>

          <p className="admin-description">
            Create sessions, inspect bookings
            and check members in.
          </p>
        </div>
      </section>


      {pageError && (
        <p
          className="admin-message error"
          role="alert"
        >
          {pageError}
        </p>
      )}


      <div className="admin-grid">

        <section className="admin-panel">

          <div className="panel-heading">
            <div>
              <p className="panel-number">
                01
              </p>

              <h2>
                Create session
              </h2>
            </div>

            <span>
              Capacity 20
            </span>
          </div>


          <form
            onSubmit={handleCreateSession}
            noValidate
          >

            <div className="admin-field">
              <label htmlFor="session-start">
                Date and start time
              </label>

              <input
                id="session-start"
                type="datetime-local"
                step="3600"
                value={startTime}
                onChange={(event) => {
                  setStartTime(
                    event.target.value,
                  )

                  setCreateError('')
                  setCreateMessage('')
                }}
              />

              <small>
                Sessions must start exactly
                on the hour.
              </small>
            </div>


            {createError && (
              <p
                className="admin-message error"
                role="alert"
              >
                {createError}
              </p>
            )}


            {createMessage && (
              <p
                className="admin-message success"
                role="status"
              >
                {createMessage}
              </p>
            )}


            <button
              type="submit"
              className="admin-primary-button"
              disabled={createLoading}
            >
              {createLoading
                ? 'Creating...'
                : 'Create session'}
            </button>

          </form>

        </section>


        <section className="admin-panel">

          <div className="panel-heading">
            <div>
              <p className="panel-number">
                02
              </p>

              <h2>
                Check in member
              </h2>
            </div>
          </div>


          <form
            onSubmit={handleCheckIn}
            noValidate
          >

            <div className="admin-field">
              <label htmlFor="check-in-code">
                Check-in code
              </label>

              <input
                id="check-in-code"
                type="text"
                value={checkInCode}
                onChange={(event) => {
                  setCheckInCode(
                    event.target.value,
                  )

                  setCheckInError('')
                  setCheckInMessage('')
                  setCheckInResult(null)
                }}
                placeholder="e.g. 7XKP2Q"
                autoComplete="off"
              />
            </div>


            {checkInError && (
              <p
                className="admin-message error"
                role="alert"
              >
                {checkInError}
              </p>
            )}


            {checkInMessage && (
              <p
                className="admin-message success"
                role="status"
              >
                {checkInMessage}
              </p>
            )}


            {checkInResult && (
              <div className="checkin-result">

                <span>
                  Checked in
                </span>

                <strong>
                  {checkInResult.member_name}
                </strong>

                <p>
                  {checkInResult.member_email}
                </p>

                <small>
                  {formatDateTime(
                    checkInResult
                      .session_start_time,
                  )}
                </small>

              </div>
            )}


            <button
              type="submit"
              className="admin-primary-button"
              disabled={checkInLoading}
            >
              {checkInLoading
                ? 'Checking in...'
                : 'Check in'}
            </button>

          </form>

        </section>

      </div>


      <section className="admin-panel bookings-panel">

        <div className="panel-heading">
          <div>
            <p className="panel-number">
              03
            </p>

            <h2>
              Session bookings
            </h2>
          </div>
        </div>


        <div className="admin-field">

          <label htmlFor="admin-session">
            Choose session
          </label>


          <div className="select-wrapper">

            <select
              id="admin-session"
              value={selectedSessionId}
              onChange={(event) =>
                setSelectedSessionId(
                  event.target.value,
                )
              }
              disabled={sessionsLoading}
            >
              <option value="">
                Select a session
              </option>

              {sessions.map((session) => (
                <option
                  key={session.id}
                  value={session.id}
                >
                  {formatDateTime(
                    session.start_time,
                  )}
                  {' · '}
                  {session.seats_remaining}
                  {' seats left'}
                </option>
              ))}
            </select>

          </div>

        </div>


        {sessionsLoading && (
          <div className="admin-state">
            Loading sessions...
          </div>
        )}


        {!sessionsLoading &&
          sessions.length === 0 && (
            <div className="admin-state">
              No upcoming sessions found.
            </div>
          )}


        {bookingError && (
          <p
            className="admin-message error"
            role="alert"
          >
            {bookingError}
          </p>
        )}


        {bookingsLoading && (
          <div className="admin-state">
            Loading bookings...
          </div>
        )}


        {!bookingsLoading &&
          selectedSessionId &&
          !bookingError &&
          sessionBookings.length === 0 && (
            <div className="admin-state">
              This session has no bookings yet.
            </div>
          )}


        {!bookingsLoading &&
          sessionBookings.length > 0 && (
            <div className="admin-bookings-list">

              {sessionBookings.map(
                (booking) => (
                  <article
                    className="admin-booking-row"
                    key={booking.id}
                  >

                    <div>
                      <strong>
                        {booking.member_name}
                      </strong>

                      <span>
                        {booking.member_email}
                      </span>
                    </div>


                    <div className="admin-booking-code">

                      <span>
                        Code
                      </span>

                      <code>
                        {
                          booking.check_in_code ??
                          '—'
                        }
                      </code>

                    </div>


                    <div>
                      <span
                        className={
                          booking.status ===
                          'confirmed'
                            ? 'admin-status confirmed'
                            : 'admin-status cancelled'
                        }
                      >
                        {booking.status}
                      </span>
                    </div>


                    <div>
                      {booking.checked_in_at ? (
                        <span className="present-text">
                          Present
                        </span>
                      ) : booking.status ===
                        'confirmed' ? (
                        <span className="not-present-text">
                          Not checked in
                        </span>
                      ) : (
                        <span className="not-present-text">
                          —
                        </span>
                      )}
                    </div>

                  </article>
                ),
              )}

            </div>
          )}

      </section>

    </main>
  )
}


export default AdminPage