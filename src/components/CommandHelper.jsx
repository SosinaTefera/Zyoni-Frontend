import React, { useState, useEffect } from "react";
import "./CommandHelper.css";

const CommandHelper = ({ isVisible, onClose, onSuggestionClick }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [copiedCommand, setCopiedCommand] = useState(null);

  const commandCategories = {
    all: "All Commands",
    property: "Property Management",
    batch: "Batch Operations",
    system: "System Operations",
    search: "Search & Listing",
  };

  const adminCommands = [
    {
      id: "create_property",
      category: "property",
      title: "Create Property",
      description: "Create a new property listing",
      examples: [
        "Create a new property at Calle Gran Vía 123",
        "Add property in Madrid with 3 bedrooms",
        "Create apartment listing for rent",
      ],
      parameters: [
        "Address (required)",
        "Property type (apartment, house, etc.)",
        "Number of bedrooms",
        "Number of bathrooms",
        "Price information",
        "Features and amenities",
      ],
    },
    {
      id: "read_property",
      category: "property",
      title: "View Property",
      description: "Get details of a specific property",
      examples: [
        "Show property 12345",
        "Get property details for ID 67890",
        "View property information 54321",
      ],
      parameters: ["Property ID (required)"],
    },
    {
      id: "update_property",
      category: "property",
      title: "Update Property",
      description: "Modify existing property information",
      examples: [
        "Update property 12345 with price 350000",
        "Change property 67890 status to available",
        "Update property 54321 bedrooms to 4",
      ],
      parameters: [
        "Property ID (required)",
        "Fields to update (price, status, bedrooms, etc.)",
      ],
    },
    {
      id: "delete_property",
      category: "property",
      title: "Delete Property",
      description: "Remove a property from the system",
      examples: [
        "Delete property 12345",
        "Remove property 67890",
        "Delete property ID 54321",
      ],
      parameters: ["Property ID (required)"],
    },
    {
      id: "list_properties",
      category: "search",
      title: "List Properties",
      description: "Search and list properties with filters",
      examples: [
        "List all properties",
        "Show properties in Madrid",
        "List properties under 300000 euros",
        "Show apartments with 2 bedrooms",
      ],
      parameters: [
        "Location (optional)",
        "Price range (optional)",
        "Property type (optional)",
        "Number of bedrooms (optional)",
        "Other filters (optional)",
      ],
    },
    {
      id: "delete_batch",
      category: "batch",
      title: "Delete Batch",
      description: "Delete multiple properties at once",
      examples: [
        "Delete properties 12345, 67890, 54321",
        "Delete batch TestBatch2024",
        "Remove properties from batch ImportBatch",
      ],
      parameters: ["Property IDs (comma-separated) OR Batch name"],
    },
    {
      id: "get_stats",
      category: "system",
      title: "System Statistics",
      description: "Get system performance and data statistics",
      examples: [
        "Show system statistics",
        "Get system stats",
        "Display database statistics",
      ],
      parameters: [],
    },
    {
      id: "health_check",
      category: "system",
      title: "Health Check",
      description: "Check system health and connectivity",
      examples: [
        "Check system health",
        "Run health check",
        "Test system connectivity",
      ],
      parameters: [],
    },
  ];

  const filteredCommands = adminCommands.filter((command) => {
    const matchesCategory =
      selectedCategory === "all" || command.category === selectedCategory;
    const matchesSearch =
      searchTerm === "" ||
      command.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      command.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      command.examples.some((example) =>
        example.toLowerCase().includes(searchTerm.toLowerCase())
      );

    return matchesCategory && matchesSearch;
  });

  const handleSuggestionClick = (example) => {
    if (onSuggestionClick) {
      onSuggestionClick(example);
    }
    onClose();
  };

  const copyToClipboard = async (text, commandId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(commandId);
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch (err) {
      console.error("Failed to copy command: ", err);
    }
  };

  useEffect(() => {
    if (isVisible) {
      setSearchTerm("");
      setSelectedCategory("all");
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="command-helper-overlay">
      <div className="command-helper-modal">
        <div className="command-helper-header">
          <h2>Admin Command Helper</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="command-helper-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search commands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>

          <div className="category-selector">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {Object.entries(commandCategories).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="command-helper-content">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((command) => (
              <div key={command.id} className="command-card">
                <div className="command-header">
                  <h3>{command.title}</h3>
                  <span className="command-category">
                    {commandCategories[command.category]}
                  </span>
                </div>

                <p className="command-description">{command.description}</p>

                <div className="command-examples">
                  <h4>Examples:</h4>
                  {command.examples.map((example, index) => (
                    <div key={index} className="example-item">
                      <code>{example}</code>
                      <div className="example-actions">
                        <button
                          onClick={() => handleSuggestionClick(example)}
                          className="use-btn"
                        >
                          Use
                        </button>
                        <button
                          onClick={() =>
                            copyToClipboard(example, `${command.id}-${index}`)
                          }
                          className="copy-btn"
                        >
                          {copiedCommand === `${command.id}-${index}`
                            ? "✅"
                            : "📋"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {command.parameters.length > 0 && (
                  <div className="command-parameters">
                    <h4>Parameters:</h4>
                    <ul>
                      {command.parameters.map((param, index) => (
                        <li key={index}>{param}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="no-commands">
              <p>No commands found matching your search criteria.</p>
            </div>
          )}
        </div>

        <div className="command-helper-footer">
          <div className="help-tip">
            <span className="tip-icon">💡</span>
            <p>
              Tip: Use natural language! The AI will understand your intent and
              extract the necessary parameters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandHelper;
