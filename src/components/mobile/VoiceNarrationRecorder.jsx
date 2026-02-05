import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VoiceNarrationRecorder({ onTranscriptChange, initialTranscript = '' }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(initialTranscript);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      setIsSupported(false);
      setDebugInfo('Not supported');
    } else {
      setDebugInfo('Ready');
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
      setDebugInfo('🎙️ Listening...');
    };

    recognitionInstance.onresult = (event) => {
      let interimText = '';
      let finalText = '';
      
      for (let i = 0; i < event.results.length; i++) {
        const resultTranscript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += resultTranscript + ' ';
        } else {
          interimText += resultTranscript;
        }
      }
      
      if (finalText) {
        setTranscript(prev => prev + finalText);
        setDebugInfo('✅ Recording...');
      }
      if (interimText) {
        setInterimTranscript(interimText);
        setDebugInfo('📝 Hearing you...');
      }
      
      setError('');
    };

    recognitionInstance.onend = () => {
      setIsRecording(false);
      setInterimTranscript('');
      setDebugInfo('Ready');
      recognitionRef.current = null;
    };

    recognitionInstance.onerror = (event) => {
      setIsRecording(false);
      recognitionRef.current = null;
      
      switch(event.error) {
        case 'not-allowed':
          setError('Microphone permission denied');
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
          setError('Cannot access microphone');
          setDebugInfo('Mic unavailable');
          break;
        case 'network':
          setError('Network error - check connection');
          setDebugInfo('Network error');
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
      setDebugInfo('Starting...');
      
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch (e) {
            console.log('Abort error:', e);
          }
          recognitionRef.current = null;
        }
        
        recognitionRef.current = createRecognition();
        recognitionRef.current.start();
        setIsRecording(true);
        
      } catch (err) {
        setError('Failed to start. Try again.');
        setDebugInfo('Failed');
        setIsRecording(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center py-8">
        <button
          onClick={toggleRecording}
          disabled={!isSupported}
          className={`w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isRecording 
              ? 'bg-red-500 animate-pulse' 
              : transcript 
                ? 'bg-green-500' 
                : 'bg-amber-600 hover:bg-amber-700'
          } ${!isSupported ? 'opacity-50' : ''}`}
        >
          {isRecording ? (
            <Square className="w-16 h-16 text-white" />
          ) : transcript ? (
            <Check className="w-16 h-16 text-white" />
          ) : (
            <Mic className="w-16 h-16 text-white" />
          )}
        </button>
        <p className="mt-4 text-sm text-slate-600 font-medium">
          {isRecording ? 'Tap to Stop Recording' : transcript ? 'Recording Complete' : 'Tap to Start Recording'}
        </p>
        <p className="mt-2 text-xs text-slate-500">{debugInfo}</p>
      </div>

      {(transcript || interimTranscript) && (
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-700 leading-relaxed">
              {transcript}
              {interimTranscript && (
                <span className="text-slate-400 italic"> {interimTranscript}</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}