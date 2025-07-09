import React, { useState, useEffect } from "react";
import "./HeaderMappingModal.css";

const HeaderMappingModal = ({
  isOpen,
  onClose,
  mappingData,
  onConfirmMapping,
  loading = false,
}) => {
  const [currentMappings, setCurrentMappings] = useState({});
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (mappingData && mappingData.suggested_mappings) {
      // Initialize mappings with suggested values
      const initialMappings = {};
      mappingData.suggested_mappings.forEach((mapping) => {
        initialMappings[mapping.csv_header] = mapping.suggested_db_field;
      });

      // Add unmapped headers as empty mappings
      mappingData.unmapped_headers?.forEach((header) => {
        initialMappings[header] = "";
      });

      setCurrentMappings(initialMappings);
    }
  }, [mappingData]);

  const handleMappingChange = (csvHeader, dbField) => {
    setCurrentMappings((prev) => ({
      ...prev,
      [csvHeader]: dbField,
    }));
    setShowValidation(false); // Hide validation when mapping changes
  };

  const validateMappings = async () => {
    setIsValidating(true);
    setShowValidation(false);

    try {
      // Filter out empty mappings
      const validMappings = Object.fromEntries(
        Object.entries(currentMappings).filter(([_, value]) => value !== "")
      );

      // Get API key from saved session
      const savedSession = localStorage.getItem("adminSession");
      let apiKey = null;
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          apiKey = session.apiKey;
        } catch (e) {
          console.error("Error parsing saved session:", e);
        }
      }

      if (!apiKey) {
        setValidationResult({
          valid: false,
          errors: ["Authentication error. Please login again."],
        });
        setShowValidation(true);
        return;
      }

      const response = await fetch(
        "http://localhost:8000/api/admin/csv/validate-mapping",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-API-Key": apiKey,
          },
          body: JSON.stringify({
            mappings: validMappings,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setValidationResult(result);
        setShowValidation(true);
      } else {
        const error = await response.json();
        setValidationResult({
          valid: false,
          errors: [error.detail || "Validation failed"],
        });
        setShowValidation(true);
      }
    } catch (error) {
      console.error("Validation error:", error);
      setValidationResult({
        valid: false,
        errors: ["Failed to validate mappings. Please try again."],
      });
      setShowValidation(true);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirm = () => {
    const validMappings = Object.fromEntries(
      Object.entries(currentMappings).filter(([_, value]) => value !== "")
    );
    onConfirmMapping(validMappings);
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case "exact":
        return "#22c55e"; // green
      case "high":
        return "#3b82f6"; // blue
      case "medium":
        return "#f59e0b"; // yellow
      case "low":
        return "#ef4444"; // red
      default:
        return "#6b7280"; // gray
    }
  };

  const getConfidenceText = (confidence) => {
    switch (confidence) {
      case "exact":
        return "Exact Match";
      case "high":
        return "High Confidence";
      case "medium":
        return "Medium Confidence";
      case "low":
        return "Low Confidence";
      default:
        return "No Match";
    }
  };

  if (!isOpen || !mappingData) {
    return null;
  }

  const allMappings = mappingData.suggested_mappings || [];
  const unmappedHeaders = mappingData.unmapped_headers || [];
  const availableFields = mappingData.available_db_fields || [];
  const requiredFields = mappingData.required_db_fields || [];

  return (
    <div className="mapping-modal-overlay">
      <div className="mapping-modal">
        <div className="mapping-modal-header">
          <h2>Review Header Mappings</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="mapping-modal-content">
          {/* File Information */}
          <div className="file-info">
            <h3>File Information</h3>
            <div className="file-details">
              <span>
                <strong>File:</strong> {mappingData.file_info?.filename}
              </span>
              <span>
                <strong>Rows:</strong> {mappingData.file_info?.total_rows}
              </span>
              <span>
                <strong>Headers:</strong> {mappingData.file_info?.total_headers}
              </span>
            </div>
          </div>

          {/* Mapping Analysis */}
          <div className="mapping-analysis">
            <h3>Mapping Analysis</h3>
            <div className="analysis-stats">
              <div className="stat">
                <span className="stat-label">Successfully Mapped:</span>
                <span className="stat-value success">
                  {mappingData.mapping_analysis?.successfully_mapped}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Unmapped Headers:</span>
                <span className="stat-value warning">
                  {mappingData.mapping_analysis?.unmapped_headers}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Missing Required:</span>
                <span className="stat-value error">
                  {mappingData.mapping_analysis?.missing_required_fields}
                </span>
              </div>
            </div>
          </div>

          {/* Header Mappings */}
          <div className="mappings-section">
            <h3>Header Mappings</h3>
            <div className="mappings-container">
              {/* Suggested Mappings */}
              {allMappings.map((mapping, index) => (
                <div key={index} className="mapping-row">
                  <div className="csv-header">
                    <strong>{mapping.csv_header}</strong>
                  </div>
                  <div className="mapping-arrow">→</div>
                  <div className="db-field-container">
                    <select
                      value={currentMappings[mapping.csv_header] || ""}
                      onChange={(e) =>
                        handleMappingChange(mapping.csv_header, e.target.value)
                      }
                      className="db-field-select"
                    >
                      <option value="">Select database field...</option>
                      {availableFields.map((field) => (
                        <option key={field} value={field}>
                          {field}{" "}
                          {requiredFields.includes(field) ? "(Required)" : ""}
                        </option>
                      ))}
                    </select>
                    <div className="confidence-indicator">
                      <span
                        className="confidence-badge"
                        style={{
                          backgroundColor: getConfidenceColor(
                            mapping.confidence
                          ),
                        }}
                      >
                        {getConfidenceText(mapping.confidence)}
                      </span>
                      <span className="similarity-score">
                        {Math.round(mapping.similarity_score * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Unmapped Headers */}
              {unmappedHeaders.map((header, index) => (
                <div key={`unmapped-${index}`} className="mapping-row unmapped">
                  <div className="csv-header">
                    <strong>{header}</strong>
                    <span className="unmapped-label">
                      No auto-mapping found
                    </span>
                  </div>
                  <div className="mapping-arrow">→</div>
                  <div className="db-field-container">
                    <select
                      value={currentMappings[header] || ""}
                      onChange={(e) =>
                        handleMappingChange(header, e.target.value)
                      }
                      className="db-field-select"
                    >
                      <option value="">Select database field...</option>
                      {availableFields.map((field) => (
                        <option key={field} value={field}>
                          {field}{" "}
                          {requiredFields.includes(field) ? "(Required)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Required Fields Warning */}
          {mappingData.missing_required_fields?.length > 0 && (
            <div className="missing-fields-warning">
              <h4>⚠️ Missing Required Fields</h4>
              <p>The following required fields are not mapped:</p>
              <ul>
                {mappingData.missing_required_fields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Validation Results */}
          {showValidation && validationResult && (
            <div
              className={`validation-result ${
                validationResult.valid ? "valid" : "invalid"
              }`}
            >
              <h4>
                {validationResult.valid
                  ? "✅ Validation Passed"
                  : "❌ Validation Failed"}
              </h4>
              {validationResult.errors?.length > 0 && (
                <ul className="validation-errors">
                  {validationResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
              {validationResult.valid && (
                <div className="validation-summary">
                  <p>
                    <strong>Mappings ready:</strong>{" "}
                    {validationResult.mapping_summary?.total_mappings} fields
                    mapped
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mapping-modal-footer">
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn-validate"
            onClick={validateMappings}
            disabled={isValidating || loading}
          >
            {isValidating ? "Validating..." : "Validate Mappings"}
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={!showValidation || !validationResult?.valid || loading}
          >
            {loading ? "Processing..." : "Confirm & Upload"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeaderMappingModal;
