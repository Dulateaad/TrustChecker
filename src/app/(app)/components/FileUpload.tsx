'use client';

import { useState, useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadCloud, File as FileIcon, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploadProps {
  onAnalysisStart: (s3Key: string) => void;
  setAnalysisLoading: (isLoading: boolean) => void;
  setPolling: (isPolling: boolean, pollingData?: any) => void;
  endpoint: 'image' | 'document' | 'audio';
  acceptedFiles: Record<string, string[]>;
  title: string;
}

export function FileUpload({
  onAnalysisStart,
  setAnalysisLoading,
  setPolling,
  endpoint,
  acceptedFiles,
  title,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleUpload = async (selectedFile: File) => {
    setFile(selectedFile);
    setStatus('uploading');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Upload via our proxy to avoid CORS
      const response = await fetch('/api/upload-proxy', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Произошла ошибка во время загрузки.');
      }

      setStatus('success');
      setAnalysisLoading(true);
      onAnalysisStart(result.s3Key);
    } catch (e) {
      const err = e as Error;
      setStatus('error');
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Ошибка загрузки',
        description: err.message,
      });
    }
  };

  const onDrop = useCallback((droppedAcceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
        toast({
            variant: "destructive",
            title: "Тип файла не поддерживается",
            description: `Пожалуйста, загрузите один из следующих типов файлов: ${Object.values(acceptedFiles).flat().join(', ')}`
        })
        return;
    }
    if (droppedAcceptedFiles.length > 0) {
      handleUpload(droppedAcceptedFiles[0]);
    }
  }, [acceptedFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFiles,
    multiple: false,
  });

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setError(null);
    setAnalysisLoading(false);
    setPolling(false);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold font-headline">{title}</h1>
      <p className="text-muted-foreground">
        Загрузите файл для анализа рисков. Мы проверим его на наличие угроз и предоставим отчет о безопасности.
      </p>

      {status === 'idle' && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed border-muted-foreground/30 rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors',
            isDragActive && 'border-primary bg-accent'
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <UploadCloud className="h-12 w-12 text-muted-foreground" />
            <p className="font-semibold">
              {isDragActive ? 'Перетащите файл сюда' : 'Перетащите файл сюда или нажмите, чтобы выбрать'}
            </p>
            <p className="text-sm text-muted-foreground">
              Допустимые файлы: {Object.values(acceptedFiles).flat().join(', ')}
            </p>
          </div>
        </div>
      )}

      {file && status !== 'idle' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <FileIcon className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {Math.round(file.size / 1024)} KB
                </p>
              </div>
              {status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin" />}
              {status === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
            </div>
            
            {status === 'uploading' && (
                <p className="text-sm text-muted-foreground text-center mt-4">Загрузка...</p>
            )}

            {status === 'error' && (
                <p className='text-sm text-destructive mt-2 text-center'>{error}</p>
            )}
            <div className='mt-4 flex justify-center'>
                 <Button variant="outline" onClick={reset} disabled={status === 'uploading'}>
                    Анализировать другой файл
                </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
