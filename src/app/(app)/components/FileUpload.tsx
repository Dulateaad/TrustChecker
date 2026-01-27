'use client';

import { useState, useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadCloud, File as FileIcon, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { UploadUrlResponse } from '@/lib/types';

interface FileUploadProps {
  onAnalysisStart: (s3Key: string, pollingData?: any) => void;
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getFileExtension = (filename: string) => {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
  };

  const handleUpload = async (selectedFile: File) => {
    setFile(selectedFile);
    setStatus('uploading');
    setUploadProgress(0);
    setError(null);

    try {
      // 1. Get presigned URL
      const ext = getFileExtension(selectedFile.name);
      const uploadUrlRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: selectedFile.type, ext }),
      });

      if (!uploadUrlRes.ok) {
        throw new Error('Не удалось получить URL для загрузки.');
      }
      const { uploadUrl, s3Key }: UploadUrlResponse = await uploadUrlRes.json();

      // 2. Upload file to S3 with progress
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          setStatus('success');
          setUploadProgress(100);
          toast({ title: 'Загрузка завершена', description: 'Начинается анализ...' });
          setAnalysisLoading(true);

          const payload: any = { s3Key };
          if (endpoint === 'document') {
            payload.fileType = ext;
          }

          onAnalysisStart(s3Key);
        } else {
          throw new Error('Загрузка файла не удалась.');
        }
      };

      xhr.onerror = () => {
        throw new Error('Произошла ошибка во время загрузки.');
      };
      
      xhr.setRequestHeader('Content-Type', selectedFile.type);
      xhr.send(selectedFile);

    } catch (e) {
      const err = e as Error;
      setStatus('error');
      setError(err.message);
      toast({ variant: 'destructive', title: 'Ошибка загрузки', description: err.message });
      reset();
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
        toast({
            variant: "destructive",
            title: "Тип файла не поддерживается",
            description: `Пожалуйста, загрузите один из следующих типов файлов: ${Object.values(acceptedFiles).flat().join(', ')}`
        })
        return;
    }
    if (acceptedFiles.length > 0) {
      handleUpload(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFiles,
    multiple: false,
  });

  const reset = () => {
    setFile(null);
    setUploadProgress(null);
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

            {uploadProgress !== null && (
              <div className="mt-4 space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-muted-foreground text-center">
                  {status === 'uploading' ? `Загрузка... ${Math.round(uploadProgress)}%` : 'Загрузка завершена!'}
                </p>
              </div>
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
