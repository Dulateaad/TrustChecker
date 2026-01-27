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
        title: 'Input required',
        description: 'Please enter a URL to analyze.',
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
        throw new Error(errorData.message || 'Failed to analyze link.');
      }

      const result: LinkAnalysisResponse = await response.json();
      setAnalysisResult(result);
    } catch (error) {
      const err = error as Error;
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Link Analysis</h1>
        <p className="text-muted-foreground">
          Enter a URL to check if it's safe or leads to a malicious website.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enter Link</CardTitle>
          <CardDescription>
            Provide the URL you want to analyze in the box below.
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
                {isLoading ? 'Analyzing...' : 'Analyze Link'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <AnalysisResult data={analysisResult} isLoading={isLoading} />
    </div>
  );
}
