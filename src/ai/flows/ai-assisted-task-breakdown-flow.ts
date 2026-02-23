'use server';
/**
 * @fileOverview This file implements a Genkit flow for breaking down a large task into smaller, actionable sub-tasks.
 *
 * - aiAssistedTaskBreakdown - A function that handles the task breakdown process.
 * - TaskBreakdownInput - The input type for the aiAssistedTaskBreakdown function.
 * - TaskBreakdownOutput - The return type for the aiAssistedTaskBreakdown function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TaskBreakdownInputSchema = z.object({
  largeTaskDescription: z
    .string()
    .describe('A detailed description of the large or complex task to be broken down.'),
});
export type TaskBreakdownInput = z.infer<typeof TaskBreakdownInputSchema>;

const TaskBreakdownOutputSchema = z.object({
  subTasks: z
    .array(z.string())
    .describe('A list of smaller, actionable sub-tasks derived from the large task.'),
});
export type TaskBreakdownOutput = z.infer<typeof TaskBreakdownOutputSchema>;

export async function aiAssistedTaskBreakdown(
  input: TaskBreakdownInput
): Promise<TaskBreakdownOutput> {
  return taskBreakdownFlow(input);
}

const taskBreakdownPrompt = ai.definePrompt({
  name: 'taskBreakdownPrompt',
  input: {schema: TaskBreakdownInputSchema},
  output: {schema: TaskBreakdownOutputSchema},
  prompt: `You are a helpful assistant designed to break down large tasks into smaller, actionable sub-tasks.

Break down the following large task into a list of concise, actionable sub-tasks. Ensure each sub-task is clear and manageable.

Large Task: {{{largeTaskDescription}}}`,
});

const taskBreakdownFlow = ai.defineFlow(
  {
    name: 'taskBreakdownFlow',
    inputSchema: TaskBreakdownInputSchema,
    outputSchema: TaskBreakdownOutputSchema,
  },
  async (input) => {
    const {output} = await taskBreakdownPrompt(input);
    return output!;
  }
);
