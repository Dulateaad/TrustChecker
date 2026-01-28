'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnalysisResult } from '../components/AnalysisResult';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Square } from 'lucide-react';
import { TextAnalysisResponse } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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
    const socketRef = useRef<Socket | null>(null);
    const [status, setStatus] = useState('idle');
    const [isStreaming, setIsStreaming] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [partialTranscript, setPartialTranscript] = useState('');
    const [finalTranscript, setFinalTranscript] = useState('');
    const [analysisResult, setAnalysisResult] = useState<TextAnalysisResponse | null>(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
    const lastAnalyzedTextRef = useRef('');

    const { toast } = useToast();

    const stopStreaming = useCallback(() => {
        setIsStreaming(false);

        if (socketRef.current?.connected) {
            socketRef.current.emit('stop');
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scriptNodeRef.current) {
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

        newSocket.on('connect', () => {
            console.log('Socket connected');
            setIsConnected(true);
        });
        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
            if (isStreaming) {
                stopStreaming();
            }
        });
        newSocket.on('status', (data) => setStatus(data.state));
        newSocket.on('transcript', ({ text, isPartial }) => {
            if (isPartial) {
                setPartialTranscript(text);
            } else if (text) {
                setPartialTranscript('');
                setFinalTranscript(prev => prev ? `${prev.trim()} ${text.trim()}`.trim() : text.trim());
            }
        });
        newSocket.on('error', (error) => {
            toast({ variant: 'destructive', title: 'Streaming Error', description: error.message });
            stopStreaming();
        });

        return () => {
            newSocket.disconnect();
            socketRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAnalysis = useCallback(async () => {
        if (!finalTranscript.trim()) {
            toast({ title: 'Нечего анализировать', description: 'Транскрипция пуста.' });
            return;
        }

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
                throw new Error(errorData.message || 'Не удалось проанализировать текст.');
            }

            const result: TextAnalysisResponse = await response.json();
            setAnalysisResult(result);
        } catch (error) {
            const err = error as Error;
            toast({
                variant: 'destructive',
                title: 'Ошибка анализа',
                description: err.message,
            });
        } finally {
            setIsLoadingAnalysis(false);
        }
    }, [finalTranscript, toast]);

    useEffect(() => {
        const handle = setInterval(() => {
            if (finalTranscript && finalTranscript.length >= 30 && finalTranscript !== lastAnalyzedTextRef.current) {
                handleAnalysis();
            }
        }, 5000);
        return () => clearInterval(handle);
    }, [finalTranscript, handleAnalysis]);

    const startStreaming = useCallback(async () => {
        if (isStreaming || !socketRef.current) return;

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
                if(!isStreaming) return;
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
                title: 'Микрофон не доступен',
                description: 'Пожалуйста, разрешите доступ к микрофону в настройках вашего браузера.',
            });
            if (isStreaming) {
                stopStreaming();
            }
        }
    }, [isStreaming, toast, stopStreaming]);

    const statusMap: Record<string, { text: string; color: string; }> = {
        idle: { text: "Ожидание", color: "bg-gray-500" },
        starting: { text: "Подключение...", color: "bg-yellow-500" },
        streaming: { text: "В эфире...", color: "bg-green-500 animate-pulse" },
        stopping: { text: "Остановка...", color: "bg-yellow-500" },
        ended: { text: "Завершено", color: "bg-red-500" },
    };
    
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Анализ в реальном времени</h1>
                <p className="text-muted-foreground">
                    Начните транскрипцию для анализа речи на наличие потенциальных рисков в реальном времени.
                </p>
            </div>
            
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Транскрипция</CardTitle>
                        <div className="flex items-center gap-2">
                             <Badge variant="outline" className={`transition-colors ${statusMap[status]?.color || 'bg-gray-500'}`}>
                                {statusMap[status]?.text || 'Неизвестно'}
                            </Badge>
                            {!isStreaming ? (
                                <Button onClick={startStreaming} disabled={isStreaming || !isConnected}>
                                    <Play className="mr-2 h-4 w-4" /> Старт
                                </Button>
                            ) : (
                                <Button variant="destructive" onClick={stopStreaming} disabled={!isStreaming}>
                                    <Square className="mr-2 h-4 w-4" /> Стоп
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {hasMicPermission === false && (
                        <Alert variant="destructive">
                            <AlertTitle>Требуется доступ к микрофону</AlertTitle>
                            <AlertDescription>
                                Пожалуйста, включите доступ к микрофону в настройках браузера, чтобы использовать эту функцию.
                            </AlertDescription>
                        </Alert>
                    )}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Частичная транскрипция (в реальном времени)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="italic text-muted-foreground min-h-[2rem]">
                                {partialTranscript || '...'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Полная транскрипция</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="min-h-[6rem]">{finalTranscript || "Пока нет полной транскрипции."}</p>
                        </CardContent>
                    </Card>
                    <div className="flex justify-start">
                        <Button onClick={handleAnalysis} disabled={isLoadingAnalysis || !finalTranscript.trim()}>
                            {isLoadingAnalysis && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Анализировать транскрипцию
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {(isLoadingAnalysis && !analysisResult) && (
                 <div className="text-center p-8">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Анализ...</p>
                </div>
            )}
            
            {analysisResult && (
                <AnalysisResult data={analysisResult} isLoading={isLoadingAnalysis} />
            )}
        </div>
    );
}
