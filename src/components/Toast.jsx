import { useEffect } from 'react';

function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 3500);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded shadow-lg text-white text-base font-medium transition-all duration-300 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      {message}
    </div>
  );
}

export default Toast; 