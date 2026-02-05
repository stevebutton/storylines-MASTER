import React, { useState, useEffect, useRef } from 'react';

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');
  const [eventLog, setEventLog] = useState([]);
  const recognitionRef = useRef(null);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog(prev => [...prev.slice(-4), `${timestamp}: ${message}`]);
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
        setTranscript(prev => prev + finalText);
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
      
      switch(event.error) {
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex flex-col items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-4">
                <h1 className="text-3xl font-bold text-gray-800 text-center">Voice Recorder</h1>
                <p className="text-sm text-gray-600 text-center">Tap to record, transcribe, and edit your speech.</p>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <div className="flex justify-between items-center mt-6 mb-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isRecording ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                        {status}
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={undoLastSegment}
                            disabled={isRecording || segments.filter(s => s.isFinal).length === 0}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            <Undo2 className="h-4 w-4 mr-1" />
                            Undo
                        </button>
                        <button
                            onClick={clearSegments}
                            disabled={isRecording || segments.length === 0}
                            className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                <div className="flex justify-center my-6">
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={!recognitionRef.current}
                        className={`w-32 h-32 rounded-full shadow-lg transition-all duration-300 disabled:opacity-50 ${
                            isRecording 
                                ? 'bg-blue-500 hover:bg-blue-600 animate-pulse' 
                                : 'bg-gray-700 hover:bg-gray-800'
                        }`}
                    >
                        {isRecording ? (
                            <Square className="w-12 h-12 text-white" />
                        ) : (
                            <Mic className="w-12 h-12 text-white" />
                        )}
                    </button>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-32 overflow-y-auto text-gray-800 text-sm leading-relaxed">
                    {displayTranscription || (
                        <p className="italic text-gray-500 text-center">
                            {isRecording ? 'Speak now...' : 'Your transcription will appear here.'}
                        </p>
                    )}
                </div>

                {isIOS && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                        Note: For optimal performance on iOS, ensure "Enable Dictation" is turned on in your device settings.
                    </div>
                )}
            </div>
        </div>
    );
}