import { useCallback } from "react";

export const useLiveUpdates = (addMessage) => {
  const sendLiveUpdate = useCallback(
    (message, type = "info") => {
      const updateMessage = {
        role: "assistant",
        content: message,
        timestamp: Date.now(),
        isLiveUpdate: true,
        updateType: type, // 'info', 'success', 'error', 'progress'
      };

      addMessage(updateMessage);
    },
    [addMessage]
  );

  const sendProgressUpdate = useCallback(
    (step, total, message) => {
      const progressMessage = {
        role: "assistant",
        content: `**Step ${step}/${total}:** ${message}`,
        timestamp: Date.now(),
        isLiveUpdate: true,
        updateType: "progress",
        progress: { step, total },
      };

      addMessage(progressMessage);
    },
    [addMessage]
  );

  const sendFinalUpdate = useCallback(
    async (operation, success, details, adminChat) => {
      // Generate a comprehensive summary using the LLM
      const summaryPrompt = `Generate a professional summary message for the following admin operation:

Operation: ${operation}
Success: ${success}
Details: ${JSON.stringify(details, null, 2)}

Create a concise, informative message that:
1. Clearly states the operation result (success/failure)
2. Includes key details (property ID, name, etc.)
3. Mentions what was accomplished (database updated, AI generated, indexer triggered, etc.)
4. Uses appropriate emojis and formatting
5. Keeps it under 150 words

Return only the formatted message, no additional text.`;

      try {
        const response = await adminChat(summaryPrompt);
        const finalMessage = {
          role: "assistant",
          content:
            response.response ||
            (success
              ? "✅ Operation completed successfully!"
              : "❌ Operation failed."),
          timestamp: Date.now(),
          isLiveUpdate: true,
          updateType: success ? "success" : "error",
          isFinal: true,
        };

        addMessage(finalMessage);
      } catch (error) {
        // Fallback message if LLM summary fails
        const fallbackMessage = {
          role: "assistant",
          content: success
            ? `✅ **Operation Completed Successfully**\n\n${operation} has been completed.`
            : `❌ **Operation Failed**\n\n${operation} could not be completed. ${
                details.error || "Please try again."
              }`,
          timestamp: Date.now(),
          isLiveUpdate: true,
          updateType: success ? "success" : "error",
          isFinal: true,
        };

        addMessage(fallbackMessage);
      }
    },
    [addMessage]
  );

  return {
    sendLiveUpdate,
    sendProgressUpdate,
    sendFinalUpdate,
  };
};
