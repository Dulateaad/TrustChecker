'use client';

import { useState } from 'react';
import { FileUpload } from '../components/FileUpload';
import { AnalysisResult } from '../components/AnalysisResult';
import { useToast } from '@/hooks/use-toast';
import { DocumentAnalysisResponse, Pollable } from '@/lib/types';

const acceptedFileTypes = {
  'application/pdf': ['.pdf'],
};

export default function DocumentPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingData, setPollingData] = useState<Pollable | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResponse | null>(null);
  const { toast } = useToast();

  const handleAnalysis = async (payload: { s3Key: string } | Pollable) => {
    setIsLoading(true);
    if ('s3Key' in payload) {
      setAnalysisResult(null);
    }

    try {
      const response = await fetch('/api/analyze/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.status === 202) {
        const result: DocumentAnalysisResponse = await response.json();
        setIsPolling(true);
        setPollingData({ jobId: result.jobId });
        toast({ title: 'Обработка документа', description: 'Документ анализируется. Это может занять некоторое время.' });
      } else if (response.ok) {
        const result: DocumentAnalysisResponse = await response.json();
        setAnalysisResult(result);
        setIsPolling(false);
        setPollingData(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Не удалось проанализировать документ.');
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
          onAnalysisStart={(s3Key) => handleAnalysis({ s3Key, fileType: 'pdf' })}
          setAnalysisLoading={setIsLoading}
          setPolling={setPollingState}
          endpoint="document"
          acceptedFiles={acceptedFileTypes}
          title="Анализ документа"
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
