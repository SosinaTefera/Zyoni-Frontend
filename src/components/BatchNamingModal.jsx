import React, { useState } from "react";
import { XMarkIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

const BatchNamingModal = ({
  isOpen,
  onClose,
  onConfirm,
  fileName,
  loading,
}) => {
  const [batchName, setBatchName] = useState("");
  const [useOptimized, setUseOptimized] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (batchName.trim()) {
      onConfirm(batchName.trim(), useOptimized);
    }
  };

  const handleClose = () => {
    setBatchName("");
    setUseOptimized(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="h-6 w-6 text-blue-500" />
            <h3 className="text-xl font-bold text-gray-800">Name Your Batch</h3>
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
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File to Upload
            </label>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
              <span className="text-sm text-gray-600 font-mono">
                {fileName}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="batchName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Batch Name <span className="text-red-500">*</span>
            </label>
            <input
              id="batchName"
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g., Madrid Downtown Properties, New Listings Q1 2024"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={loading}
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              This name will appear in the data sources filter and identify this
              batch in the system.
            </p>
          </div>

          {/* Upload Mode Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Upload Mode
            </label>
            <div className="space-y-3">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="uploadMode"
                  value="optimized"
                  checked={useOptimized}
                  onChange={() => setUseOptimized(true)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={loading}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      🚀 Optimized Upload
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Parallel processing with up to 8 concurrent LLM calls. Much
                    faster for large files (3-5x speed improvement).
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="uploadMode"
                  value="regular"
                  checked={!useOptimized}
                  onChange={() => setUseOptimized(false)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={loading}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      ⚡ Regular Upload
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      Legacy
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Sequential processing (one property at a time). More
                    conservative approach.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!batchName.trim() || loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {useOptimized ? "Optimizing..." : "Uploading..."}
                </>
              ) : (
                <>
                  <DocumentTextIcon className="h-4 w-4" />
                  {useOptimized
                    ? "🚀 Start Optimized Upload"
                    : "⚡ Start Regular Upload"}
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
  );
};

export default BatchNamingModal;
