import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navigation({ isAuthenticated, onLogout }) {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand">Yuk Platformasi</div>
      
      <div className="navbar-menu">
        <Link to="/">
          <button 
            className={`nav-button ${location.pathname === '/' ? 'active' : ''}`}
          >
            Yuklar
          </button>
        </Link>

        <Link to="/transports">
          <button 
            className={`nav-button ${location.pathname === '/transports' ? 'active' : ''}`}
          >
            Transportlar
          </button>
        </Link>

        {isAuthenticated && (
          <>
            <Link to="/driver-status">
              <button 
                className={`nav-button ${location.pathname === '/driver-status' ? 'active' : ''}`}
              >
                Haydovchi holati
              </button>
            </Link>

            <Link to="/create-transport">
              <button 
                className={`nav-button ${location.pathname === '/create-transport' ? 'active' : ''}`}
              >
                Transport yaratish
              </button>
            </Link>

            <Link to="/create-harbinger">
              <button 
                className={`nav-button ${location.pathname === '/create-harbinger' ? 'active' : ''}`}
              >
                Harbinger yaratish
              </button>
            </Link>

            <Link to="/my-orders">
              <button 
                className={`nav-button ${location.pathname === '/my-orders' ? 'active' : ''}`}
              >
                Buyurtmalarim
              </button>
            </Link>

            <Link to="/my-transports">
              <button 
                className={`nav-button ${location.pathname === '/my-transports' ? 'active' : ''}`}
              >
                Transportlarim
              </button>
            </Link>

            <Link to="/profile">
              <button 
                className={`nav-button ${location.pathname === '/profile' ? 'active' : ''}`}
              >
                Profil
              </button>
            </Link>

            <button className="nav-button danger" onClick={onLogout}>
              Chiqish
            </button>
          </>
        )}

        {!isAuthenticated && (
          <Link to="/login">
            <button className="nav-button primary">
              Kirish
            </button>
          </Link>
        )}
      </div>
    </nav>
  );
}
