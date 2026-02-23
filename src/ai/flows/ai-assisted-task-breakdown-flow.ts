'use server';
/**
 * @fileOverview Este archivo implementa un flujo de Genkit para desglosar una tarea grande en sub-tareas pequeñas y accionables.
 *
 * - aiAssistedTaskBreakdown - Una función que maneja el proceso de desglose de tareas.
 * - TaskBreakdownInput - El tipo de entrada para la función aiAssistedTaskBreakdown.
 * - TaskBreakdownOutput - El tipo de retorno para la función aiAssistedTaskBreakdown.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TaskBreakdownInputSchema = z.object({
  largeTaskDescription: z
    .string()
    .describe('Una descripción detallada de la tarea grande o compleja a desglosar.'),
});
export type TaskBreakdownInput = z.infer<typeof TaskBreakdownInputSchema>;

const TaskBreakdownOutputSchema = z.object({
  subTasks: z
    .array(z.string())
    .describe('Una lista de sub-tareas pequeñas y accionables derivadas de la tarea principal.'),
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
  prompt: `Eres un experto asistente de productividad especializado en la metodología GTD y la técnica Pomodoro.

Tu objetivo es desglosar la siguiente tarea compleja en una lista de sub-tareas pequeñas, concisas y 100% accionables en ESPAÑOL. 

Cada sub-tarea debe poder completarse en menos de un Pomodoro (25 minutos).

Tarea principal: {{{largeTaskDescription}}}`,
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
