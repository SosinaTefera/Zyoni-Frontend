import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';

function ChatPanel({ selectedDocument }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello,\nWelcome to Airz real state assistant, let me know what you are looking for. También puedo hablar en español.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const [guestName, setGuestName] = useState("");
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

  const handleSubmit = async (e, retrying = false) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !retrying) || isLoading) return;

    const userMessage = retrying ? retryInfo?.userMessage : input.trim();
    if (!userMessage) return;
    if (!retrying) setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setRetryInfo(null);

    try {
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const sessionRes = await fetch('http://localhost:8000/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: guestName })
        });
        if (!sessionRes.ok) throw new Error('Failed to create session');
        const sessionData = await sessionRes.json();
        currentSessionId = sessionData.session_id;
        setSessionId(currentSessionId);
      }
      const chatRes = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: guestName,
          session_id: currentSessionId,
          message: userMessage
        })
      });
      if (!chatRes.ok) throw new Error('Failed to get chat response');
      const chatData = await chatRes.json();
      setMessages(prev => [...prev, { role: 'assistant', content: chatData.response }]);
    } catch (error) {
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      if (
        error.message && (
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Network Error')
        )
      ) {
        errorMessage = 'App disconnected, please restart.';
      } else if (error.response) {
        try {
          const data = await error.response.json();
          if (data && data.detail && typeof data.detail === 'string' && data.detail.length < 200) {
            errorMessage = data.detail;
          }
        } catch (e) {}
      }
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: errorMessage, failed: true }
      ]);
      setRetryInfo({ userMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (retryInfo && retryInfo.userMessage) {
      // Remove the last assistant error message before retrying
      setMessages(prev => prev.filter((msg, idx, arr) => !(idx === arr.length - 1 && msg.role === 'assistant' && msg.failed)));
      handleSubmit(null, true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        handleSubmit(e);
      }
    }
  };

  return (
    <main className="w-full flex flex-col h-full bg-gradient-to-br from-blue-100/40 via-purple-100/40 to-white/60 py-4">
      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white/60 p-8 mb-4 shadow-2xl backdrop-blur-md backdrop-saturate-150">
        <div className="space-y-8">
          {messages.map((message, index) => (
            <>
              {console.log('MSG', message)}
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="flex flex-col items-center mr-2">
                    <ChatBubbleLeftEllipsisIcon className="h-8 w-8 text-purple-400 drop-shadow" />
                    <span className="text-xs font-semibold text-purple-500 mt-1">AI</span>
                  </div>
                )}
                <div
                  className={`max-w-[70%] px-5 py-4 rounded-2xl text-base shadow-xl transition-all duration-300 ${
                    message.role === 'user'
                      ? 'bg-blue-200/80 text-blue-900 rounded-br-none'
                      : 'bg-purple-200/80 text-purple-900 rounded-bl-none'
                  } animate-fade-in`}
                >
                  {message.role === 'assistant'
                    ? <ReactMarkdown>{message.content}</ReactMarkdown>
                    : message.content}
                  {/* Retry button for failed assistant message */}
                  {message.role === 'assistant' && message.failed && index === messages.length - 1 && (
                    <button
                      onClick={handleRetry}
                      className="mt-3 ml-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-semibold border border-red-300 transition"
                    >
                      Retry
                    </button>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="flex flex-col items-center ml-2">
                    <UserCircleIcon className="h-8 w-8 text-blue-400 drop-shadow" />
                    <span className="text-xs font-semibold text-blue-500 mt-1">You</span>
                  </div>
                )}
              </div>
            </>
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
              <span className="text-xs text-purple-400 mt-2 ml-2">AI is typing…</span>
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
