import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useSearchParams,
} from 'react-router-dom'

import { apiRequest } from '../services/api'

import './VerifyEmailPage.css'


function VerifyEmailPage() {
  const [searchParams] = useSearchParams()

  const [status, setStatus] =
    useState('loading')

  const [message, setMessage] =
    useState('Verifying your email...')


  useEffect(() => {
    document.title =
      'GymSlot | Verify Email'

    const token =
      searchParams.get('token')

    if (!token) {
      setStatus('error')

      setMessage(
        'This verification link is missing its token.',
      )

      return
    }


    let cancelled = false


    async function verifyEmail() {
      try {
        const response = await apiRequest(
          '/auth/verify-email',
          {
            method: 'POST',
            body: JSON.stringify({
              token,
            }),
          },
        )

        if (cancelled) {
          return
        }

        setStatus('success')
        setMessage(response.message)
      } catch (err) {
        if (cancelled) {
          return
        }

        setStatus('error')
        setMessage(err.message)
      }
    }


    verifyEmail()


    return () => {
      cancelled = true
    }
  }, [searchParams])


  return (
    <main className="verify-page">
      <section className="verify-card">
        <div className="verify-brand">
          <div className="verify-logo">
            G
          </div>

          <span>GYMSLOT</span>
        </div>


        {status === 'loading' && (
          <>
            <p className="verify-eyebrow">
              EMAIL VERIFICATION
            </p>

            <h1>
              Verifying your email
            </h1>

            <p className="verify-message">
              {message}
            </p>

            <div
              className="verify-spinner"
              aria-label="Verifying email"
            />
          </>
        )}


        {status === 'success' && (
          <>
            <p className="verify-eyebrow">
              EMAIL VERIFIED
            </p>

            <h1>
              You're verified.
            </h1>

            <p className="verify-message">
              {message}. You can now sign in
              to your GymSlot account.
            </p>

            <Link
              className="verify-button"
              to="/auth"
            >
              Continue to login
            </Link>
          </>
        )}


        {status === 'error' && (
          <>
            <p className="verify-eyebrow">
              VERIFICATION FAILED
            </p>

            <h1>
              Link not valid.
            </h1>

            <p
              className="verify-message"
              role="alert"
            >
              {message}
            </p>

            <Link
              className="verify-button"
              to="/auth"
            >
              Back to login
            </Link>
          </>
        )}
      </section>
    </main>
  )
}


export default VerifyEmailPage