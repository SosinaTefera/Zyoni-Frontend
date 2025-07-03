import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';

function ChatPanel({ selectedDocument }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I can help you analyze your documents. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const [guestName, setGuestName] = useState("");

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      let currentSessionId = sessionId;
      // If no session, create one
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
      // Now send chat message
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
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
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
    <main className="w-full flex flex-col h-full bg-gray-50 py-4">
      <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white p-6 mb-4 shadow-sm">
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="flex flex-col items-center mr-2">
                  <ChatBubbleLeftEllipsisIcon className="h-8 w-8 text-blue-400" />
                  <span className="text-xs font-semibold text-gray-500 mt-1">IA</span>
                </div>
              )}
              <div
                className={`max-w-[70%] px-4 py-3 rounded-2xl text-base shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gray-100 text-gray-800 rounded-br-none'
                    : 'bg-blue-100 text-blue-900 rounded-bl-none'
                }`}
              >
                {message.content}
              </div>
              {message.role === 'user' && (
                <div className="flex flex-col items-center ml-2">
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 mt-1">User</span>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-blue-100 rounded-2xl px-4 py-3 text-blue-900 shadow-sm">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-auto">
        <div className="flex items-end gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the document..."
            className="flex-1 resize-none border-0 focus:ring-0 bg-transparent text-base min-h-[40px] max-h-32"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
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
