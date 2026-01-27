'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalysisResult } from '../components/AnalysisResult';
import { useToast } from '@/hooks/use-toast';
import { TextAnalysisResponse } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function TextPage() {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TextAnalysisResponse | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast({
        variant: 'destructive',
        title: 'Требуется ввод',
        description: 'Пожалуйста, введите текст для анализа.',
      });
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/analyze/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
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
        <h1 className="text-3xl font-bold font-headline">Анализ текста</h1>
        <p className="text-muted-foreground">
          Вставьте любой текст для проверки на вредоносное содержимое, попытки фишинга или мошенничество.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Введите текст</CardTitle>
          <CardDescription>
            Вставьте текст, который вы хотите проанализировать, в поле ниже.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="например, Поздравляем! Вы выиграли подарочную карту на 1000 долларов. Нажмите здесь, чтобы получить..."
            className="min-h-[150px] resize-y"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isLoading}
          />
          <Button onClick={handleAnalyze} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Анализ...' : 'Анализировать текст'}
          </Button>
        </CardContent>
      </Card>
      
      <AnalysisResult data={analysisResult} isLoading={isLoading} />
    </div>
  );
}
