import {
  useEffect,
  useState,
} from 'react'

import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../services/api'

import './AuthPage.css'


function AuthPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [mode, setMode] = useState('login')

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const [
    verificationEmail,
    setVerificationEmail,
  ] = useState('')

  const [
    resendLoading,
    setResendLoading,
  ] = useState(false)


  useEffect(() => {
    document.title =
      mode === 'login'
        ? 'GymSlot | Login'
        : 'GymSlot | Register'
  }, [mode])


  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setError('')
  }


  function validateForm() {
    if (
      mode === 'register' &&
      !form.name.trim()
    ) {
      return 'Please enter your name.'
    }

    if (!form.email.trim()) {
      return 'Please enter your email.'
    }

    if (!form.email.includes('@')) {
      return 'Please enter a valid email.'
    }

    if (!form.password) {
      return 'Please enter your password.'
    }

    if (
      mode === 'register' &&
      form.password.length < 8
    ) {
      return (
        'Password must be at least 8 characters.'
      )
    }

    return null
  }


  async function handleSubmit(event) {
    event.preventDefault()

    const validationError = validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'login') {
        try {
          const user = await login(
            form.email,
            form.password,
          )

          if (user.role === 'admin') {
            navigate('/admin')
          } else {
            navigate('/sessions')
          }

          return
        } catch (err) {
          if (
            err.message
              .toLowerCase()
              .includes('verify your email')
          ) {
            setVerificationEmail(
              form.email.trim(),
            )
          }

          throw err
        }
      }


      const email = form.email
        .trim()
        .toLowerCase()

      await apiRequest(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            name: form.name.trim(),
            email,
            password: form.password,
          }),
        },
      )

      setVerificationEmail(email)

      setSuccess(
        'Account created. We sent you a verification email. Verify your email before signing in.',
      )

      setMode('login')

      setForm({
        name: '',
        email,
        password: '',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }


  async function resendVerification() {
    const email =
      verificationEmail ||
      form.email.trim()

    if (!email) {
      setError(
        'Enter your email address first.',
      )
      return
    }

    setResendLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await apiRequest(
        '/auth/resend-verification',
        {
          method: 'POST',
          body: JSON.stringify({
            email,
          }),
        },
      )

      setVerificationEmail(email)
      setSuccess(response.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setResendLoading(false)
    }
  }


  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setSuccess('')
    setVerificationEmail('')

    setForm({
      name: '',
      email: '',
      password: '',
    })
  }


  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="brand">
          <div className="brand-mark">
            G
          </div>

          <span>GYMSLOT</span>
        </div>

        <div className="hero-content">
          <p className="eyebrow">
            TRAIN. BOOK. SHOW UP.
          </p>

          <h1>
            Your workout.
            <br />
            Your slot.
          </h1>

          <p className="hero-copy">
            Reserve gym sessions without calls,
            queues or overbooking.
          </p>

          <div className="hero-stat">
            <strong>20</strong>

            <span>
              members per session
            </span>
          </div>
        </div>
      </section>


      <section className="auth-panel">
        <div className="auth-card">
          <p className="auth-label">
            MEMBER ACCESS
          </p>

          <h2>
            {mode === 'login'
              ? 'Welcome back'
              : 'Create your account'}
          </h2>

          <p className="auth-description">
            {mode === 'login'
              ? 'Sign in to manage your gym sessions.'
              : 'Register as a member and start booking sessions.'}
          </p>


          <div
            className="auth-tabs"
            aria-label="Authentication type"
          >
            <button
              type="button"
              className={
                mode === 'login'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                switchMode('login')
              }
            >
              Login
            </button>

            <button
              type="button"
              className={
                mode === 'register'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                switchMode('register')
              }
            >
              Register
            </button>
          </div>


          <form
            onSubmit={handleSubmit}
            noValidate
          >
            {mode === 'register' && (
              <div className="form-field">
                <label htmlFor="name">
                  Name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
            )}


            <div className="form-field">
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>


            <div className="form-field">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete={
                  mode === 'login'
                    ? 'current-password'
                    : 'new-password'
                }
              />
            </div>


            {error && (
              <p
                className="form-message error"
                role="alert"
              >
                {error}
              </p>
            )}


            {success && (
              <p
                className="form-message success"
                role="status"
              >
                {success}
              </p>
            )}


            <button
              className="submit-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
            </button>


            {mode === 'login' &&
              verificationEmail && (
                <button
                  className="verification-link-button"
                  type="button"
                  onClick={resendVerification}
                  disabled={resendLoading}
                >
                  {resendLoading
                    ? 'Sending...'
                    : 'Resend verification email'}
                </button>
              )}
          </form>


          <p className="auth-footer">
            {mode === 'login'
              ? 'New here? '
              : 'Already registered? '}

            <button
              type="button"
              onClick={() =>
                switchMode(
                  mode === 'login'
                    ? 'register'
                    : 'login',
                )
              }
            >
              {mode === 'login'
                ? 'Create an account'
                : 'Sign in'}
            </button>
          </p>
        </div>
      </section>
    </div>
  )
}


export default AuthPage