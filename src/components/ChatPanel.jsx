import { useState, useRef, useEffect } from "react";
import {
  PaperAirplaneIcon,
  UserCircleIcon,
  MicrophoneIcon,
} from "@heroicons/react/24/solid";
import {
  ChatBubbleLeftEllipsisIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import AdminChatInterface from "./AdminChatInterface";
import "../markdown.css";

// Helper function to extract property cards from Markdown
function extractPropertyCards(markdown) {
  // Simple regex to find property blocks (e.g., starts with 'Nombre:' or '**Nombre:**')
  const propertyBlocks = markdown.split(/\n(?=\*\*Nombre:|Nombre:)/g);
  const cards = [];
  propertyBlocks.forEach((block) => {
    if (/Nombre:|\*\*Nombre:\*\*/.test(block)) {
      // Extract fields
      const name = block.match(/Nombre:?\s*([\w\d]+)/i)?.[1] || "";
      const type = block.match(/Tipo:?\s*([\w\s]+)/i)?.[1] || "";
      const price = block.match(/Precio:?\s*([\w\d€().\/ ]+)/i)?.[1] || "";
      const rooms = block.match(/Habitaciones:?\s*(\d+)/i)?.[1] || "";
      const baths = block.match(/Baños:?\s*(\d+)/i)?.[1] || "";
      const furniture = block.match(/Mobiliario:?\s*([\w\s]+)/i)?.[1] || "";
      const climate = block.match(/Climatización:?\s*([\w\s]+)/i)?.[1] || "";
      const location = block.match(/Ubicación:?\s*([\w\s,]+)/i)?.[1] || "";
      // Features: look for lines after 'Características adicionales:'
      let features = [];
      const featuresMatch = block.match(
        /Características adicionales:[\s\S]*?(- .+)+/
      );
      if (featuresMatch) {
        features = featuresMatch[0]
          .split("\n")
          .filter((l) => l.trim().startsWith("-"))
          .map((l) => l.replace("- ", "").trim());
      }
      cards.push({
        name,
        type,
        price,
        rooms,
        baths,
        furniture,
        climate,
        location,
        features,
      });
    }
  });
  return cards;
}

function ChatPanel({ selectedDocument, autoPlay, setAutoPlay, selectedBatches }) {
  const { isAuthenticated: isAdminAuthenticated } = useAdminAuth();

  // If admin is authenticated, show admin interface
  if (isAdminAuthenticated) {
    return <AdminChatInterface />;
  }

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello,\nWelcome to Airz real state assistant, let me know what you are looking for. También puedo hablar en español.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const [guestName, setGuestName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const [retryInfo, setRetryInfo] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const storedName = localStorage.getItem("guestName") || "";
    setGuestName(storedName);
  }, []);

  useEffect(() => {
    // Auto-play newly arrived assistant voice messages
    if (!autoPlay) return;
    if (!messages.length) return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || !lastMsg.audio) return;

    // Find the most recently rendered <audio> element and attempt to play it.
    const audioElements = document.querySelectorAll("audio");
    if (audioElements.length === 0) return;
    const latestAudio = audioElements[audioElements.length - 1];
    // Attempt playback; ignore errors (e.g. user gesture policies)
    latestAudio.play().catch(() => {});
  }, [messages, autoPlay]);

  const handleSubmit = async (e, retrying = false) => {
    if (e) e.preventDefault();
    if ((!retrying && !input.trim()) || isLoading) return;

    const userMessage = retrying ? retryInfo?.userMessage : input.trim();
    if (!userMessage) return;
    if (!retrying) setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    setRetryInfo(null);

    try {
      const chatData = await sendChatRequest({ message: userMessage });

      const assistantMsg = { role: "assistant", content: chatData.response };
      if (chatData.audio_base64) assistantMsg.audio = chatData.audio_base64;

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      let errorMessage = "Sorry, I encountered an error. Please try again.";
      if (
        error.message &&
        (error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError") ||
          error.message.includes("Network Error"))
      ) {
        errorMessage = "App disconnected, please restart.";
      } else if (error.response) {
        try {
          const data = await error.response.json();
          if (
            data &&
            data.detail &&
            typeof data.detail === "string" &&
            data.detail.length < 200
          ) {
            errorMessage = data.detail;
          }
        } catch (e) {}
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage, failed: true },
      ]);
      setRetryInfo({ userMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (retryInfo && retryInfo.userMessage) {
      // Remove the last assistant error message before retrying
      setMessages((prev) =>
        prev.filter(
          (msg, idx, arr) =>
            !(idx === arr.length - 1 && msg.role === "assistant" && msg.failed)
        )
      );
      handleSubmit(null, true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        handleSubmit(e);
      }
    }
  };

  // ---------------- Voice recording / STT -----------------
  // Helper to create or reuse a conversation session on the backend
  const ensureSession = async () => {
    if (sessionId) return sessionId;

    const res = await fetch("http://localhost:8000/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: guestName }),
    });
    if (!res.ok) throw new Error("Failed to create session");
    const data = await res.json();
    setSessionId(data.session_id);
    return data.session_id;
  };

  // Unified helper to send either text or audio payloads to the /chat endpoint
  const sendChatRequest = async ({
    message = null,
    audioBase64 = null,
    mimeType = null,
  }) => {
    const currentSessionId = await ensureSession();

    const res = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: guestName,
        session_id: currentSessionId,
        message,
        audio_base64: audioBase64,
        audio_mime_type: mimeType,
        batch_filter: selectedBatches && selectedBatches.length > 0 ? selectedBatches : null,
      }),
    });

    if (!res.ok) throw new Error("Failed to get chat response");
    return await res.json();
  };

  const getSupportedMimeType = () => {
    const preferredTypes = [
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/webm;codecs=opus",
      "audio/webm",
    ];
    for (const type of preferredTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      if (!mimeType)
        throw new Error("No supported audio format found for MediaRecorder");
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        sendAudioMessage(blob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
    }
  };

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const sendAudioMessage = async (audioBlob) => {
    setIsLoading(true);

    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const mimeType = getSupportedMimeType() || "audio/webm";

      // 1) Transcribe quickly
      let transcript = "[Voice message]";
      try {
        const transRes = await fetch("http://localhost:8000/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio_base64: audioBase64,
            audio_mime_type: mimeType,
          }),
        });
        if (transRes.ok) {
          const data = await transRes.json();
          if (data && data.transcript) transcript = data.transcript;
        }
      } catch (e) {
        console.warn("Transcription failed, falling back to placeholder", e);
      }

      // Show transcript immediately
      setMessages((prev) => [...prev, { role: "user", content: transcript }]);

      // 2) Send to chat for Assistant response
      const chatData = await sendChatRequest({ message: transcript });

      const assistantMsg = { role: "assistant", content: chatData.response };
      if (chatData.audio_base64) assistantMsg.audio = chatData.audio_base64;

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Error sending audio message:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Lo siento, ocurrió un error con el audio.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="w-full flex flex-col h-full bg-gradient-to-br from-blue-100/40 via-purple-100/40 to-white/60 py-4 relative">
      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white/60 p-8 mb-4 shadow-2xl backdrop-blur-md backdrop-saturate-150">
        <div className="space-y-8">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex flex-col items-center mr-2">
                  <ChatBubbleLeftEllipsisIcon className="h-8 w-8 text-purple-400 drop-shadow" />
                  <span className="text-xs font-semibold text-purple-500 mt-1">
                    AI
                  </span>
                </div>
              )}
              <div
                className={`max-w-[70%] px-5 py-4 rounded-2xl text-base shadow-xl transition-all duration-300 ${
                  message.role === "user"
                    ? "bg-blue-200/80 text-blue-900 rounded-br-none"
                    : "bg-purple-200/80 text-purple-900 rounded-bl-none"
                } animate-fade-in`}
              >
                {message.role === "assistant"
                  ? (() => {
                      // Try to detect property cards in the message
                      const cards = extractPropertyCards(message.content);
                      if (cards.length > 0) {
                        return (
                          <div className="property-cards-container">
                            {cards.map((card, idx) => (
                              <div className="property-card" key={idx}>
                                <div className="property-card-title">
                                  {card.name}
                                </div>
                                <div className="property-card-type">
                                  {card.type}
                                </div>
                                <div className="property-card-price">
                                  {card.price}
                                </div>
                                <div className="property-card-details">
                                  <span>🛏️ {card.rooms} habitaciones</span>
                                  <span>🛁 {card.baths} baños</span>
                                  <span>
                                    {card.furniture &&
                                      `Mobiliario: ${card.furniture}`}
                                  </span>
                                  <span>
                                    {card.climate && `Clima: ${card.climate}`}
                                  </span>
                                  <span>
                                    {card.location && `📍 ${card.location}`}
                                  </span>
                                </div>
                                {card.features && card.features.length > 0 && (
                                  <ul className="property-card-features">
                                    {card.features.map((f, i) => (
                                      <li key={i}>{f}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      // Fallback: render as Markdown
                      return (
                        <div className="markdown-body">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      );
                    })()
                  : message.content}
                {/* Retry button for failed assistant message */}
                {message.role === "assistant" &&
                  message.failed &&
                  index === messages.length - 1 && (
                    <button
                      onClick={handleRetry}
                      className="mt-3 ml-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-semibold border border-red-300 transition"
                    >
                      Retry
                    </button>
                  )}
              </div>
              {message.role === "user" && (
                <div className="flex flex-col items-center ml-2">
                  <UserCircleIcon className="h-8 w-8 text-blue-400 drop-shadow" />
                  <span className="text-xs font-semibold text-blue-500 mt-1">
                    You
                  </span>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="bg-purple-100/80 rounded-2xl px-5 py-4 text-purple-900 shadow-xl animate-pulse">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
              <span className="text-xs text-purple-400 mt-2 ml-2">
                AI is typing…
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-auto">
        <div className="flex items-end gap-2 bg-white/70 border border-gray-200 rounded-2xl px-6 py-4 shadow-xl backdrop-blur-md transition-all duration-300 focus-within:ring-2 focus-within:ring-purple-300">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the document..."
            className="flex-1 resize-none border-0 focus:ring-0 bg-transparent text-base min-h-[40px] max-h-32 transition-all duration-300 focus:bg-white/90 focus:shadow-lg"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleRecordClick}
            disabled={isLoading}
            className={`rounded-xl p-2 transition-all duration-300 shadow-lg focus:ring-2 focus:ring-purple-300 ${
              isRecording
                ? "bg-red-500 text-white"
                : "bg-blue-500 text-white hover:scale-110"
            } mr-2`}
          >
            {isRecording ? (
              <StopIcon className="h-6 w-6" />
            ) : (
              <MicrophoneIcon className="h-6 w-6" />
            )}
          </button>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl px-6 py-2 hover:scale-105 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg transition-all duration-300 focus:ring-2 focus:ring-purple-300"
          >
            <span className="font-semibold">Send</span>
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </main>
  );
}

export default ChatPanel;
