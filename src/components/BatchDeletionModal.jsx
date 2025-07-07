import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useProgressTracking } from "../hooks/useProgressTracking";

const BatchDeletionModal = ({ batchName, onConfirm, onCancel }) => {
  const [apiKey, setApiKey] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Progress tracking hook
  const {
    progress,
    isConnected,
    error: progressError,
    resetProgress,
    getLastCompletedOperation,
  } = useProgressTracking("admin");

  // Monitor for completed deletion operations
  useEffect(() => {
    const lastCompleted = getLastCompletedOperation();
    if (lastCompleted && loading) {
      console.log("[BATCH_DELETION] Operation completed:", lastCompleted);

      if (lastCompleted.status === "success") {
        // Success - close modal and refresh parent
        console.log("[BATCH_DELETION] Deletion successful, closing modal");
        setLoading(false);
        onConfirm();
      } else {
        // Error - show error message and stop loading
        console.log("[BATCH_DELETION] Deletion failed:", lastCompleted);
        setError(
          lastCompleted.message ||
            lastCompleted.result?.message ||
            "Deletion failed"
        );
        setLoading(false);
      }
    }
  }, [getLastCompletedOperation(), loading, onConfirm]);

  const expectedConfirmation = `delete/${batchName}`;
  const isConfirmationValid = confirmationText === expectedConfirmation;
  const isFormValid = apiKey.trim() && isConfirmationValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError("");
    resetProgress(); // Clear any previous progress

    try {
      const response = await fetch(
        "http://localhost:8000/api/admin/batch/delete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            batch_name: batchName,
            api_key: apiKey.trim(),
            user_id: "admin", // For progress tracking
            session_id: `batch_delete_${Date.now()}`, // For progress tracking
          }),
        }
      );

      if (response.ok) {
        // The deletion is now tracked via WebSocket progress updates
        // Don't close modal immediately - wait for progress completion
        console.log(
          "[BATCH_DELETION] Deletion started, waiting for progress updates..."
        );
      } else {
        const errorData = await response.json();
        setError(
          errorData.detail || `Failed to delete batch: ${response.status}`
        );
        setLoading(false);
      }
    } catch (err) {
      console.error("Error deleting batch:", err);
      setError("Network error: Failed to connect to server");
      setLoading(false);
    }
  };

  const handleClose = () => {
    setApiKey("");
    setConfirmationText("");
    setShowApiKey(false);
    setError("");
    onCancel();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            <h3 className="text-xl font-bold text-gray-800">Delete Batch</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Warning Section */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-red-800 font-semibold mb-2">
                  ⚠️ Irreversible Action
                </h4>
                <p className="text-red-700 text-sm mb-2">
                  You are about to permanently delete the batch{" "}
                  <strong>"{batchName}"</strong> and all its properties.
                </p>
                <ul className="text-red-700 text-sm space-y-1">
                  <li>
                    • All properties in this batch will be removed from the
                    database
                  </li>
                  <li>
                    • The search index will be updated to reflect these changes
                  </li>
                  <li>• This action cannot be undone</li>
                  <li>
                    • Users will no longer be able to search these properties
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* API Key Field */}
            <div>
              <label
                htmlFor="apiKey"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Admin API Key <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your admin API key"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-12"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 text-lg"
                  disabled={loading}
                >
                  {showApiKey ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Confirmation Text Field */}
            <div>
              <label
                htmlFor="confirmation"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirmation <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmation"
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={`Type: ${expectedConfirmation}`}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 ${
                  confirmationText && !isConfirmationValid
                    ? "border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50"
                    : isConfirmationValid
                    ? "border-green-300 focus:ring-green-500 focus:border-green-500 bg-green-50"
                    : "border-gray-300 focus:ring-red-500 focus:border-red-500"
                }`}
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-600 mt-1">
                Type{" "}
                <code className="bg-gray-100 px-1 rounded text-red-600 font-mono">
                  {expectedConfirmation}
                </code>{" "}
                to confirm
              </p>
              {confirmationText && !isConfirmationValid && (
                <p className="text-xs text-red-600 mt-1">
                  ❌ Confirmation text doesn't match
                </p>
              )}
              {isConfirmationValid && (
                <p className="text-xs text-green-600 mt-1">
                  ✅ Confirmation text matches
                </p>
              )}
            </div>

            {/* Progress Display */}
            {loading && progress && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="mb-2">
                  <div className="flex justify-between text-sm font-medium text-blue-900">
                    <span>Deleting batch...</span>
                    <span>
                      {Math.round(progress.progress_percentage || 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.progress_percentage || 0}%` }}
                    />
                  </div>
                </div>
                {progress.current_step && (
                  <p className="text-blue-700 text-sm">
                    {progress.current_step}
                  </p>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={!isFormValid || loading}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-medium hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {progress && progress.progress_percentage !== undefined
                      ? `Deleting... ${Math.round(
                          progress.progress_percentage
                        )}%`
                      : "Deleting Batch..."}
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    Delete Batch Permanently
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BatchDeletionModal;
