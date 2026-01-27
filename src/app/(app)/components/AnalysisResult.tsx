'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, Copy, RefreshCw, ChevronDown, ChevronUp, FileText, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { AnalysisResponse, RedFlag, RiskLevel } from '@/lib/types';
import { generateSafeReply, GenerateSafeReplyInput } from '@/ai/flows/generate-safe-reply';
import { Separator } from '@/components/ui/separator';

type AnalysisResultProps = {
  data: AnalysisResponse | null;
  isLoading: boolean;
  isPolling?: boolean;
  onPoll?: () => void;
};

const riskLevelConfig: Record<
  RiskLevel,
  { color: string; darkColor: string; icon: React.ElementType }
> = {
  low: { color: 'bg-green-100 text-green-800', darkColor: 'dark:bg-green-900 dark:text-green-300', icon: CheckCircle },
  medium: { color: 'bg-yellow-100 text-yellow-800', darkColor: 'dark:bg-yellow-900 dark:text-yellow-300', icon: AlertTriangle },
  high: { color: 'bg-orange-100 text-orange-800', darkColor: 'dark:bg-orange-900 dark:text-orange-300', icon: AlertTriangle },
  critical: { color: 'bg-red-100 text-red-800', darkColor: 'dark:bg-red-900 dark:text-red-300', icon: AlertTriangle },
};

const RedFlagSeverityIcon = ({ severity }: { severity: RiskLevel }) => {
  const Icon = riskLevelConfig[severity]?.icon || Info;
  const colorClass = {
    low: 'text-green-500',
    medium: 'text-yellow-500',
    high: 'text-orange-500',
    critical: 'text-red-500',
  }[severity];
  return <Icon className={`h-5 w-5 ${colorClass}`} />;
};

export function AnalysisResult({ data, isLoading, isPolling, onPoll }: AnalysisResultProps) {
  const { toast } = useToast();
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [currentSafeReply, setCurrentSafeReply] = useState(data?.safe_reply);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to Clipboard',
      description: `${type} has been copied.`,
    });
  };

  const handleRegenerateReply = async () => {
    if (!data) return;
    setIsGeneratingReply(true);
    try {
      const input: GenerateSafeReplyInput = {
        analysisSummary: data.summary,
        recommendedActions: data.recommended_actions,
      };
      const result = await generateSafeReply(input);
      setCurrentSafeReply(result.safeReply);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Generating Reply',
        description: 'Could not generate a new safe reply.',
      });
    } finally {
      setIsGeneratingReply(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  
  if (isPolling) {
    return (
        <Card className="text-center">
            <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    Analysis in Progress
                </CardTitle>
                <CardDescription>
                    The file is being processed. This may take a moment.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">You can wait or click the button below to check the status.</p>
            </CardContent>
            <CardFooter className="justify-center">
                <Button onClick={onPoll}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check Status
                </Button>
            </CardFooter>
        </Card>
    )
  }

  if (!data) {
    return null;
  }
  
  const RiskLevelBadge = riskLevelConfig[data.risk_level];
  const RiskIcon = RiskLevelBadge.icon;

  const extractedText = (data as any).extracted_text || (data as any).transcript_text;

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle className="font-headline text-2xl">Risk Assessment</CardTitle>
                    <CardDescription>Overall risk detected from the provided input.</CardDescription>
                </div>
                 <Button variant="ghost" size="sm" onClick={() => copyToClipboard(JSON.stringify(data, null, 2), 'JSON response')}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy JSON
                </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="flex flex-col items-center justify-center text-center p-6 rounded-lg bg-muted">
                    <div className="font-bold text-7xl font-headline" style={{color: `hsl(var(--${data.risk_level === 'high' || data.risk_level === 'critical' ? 'destructive' : data.risk_level === 'medium' ? 'primary' : 'foreground'}))`}}>
                        {data.risk_score}
                    </div>
                    <p className="text-muted-foreground">Risk Score (0-100)</p>
                </div>
                <div className="md:col-span-2 space-y-4">
                    <div className={`flex items-center gap-3 rounded-md p-4 ${RiskLevelBadge.color} ${RiskLevelBadge.darkColor}`}>
                        <RiskIcon className="h-8 w-8" />
                        <div>
                            <p className="font-bold text-lg capitalize">{data.risk_level} Risk</p>
                            <p className="text-sm">{data.summary}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {data.red_flags && data.red_flags.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>Red Flags</CardTitle>
                    <CardDescription>Specific issues and concerns identified during analysis.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {data.red_flags.map((flag, index) => (
                            <li key={index} className="flex gap-4">
                                <RedFlagSeverityIcon severity={flag.severity} />
                                <div className="flex-1">
                                    <p className="font-semibold capitalize">{flag.type.replace(/_/g, ' ')}</p>
                                    <p className="text-sm text-muted-foreground">{flag.evidence}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        )}

        {data.recommended_actions && data.recommended_actions.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CheckCircle className="text-green-600"/>Recommended Actions</CardTitle>
                    <CardDescription>Follow these steps to stay safe.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ul className="space-y-3">
                        {data.recommended_actions.map((action, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                                <span>{action}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        )}

        {(currentSafeReply || data.safe_reply) && (
            <Card>
                <CardHeader>
                    <CardTitle>Suggested Safe Reply</CardTitle>
                    <CardDescription>A safe and neutral response you can use.</CardDescription>
                </CardHeader>
                <CardContent>
                    <blockquote className="border-l-4 border-primary pl-4 py-2 bg-muted">
                        <p className="italic text-muted-foreground">{currentSafeReply || data.safe_reply}</p>
                    </blockquote>
                </CardContent>
                <CardFooter className="gap-2">
                    <Button onClick={() => copyToClipboard(currentSafeReply || data.safe_reply || '', 'Safe reply')}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Reply
                    </Button>
                    <Button variant="outline" onClick={handleRegenerateReply} disabled={isGeneratingReply}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isGeneratingReply ? 'animate-spin' : ''}`} />
                        {isGeneratingReply ? 'Generating...' : 'Regenerate'}
                    </Button>
                </CardFooter>
            </Card>
        )}

        {extractedText && (
            <Collapsible>
                <Card>
                    <CollapsibleTrigger asChild>
                        <div className='flex items-center justify-between p-4 cursor-pointer'>
                            <div className='flex items-center gap-2'>
                                <FileText className="h-5 w-5" />
                                <h3 className="font-semibold">Extracted Content</h3>
                            </div>
                            <Button variant="ghost" size="sm" className="w-9 p-0">
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                <span className="sr-only">Toggle</span>
                            </Button>
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <Separator />
                        <div className="p-6">
                            <pre className="text-sm bg-muted rounded-md p-4 whitespace-pre-wrap font-code">{extractedText}</pre>
                        </div>
                    </CollapsibleContent>
                </Card>
            </Collapsible>
        )}
    </div>
  );
}
