import React, { useState } from "react";

const ProgressIndicator = ({
  progress,
  isConnected,
  error,
  onDismiss,
  onCancel,
}) => {
  const [isCancelling, setIsCancelling] = useState(false);

  if (!progress.isActive && progress.percentage === 0) {
    return null;
  }

  const getProgressColor = () => {
    if (error) return "bg-red-500";
    if (progress.percentage === 100) return "bg-green-500";
    return "bg-blue-500";
  };

  const getStatusIcon = () => {
    if (error) return "❌";
    if (progress.percentage === 100) return "✅";
    return "⏳";
  };

  const formatItemsProgress = () => {
    if (progress.totalItems > 0) {
      return `${progress.itemsProcessed}/${progress.totalItems} items`;
    }
    return "";
  };

  const handleCancel = async () => {
    if (isCancelling || !progress.operationId) return;

    setIsCancelling(true);

    try {
      const response = await fetch(
        "http://localhost:8000/api/admin/operation/cancel",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key":
              localStorage.getItem("admin_api_key") ||
              "zyonia-secret-admin-key-2024",
          },
          body: JSON.stringify({
            operation_id: progress.operationId,
            user_id: "admin",
            reason: "User requested cancellation",
          }),
        }
      );

      if (response.ok) {
        console.log("[PROGRESS] Operation cancelled successfully");
        if (onCancel) {
          onCancel();
        }
      } else {
        console.error("[PROGRESS] Failed to cancel operation");
        // Don't show error to user, just log it
      }
    } catch (error) {
      console.error("[PROGRESS] Error cancelling operation:", error);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full bg-white rounded-lg shadow-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <span className="font-medium text-gray-900">
            {error
              ? "Upload Failed"
              : progress.percentage === 100
              ? "Upload Complete"
              : "Uploading..."}
          </span>
        </div>

        {/* Connection indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-400" : "bg-red-400"
            }`}
          ></div>
          <span className="text-xs text-gray-500">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">
            {Math.round(progress.percentage)}% Complete
          </span>
          <span className="text-xs text-gray-500">{formatItemsProgress()}</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${progress.percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Current step */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 font-medium mb-1">Current Step:</p>
        <p className="text-xs text-gray-600">
          {progress.currentStep || "Preparing..."}
        </p>

        {progress.currentItem && (
          <p className="text-xs text-gray-500 mt-1">
            Processing: {progress.currentItem}
          </p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Cancel button - only show during active upload */}
        {progress.isActive && progress.percentage < 100 && !error && (
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="flex-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            {isCancelling ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b border-red-700"></div>
                Cancelling...
              </>
            ) : (
              <>
                <span>🚫</span>
                Cancel Upload
              </>
            )}
          </button>
        )}

        {/* Dismiss button - only show when completed or error */}
        {(progress.percentage === 100 || error) && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>

      {/* Progress details for debugging */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">Debug Info</summary>
            <pre className="mt-2 text-xs bg-gray-50 p-2 rounded">
              {JSON.stringify(progress, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;
