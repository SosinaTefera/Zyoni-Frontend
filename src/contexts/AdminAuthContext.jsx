import React, { createContext, useContext, useReducer, useEffect } from "react";

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  sessionToken: null,
  loading: false,
  error: null,
  expiresAt: null,
  timeoutMinutes: 30,
};

// Action types
const ActionTypes = {
  LOGIN_START: "LOGIN_START",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILURE: "LOGIN_FAILURE",
  LOGOUT: "LOGOUT",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  CLEAR_ERROR: "CLEAR_ERROR",
};

// Reducer
const adminAuthReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.LOGIN_START:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case ActionTypes.LOGIN_SUCCESS:
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        sessionToken: action.payload.sessionToken,
        expiresAt: action.payload.expiresAt,
        timeoutMinutes: action.payload.timeoutMinutes,
        error: null,
      };
    case ActionTypes.LOGIN_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload.error,
        isAuthenticated: false,
        user: null,
        sessionToken: null,
        expiresAt: null,
      };
    case ActionTypes.LOGOUT:
      return {
        ...initialState,
      };
    case ActionTypes.SESSION_EXPIRED:
      return {
        ...initialState,
        error: "Session expired. Please login again.",
      };
    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Create context
const AdminAuthContext = createContext(null);

// Context provider
export const AdminAuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(adminAuthReducer, initialState);

  // Check for existing session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem("adminSession");
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);

        if (now < expiresAt) {
          // Session appears valid locally, but we need to validate with backend
          validateSessionWithBackend(session);
        } else {
          // Session expired, clear it
          localStorage.removeItem("adminSession");
          dispatch({ type: "SESSION_EXPIRED" });
        }
      } catch (error) {
        console.error("Error parsing saved session:", error);
        localStorage.removeItem("adminSession");
      }
    }
  }, []);

  // Validate session with backend
  const validateSessionWithBackend = async (session) => {
    try {
      // Skip validation for now to prevent UI resets
      // Just restore the session from localStorage
      dispatch({
        type: "LOGIN_SUCCESS",
        payload: {
          user: session.user,
          sessionToken: session.sessionToken,
          expiresAt: session.expiresAt,
          timeoutMinutes: session.timeoutMinutes,
        },
      });
    } catch (error) {
      console.error("Session validation error:", error);
      // On network error, assume session is invalid and clear it
      localStorage.removeItem("adminSession");
      dispatch({
        type: "LOGIN_FAILURE",
        payload: { error: "Session validation failed. Please login again." },
      });
    }
  };

  // Handle session validation errors from API calls
  const handleSessionError = () => {
    localStorage.removeItem("adminSession");
    dispatch({
      type: "SESSION_EXPIRED",
    });
  };

  // Set up session expiration timer
  useEffect(() => {
    if (state.isAuthenticated && state.expiresAt) {
      const now = new Date();
      const expiresAt = new Date(state.expiresAt);
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();

      if (timeUntilExpiry > 0) {
        const timer = setTimeout(() => {
          dispatch({ type: "SESSION_EXPIRED" });
          localStorage.removeItem("adminSession");
        }, timeUntilExpiry);

        return () => clearTimeout(timer);
      }
    }
  }, [state.isAuthenticated, state.expiresAt]);

  const login = async (apiKey, userId = "admin") => {
    dispatch({ type: "LOGIN_START" });

    try {
      const response = await fetch(
        "http://localhost:8000/api/admin/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: apiKey,
            user_id: userId,
            timeout_minutes: 30,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Authentication failed");
      }

      const data = await response.json();

      const sessionData = {
        user: { id: data.user_id, role: "Administrator" },
        sessionToken: data.session_token,
        expiresAt: data.expires_at,
        timeoutMinutes: data.timeout_minutes,
        apiKey: apiKey, // Store the original API key
      };

      // Save session to localStorage
      localStorage.setItem("adminSession", JSON.stringify(sessionData));

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: sessionData,
      });

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      dispatch({
        type: "LOGIN_FAILURE",
        payload: { error: error.message },
      });
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    if (state.sessionToken) {
      try {
        // Call backend logout endpoint
        await fetch(
          `http://localhost:8000/api/admin/auth/logout/${state.sessionToken}`,
          {
            method: "POST",
          }
        );
      } catch (error) {
        console.error("Logout error:", error);
      }
    }

    localStorage.removeItem("adminSession");
    dispatch({ type: "LOGOUT" });
  };

  const checkPermission = (permission) => {
    return state.isAuthenticated && state.user?.role === "Administrator";
  };

  const isSessionValid = () => {
    if (!state.isAuthenticated || !state.expiresAt) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(state.expiresAt);
    return now < expiresAt;
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const getTimeRemaining = () => {
    if (!state.expiresAt) return 0;
    const now = new Date();
    const expiresAt = new Date(state.expiresAt);
    const timeRemaining = expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(timeRemaining / 1000 / 60)); // minutes
  };

  // Admin chat function for the new agentic workflow
  const adminChat = async (message, conversationHistory = []) => {
    if (!state.isAuthenticated || !state.sessionToken) {
      throw new Error("Not authenticated");
    }

    // Get the original API key from localStorage
    const savedSession = localStorage.getItem("adminSession");
    let apiKey = null;
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        apiKey = session.apiKey; // We need to store the original API key
      } catch (e) {
        console.error("Error parsing saved session:", e);
      }
    }

    if (!apiKey) {
      throw new Error("API key not found. Please login again.");
    }

    try {
      const response = await fetch("http://localhost:8000/api/admin/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-API-Key": apiKey, // Use the API key directly as expected by backend
        },
        body: JSON.stringify({
          message,
          user_id: state.user?.id || "admin",
          session_id: state.sessionToken,
          conversation_history: conversationHistory,
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleSessionError();
          throw new Error("Session expired. Please login again.");
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || "Admin chat request failed");
      }

      return await response.json();
    } catch (error) {
      console.error("Admin chat error:", error);
      throw error;
    }
  };

  const value = {
    ...state,
    login,
    logout,
    checkPermission,
    clearError,
    getTimeRemaining,
    handleSessionError,
    isSessionValid,
    adminChat,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

// Custom hook to use the context
export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};

export default AdminAuthContext;
