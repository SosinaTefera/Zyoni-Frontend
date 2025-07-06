import React, { useState, useEffect } from "react";
import "./AdminConfirmationDialog.css";

const AdminConfirmationDialog = ({
  isOpen,
  operation,
  onConfirm,
  onCancel,
  destructiveLevel = "medium", // low, medium, high
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [requiresTypeConfirmation, setRequiresTypeConfirmation] =
    useState(false);

  // Determine confirmation requirements based on destructive level
  useEffect(() => {
    if (isOpen && operation) {
      // Reset state
      setIsConfirming(false);
      setUserInput("");

      // Set requirements based on destructive level
      if (destructiveLevel === "high") {
        setRequiresTypeConfirmation(true);
        setCountdown(5); // 5 second countdown for high risk
      } else if (destructiveLevel === "medium") {
        setRequiresTypeConfirmation(false);
        setCountdown(3); // 3 second countdown for medium risk
      } else {
        setRequiresTypeConfirmation(false);
        setCountdown(0); // No countdown for low risk
      }
    }
  }, [isOpen, operation, destructiveLevel]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleConfirm = async () => {
    if (isConfirming) return;

    // Check if type confirmation is required
    if (requiresTypeConfirmation && userInput.toLowerCase() !== "delete") {
      return;
    }

    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    if (isConfirming) return;
    onCancel();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter" && canConfirm()) {
      handleConfirm();
    }
  };

  const canConfirm = () => {
    if (countdown > 0) return false;
    if (requiresTypeConfirmation && userInput.toLowerCase() !== "delete")
      return false;
    return true;
  };

  const getIcon = () => {
    switch (destructiveLevel) {
      case "high":
        return "🚨";
      case "medium":
        return "⚠️";
      default:
        return "❓";
    }
  };

  const getTitle = () => {
    switch (destructiveLevel) {
      case "high":
        return "DANGEROUS OPERATION";
      case "medium":
        return "Confirmation Required";
      default:
        return "Confirm Action";
    }
  };

  const getDescription = () => {
    if (!operation) return "";

    const baseDescription =
      operation.description || "This operation will make changes to your data.";

    switch (destructiveLevel) {
      case "high":
        return `${baseDescription}\n\n⚠️ This action is IRREVERSIBLE and may affect multiple properties or system data.`;
      case "medium":
        return `${baseDescription}\n\n⚠️ This action cannot be undone.`;
      default:
        return baseDescription;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-confirmation-overlay" onClick={handleCancel}>
      <div
        className={`admin-confirmation-dialog ${destructiveLevel}-risk`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="admin-confirmation-header">
          <div className="admin-confirmation-icon">{getIcon()}</div>
          <h2 className="admin-confirmation-title">{getTitle()}</h2>
        </div>

        <div className="admin-confirmation-content">
          <div className="admin-confirmation-description">
            {getDescription()
              .split("\n")
              .map((line, index) => (
                <p
                  key={index}
                  className={line.startsWith("⚠️") ? "warning-text" : ""}
                >
                  {line}
                </p>
              ))}
          </div>

          {operation && (
            <div className="admin-confirmation-details">
              <div className="admin-confirmation-detail-item">
                <span className="detail-label">Operation:</span>
                <span className="detail-value">
                  {operation.intent_type?.replace("_", " ").toUpperCase()}
                </span>
              </div>
              {operation.entity_id && (
                <div className="admin-confirmation-detail-item">
                  <span className="detail-label">Target:</span>
                  <span className="detail-value">{operation.entity_id}</span>
                </div>
              )}
              {operation.parameters &&
                Object.keys(operation.parameters).length > 0 && (
                  <div className="admin-confirmation-detail-item">
                    <span className="detail-label">Parameters:</span>
                    <span className="detail-value">
                      {Object.entries(operation.parameters).map(
                        ([key, value]) => (
                          <span key={key} className="param-item">
                            {key}: {String(value)}
                          </span>
                        )
                      )}
                    </span>
                  </div>
                )}
            </div>
          )}

          {requiresTypeConfirmation && (
            <div className="admin-confirmation-input-section">
              <label
                htmlFor="confirmationInput"
                className="confirmation-input-label"
              >
                Type <strong>"DELETE"</strong> to confirm this dangerous
                operation:
              </label>
              <input
                id="confirmationInput"
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="confirmation-input"
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="admin-confirmation-actions">
          <button
            onClick={handleCancel}
            className="admin-confirmation-cancel"
            disabled={isConfirming}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`admin-confirmation-confirm ${destructiveLevel}-risk`}
            disabled={!canConfirm() || isConfirming}
          >
            {isConfirming ? (
              <>
                <span className="confirmation-spinner">⏳</span>
                Executing...
              </>
            ) : countdown > 0 ? (
              `Confirm (${countdown}s)`
            ) : (
              "Confirm Operation"
            )}
          </button>
        </div>

        {countdown > 0 && (
          <div className="admin-confirmation-countdown">
            <div className="countdown-bar">
              <div
                className="countdown-progress"
                style={{
                  width: `${
                    (((destructiveLevel === "high" ? 5 : 3) - countdown) /
                      (destructiveLevel === "high" ? 5 : 3)) *
                    100
                  }%`,
                }}
              />
            </div>
            <p className="countdown-text">
              Please wait {countdown} second{countdown !== 1 ? "s" : ""} before
              confirming...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminConfirmationDialog;
