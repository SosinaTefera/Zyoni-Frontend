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
    <div className="relative w-56">
      {/* Admin Toggle Button */}
      <button
        onClick={handleToggleClick}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-bold text-sm shadow-md transition-all duration-200 ${
          isAuthenticated
            ? "bg-purple-500 hover:bg-purple-600"
            : "bg-purple-400 hover:bg-purple-500"
        }`}
        disabled={loading}
      >
        {isAuthenticated ? (
          <>
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span>Admin Mode: Active</span>
          </>
        ) : (
          <>
            <span className="text-lg">🔓</span>
            <span>Admin Mode</span>
          </>
        )}
        {loading && <span className="animate-spin ml-2">⏳</span>}
      </button>

      {/* Admin Status Dropdown */}
      {showDropdown && isAuthenticated && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-20">
            <div className="w-full bg-white rounded-xl shadow-2xl border border-gray-200/80 p-4">
                <div className="flex items-center gap-3 border-b border-gray-200 pb-3 mb-3">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span className="font-bold text-base text-gray-800">Admin Active</span>
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Logged in as:</span>
                        <span className="font-semibold text-gray-800">{user?.id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Role:</span>
                        <span className="font-semibold text-gray-800">{user?.role}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Session expires:</span>
                        <span className="font-semibold text-gray-800">
                        {formatTimeRemaining(timeRemaining)}
                        </span>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all duration-200 shadow-md"
                >
                    Logout
                </button>
            </div>
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
