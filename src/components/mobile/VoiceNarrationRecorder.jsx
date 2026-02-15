import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Check } from 'lucide-react';

export default function VoiceNarrationRecorder({ onTranscriptChange, initialTranscript = '', showDebug = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(initialTranscript);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');
  const [eventLog, setEventLog] = useState([]);
  const recognitionRef = useRef(null);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog((prev) => [...prev.slice(-4), `${timestamp}: ${message}`]);
    console.log(message);
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      setIsSupported(false);
      setDebugInfo('Not supported');
      addLog('SpeechRecognition API not found');
    } else {
      setDebugInfo('Ready');
      addLog('App loaded and ready');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.log('Cleanup error:', e);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (onTranscriptChange) {
      onTranscriptChange(transcript);
    }
  }, [transcript, onTranscriptChange]);

  const createRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';
    recognitionInstance.maxAlternatives = 1;

    recognitionInstance.onstart = () => {
      addLog('✓ onstart fired');
      setDebugInfo('🎙️ LISTENING');
    };

    recognitionInstance.onaudiostart = () => {
      addLog('✓ onaudiostart - mic active');
      setDebugInfo('🎙️ MIC ACTIVE');
    };

    recognitionInstance.onsoundstart = () => {
      addLog('✓ onsoundstart - sound detected');
      setDebugInfo('🔊 SOUND DETECTED');
    };

    recognitionInstance.onspeechstart = () => {
      addLog('✓ onspeechstart - speech detected!');
      setDebugInfo('🗣️ SPEECH DETECTED');
    };

    recognitionInstance.onresult = (event) => {
      addLog(`✓ onresult fired! (${event.results.length} results)`);

      let interimText = '';
      let finalText = '';

      for (let i = 0; i < event.results.length; i++) {
        const resultTranscript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += resultTranscript + ' ';
          addLog(`FINAL: "${resultTranscript}"`);
        } else {
          interimText += resultTranscript;
          addLog(`interim: "${resultTranscript}"`);
        }
      }

      if (finalText) {
        setTranscript((prev) => prev + finalText);
        setDebugInfo('✅ GOT TRANSCRIPTION');
      }
      if (interimText) {
        setInterimTranscript(interimText);
        setDebugInfo('📝 Hearing you...');
      }

      setError('');
    };

    recognitionInstance.onspeechend = () => {
      addLog('onspeechend - speech stopped');
      setDebugInfo('🤫 Silence detected');
    };

    recognitionInstance.onsoundend = () => {
      addLog('onsoundend - sound stopped');
    };

    recognitionInstance.onaudioend = () => {
      addLog('onaudioend - mic stopped');
    };

    recognitionInstance.onend = () => {
      addLog('onend - recognition ended');
      setIsRecording(false);
      setInterimTranscript('');
      setDebugInfo('Ready');
      recognitionRef.current = null;
    };

    recognitionInstance.onerror = (event) => {
      addLog(`❌ ERROR: ${event.error}`);
      setIsRecording(false);
      recognitionRef.current = null;

      switch (event.error) {
        case 'not-allowed':
          setError('❌ Microphone permission denied');
          setDebugInfo('Permission denied');
          break;
        case 'no-speech':
          setError('No speech detected - speak louder?');
          setDebugInfo('No speech heard');
          break;
        case 'aborted':
          setError('');
          setDebugInfo('Stopped');
          break;
        case 'audio-capture':
          setError('❌ Cannot access microphone');
          setDebugInfo('Mic unavailable');
          break;
        case 'network':
          setError('❌ Network error - check WiFi/cellular');
          setDebugInfo('Network error');
          break;
        case 'service-not-allowed':
          setError('❌ Speech service not available');
          setDebugInfo('Service blocked');
          break;
        default:
          setError(`Error: ${event.error}`);
          setDebugInfo(`Error: ${event.error}`);
      }
    };

    return recognitionInstance;
  };

  const toggleRecording = () => {
    if (!isSupported) {
      setError('Speech recognition not supported.');
      return;
    }

    if (isRecording) {
      addLog('User clicked stop');
      setDebugInfo('Stopping...');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping:', e);
          setIsRecording(false);
        }
      }
    } else {
      setError('');
      setInterimTranscript('');
      addLog('User clicked start');
      setDebugInfo('Starting...');

      try {
        if (recognitionRef.current) {
          addLog('Cleaning up old instance');
          try {
            recognitionRef.current.abort();
          } catch (e) {
            console.log('Abort error:', e);
          }
          recognitionRef.current = null;
        }

        addLog('Creating new recognition');
        recognitionRef.current = createRecognition();
        addLog('Calling start()...');
        recognitionRef.current.start();
        setIsRecording(true);

      } catch (err) {
        addLog(`Start failed: ${err.message}`);
        setError('Failed to start. Try again.');
        setDebugInfo('Failed');
        setIsRecording(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {error &&
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      }

      <div className="flex flex-col items-center py-4">
        <button
          onClick={toggleRecording}
          disabled={!isSupported} className="bg-lime-500 text-white text-4xl rounded-full w-32 h-32 flex items-center justify-center transition-all duration-300 shadow-lg hover:bg-amber-700 cursor-pointer">











          {isRecording ? '⏹️' : '🎤'}
        </button>
        
        <p className="mt-4 text-sm font-medium text-slate-600">
          {isRecording ? 'RECORDING - Click to stop' : 'Click to start'}
        </p>
        
        {showDebug &&
        <>
            <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">STATUS:</p>
              <p className="text-blue-900 text-base font-bold">{debugInfo}</p>
            </div>

            <div className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto mt-4">
              <p className="text-xs font-semibold text-gray-700 mb-1">EVENT LOG:</p>
              {eventLog.length === 0 ?
            <p className="text-xs text-gray-500">No events yet</p> :

            eventLog.map((log, i) =>
            <p key={i} className="text-xs text-gray-700 font-mono">{log}</p>
            )
            }
            </div>
          </>
        }
      </div>

      {showDebug && interimTranscript &&
      <div className="w-full bg-yellow-50 border border-yellow-300 rounded-lg p-3">
          <p className="text-xs font-semibold text-yellow-700 mb-1">INTERIM:</p>
          <p className="text-gray-700 text-sm italic">{interimTranscript}</p>
        </div>
      }
      
      {transcript &&
      <div className="w-full bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-green-700 mb-2">TRANSCRIPT:</p>
          <p className="text-gray-800 text-lg">{transcript}</p>
        </div>
      }
      
      {!transcript && !interimTranscript && !error && !isRecording &&
      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-gray-500 text-center italic">
            Transcription will appear here
          </p>
        </div>
      }
    </div>);

}