import React, { useState, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

const generateId = () => crypto.randomUUID().replace(/-/g, '').substring(0, 24);
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';

export default function AudioTest() {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [error, setError] = useState('');
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startRecording = async () => {
        try {
            setError('');
            setTranscription('');
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });
            
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                await transcribeAudio(blob);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            setError(`Recording failed: ${err.message}`);
            console.error('Recording error:', err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const transcribeAudio = async (blob) => {
        setIsProcessing(true);
        try {
            const file = new File([blob], 'recording.webm', { type: 'audio/webm' });

            const filePath = `${generateId()}-${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('media')
                .upload(filePath, file, { contentType: file.type, upsert: false });
            if (uploadError) throw uploadError;

            throw new Error('AI generation requires LLM API key — not yet configured');
        } catch (err) {
            setError(`Transcription failed: ${err.message}`);
            console.error('Transcription error:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2 text-center">
                    Audio Recording Test
                </h1>
                <p className="text-sm text-slate-500 mb-8 text-center">
                    Safari on iOS
                </p>

                <div className="flex flex-col items-center gap-4">
                    {!isRecording ? (
                        <Button
                            onClick={startRecording}
                            disabled={isProcessing}
                            className="w-32 h-32 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
                            size="icon"
                        >
                            <Mic className="w-12 h-12" />
                        </Button>
                    ) : (
                        <Button
                            onClick={stopRecording}
                            className="w-32 h-32 rounded-full bg-slate-800 hover:bg-slate-900 text-white shadow-lg animate-pulse"
                            size="icon"
                        >
                            <Square className="w-12 h-12" />
                        </Button>
                    )}

                    <p className="text-sm font-medium text-slate-600">
                        {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
                    </p>
                </div>

                {isProcessing && (
                    <div className="mt-8 flex items-center justify-center gap-3 text-amber-600">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-medium">Transcribing audio...</span>
                    </div>
                )}

                {error && (
                    <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {transcription && (
                    <div className="mt-8">
                        <h2 className="text-lg font-semibold text-slate-800 mb-3">Transcription:</h2>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <p className="text-slate-700 leading-relaxed">{transcription}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}