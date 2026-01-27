'use client';

import { useState } from 'react';
import { FileUpload } from '../components/FileUpload';
import { AnalysisResult } from '../components/AnalysisResult';
import { useToast } from '@/hooks/use-toast';
import { AudioAnalysisResponse, Pollable } from '@/lib/types';

const acceptedFileTypes = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/mp4': ['.mp4', '.m4a'],
};

export default function AudioPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingData, setPollingData] = useState<Pollable | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysisResponse | null>(null);
  const { toast } = useToast();

  const handleAnalysis = async (payload: { s3Key: string } | Pollable) => {
    setIsLoading(true);
    if ('s3Key' in payload) {
      setAnalysisResult(null);
    }

    try {
      const response = await fetch('/api/analyze/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.status === 202) {
        const result: AudioAnalysisResponse = await response.json();
        setIsPolling(true);
        setPollingData({ transcribe_job: result.transcribe_job });
        toast({ title: 'Обработка аудио', description: 'Аудио транскрибируется и анализируется. Это может занять некоторое время.' });
      } else if (response.ok) {
        const result: AudioAnalysisResponse = await response.json();
        setAnalysisResult(result);
        setIsPolling(false);
        setPollingData(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Не удалось проанализировать аудио.');
      }
    } catch (error) {
      const err = error as Error;
      toast({
        variant: 'destructive',
        title: 'Анализ не удался',
        description: err.message,
      });
      setIsPolling(false);
      setPollingData(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePoll = () => {
    if (pollingData) {
      handleAnalysis(pollingData);
    }
  };

  const setPollingState = (polling: boolean, data?: Pollable) => {
    setIsPolling(polling);
    if(data) setPollingData(data);
  }

  const showUpload = !analysisResult && !isPolling;

  return (
    <div className="space-y-8">
      {showUpload && (
        <FileUpload
          onAnalysisStart={(s3Key) => handleAnalysis({ s3Key })}
          setAnalysisLoading={setIsLoading}
          setPolling={setPollingState}
          endpoint="audio"
          acceptedFiles={acceptedFileTypes}
          title="Анализ аудио"
        />
      )}
      <AnalysisResult 
        data={analysisResult} 
        isLoading={isLoading}
        isPolling={isPolling}
        onPoll={handlePoll}
      />
    </div>
  );
}
