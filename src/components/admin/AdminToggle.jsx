import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

const AdminToggle = () => {
  const {
    isAuthenticated,
    user,
    loading,
    error,
    login,
    logout,
    clearError,
    getTimeRemaining,
  } = useAdminAuth();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Update time remaining every minute
  useEffect(() => {
    if (isAuthenticated) {
      const updateTimeRemaining = () => {
        setTimeRemaining(getTimeRemaining());
      };

      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, getTimeRemaining]);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!apiKey.trim()) {
      return;
    }

    const result = await login(apiKey.trim());

    if (result.success) {
      setShowLoginModal(false);
      setApiKey("");
      setShowApiKey(false);
    }
  };

  const handleModalClose = () => {
    setShowLoginModal(false);
    setApiKey("");
    setShowApiKey(false);
    clearError();
  };

  const handleLogout = async () => {
    await logout();
    setShowDropdown(false);
  };

  const handleToggleClick = () => {
    if (isAuthenticated) {
      setShowDropdown(!showDropdown);
    } else {
      setShowLoginModal(true);
    }
  };

  const formatTimeRemaining = (minutes) => {
    if (minutes <= 0) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="admin-toggle-container">
      {/* Admin Toggle Button */}
      <button
        onClick={handleToggleClick}
        className={`admin-toggle-button ${
          isAuthenticated ? "admin-authenticated" : "admin-unauthenticated"
        }`}
        disabled={loading}
      >
        {isAuthenticated ? (
          <>
            <span className="admin-status-circle admin-active"></span>
            <span className="admin-toggle-text">Admin Mode: Active</span>
          </>
        ) : (
          <>
            <span className="admin-toggle-icon">🔓</span>
            <span className="admin-toggle-text">Admin Mode</span>
          </>
        )}
                {loading && <span className="admin-loading-spinner">⏳</span>}
        </button>

        {/* Admin Status Dropdown */}
        {showDropdown && isAuthenticated && (
          <div className="admin-dropdown">
            <div className="admin-dropdown-header">
              <span className="admin-status-indicator admin-active"></span>
              <span className="admin-status-text">Admin Active</span>
            </div>
            <div className="admin-dropdown-content">
              <div className="admin-info-line">
                <span className="admin-info-label">Logged in as:</span>
                <span className="admin-info-value">{user?.id}</span>
              </div>
              <div className="admin-info-line">
                <span className="admin-info-label">Role:</span>
                <span className="admin-info-value">{user?.role}</span>
              </div>
              <div className="admin-info-line">
                <span className="admin-info-label">Session expires:</span>
                <span className="admin-info-value">
                  {formatTimeRemaining(timeRemaining)}
                </span>
              </div>
            </div>
            <button onClick={handleLogout} className="admin-logout-button">
              Logout
            </button>
          </div>
        )}

        {/* Login Modal - Rendered as Portal to center on page */}
      {showLoginModal &&
        createPortal(
          <div className="admin-modal-overlay" onClick={handleModalClose}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h3 className="admin-modal-title">🔒 Admin Login</h3>
                <button
                  onClick={handleModalClose}
                  className="admin-modal-close"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleLogin} className="admin-modal-form">
                <div className="admin-form-group">
                  <label htmlFor="apiKey" className="admin-form-label">
                    Admin API Key
                  </label>
                  <div className="admin-api-key-input">
                    <input
                      id="apiKey"
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter admin API key"
                      className="admin-form-input"
                      autoComplete="off"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="admin-api-key-toggle"
                    >
                      {showApiKey ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="admin-error-message">
                    <span className="admin-error-icon">⚠️</span>
                    <span className="admin-error-text">{error}</span>
                  </div>
                )}

                <div className="admin-modal-actions">
                  <button
                    type="submit"
                    disabled={loading || !apiKey.trim()}
                    className="admin-login-button"
                  >
                    {loading ? (
                      <>
                        <span className="admin-loading-spinner">⏳</span>
                        Authenticating...
                      </>
                    ) : (
                      "Login"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="admin-cancel-button"
                  >
                    Cancel
                  </button>
                </div>
              </form>

              <div className="admin-modal-footer">
                <p className="admin-demo-note">
                  <span className="admin-demo-icon">💡</span>
                  Demo API Key: <code>zyonia-secret-admin-key-2024</code>
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AdminToggle;
