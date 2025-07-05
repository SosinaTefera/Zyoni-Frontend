import { useState } from 'react';
import axios from 'axios';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

/**
 * Smart microphone component: streams directly to Azure Speech SDK when the
 * browser supports it, otherwise falls back to MediaRecorder + blob upload.
 *
 * Props:
 *   onText(text: string) – callback invoked with final transcript.
 */
export default function UniversalMic({ onText }) {
  const [mode] = useState(browserCanStreamDirectly() ? 'direct' : 'blob');
  return mode === 'direct' ? (
    <MicDirect onText={onText} />
  ) : (
    <MicBlob onText={onText} />
  );
}

/* ---------------- capability check ---------------- */
function browserCanStreamDirectly() {
  const info = sdk.BrowserInfo.getBrowserInformation();
  return (
    info.browser === sdk.BrowserType.Chrome ||
    info.browser === sdk.BrowserType.Edge ||
    info.browser === sdk.BrowserType.Firefox
  );
}

/* ---------------- Direct stream implementation ---------------- */
function MicDirect({ onText }) {
  const [recognizer, setRec] = useState(null);
  const [listening, setListening] = useState(false);

  const toggle = async () => {
    if (listening) {
      recognizer.stopContinuousRecognitionAsync();
      setListening(false);
      return;
    }
    // get short-lived token from backend
    const { data } = await axios.get('http://localhost:8000/speech-token');
    const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(
      data.token,
      data.region,
    );
    speechConfig.speechRecognitionLanguage = 'es-ES';
    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    const rec = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    rec.recognized = (_, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
        onText(e.result.text);
      }
    };
    rec.startContinuousRecognitionAsync();
    setRec(rec);
    setListening(true);
  };

  return (
    <button onClick={toggle} className="rounded-xl p-2 bg-blue-500 text-white">
      {listening ? 'Stop Mic' : 'Start Mic'}
    </button>
  );
}

/* ---------------- Blob fallback implementation ---------------- */
function MicBlob({ onText }) {
  const [recording, setRecording] = useState(false);
  const mediaRef = useState(null);

  const toggle = async () => {
    if (recording) {
      mediaRef.current.stop();
      setRecording(false);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    const media = new MediaRecorder(stream, { mimeType });
    const chunks = [];
    media.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    media.onstop = async () => {
      const blob = new Blob(chunks, { type: mimeType });
      const b64 = await blobToBase64(blob);
      await onText('[VOICE_BLOB]', { audio_base64: b64, audio_mime_type: mimeType });
    };
    mediaRef.current = media;
    media.start();
    setRecording(true);
  };

  return (
    <button onClick={toggle} className="rounded-xl p-2 bg-blue-500 text-white">
      {recording ? 'Stop Mic' : 'Start Mic'}
    </button>
  );
}

/* util */
function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onloadend = () => res(reader.result.split(',')[1]);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
} 