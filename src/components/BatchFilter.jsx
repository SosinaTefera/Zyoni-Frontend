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
import { useAdminAuth } from "../contexts/AdminAuthContext";
import "./BatchFilter.css";

const BatchFilter = forwardRef(
  (
    {
      onBatchFilterChange,
      selectedBatches = [],
      isAdminMode = false,
      onBatchDelete,
      refreshHandler,
    },
    ref
  ) => {
    const { isAuthenticated: isAdminAuthenticated } = useAdminAuth();
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
          throw new Error("Failed to fetch batches");
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
        setError("Failed to load batches");
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

    // Set up refresh handler for external triggers (like upload completion)
    useEffect(() => {
      if (refreshHandler) {
        refreshHandler.current = () => fetchAvailableBatches(true);
      }
    }, [refreshHandler]);

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

    const handleDeleteClick = (batchName, event) => {
      event.stopPropagation(); // Prevent checkbox toggle
      setBatchToDelete(batchName);
      setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
      // The deletion is handled by the modal, so we just need to refresh and update state
      try {
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
        console.error("Error refreshing after deletion:", error);
      }
    };

    const handleDeleteModalClose = () => {
      setShowDeleteModal(false);
      setBatchToDelete(null);
    };

    if (loading) {
      return (
        <div className="batch-filter-container">
          <h4 className="batch-filter-title">Batch Filter</h4>
          <div className="batch-filter-loading">Loading batches...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="batch-filter-container">
          <h4 className="batch-filter-title">Batch Filter</h4>
          <div className="batch-filter-error">{error}</div>
          <button
            onClick={fetchAvailableBatches}
            className="batch-filter-retry"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="batch-filter-container">
          <h4 className="batch-filter-title">Batch Filter</h4>
          {availableBatches.length === 0 ? (
            <div className="batch-filter-empty">No batches available</div>
          ) : (
            <div className="batch-filter-list">
              {availableBatches.map((batchName) => (
                <div key={batchName} className="batch-filter-item">
                  <label className="batch-filter-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedBatches.includes(batchName)}
                      onChange={() => handleBatchToggle(batchName)}
                      className="batch-checkbox-input"
                    />
                    <span className="batch-checkbox-label">{batchName}</span>
                  </label>
                  {isAdminAuthenticated && (
                    <button
                      onClick={(e) => handleDeleteClick(batchName, e)}
                      className="batch-delete-button"
                      title={`Delete batch: ${batchName}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {selectedBatches.length > 0 && (
            <div className="batch-filter-summary">
              {selectedBatches.length} batch
              {selectedBatches.length !== 1 ? "es" : ""} selected
            </div>
          )}
        </div>

        {/* Batch Deletion Modal */}
        {showDeleteModal && (
          <BatchDeletionModal
            batchName={batchToDelete}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteModalClose}
          />
        )}
      </>
    );
  }
);

export default BatchFilter;
