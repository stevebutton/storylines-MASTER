import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Undo2 } from 'lucide-react';

export default function AudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [segments, setSegments] = useState([]);
    const [status, setStatus] = useState('Ready');
    const [error, setError] = useState('');
    const recognitionRef = useRef(null);
    const segmentCounter = useRef(0);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setError('Speech recognition is not supported in this browser.');
            setStatus('Not Supported');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsRecording(true);
            setStatus('Listening...');
            setError('');
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                setSegments(prevSegments => [
                    ...prevSegments,
                    { id: segmentCounter.current++, text: finalTranscript, isFinal: true }
                ]);
            }

            if (interimTranscript) {
                setSegments(prevSegments => {
                    const withoutInterim = prevSegments.filter(s => s.isFinal);
                    return [
                        ...withoutInterim,
                        { id: 'interim', text: interimTranscript, isFinal: false }
                    ];
                });
            }
        };

        recognition.onerror = (event) => {
            setIsRecording(false);
            setStatus('Ready');
            if (event.error === 'not-allowed' || event.error === 'permission-denied') {
                setError('Microphone access denied. Please enable microphone permissions in your browser settings.');
            } else if (event.error === 'no-speech') {
                setError('No speech detected. Please speak clearly.');
            } else if (event.error === 'audio-capture') {
                setError('Microphone is not available. Please check your microphone connection.');
            } else if (event.error === 'network') {
                setError('Network error during speech recognition. Please check your internet connection.');
            } else if (event.error !== 'aborted') {
                setError(`Speech recognition error: ${event.error}`);
            }
            console.error('Speech recognition error:', event.error);
        };

        recognition.onend = () => {
            setIsRecording(false);
            setStatus('Ready');
            setSegments(prevSegments => prevSegments.filter(s => s.isFinal));
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const startRecording = () => {
        if (recognitionRef.current && !isRecording) {
            recognitionRef.current.start();
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop();
        }
    };

    const clearSegments = () => {
        setSegments([]);
        segmentCounter.current = 0;
        setError('');
    };

    const undoLastSegment = () => {
        setSegments(prevSegments => {
            const finalSegments = prevSegments.filter(s => s.isFinal);
            return finalSegments.slice(0, -1);
        });
    };

    const displayTranscription = segments.map(s => s.text).join(' ');

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