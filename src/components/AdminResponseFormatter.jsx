import React, { useState } from "react";
import "./AdminResponseFormatter.css";

const AdminResponseFormatter = ({ response, type = "general" }) => {
  const [expandedSections, setExpandedSections] = useState({});
  const [copiedItems, setCopiedItems] = useState({});

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const copyToClipboard = async (text, itemId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems((prev) => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setCopiedItems((prev) => ({ ...prev, [itemId]: false }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Parse different response types
  const parseResponse = (response) => {
    if (typeof response !== "string")
      return { type: "general", content: response };

    // Check for specific admin response patterns
    if (response.includes("## ✅ **Operation Completed**")) {
      return { type: "operation_success", content: response };
    } else if (response.includes("## ❌ **Operation Failed**")) {
      return { type: "operation_error", content: response };
    } else if (response.includes("## ⚠️ **Confirmation Required**")) {
      return { type: "confirmation", content: response };
    } else if (response.includes("## 🤔 **Clarification Needed**")) {
      return { type: "clarification", content: response };
    } else if (response.includes("### 📋 **Operation Data**")) {
      return { type: "data_display", content: response };
    } else if (response.includes("📈 System Statistics")) {
      return { type: "stats", content: response };
    } else if (response.includes("🏠 Property Information")) {
      return { type: "property", content: response };
    }

    return { type: "general", content: response };
  };

  const formatPropertyData = (content) => {
    const lines = content.split("\n");
    const properties = [];
    let currentProperty = null;

    lines.forEach((line) => {
      if (line.includes("🏠 Property Information")) {
        if (currentProperty) properties.push(currentProperty);
        currentProperty = { fields: [] };
      } else if (line.includes("**") && line.includes("**:")) {
        const match = line.match(/\*\*(.*?)\*\*:\s*`(.*?)`/);
        if (match && currentProperty) {
          currentProperty.fields.push({
            label: match[1],
            value: match[2],
          });
        }
      }
    });

    if (currentProperty) properties.push(currentProperty);
    return properties;
  };

  const formatStatsData = (content) => {
    const lines = content.split("\n");
    const stats = [];

    lines.forEach((line) => {
      const match = line.match(/\*\*(.*?)\*\*:\s*`(.*?)`/);
      if (match) {
        stats.push({
          label: match[1],
          value: match[2],
          icon: line.includes("🏠")
            ? "🏠"
            : line.includes("➕")
            ? "➕"
            : line.includes("✏️")
            ? "✏️"
            : "📊",
        });
      }
    });

    return stats;
  };

  const renderOperationSuccess = (content) => {
    const lines = content.split("\n");
    const title = lines
      .find((line) => line.includes("Operation Completed"))
      ?.replace(/[#*]/g, "")
      .trim();
    const description = lines
      .find((line) => line.includes("Description:"))
      ?.replace(/[*]/g, "")
      .replace("Description:", "")
      .trim();

    return (
      <div className="admin-response-success">
        <div className="admin-response-header">
          <div className="admin-response-icon">✅</div>
          <h3>{title || "Operation Completed"}</h3>
        </div>
        {description && (
          <div className="admin-response-description">
            <p>{description}</p>
          </div>
        )}
        <div className="admin-response-actions">
          <button onClick={() => copyToClipboard(content, "success")}>
            {copiedItems.success ? "✅ Copied" : "📋 Copy Details"}
          </button>
        </div>
      </div>
    );
  };

  const renderOperationError = (content) => {
    const lines = content.split("\n");
    const title = lines
      .find((line) => line.includes("Operation Failed"))
      ?.replace(/[#*]/g, "")
      .trim();
    const errorMessage = lines
      .find((line) => line.includes("Error:"))
      ?.replace(/[*]/g, "")
      .replace("Error:", "")
      .trim();

    return (
      <div className="admin-response-error">
        <div className="admin-response-header">
          <div className="admin-response-icon">❌</div>
          <h3>{title || "Operation Failed"}</h3>
        </div>
        {errorMessage && (
          <div className="admin-response-error-message">
            <p>{errorMessage}</p>
          </div>
        )}
        <div className="admin-response-actions">
          <button onClick={() => copyToClipboard(content, "error")}>
            {copiedItems.error ? "✅ Copied" : "📋 Copy Error Details"}
          </button>
        </div>
      </div>
    );
  };

  const renderConfirmation = (content) => {
    const lines = content.split("\n");
    const operation = lines
      .find((line) => line.includes("Operation:"))
      ?.replace(/[*]/g, "")
      .replace("Operation:", "")
      .trim();
    const description = lines
      .find((line) => line.includes("Description:"))
      ?.replace(/[*]/g, "")
      .replace("Description:", "")
      .trim();

    return (
      <div className="admin-response-confirmation">
        <div className="admin-response-header">
          <div className="admin-response-icon">⚠️</div>
          <h3>Confirmation Required</h3>
        </div>
        <div className="admin-response-content">
          {operation && (
            <p>
              <strong>Operation:</strong> {operation}
            </p>
          )}
          {description && (
            <p>
              <strong>Description:</strong> {description}
            </p>
          )}
        </div>
        <div className="admin-response-warning">
          <p>
            ⚠️ This operation may be irreversible. Please confirm to proceed.
          </p>
        </div>
        <div className="admin-response-actions">
          <button className="confirm-btn">✅ Confirm</button>
          <button className="cancel-btn">❌ Cancel</button>
        </div>
      </div>
    );
  };

  const renderPropertyData = (content) => {
    const properties = formatPropertyData(content);

    return (
      <div className="admin-response-property">
        <div className="admin-response-header">
          <div className="admin-response-icon">🏠</div>
          <h3>Property Information</h3>
        </div>
        {properties.map((property, index) => (
          <div key={index} className="property-card">
            <div className="property-header">
              <h4>Property {index + 1}</h4>
              <button
                className="expand-btn"
                onClick={() => toggleSection(`property-${index}`)}
              >
                {expandedSections[`property-${index}`] ? "▼" : "▶"}
              </button>
            </div>
            {expandedSections[`property-${index}`] && (
              <div className="property-details">
                {property.fields.map((field, fieldIndex) => (
                  <div key={fieldIndex} className="property-field">
                    <span className="field-label">{field.label}:</span>
                    <span className="field-value">{field.value}</span>
                    <button
                      className="copy-field-btn"
                      onClick={() =>
                        copyToClipboard(
                          field.value,
                          `field-${index}-${fieldIndex}`
                        )
                      }
                    >
                      {copiedItems[`field-${index}-${fieldIndex}`]
                        ? "✅"
                        : "📋"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderStatsData = (content) => {
    const stats = formatStatsData(content);

    return (
      <div className="admin-response-stats">
        <div className="admin-response-header">
          <div className="admin-response-icon">📈</div>
          <h3>System Statistics</h3>
        </div>
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-content">
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="admin-response-actions">
          <button onClick={() => copyToClipboard(content, "stats")}>
            {copiedItems.stats ? "✅ Copied" : "📋 Copy Stats"}
          </button>
        </div>
      </div>
    );
  };

  const renderGeneral = (content) => {
    return (
      <div className="admin-response-general">
        <div className="admin-response-content">
          <pre>{content}</pre>
        </div>
        <div className="admin-response-actions">
          <button onClick={() => copyToClipboard(content, "general")}>
            {copiedItems.general ? "✅ Copied" : "📋 Copy Response"}
          </button>
        </div>
      </div>
    );
  };

  const { type: responseType, content } = parseResponse(response);

  return (
    <div className="admin-response-formatter">
      {responseType === "operation_success" && renderOperationSuccess(content)}
      {responseType === "operation_error" && renderOperationError(content)}
      {responseType === "confirmation" && renderConfirmation(content)}
      {responseType === "property" && renderPropertyData(content)}
      {responseType === "stats" && renderStatsData(content)}
      {responseType === "general" && renderGeneral(content)}
    </div>
  );
};

export default AdminResponseFormatter;
