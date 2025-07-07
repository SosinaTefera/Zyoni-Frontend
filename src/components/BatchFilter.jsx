import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import BatchDeletionModal from "./BatchDeletionModal";

const BatchFilter = forwardRef(
  (
    {
      onBatchFilterChange,
      selectedBatches = [],
      isAdminMode = false,
      onBatchDelete,
    },
    ref
  ) => {
    const [availableBatches, setAvailableBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allSelected, setAllSelected] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [batchToDelete, setBatchToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Fetch available batches from the backend
    useEffect(() => {
      fetchAvailableBatches();
    }, []);

    const fetchAvailableBatches = async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);
        const response = await fetch("http://localhost:8000/api/sources");

        if (!response.ok) {
          throw new Error("Failed to fetch batch sources");
        }

        const batches = await response.json();
        setAvailableBatches(batches);

        // If no batches are selected, select all by default
        if (selectedBatches.length === 0) {
          onBatchFilterChange(batches);
          setAllSelected(true);
        } else {
          setAllSelected(selectedBatches.length === batches.length);
        }
      } catch (err) {
        console.error("Error fetching batches:", err);
        setError(err.message);
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    };

    // Expose refresh function to parent component
    useImperativeHandle(ref, () => ({
      refreshBatches: () => fetchAvailableBatches(true),
    }));

    const handleBatchToggle = (batchName) => {
      let newSelectedBatches;

      if (selectedBatches.includes(batchName)) {
        // Remove batch
        newSelectedBatches = selectedBatches.filter((b) => b !== batchName);
      } else {
        // Add batch
        newSelectedBatches = [...selectedBatches, batchName];
      }

      setAllSelected(newSelectedBatches.length === availableBatches.length);
      onBatchFilterChange(newSelectedBatches);
    };

    const handleSelectAll = () => {
      if (allSelected) {
        // Deselect all
        onBatchFilterChange([]);
        setAllSelected(false);
      } else {
        // Select all
        onBatchFilterChange(availableBatches);
        setAllSelected(true);
      }
    };

    const handleDeleteBatch = (batchName) => {
      setBatchToDelete(batchName);
      setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async (deleteInfo) => {
      setDeleting(true);
      try {
        if (onBatchDelete) {
          await onBatchDelete(deleteInfo);
        }

        // Refresh the batch list after deletion
        await fetchAvailableBatches(true);

        // Update selected batches to remove the deleted batch
        const updatedSelectedBatches = selectedBatches.filter(
          (batch) => batch !== batchToDelete
        );
        onBatchFilterChange(updatedSelectedBatches);

        setShowDeleteModal(false);
        setBatchToDelete(null);
      } catch (error) {
        console.error("Error deleting batch:", error);
      } finally {
        setDeleting(false);
      }
    };

    const handleDeleteModalClose = () => {
      setShowDeleteModal(false);
      setBatchToDelete(null);
    };

    if (loading) {
      return (
        <div className="batch-filter-container">
          <div className="batch-filter-header">
            <h3>Data Sources</h3>
          </div>
          <div className="batch-filter-loading">
            <div className="loading-spinner"></div>
            <span>Loading sources...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="batch-filter-container">
          <div className="batch-filter-header">
            <h3>Data Sources</h3>
          </div>
          <div className="batch-filter-error">
            <span>❌ {error}</span>
            <button onClick={fetchAvailableBatches} className="retry-button">
              <ArrowPathIcon className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="batch-filter-container">
        <div className="batch-filter-header">
          <h3>Data Sources</h3>
          <div className="flex items-center gap-2">
            {refreshing && (
              <div
                className="loading-spinner"
                style={{ width: "14px", height: "14px" }}
              ></div>
            )}
            <span className="batch-count">
              {selectedBatches.length} of {availableBatches.length} selected
            </span>
          </div>
        </div>

        <div className="batch-filter-controls">
          <button
            onClick={handleSelectAll}
            className={`select-all-button ${allSelected ? "selected" : ""}`}
          >
            {allSelected ? (
              <>
                <XMarkIcon className="h-4 w-4" />
                Deselect All
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" />
                Select All
              </>
            )}
          </button>
        </div>

        <div className="batch-filter-list">
          {availableBatches.map((batchName) => (
            <div
              key={batchName}
              className={`batch-filter-item ${isAdminMode ? "admin-mode" : ""}`}
            >
              <label className="batch-filter-label">
                <input
                  type="checkbox"
                  checked={selectedBatches.includes(batchName)}
                  onChange={() => handleBatchToggle(batchName)}
                  className="batch-checkbox"
                />
                <div className="batch-checkbox-custom">
                  {selectedBatches.includes(batchName) && (
                    <CheckIcon className="h-3 w-3 text-white" />
                  )}
                </div>
                <span className="batch-name" title={batchName}>
                  {batchName}
                </span>
              </label>
              {isAdminMode && (
                <button
                  onClick={() => handleDeleteBatch(batchName)}
                  disabled={deleting}
                  className="batch-delete-button"
                  title={`Delete batch: ${batchName}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {availableBatches.length === 0 && (
          <div className="batch-filter-empty">
            <span>No data sources available</span>
            <button onClick={fetchAvailableBatches} className="retry-button">
              <ArrowPathIcon className="h-4 w-4" />
              Refresh
            </button>
          </div>
        )}

        {/* Batch Deletion Modal */}
        <BatchDeletionModal
          isOpen={showDeleteModal}
          onClose={handleDeleteModalClose}
          onConfirm={handleDeleteConfirm}
          batchName={batchToDelete || ""}
          loading={deleting}
        />
      </div>
    );
  }
);

export default BatchFilter;
