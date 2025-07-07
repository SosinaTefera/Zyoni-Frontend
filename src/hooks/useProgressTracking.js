import { useState, useEffect, useRef } from "react";

export const useProgressTracking = (userId = "admin") => {
  const [progress, setProgress] = useState({
    isActive: false,
    percentage: 0,
    currentStep: "",
    itemsProcessed: 0,
    totalItems: 0,
    currentItem: "",
    operationId: null,
  });

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [completedOperations, setCompletedOperations] = useState([]);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const reconnectAttempts = useRef(0);

  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000; // 2 seconds

  const connect = () => {
    try {
      const wsUrl = `ws://localhost:8000/api/admin/ws/${userId}`;
      console.log("[PROGRESS] Connecting to WebSocket:", wsUrl);

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("[PROGRESS] WebSocket connected");
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;

        // Start ping/pong to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send("ping");
          }
        }, 30000); // Ping every 30 seconds
      };

      wsRef.current.onmessage = (event) => {
        try {
          // Handle non-JSON messages like "pong"
          if (event.data === "pong") {
            console.log("[PROGRESS] Received pong heartbeat");
            return;
          }

          const message = JSON.parse(event.data);
          console.log("[PROGRESS] WebSocket message:", message);

          switch (message.type) {
            case "operation_started":
              setProgress((prev) => ({
                ...prev,
                isActive: true,
                percentage: 0,
                currentStep: "Operation started",
                itemsProcessed: 0,
                totalItems: message.data.total_items || 0,
                operationId: message.data.operation_id,
              }));
              break;

            case "operation_progress":
              setProgress((prev) => ({
                ...prev,
                isActive: true,
                percentage: message.data.progress_percentage || 0,
                currentStep: message.data.current_step || "Processing...",
                itemsProcessed: message.data.items_processed || 0,
                totalItems: message.data.total_items || prev.totalItems,
                currentItem: message.data.current_item || "",
                operationId: message.data.operation_id || prev.operationId,
              }));
              break;

            case "operation_completed":
              setProgress((prev) => ({
                ...prev,
                isActive: false,
                percentage: 100,
                currentStep: "Operation completed successfully",
              }));

              // Add to completed operations with proper structure
              setCompletedOperations((prev) => [
                ...prev,
                {
                  id: message.data.operation_id,
                  operation_id: message.data.operation_id,
                  timestamp: new Date(),
                  status: message.data.status,
                  message: message.data.message,
                  duration_seconds: message.data.duration_seconds,
                  entity_count: message.data.entity_count,
                  completed_at: message.data.completed_at,
                  // Add the complete message data as result for backward compatibility
                  result: message.data,
                },
              ]);

              // Clear progress after 3 seconds
              setTimeout(() => {
                setProgress((prev) => ({
                  ...prev,
                  percentage: 0,
                  currentStep: "",
                  itemsProcessed: 0,
                  currentItem: "",
                  operationId: null,
                }));
              }, 3000);
              break;

            case "operation_cancelled":
              setProgress((prev) => ({
                ...prev,
                isActive: false,
                currentStep: `Operation cancelled: ${
                  message.data.reason || "User requested"
                }`,
              }));

              // Clear progress after 2 seconds
              setTimeout(() => {
                setProgress((prev) => ({
                  ...prev,
                  percentage: 0,
                  currentStep: "",
                  itemsProcessed: 0,
                  currentItem: "",
                  operationId: null,
                }));
              }, 2000);
              break;

            case "operation_error":
              setProgress((prev) => ({
                ...prev,
                isActive: false,
                currentStep: `Error: ${message.data.error_message}`,
              }));
              setError(message.data.error_message);
              break;

            case "admin_connected":
              console.log("[PROGRESS] Admin connected confirmation");
              break;

            case "dashboard_update":
              console.log("[PROGRESS] Dashboard update received:", message.data);
              // Handle dashboard updates - you can add specific logic here
              // For now, just log them
              break;

            default:
              console.log("[PROGRESS] Unknown message type:", message.type);
          }
        } catch (error) {
          console.error("[PROGRESS] Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log("[PROGRESS] WebSocket closed:", event.code, event.reason);
        setIsConnected(false);
        clearInterval(pingIntervalRef.current);

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(
            `[PROGRESS] Reconnecting (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})...`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else {
          setError("Connection lost. Please refresh the page.");
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("[PROGRESS] WebSocket error:", error);
        setError("WebSocket connection error");
      };
    } catch (error) {
      console.error("[PROGRESS] Error creating WebSocket:", error);
      setError("Failed to create WebSocket connection");
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    clearInterval(pingIntervalRef.current);
    clearTimeout(reconnectTimeoutRef.current);
    setIsConnected(false);
  };

  const resetProgress = () => {
    setProgress({
      isActive: false,
      percentage: 0,
      currentStep: "",
      itemsProcessed: 0,
      totalItems: 0,
      currentItem: "",
      operationId: null,
    });
    setError(null);
  };

  const getLastCompletedOperation = () => {
    return completedOperations.length > 0
      ? completedOperations[completedOperations.length - 1]
      : null;
  };

  // Auto-connect when hook is used - temporarily disabled to prevent hanging
  useEffect(() => {
    // Delay connection to prevent app hanging on load
    const timer = setTimeout(() => {
      connect();
    }, 2000);

    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, [userId]);

  return {
    progress,
    isConnected,
    error,
    completedOperations,
    connect,
    disconnect,
    resetProgress,
    getLastCompletedOperation,
  };
};
