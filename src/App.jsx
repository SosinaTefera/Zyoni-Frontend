import { useState, useRef, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import PreviewPanel from "./components/PreviewPanel";
import Toast from "./components/Toast";
import HeaderMappingModal from "./components/HeaderMappingModal";
import ProgressIndicator from "./components/ProgressIndicator";
import { useAdminAuth } from "./contexts/AdminAuthContext";
import { useProgressTracking } from "./hooks/useProgressTracking";
import logo from "./assets/logo.png";

function App() {
  const { isAuthenticated: isAdminAuthenticated } = useAdminAuth();
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(260); // px
  const [previewWidth, setPreviewWidth] = useState(340); // px
  const [toast, setToast] = useState({ message: "", type: "error" });
  const [autoPlay, setAutoPlay] = useState(true);
  const [selectedBatches, setSelectedBatches] = useState([]);

  // Header mapping modal state
  const [showHeaderMappingModal, setShowHeaderMappingModal] = useState(false);
  const [mappingData, setMappingData] = useState(null);
  const [currentUploadDoc, setCurrentUploadDoc] = useState(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  // Progress tracking hook
  const { 
    progress, 
    isConnected, 
    error: progressError, 
    resetProgress, 
    getLastCompletedOperation 
  } = useProgressTracking('admin');

  // Ref to store the Sidebar's mapping confirmed handler
  const sidebarMappingConfirmedHandler = useRef(null);
  
  // Ref to store the batch filter refresh handler
  const batchFilterRefreshHandler = useRef(null);

  // Monitor completed operations for batch filter refresh
  useEffect(() => {
    const lastCompleted = getLastCompletedOperation();
    if (lastCompleted && lastCompleted.result && lastCompleted.result.batch_name) {
      console.log('[APP] Upload completed, refreshing batch filter:', lastCompleted.result.batch_name);
      
      // Refresh the batch filter in the sidebar
      if (batchFilterRefreshHandler.current) {
        batchFilterRefreshHandler.current();
      }
      
      // Show success toast
      setToast({
        message: `Successfully uploaded ${lastCompleted.result.processed_count} properties to batch "${lastCompleted.result.batch_name}"`,
        type: "success"
      });
    }
  }, [getLastCompletedOperation()]);

  const dragging = useRef(null);
  const mainContentRef = useRef(null);
  const PREVIEW_MIN_WIDTH = 320;
  const PREVIEW_MAX_WIDTH = 500;
  const SIDEBAR_MIN_WIDTH = 120;
  const SIDEBAR_MAX_WIDTH = 400;

  // Handle sidebar resize
  const handleSidebarDrag = (e) => {
    if (dragging.current === "sidebar") {
      const newWidth = Math.max(
        SIDEBAR_MIN_WIDTH,
        Math.min(e.clientX, SIDEBAR_MAX_WIDTH)
      );
      setSidebarWidth(newWidth);
    }
  };
  // Handle preview panel resize
  const handlePreviewDrag = (e) => {
    if (dragging.current === "preview" && mainContentRef.current) {
      const rect = mainContentRef.current.getBoundingClientRect();
      const total = rect.width;
      // Calculate the new preview width based on the mouse position relative to the main content area
      const offsetX = e.clientX - rect.left;
      let newWidth = Math.max(
        PREVIEW_MIN_WIDTH,
        Math.min(total - offsetX, PREVIEW_MAX_WIDTH)
      );
      // Prevent the preview from overlapping the chat
      if (total - newWidth < 100) newWidth = total - 100;
      setPreviewWidth(newWidth);
    }
  };
  // Mouse up: stop dragging
  const stopDragging = () => {
    dragging.current = null;
    window.removeEventListener("mousemove", handleSidebarDrag);
    window.removeEventListener("mousemove", handlePreviewDrag);
    window.removeEventListener("mouseup", stopDragging);
  };
  // Start dragging sidebar
  const startSidebarDrag = () => {
    dragging.current = "sidebar";
    window.addEventListener("mousemove", handleSidebarDrag);
    window.addEventListener("mouseup", stopDragging);
  };
  // Start dragging preview
  const startPreviewDrag = () => {
    dragging.current = "preview";
    window.addEventListener("mousemove", handlePreviewDrag);
    window.addEventListener("mouseup", stopDragging);
  };

  // Disable pointer events on preview drag handle if at min width
  const previewAtMin = previewWidth <= PREVIEW_MIN_WIDTH + 2;

  // Header mapping modal handlers
  const handleShowHeaderMapping = (data, doc) => {
    setMappingData(data);
    setCurrentUploadDoc(doc);
    setShowHeaderMappingModal(true);
  };

  const handleMappingConfirmed = (mappings) => {
    // Close the modal
    setShowHeaderMappingModal(false);
    // Store the confirmed mappings for the Sidebar to use
    // The Sidebar will handle opening the batch naming modal
    if (sidebarMappingConfirmedHandler.current) {
      sidebarMappingConfirmedHandler.current(mappings);
    }
  };

  const handleModalClose = () => {
    setShowHeaderMappingModal(false);
    setMappingData(null);
    setCurrentUploadDoc(null);
    setIsProcessingUpload(false);
  };

  return (
    <div className="flex h-screen bg-white w-full" style={{ minWidth: 0 }}>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, message: "" })}
      />
      {/* Sidebar */}
      <div
        style={{
          width: sidebarWidth,
          minWidth: SIDEBAR_MIN_WIDTH,
          maxWidth: SIDEBAR_MAX_WIDTH,
          transition: "width 0.1s",
        }}
      >
        <Sidebar
          onDocumentSelect={setSelectedDocument}
          selectedDocument={selectedDocument}
          setToast={setToast}
          autoPlay={autoPlay}
          setAutoPlay={setAutoPlay}
          selectedBatches={selectedBatches}
          onBatchFilterChange={setSelectedBatches}
          onShowHeaderMapping={handleShowHeaderMapping}
          isProcessingUpload={isProcessingUpload}
          setIsProcessingUpload={setIsProcessingUpload}
          sidebarMappingConfirmedHandler={sidebarMappingConfirmedHandler}
          batchFilterRefreshHandler={batchFilterRefreshHandler}
        />
      </div>
      {/* Sidebar drag handle */}
      <div
        onMouseDown={startSidebarDrag}
        className="w-2 cursor-col-resize bg-transparent hover:bg-blue-200 transition"
        style={{ zIndex: 20 }}
      >
        <div className="mx-auto h-full w-1 bg-gray-200 rounded" />
      </div>
      {/* Main content: chat and preview in a flex row, no gap, pure flexbox */}
      <div
        ref={mainContentRef}
        className="flex flex-row flex-1 min-w-0 h-full w-full"
      >
        {/* Chat panel fills remaining space */}
        <div style={{ flex: "1 1 0%", minWidth: 0 }}>
          <ChatPanel
            selectedDocument={selectedDocument}
            autoPlay={autoPlay}
            setAutoPlay={setAutoPlay}
            selectedBatches={selectedBatches}
          />
        </div>

        {/* Preview panel and drag handle - only show for admin users */}
        {isAdminAuthenticated && (
          <>
            {/* Preview drag handle, disables pointer events if at min width */}
            <div
              onMouseDown={previewAtMin ? undefined : startPreviewDrag}
              className={`w-2 cursor-col-resize bg-transparent hover:bg-blue-200 transition${
                previewAtMin ? " pointer-events-none opacity-30" : ""
              }`}
              style={{ zIndex: 20 }}
            >
              <div className="mx-auto h-full w-1 bg-gray-200 rounded" />
            </div>
            {/* Preview panel with enforced min/max width, no shrink */}
            <div
              style={{
                width: previewWidth,
                minWidth: PREVIEW_MIN_WIDTH,
                maxWidth: PREVIEW_MAX_WIDTH,
                flexShrink: 0,
                transition: "width 0.1s",
              }}
            >
              <PreviewPanel selectedDocument={selectedDocument} />
            </div>
          </>
        )}
      </div>

      {/* Header Mapping Modal - positioned at App level for full-screen overlay */}
      {showHeaderMappingModal && mappingData && (
        <HeaderMappingModal
          isOpen={showHeaderMappingModal}
          onClose={handleModalClose}
          mappingData={mappingData}
          onConfirmMapping={handleMappingConfirmed}
          loading={isProcessingUpload}
        />
      )}

      {/* Progress Indicator - positioned at App level for full-screen overlay */}
      <ProgressIndicator
        progress={progress}
        isConnected={isConnected}
        error={progressError}
        onDismiss={resetProgress}
      />
    </div>
  );
}

export default App;
