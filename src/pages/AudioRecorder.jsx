import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';

export default function AudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [status, setStatus] = useState('Ready');
    const [error, setError] = useState('');
    const recognitionRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            setError('Speech recognition is not supported in this browser');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsRecording(true);
            setStatus('Listening...');
            setError('');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setTranscription(transcript);
            setStatus('Ready');
        };

        recognition.onerror = (event) => {
            setIsRecording(false);
            setStatus('Ready');
            
            if (event.error === 'not-allowed') {
                setError('Microphone access denied. Please enable microphone permissions.');
            } else if (event.error === 'no-speech') {
                setError('No speech detected. Please try again.');
            } else if (event.error === 'network') {
                setError('Network error. Please check your connection.');
            } else {
                setError(`Error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            setIsRecording(false);
            if (status === 'Listening...') {
                setStatus('Ready');
            }
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const handleToggleRecording = () => {
        if (!recognitionRef.current) return;

        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            setTranscription('');
            setError('');
            recognitionRef.current.start();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2 text-center">
                    Voice Transcription
                </h1>
                <p className="text-sm text-slate-500 mb-8 text-center">
                    Tap to record and transcribe your voice
                </p>

                {/* Status Indicator */}
                <div className="mb-6 text-center">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                        isRecording 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-slate-100 text-slate-700'
                    }`}>
                        {isRecording && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                        {status}
                    </div>
                </div>

                {/* Record Button */}
                <div className="flex flex-col items-center gap-4 mb-8">
                    <Button
                        onClick={handleToggleRecording}
                        disabled={!recognitionRef.current}
                        className={`w-32 h-32 rounded-full shadow-lg transition-all ${
                            isRecording 
                                ? 'bg-slate-800 hover:bg-slate-900 animate-pulse' 
                                : 'bg-red-500 hover:bg-red-600'
                        }`}
                        size="icon"
                    >
                        {isRecording ? (
                            <Square className="w-12 h-12 text-white" />
                        ) : (
                            <Mic className="w-12 h-12 text-white" />
                        )}
                    </Button>
                    <p className="text-sm font-medium text-slate-600">
                        {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
                    </p>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Transcription Display */}
                {transcription && (
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 mb-3">Transcription:</h2>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <p className="text-slate-700 leading-relaxed">{transcription}</p>
                        </div>
                    </div>
                )}

                {/* Browser Support Warning */}
                {!recognitionRef.current && !error && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                            Initializing speech recognition...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}