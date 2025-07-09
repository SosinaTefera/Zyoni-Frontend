import { useState, useEffect } from "react";
import {
  DocumentIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  PencilIcon,
  PhotoIcon,
  CodeBracketIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import logo from "../assets/Untitled design (2).png";
import AdminToggle from "./admin/AdminToggle";
import BatchFilter from "./BatchFilter";
import BatchNamingModal from "./BatchNamingModal";
import { useAdminAuth } from "../contexts/AdminAuthContext";

function getFileTypeIcon(doc) {
  if (doc.type.startsWith("image/"))
    return <PhotoIcon className="h-5 w-5 text-blue-400 mr-2" />;
  if (doc.type === "application/pdf" || doc.name.endsWith(".pdf"))
    return <DocumentIcon className="h-5 w-5 text-red-400 mr-2" />;
  if (
    doc.type.includes("csv") ||
    doc.name.endsWith(".csv") ||
    doc.name.endsWith(".xlsx")
  )
    return <TableCellsIcon className="h-5 w-5 text-green-500 mr-2" />;
  if (
    doc.type.startsWith("text/") ||
    doc.type.includes("javascript") ||
    doc.type.includes("python") ||
    doc.name.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|h|json|html|css|md)$/)
  )
    return <CodeBracketIcon className="h-5 w-5 text-purple-400 mr-2" />;
  return <DocumentIcon className="h-5 w-5 text-gray-400 mr-2" />;
}

function Sidebar({
  onDocumentSelect,
  selectedDocument,
  setToast,
  autoPlay,
  setAutoPlay,
  selectedBatches,
  onBatchFilterChange,
  onShowHeaderMapping,
  isProcessingUpload,
  setIsProcessingUpload,
  sidebarMappingConfirmedHandler,
  batchFilterRefreshHandler,
}) {
  const { isAuthenticated: isAdminAuthenticated } = useAdminAuth();
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [guestName, setGuestName] = useState("User");
  const [editingGuest, setEditingGuest] = useState(false);
  const [showBatchNamingModal, setShowBatchNamingModal] = useState(false);
  const [currentUploadDoc, setCurrentUploadDoc] = useState(null);
  const [confirmedMappings, setConfirmedMappings] = useState(null);

  // Handle confirmed mappings from the modal
  const handleMappingConfirmed = (mappings) => {
    setConfirmedMappings(mappings);
    // Open the batch naming modal
    setShowBatchNamingModal(true);
    // Note: The App component handles closing the header mapping modal
  };

  // Set the handler ref so the App component can call it
  useEffect(() => {
    if (sidebarMappingConfirmedHandler) {
      sidebarMappingConfirmedHandler.current = handleMappingConfirmed;
    }
  }, []);

  const allowedTypes = [
    "application/pdf",
    "image/",
    "text/",
    "application/json",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/csv",
    "text/csv",
    "application/javascript",
    "application/x-javascript",
    "text/javascript",
    "text/x-python",
    "text/x-c",
    "text/x-c++",
    "text/x-java-source",
    "text/html",
    "text/css",
    "application/xml",
    "text/markdown",
  ];

  const handleGuestNameClick = () => setEditingGuest(true);
  const handleGuestNameChange = (e) => setGuestName(e.target.value);
  const handleGuestNameBlur = () => setEditingGuest(false);
  const handleGuestNameKeyDown = (e) => {
    if (e.key === "Enter") {
      setEditingGuest(false);
    } else if (e.key === "Escape") {
      setGuestName("User");
      setEditingGuest(false);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    // Check for unsupported files
    const unsupported = files.find(
      (file) =>
        !allowedTypes.some(
          (type) =>
            file.type.startsWith(type) ||
            file.name.match(
              /\.(pdf|jpg|jpeg|png|js|py|java|cpp|c|h|json|html|css|md|csv|xlsx|xls)$/i
            )
        )
    );
    if (unsupported) {
      setToast &&
        setToast({
          message: `Unsupported file: ${unsupported.name}`,
          type: "error",
        });
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20 + 10;
      setUploadProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 200);
    try {
      // Simulate upload delay
      await new Promise((res) => setTimeout(res, 1200));
      const newDocuments = files.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        file: file,
      }));
      setDocuments((prev) => [...prev, ...newDocuments]);
    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 400);
    }
  };

  const removeDocument = (id) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    if (selectedDocument?.id === id) {
      onDocumentSelect(null);
    }
  };

  const startEditing = (doc) => {
    setEditingId(doc.id);
    setEditValue(doc.name);
  };

  const saveEdit = (doc) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === doc.id ? { ...d, name: editValue.trim() || d.name } : d
      )
    );
    setEditingId(null);
    setEditValue("");
  };

  const handleEditKeyDown = (e, doc) => {
    if (e.key === "Enter") {
      saveEdit(doc);
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditValue("");
    }
  };

  // Enhanced upload function with header mapping
  const handleUploadToBackend = async (doc) => {
    // Check if it's a CSV file
    if (!doc.name.toLowerCase().endsWith(".csv")) {
      setToast &&
        setToast({
          message: `Header mapping is only available for CSV files. ${doc.name} will use legacy upload.`,
          type: "warning",
        });
      // Use legacy upload for non-CSV files
      await handleLegacyUpload(doc);
      return;
    }

    try {
      setIsProcessingUpload(true);
      setCurrentUploadDoc(doc);

      // Step 1: Get CSV preview with header mapping
      const formData = new FormData();
      formData.append("file", doc.file, doc.name);

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
        setToast &&
          setToast({
            message: "Authentication error. Please login again.",
            type: "error",
          });
        return;
      }

      const response = await fetch(
        "http://localhost:8000/api/admin/csv/preview",
        {
          method: "POST",
          headers: {
            "X-Admin-API-Key": apiKey,
          },
          body: formData,
        }
      );

      if (response.ok) {
        const previewData = await response.json();
        // Use the App-level modal handler instead of local state
        onShowHeaderMapping(previewData, doc);

        setToast &&
          setToast({
            message: `CSV analyzed: ${previewData.mapping_analysis.successfully_mapped} headers mapped automatically`,
            type: "success",
          });
      } else {
        const error = await response.json();
        setToast &&
          setToast({
            message: `Failed to analyze CSV: ${
              error.detail || "Unknown error"
            }`,
            type: "error",
          });
      }
    } catch (error) {
      setToast &&
        setToast({
          message: `Error analyzing CSV: ${error.message}`,
          type: "error",
        });
    } finally {
      setIsProcessingUpload(false);
    }
  };

  // Legacy upload for non-CSV files
  const handleLegacyUpload = async (doc) => {
    const formData = new FormData();
    formData.append("file", doc.file, doc.name);

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
      setToast &&
        setToast({
          message: "Authentication error. Please login again.",
          type: "error",
        });
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:8000/api/admin/upload/legacy",
        {
          method: "POST",
          headers: {
            "X-Admin-API-Key": apiKey,
          },
          body: formData,
        }
      );

      if (response.ok) {
        setToast &&
          setToast({
            message: `Uploaded ${doc.name} successfully!`,
            type: "success",
          });
      } else {
        const error = await response.json();
        setToast &&
          setToast({
            message: `Failed to upload: ${error.detail || "Unknown error"}`,
            type: "error",
          });
      }
    } catch (error) {
      setToast &&
        setToast({
          message: `Error uploading: ${error.message}`,
          type: "error",
        });
    }
  };

  // Handle batch naming and final upload
  const handleBatchNameConfirmed = async (batchName, useOptimized = true) => {
    try {
      setIsProcessingUpload(true);
      setShowBatchNamingModal(false);

      if (!currentUploadDoc) {
        setToast &&
          setToast({
            message: "Error: No file selected for upload.",
            type: "error",
          });
        return;
      }

      if (!confirmedMappings) {
        setToast &&
          setToast({
            message: "Error: No mappings confirmed.",
            type: "error",
          });
        return;
      }

      // Step 2: Upload with confirmed mappings
      const formData = new FormData();
      formData.append("file", currentUploadDoc.file, currentUploadDoc.name);
      formData.append("batch_name", batchName);
      formData.append("mappings", JSON.stringify(confirmedMappings));
      formData.append("user_id", "admin"); // For WebSocket progress tracking
      formData.append("session_id", `admin_session_${Date.now()}`); // For WebSocket progress tracking

      // Add optimization parameters for optimized upload
      if (useOptimized) {
        formData.append("batch_size", "15"); // Process 15 properties at a time
        formData.append("max_concurrent", "8"); // Up to 8 concurrent LLM calls
      }

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
        setToast &&
          setToast({
            message: "Authentication error. Please login again.",
            type: "error",
          });
        return;
      }

      // Choose endpoint based on optimization setting
      const endpoint = useOptimized
        ? "http://localhost:8000/api/admin/upload/optimized"
        : "http://localhost:8000/api/admin/upload/with-mapping";

      console.log(
        `[UPLOAD] Using ${useOptimized ? "optimized" : "regular"} upload for ${
          currentUploadDoc.name
        }`
      );

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "X-Admin-API-Key": apiKey,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();

        const successMessage = useOptimized
          ? `🚀 Optimized upload completed! Processed ${result.processed_count} properties in ${currentUploadDoc.name} using parallel processing (batch size: ${result.optimization_details?.batch_size}, concurrent: ${result.optimization_details?.max_concurrent})`
          : `Successfully uploaded ${currentUploadDoc.name} with ${result.header_mappings_applied} mapped fields!`;

        setToast &&
          setToast({
            message: successMessage,
            type: "success",
          });

        // Remove the uploaded document from the list
        removeDocument(currentUploadDoc.id);
      } else {
        let error;
        try {
          error = await response.json();
        } catch (e) {
          error = { detail: `HTTP ${response.status}: ${response.statusText}` };
        }
        setToast &&
          setToast({
            message: `Failed to upload: ${error.detail || "Unknown error"}`,
            type: "error",
          });
      }
    } catch (error) {
      setToast &&
        setToast({
          message: `Error uploading: ${error.message}`,
          type: "error",
        });
    } finally {
      setIsProcessingUpload(false);
      setCurrentUploadDoc(null);
      setConfirmedMappings(null);
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowBatchNamingModal(false);
    setIsProcessingUpload(false);
    setCurrentUploadDoc(null);
    setConfirmedMappings(null);
  };

  return (
    <aside
      className="h-full w-72 flex flex-col items-center gap-4 px-4 py-6 bg-gradient-to-b from-blue-100/60 via-purple-100/60 to-white/60 border-r border-gray-200 shadow-xl rounded-r-2xl backdrop-blur-md backdrop-saturate-150 overflow-y-auto"
    >
      <div className="w-56 h-24 flex flex-row items-center justify-center rounded-2xl bg-white/60 shadow-lg border-2 border-blue-100 overflow-hidden px-2">
        <img
          src={logo}
          alt="Company Logo"
          className="h-16 w-16 object-contain"
        />
        <span className="text-3xl font-bold bg-gradient-to-r from-[#0F65C1] to-[#02B3D6] text-transparent bg-clip-text ml-2">
          ZYONIA
        </span>
      </div>

      {/* Auto-play voice replies toggle */}
      {!isAdminAuthenticated && (
        <label className="w-56 flex items-center justify-center gap-3 text-sm text-gray-700 bg-white/60 px-3 py-2 rounded-lg border border-blue-200 shadow-sm hover:bg-white/80 transition-all duration-200 cursor-pointer">
          <input
            type="checkbox"
            checked={autoPlay}
            onChange={() => setAutoPlay && setAutoPlay(!autoPlay)}
            className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-400"
          />
          <span className="font-medium">Auto-play voice replies</span>
        </label>
      )}

      {/* User name input */}
      {!isAdminAuthenticated && (
        <div className="w-56">
          <label className="text-xs font-bold text-gray-500/80 uppercase tracking-wider px-1">Guest</label>
          <div className="relative mt-1">
            {editingGuest ? (
              <input
                type="text"
                value={guestName}
                onChange={handleGuestNameChange}
                onBlur={handleGuestNameBlur}
                onKeyDown={handleGuestNameKeyDown}
                autoFocus
                placeholder="Enter your name"
                className="w-full px-4 py-2 rounded-lg border-2 border-blue-400 bg-white text-base font-semibold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            ) : (
              <button
                type="button"
                onClick={handleGuestNameClick}
                className="group w-full flex justify-between items-center text-left px-4 py-2 rounded-lg border-2 border-gray-300/80 bg-white/70 text-base font-semibold text-gray-800 shadow-sm cursor-pointer hover:bg-white hover:border-blue-400 transition-all duration-200"
                title="Click to edit your name"
              >
                <span>{guestName || "User"}</span>
                <PencilIcon className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload functionality */}
      {isAdminAuthenticated && (
        <label className="block w-56">
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.js,.py,.java,.cpp,.c,.h,.html,.json,.ts,.tsx,.md,.csv,.css,.xml,.yml,.yaml,.sh,.go,.rs,.php,.rb,.swift,.kt,.scala,.sql"
          />
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg py-3 text-lg font-semibold shadow hover:bg-gray-100 transition"
            onClick={() => document.querySelector("input[type=file]").click()}
          >
            <ArrowUpTrayIcon className="h-6 w-6 text-gray-500" />
            Upload
          </button>
        </label>
      )}

      {/* Document management */}
      {isAdminAuthenticated && (
        <div className="flex-1 flex flex-col gap-2 items-center w-full overflow-y-auto">
          {documents.map((doc, idx) => (
            <div
              key={doc.id}
              className={`flex items-center group w-56`}
            >
              {editingId === doc.id ? (
                <input
                  className="w-full px-3 py-2 rounded-lg border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base font-medium shadow"
                  value={editValue}
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => saveEdit(doc)}
                  onKeyDown={(e) => handleEditKeyDown(e, doc)}
                />
              ) : (
                <button
                  className={`w-full flex items-center text-left px-4 py-3 rounded-lg border border-gray-300 bg-white shadow hover:bg-blue-50 transition text-base font-medium truncate ${
                    selectedDocument?.id === doc.id
                      ? "ring-2 ring-blue-500 bg-blue-100"
                      : ""
                  }`}
                  onClick={() => onDocumentSelect(doc)}
                >
                  {getFileTypeIcon(doc)}
                  <span className="truncate">{doc.name}</span>
                </button>
              )}
              <button
                onClick={() => startEditing(doc)}
                className="ml-2 p-1 text-gray-400 hover:text-blue-500 shrink-0"
                title="Rename"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => removeDocument(doc.id)}
                className="ml-2 p-1 text-gray-400 hover:text-red-500 shrink-0"
                title="Remove"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              {/* Upload to Backend Button */}
              <button
                onClick={() => handleUploadToBackend(doc)}
                className="ml-2 p-1 text-gray-400 hover:text-green-600 shrink-0"
                title="Upload to Backend"
                disabled={isProcessingUpload}
              >
                <ArrowUpTrayIcon
                  className={`h-5 w-5 ${
                    isProcessingUpload ? "animate-pulse" : ""
                  }`}
                />
              </button>
            </div>
          ))}

          {/* Upload progress indicator */}
          {isUploading && (
            <div className="w-full px-2 mb-2">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="text-center text-xs text-gray-500 mt-1">
                Uploading...
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Controls */}
      <div className="w-full flex flex-col items-center gap-4 mt-auto pt-4 border-t border-gray-300/60">
        {isAdminAuthenticated && (
          <BatchFilter
            selectedBatches={selectedBatches}
            onBatchFilterChange={onBatchFilterChange}
            onRefresh={batchFilterRefreshHandler}
          />
        )}
        <div className="w-56 flex justify-center">
          <AdminToggle />
        </div>
      </div>

      {/* Batch Naming Modal */}
      <BatchNamingModal
        isOpen={showBatchNamingModal}
        onClose={handleModalClose}
        onConfirm={handleBatchNameConfirmed}
        docName={currentUploadDoc?.name}
      />
    </aside>
  );
}

export default Sidebar;
