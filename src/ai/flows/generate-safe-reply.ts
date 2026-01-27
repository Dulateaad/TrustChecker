'use server';

/**
 * @fileOverview An AI agent for generating safe replies based on analysis results.
 *
 * - generateSafeReply - A function that generates a safe reply.
 * - GenerateSafeReplyInput - The input type for the generateSafeReply function.
 * - GenerateSafeReplyOutput - The return type for the generateSafeReply function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSafeReplyInputSchema = z.object({
  analysisSummary: z
    .string()
    .describe('The analysis summary from the TrustCheck backend.'),
  recommendedActions: z
    .array(z.string())
    .describe('The recommended actions from the TrustCheck backend.'),
});

export type GenerateSafeReplyInput = z.infer<typeof GenerateSafeReplyInputSchema>;

const GenerateSafeReplyOutputSchema = z.object({
  safeReply: z
    .string()
    .describe('A safe reply generated based on the analysis results.'),
});

export type GenerateSafeReplyOutput = z.infer<typeof GenerateSafeReplyOutputSchema>;

export async function generateSafeReply(
  input: GenerateSafeReplyInput
): Promise<GenerateSafeReplyOutput> {
  return generateSafeReplyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSafeReplyPrompt',
  input: {schema: GenerateSafeReplyInputSchema},
  output: {schema: GenerateSafeReplyOutputSchema},
  prompt: `You are a helpful assistant designed to generate safe replies based on a security analysis.

  Given the following analysis summary and recommended actions, generate a safe and professional reply.

  Analysis Summary: {{{analysisSummary}}}
  Recommended Actions: {{#each recommendedActions}}\n- {{{this}}}{{/each}}\n
  Safe Reply:`,
});

const generateSafeReplyFlow = ai.defineFlow(
  {
    name: 'generateSafeReplyFlow',
    inputSchema: GenerateSafeReplyInputSchema,
    outputSchema: GenerateSafeReplyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
