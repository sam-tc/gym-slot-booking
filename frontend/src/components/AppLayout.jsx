import { NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

import './AppLayout.css'


function AppLayout({ children }) {
  const {
    user,
    isAdmin,
    logout,
  } = useAuth()

  const navigate = useNavigate()


  function handleLogout() {
    logout()
    navigate('/auth')
  }


  return (
    <div className="app-shell">
      <header className="app-header">

        <NavLink
          to="/sessions"
          className="app-brand"
        >
          <span className="app-brand-mark">
            G
          </span>

          <span>GYMSLOT</span>
        </NavLink>


        <nav
          className="app-nav"
          aria-label="Main navigation"
        >
          <NavLink
            to="/sessions"
            className={({ isActive }) =>
              isActive
                ? 'nav-link active'
                : 'nav-link'
            }
          >
            Sessions
          </NavLink>


          {!isAdmin && (
            <NavLink
              to="/bookings"
              className={({ isActive }) =>
                isActive
                  ? 'nav-link active'
                  : 'nav-link'
              }
            >
              My Bookings
            </NavLink>
          )}


          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                isActive
                  ? 'nav-link active'
                  : 'nav-link'
              }
            >
              Admin
            </NavLink>
          )}
        </nav>


        <div className="header-user">
          <div className="user-details">
            <strong>
              {user?.name}
            </strong>

            <span>
              {isAdmin
                ? 'Admin'
                : 'Member'}
            </span>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>

      </header>


      <div className="app-content">
        {children}
      </div>
    </div>
  )
}


export default AppLayout