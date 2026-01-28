'use client';

import { useState } from 'react';
import { FileUpload } from '../components/FileUpload';
import { AnalysisResult } from '../components/AnalysisResult';
import { useToast } from '@/hooks/use-toast';
import { ImageAnalysisResponse } from '@/lib/types';

const acceptedFileTypes = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

export default function ImagePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResponse | null>(null);
  const { toast } = useToast();

  const handleAnalysisStart = async (s3Key: string) => {
    setAnalysisResult(null);
    try {
      const response = await fetch('/api/analyze/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze the image.');
      }

      const result: ImageAnalysisResponse = await response.json();
      setAnalysisResult(result);
    } catch (error) {
      const err = error as Error;
      toast({
        variant: 'destructive',
        title: 'Analysis failed',
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {!analysisResult && (
        <FileUpload
          onAnalysisStart={handleAnalysisStart}
          setAnalysisLoading={setIsLoading}
          setPolling={() => {}}
          endpoint="image"
          acceptedFiles={acceptedFileTypes}
          title="Image Analysis"
        />
      )}
      <AnalysisResult data={analysisResult} isLoading={isLoading} />
    </div>
  );
}
