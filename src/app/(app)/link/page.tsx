'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalysisResult } from '../components/AnalysisResult';
import { useToast } from '@/hooks/use-toast';
import { LinkAnalysisResponse } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function LinkPage() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<LinkAnalysisResponse | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast({
        variant: 'destructive',
        title: 'Требуется ввод',
        description: 'Пожалуйста, введите URL для анализа.',
      });
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/analyze/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Не удалось проанализировать ссылку.');
      }

      const result: LinkAnalysisResponse = await response.json();
      setAnalysisResult(result);
    } catch (error) {
      const err = error as Error;
      toast({
        variant: 'destructive',
        title: 'Анализ не удался',
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Анализ ссылки</h1>
        <p className="text-muted-foreground">
          Введите URL-адрес, чтобы проверить, безопасен ли он и не ведет ли на вредоносный сайт.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Введите ссылку</CardTitle>
          <CardDescription>
            Укажите URL-адрес, который вы хотите проанализировать, в поле ниже.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
            />
            <Button onClick={handleAnalyze} disabled={isLoading} className="whitespace-nowrap">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Анализ...' : 'Анализировать ссылку'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <AnalysisResult data={analysisResult} isLoading={isLoading} />
    </div>
  );
}
