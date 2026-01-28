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
        title: 'Input required',
        description: 'Please enter some text to analyze.',
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
        throw new Error(errorData.message || 'Failed to analyze text.');
      }

      const result: TextAnalysisResponse = await response.json();
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
      <div>
        <h1 className="text-3xl font-bold font-headline">Text Analysis</h1>
        <p className="text-muted-foreground">
          Paste any text to check for malicious content, phishing attempts, or scams.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enter Text</CardTitle>
          <CardDescription>
            Paste the text you want to analyze in the field below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., Congratulations! You have won a $1000 gift card. Click here to claim..."
            className="min-h-[150px] resize-y"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isLoading}
          />
          <Button onClick={handleAnalyze} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Analyzing...' : 'Analyze Text'}
          </Button>
        </CardContent>
      </Card>
      
      <AnalysisResult data={analysisResult} isLoading={isLoading} />
    </div>
  );
}
