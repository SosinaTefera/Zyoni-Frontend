import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, UserCircleIcon, MicrophoneIcon } from '@heroicons/react/24/solid';
import { ChatBubbleLeftEllipsisIcon, StopIcon } from '@heroicons/react/24/outline';
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

  // --- Audio recording ---
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);

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


  // Ensure we have a valid session ‒ creates one on first use
  const ensureSession = async () => {
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const res = await fetch('http://localhost:8000/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: guestName })
      });
      if (!res.ok) throw new Error('Failed to create session');
      const data = await res.json();
      currentSessionId = data.session_id;
      setSessionId(currentSessionId);
    }
    return currentSessionId;
  };

  // Core chat request – accepts either plain text or base-64 audio
  const sendChatRequest = async ({ text, audioBase64, mimeType }) => {
    const currentSessionId = await ensureSession();
    const payload = {
      user_id: guestName,
      session_id: currentSessionId,
      ...(text ? { message: text } : {}),
      ...(audioBase64 ? { audio_base64: audioBase64, audio_mime_type: mimeType || 'audio/webm' } : {})
    };

    const res = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to get chat response');
    return res.json();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const chatData = await sendChatRequest({ text: userMessage });
      setMessages(prev => [...prev, { role: 'assistant', content: chatData.response, ...(chatData.audio_base64 ? { audio: chatData.audio_base64 } : {}) }]);

      if (chatData.audio_base64) {
        const audio = new Audio(`data:audio/wav;base64,${chatData.audio_base64}`);
        audio.play().catch(console.error);
      }
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

  // ---------------- Voice recording / STT -----------------
  const getSupportedMimeType = () => {
    const preferredTypes = [
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/webm;codecs=opus',
      'audio/webm',
    ];
    for (const type of preferredTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      if (!mimeType) throw new Error('No supported audio format found for MediaRecorder');
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
      console.error('Failed to start recording:', err);
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

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const sendAudioMessage = async (audioBlob) => {
    setMessages(prev => [...prev, { role: 'user', content: '[Voice message]' }]);
    setIsLoading(true);

    try {
      const audioBase64 = await blobToBase64(audioBlob);
      // Need to know which type was used; reuse getSupportedMimeType()
      const mimeType = getSupportedMimeType() || 'audio/webm';
      const chatData = await sendChatRequest({ audioBase64, mimeType });

      // Push assistant message with optional audio
      const assistantMsg = { role: 'assistant', content: chatData.response };
      if (chatData.audio_base64) assistantMsg.audio = chatData.audio_base64;
      setMessages(prev => [...prev, assistantMsg]);

      // Auto-play audio if available
      if (chatData.audio_base64) {
        const audio = new Audio(`data:audio/wav;base64,${chatData.audio_base64}`);
        audio.play().catch(console.error);
      }
    } catch (err) {
      console.error('Error sending audio message:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, ocurrió un error con el audio.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="w-full flex flex-col h-full bg-gradient-to-br from-blue-100/40 via-purple-100/40 to-white/60 py-4">
      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white/60 p-8 mb-4 shadow-2xl backdrop-blur-md backdrop-saturate-150">
        <div className="space-y-8">
          {messages.map((message, index) => (
            <>
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
                    ? <>
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                        {message.audio && (
                          <audio
                            src={`data:audio/wav;base64,${message.audio}`}
                            controls
                            className="mt-2 w-full"
                          />
                        )}
                      </>
                    : message.content}
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
            type="button"
            onClick={handleRecordClick}
            disabled={isLoading}
            className={`rounded-xl p-2 transition-all duration-300 shadow-lg focus:ring-2 focus:ring-purple-300 ${isRecording ? 'bg-red-500 text-white' : 'bg-blue-500 text-white hover:scale-110'} mr-2`}
          >
            {isRecording ? <StopIcon className="h-6 w-6" /> : <MicrophoneIcon className="h-6 w-6" />}
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
