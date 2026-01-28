'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Square } from 'lucide-react';
import { TextAnalysisResponse } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const STREAMING_URL = 'https://trustcheck-streaming-gateway.onrender.com';
const TARGET_SAMPLE_RATE = 16000;

const downsampleBuffer = (buffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array => {
    if (outputSampleRate === inputSampleRate) {
        return buffer;
    }
    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        let accum = 0;
        let count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = accum / count;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
};

const floatTo16BitPCM = (input: Float32Array): Int16Array => {
    const pcm = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm;
};


export default function LiveCallPage() {
    const [status, setStatus] = useState('idle');
    const [isStreaming, setIsStreaming] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [partialTranscript, setPartialTranscript] = useState('');
    const [finalTranscript, setFinalTranscript] = useState('');
    const [analysisResult, setAnalysisResult] = useState<TextAnalysisResponse | null>(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
    const lastAnalyzedTextRef = useRef('');
    const isStreamingRef = useRef(false);
    
    const { toast } = useToast();

    useEffect(() => {
        isStreamingRef.current = isStreaming;
    }, [isStreaming]);

    const stopStreaming = useCallback((notifyServer = true) => {
        setIsStreaming(false);

        if (notifyServer && socketRef.current?.connected) {
            socketRef.current.emit('stop');
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scriptNodeRef.current) {
            scriptNodeRef.current.onaudioprocess = null;
            scriptNodeRef.current.disconnect();
            scriptNodeRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
    }, []);

    useEffect(() => {
        const newSocket = io(STREAMING_URL, {
            transports: ['websocket'],
            path: '/socket.io',
        });
        socketRef.current = newSocket;

        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => {
            setIsConnected(false);
            if (isStreamingRef.current) {
                stopStreaming(false);
            }
        };
        const onStatus = (data: { state: string }) => setStatus(data.state);
        const onTranscript = ({ text, isPartial }: { text: string; isPartial: boolean }) => {
            if (isPartial) {
                setPartialTranscript(text);
            } else if (text) {
                setPartialTranscript('');
                setFinalTranscript(prev => prev ? `${prev.trim()} ${text.trim()}`.trim() : text.trim());
            }
        };
        const onError = (error: { message: string }) => {
            toast({ variant: 'destructive', title: 'Streaming Error', description: error.message });
            stopStreaming(false);
        };

        newSocket.on('connect', onConnect);
        newSocket.on('disconnect', onDisconnect);
        newSocket.on('status', onStatus);
        newSocket.on('transcript', onTranscript);
        newSocket.on('error', onError);

        return () => {
            newSocket.disconnect();
        };
    }, [stopStreaming, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!finalTranscript.trim()) return;

        setIsLoadingAnalysis(true);
        lastAnalyzedTextRef.current = finalTranscript;
        
        try {
            const response = await fetch('/api/analyze/live-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: finalTranscript }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to analyze text.');
            }

            const result: TextAnalysisResponse = await response.json();
            setAnalysisResult(result);
        } catch (error) {
            const err = error as Error;
            toast({
                variant: 'destructive',
                title: 'Analysis Error',
                description: err.message,
            });
        } finally {
            setIsLoadingAnalysis(false);
        }
    }, [finalTranscript, toast]);

    useEffect(() => {
        if (finalTranscript && finalTranscript.length >= 30 && finalTranscript !== lastAnalyzedTextRef.current) {
            const handle = setTimeout(() => {
                handleAnalysis();
            }, 5000);
            return () => clearTimeout(handle);
        }
    }, [finalTranscript, handleAnalysis]);

    const startStreaming = useCallback(async () => {
        if (isStreaming || !socketRef.current?.connected) return;

        setFinalTranscript('');
        setPartialTranscript('');
        setAnalysisResult(null);
        setHasMicPermission(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            setHasMicPermission(true);

            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = context;
            
            socketRef.current.emit('start', { languageCode: 'en-US', sampleRateHertz: TARGET_SAMPLE_RATE });
            setIsStreaming(true);
            
            const source = context.createMediaStreamSource(stream);
            const bufferSize = 4096;
            const scriptNode = context.createScriptProcessor(bufferSize, 1, 1);
            scriptNodeRef.current = scriptNode;

            scriptNode.onaudioprocess = (event) => {
                if(!isStreamingRef.current) return;
                const inputData = event.inputBuffer.getChannelData(0);
                const downsampled = downsampleBuffer(inputData, context.sampleRate, TARGET_SAMPLE_RATE);
                const pcm16 = floatTo16BitPCM(downsampled);
                socketRef.current?.emit('audio', pcm16.buffer);
            };

            source.connect(scriptNode);
            scriptNode.connect(context.destination);

        } catch (error) {
            console.error('Error starting stream:', error);
            setHasMicPermission(false);
            toast({
                variant: 'destructive',
                title: 'Microphone not available',
                description: 'Please allow microphone access in your browser settings.',
            });
            if (isStreamingRef.current) {
                stopStreaming();
            }
        }
    }, [isStreaming, stopStreaming, toast]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold font-headline">TrustCheck: Live Speech-to-Text + Live Risk</h1>

            {hasMicPermission === false && (
                <Alert variant="destructive">
                    <AlertTitle>Microphone Access Required</AlertTitle>
                    <AlertDescription>
                        Please enable microphone access in your browser settings to use this feature.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="text-sm font-medium">status: {status}</span>
                        {!isStreaming ? (
                            <Button onClick={startStreaming} disabled={!isConnected || isStreaming} size="sm">
                                <Play className="mr-2 h-4 w-4" /> Start
                            </Button>
                        ) : (
                            <Button variant="destructive" onClick={() => stopStreaming(true)} disabled={!isStreaming} size="sm">
                                <Square className="mr-2 h-4 w-4" /> Stop
                            </Button>
                        )}
                        <Button variant="outline" onClick={handleAnalysis} disabled={isLoadingAnalysis || !finalTranscript.trim()} size="sm">
                            {isLoadingAnalysis ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Analyze transcript
                        </Button>
                        <span className="text-sm text-muted-foreground">Auto-analyze: every 5s (final transcript)</span>
                    </div>
                    
                    {(isLoadingAnalysis || analysisResult) && <Separator />}

                    {isLoadingAnalysis && !analysisResult && (
                        <div className="flex items-center justify-center p-6 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="ml-4">Analyzing transcript...</span>
                        </div>
                    )}

                    {analysisResult && (
                        <div className="space-y-3 pt-4">
                            <div className="flex items-baseline gap-4">
                                <div className="flex items-center gap-2">
                                   <span className="font-semibold">Risk:</span>
                                   <Badge variant={(analysisResult.risk_level === 'high' || analysisResult.risk_level === 'critical') ? 'destructive' : 'secondary'}>
                                      {analysisResult.risk_level.toUpperCase()}
                                   </Badge>
                                </div>
                                <span className="text-sm text-muted-foreground">score: {analysisResult.risk_score}</span>
                            </div>

                            <div>
                                <h3 className="font-semibold">Summary</h3>
                                <p className="text-sm text-muted-foreground">{analysisResult.summary}</p>
                            </div>

                            {analysisResult.red_flags?.length > 0 && (
                                <div>
                                    <h3 className="font-semibold">Red flags</h3>
                                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                        {analysisResult.red_flags.map((flag, index) => (
                                            <li key={index}>
                                                <span className="font-semibold">{flag.type.replace(/_/g, ' ')} ({flag.severity}):</span> {flag.evidence}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Final transcript</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground min-h-[4rem]">{finalTranscript || "Waiting for final transcript..."}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Partial</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="italic text-muted-foreground min-h-[2rem]">{partialTranscript || '...'}</p>
                </CardContent>
            </Card>
        </div>
    );
}
