import React, { createContext, useState, useContext, useCallback } from 'react';

const AudioContext = createContext();

export const useAudio = () => {
  return useContext(AudioContext);
};

export const AudioProvider = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [playingId, setPlayingId] = useState(null); // ID of the message being played

  const stopAudio = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      const urlToRevoke = currentAudio.src;
      if (urlToRevoke && urlToRevoke.startsWith('blob:')) {
        URL.revokeObjectURL(urlToRevoke);
      }
    }
    setCurrentAudio(null);
    setIsPlaying(false);
    setPlayingId(null);
  }, [currentAudio]);


  const playAudio = useCallback((base64Audio, messageId) => {
    if (isPlaying && playingId === messageId) {
      stopAudio();
      return;
    }

    if (currentAudio) {
      stopAudio();
    }

    try {
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);
      setPlayingId(messageId);
      
      audio.play();

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        stopAudio();
      };
      audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          stopAudio();
      }
    } catch (error) {
        console.error("Error decoding or playing base64 audio:", error);
        stopAudio();
    }
  }, [currentAudio, isPlaying, playingId, stopAudio]);

  const toggleAutoPlay = () => {
    setIsAutoPlayEnabled(prev => !prev);
  };

  const value = {
    isPlaying,
    playingId,
    isAutoPlayEnabled,
    playAudio,
    stopAudio,
    toggleAutoPlay,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}; 