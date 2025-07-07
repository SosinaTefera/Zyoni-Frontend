import React, { useState } from "react";
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const BatchDeletionModal = ({
  isOpen,
  onClose,
  onConfirm,
  batchName,
  loading,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const expectedConfirmation = `delete/${batchName}`;
  const isConfirmationValid = confirmationText === expectedConfirmation;
  const isFormValid = apiKey.trim() && isConfirmationValid;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isFormValid) {
      onConfirm({
        apiKey: apiKey.trim(),
        batchName,
      });
    }
  };

  const handleClose = () => {
    setApiKey("");
    setConfirmationText("");
    setShowApiKey(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
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
                    Deleting Batch...
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
    </div>
  );
};

export default BatchDeletionModal;
