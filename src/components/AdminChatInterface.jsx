import React, { useState, useRef, useEffect } from "react";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import {
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import ReactMarkdown from "react-markdown";
import AdminPropertyModal from "./AdminPropertyModal";
import { useLiveUpdates } from "../hooks/useLiveUpdates";

const AdminChatInterface = () => {
  const { adminChat, isAuthenticated, user, logout } = useAdminAuth();
  const [language, setLanguage] = useState("en"); // Default to English
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "🏠 **Admin Mode Activated**\n\nHello, I'm your administrative assistant for the Zyonia property system. I can help you with:\n\n• **Create** new properties\n• **Search** and view existing properties\n• **Update** property information\n• **Delete** properties\n\nWhat would you like to do today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalType, setModalType] = useState(null);
  const messagesEndRef = useRef(null);

  // Live updates hook
  const addMessage = (message) => {
    setMessages((prev) => [...prev, message]);
  };

  const { sendLiveUpdate, sendProgressUpdate, sendFinalUpdate } =
    useLiveUpdates(addMessage);

  // Language detection function
  const detectLanguage = (text) => {
    const spanishWords = [
      "crear",
      "buscar",
      "actualizar",
      "eliminar",
      "propiedad",
      "propiedades",
      "apartamento",
      "casa",
      "habitación",
      "habitaciones",
      "baño",
      "baños",
      "madrid",
      "barcelona",
      "valencia",
      "sevilla",
      "bilbao",
      "málaga",
      "hola",
      "qué",
      "cómo",
      "dónde",
      "cuándo",
      "por",
      "para",
      "con",
      "soy",
      "estoy",
      "tengo",
      "quiero",
      "necesito",
      "puedo",
      "ayuda",
      "gracias",
      "por favor",
      "disculpa",
      "perdón",
      "bien",
      "mal",
    ];

    const textLower = text.toLowerCase();
    const spanishWordCount = spanishWords.filter((word) =>
      textLower.includes(word)
    ).length;

    // If we find 2 or more Spanish words, consider it Spanish
    return spanishWordCount >= 2 ? "es" : "en";
  };

  // Get localized text
  const getText = (key) => {
    const texts = {
      en: {
        placeholder:
          "Type your administrative request here... (e.g., 'create a 2-bedroom apartment in Madrid')",
        processing: "Processing...",
        welcomeMessage:
          "🏠 **Admin Mode Activated**\n\nHello, I'm your administrative assistant for the Zyonia property system. I can help you with:\n\n• **Create** new properties\n• **Search** and view existing properties\n• **Update** property information\n• **Delete** properties\n\nWhat would you like to do today?",
      },
      es: {
        placeholder:
          "Escribe tu solicitud administrativa aquí... (ej: 'crear un apartamento de 2 habitaciones en Madrid')",
        processing: "Procesando...",
        welcomeMessage:
          "🏠 **Admin Mode Activado**\n\nHola, soy tu asistente administrativo para el sistema de propiedades Zyonia. Puedo ayudarte con:\n\n• **Crear** nuevas propiedades\n• **Buscar** y ver propiedades existentes\n• **Actualizar** información de propiedades\n• **Eliminar** propiedades\n\n¿Qué te gustaría hacer hoy?",
      },
    };

    return texts[language][key] || texts.en[key];
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !isAuthenticated) return;

    const userMessage = input.trim();

    // Detect language from user input
    const detectedLanguage = detectLanguage(userMessage);
    if (detectedLanguage !== language) {
      setLanguage(detectedLanguage);

      // Update welcome message to match detected language
      setMessages((prev) => {
        const newMessages = [...prev];
        if (
          newMessages[0]?.role === "assistant" &&
          newMessages[0]?.content.includes("Admin Mode")
        ) {
          newMessages[0] = {
            ...newMessages[0],
            content:
              detectedLanguage === "es"
                ? "🏠 **Admin Mode Activado**\n\nHola, soy tu asistente administrativo para el sistema de propiedades Zyonia. Puedo ayudarte con:\n\n• **Crear** nuevas propiedades\n• **Buscar** y ver propiedades existentes\n• **Actualizar** información de propiedades\n• **Eliminar** propiedades\n\n¿Qué te gustaría hacer hoy?"
                : "🏠 **Admin Mode Activated**\n\nHello, I'm your administrative assistant for the Zyonia property system. I can help you with:\n\n• **Create** new properties\n• **Search** and view existing properties\n• **Update** property information\n• **Delete** properties\n\nWhat would you like to do today?",
          };
        }
        return newMessages;
      });
    }

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Prepare conversation history for context
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await adminChat(userMessage, conversationHistory);

      // Add assistant response
      const assistantMessage = {
        role: "assistant",
        content: response.response,
        success: response.success,
        functionCalled: response.function_called,
        functionResult: response.function_result,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Handle modal display if required
      if (response.requires_modal && response.function_result) {
        // Send opening modal message
        sendLiveUpdate(
          `Opening ${response.modal_type.replace("_", " ")} modal...`,
          "info"
        );

        setModalType(response.modal_type);
        setModalData(response.function_result);
        setShowModal(true);
      }
    } catch (error) {
      console.error("Admin chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ **Error**: ${error.message}`,
          success: false,
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setModalData(null);
    setModalType(null);
  };



  const formatMessage = (message) => {
    // Add success/error styling to messages
    let className = "admin-message-content";
    
    // Handle live updates
    if (message.isLiveUpdate) {
      className += " live-update";
      if (message.updateType) {
        className += ` ${message.updateType}`;
      }
      if (message.isFinal) {
        className += " final";
      }
    } else if (message.success === false || message.error) {
      className += " admin-message-error";
    } else if (message.success === true && message.functionCalled) {
      className += " admin-message-success";
    }

    return (
      <div className={className}>
        {message.progress && (
          <div className="admin-progress-indicator">
            <div className="admin-progress-bar">
              <div 
                className="admin-progress-fill"
                style={{ width: `${(message.progress.step / message.progress.total) * 100}%` }}
              />
            </div>
            <span>{message.progress.step}/{message.progress.total}</span>
          </div>
        )}
        <ReactMarkdown>{message.content}</ReactMarkdown>
        {message.functionCalled && (
          <div className="admin-function-info">
            <span className="admin-function-badge">
              {message.functionCalled}
            </span>
          </div>
        )}
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-chat-not-authenticated">
        <div className="admin-auth-prompt">
          <ExclamationTriangleIcon className="admin-auth-icon" />
          <p>Please authenticate as an admin to use this interface.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-chat-interface">
      {/* Header */}
      <div className="admin-chat-header">
        <div className="admin-chat-title">
          <span className="admin-chat-icon">🏠</span>
          <h3>Admin Chat Interface</h3>
        </div>
        <div className="admin-chat-controls">
          <div className="admin-chat-user">
            <span className="admin-user-badge">{user?.id}</span>
            <span className="admin-status-dot admin-status-active"></span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="admin-chat-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`admin-message ${
              message.role === "user"
                ? "admin-message-user"
                : "admin-message-assistant"
            }`}
          >
            <div className="admin-message-avatar">
              {message.role === "user" ? (
                <span className="admin-avatar-user">👤</span>
              ) : (
                <span className="admin-avatar-assistant">🤖</span>
              )}
            </div>
            {formatMessage(message)}
          </div>
        ))}

        {isLoading && (
          <div className="admin-message admin-message-assistant">
            <div className="admin-message-avatar">
              <span className="admin-avatar-assistant">🤖</span>
            </div>
            <div className="admin-message-content admin-message-loading">
              <div className="admin-loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="admin-loading-text">
                {getText("processing")}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="admin-chat-input-form">
        <div className="admin-chat-input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getText("placeholder")}
            className="admin-chat-input"
            rows="2"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="admin-chat-send-button"
          >
            <PaperAirplaneIcon className="admin-send-icon" />
          </button>
        </div>
      </form>

      {/* Modal */}
      {showModal && modalData && (
        <AdminPropertyModal
          type={modalType}
          data={modalData}
          onClose={closeModal}
          liveUpdates={{
            sendLiveUpdate,
            sendProgressUpdate,
            sendFinalUpdate,
          }}
          adminChat={adminChat}
        />
      )}
    </div>
  );
};

export default AdminChatInterface;
