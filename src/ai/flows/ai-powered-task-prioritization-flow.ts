'use server';
/**
 * @fileOverview Un agente de IA para priorizar tareas basado en fechas límite, esfuerzo y niveles de energía del usuario.
 *
 * - prioritizeTasks - Una función que maneja el proceso de priorización de tareas.
 * - AIPoweredTaskPrioritizationInput - El tipo de entrada para la función prioritizeTasks.
 * - AIPoweredTaskPrioritizationOutput - El tipo de retorno para la función prioritizeTasks.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TaskSchema = z.object({
  id: z.string().describe('Identificador único de la tarea.'),
  title: z.string().describe('El título o nombre de la tarea.'),
  priority: z.string().describe('Nivel de prioridad actual (Alta, Media, Baja).'),
  deadline: z.string().describe('Fecha límite de la tarea.'),
  effort: z.number().describe('Esfuerzo estimado en sesiones Pomodoro.'),
});

const AIPoweredTaskPrioritizationInputSchema = z.object({
  tasks: z.array(TaskSchema).describe('La lista de tareas a priorizar.'),
  userEnergyLevel: z.string().describe('Nivel de energía actual del usuario (Alto, Medio, Bajo).'),
});
export type AIPoweredTaskPrioritizationInput = z.infer<typeof AIPoweredTaskPrioritizationInputSchema>;

const AIPoweredTaskPrioritizationOutputSchema = z.object({
  prioritizedTaskIds: z.array(z.string()).describe('Los IDs de las tareas en el orden recomendado.'),
  reasoning: z.string().describe('Explicación de por qué se eligió este orden.'),
});
export type AIPoweredTaskPrioritizationOutput = z.infer<typeof AIPoweredTaskPrioritizationOutputSchema>;

export async function prioritizeTasks(
  input: AIPoweredTaskPrioritizationInput
): Promise<AIPoweredTaskPrioritizationOutput> {
  return prioritizationFlow(input);
}

const prioritizationPrompt = ai.definePrompt({
  name: 'prioritizationPrompt',
  input: { schema: AIPoweredTaskPrioritizationInputSchema },
  output: { schema: AIPoweredTaskPrioritizationOutputSchema },
  prompt: `Eres un experto coach de productividad especializado en la técnica Pomodoro.

Tu objetivo es organizar las siguientes tareas de la manera más eficiente posible, considerando la fecha límite, el esfuerzo necesario y el nivel de energía actual del usuario.

Nivel de Energía del Usuario: {{{userEnergyLevel}}}

Tareas a organizar:
{{#each tasks}}
- [ID: {{id}}] {{title}} (Prioridad: {{priority}}, Vence: {{deadline}}, Esfuerzo: {{effort}} Pomodoros)
{{/each}}

Por favor, devuelve el orden recomendado de los IDs de las tareas y una breve explicación en español del razonamiento detrás de esta prioridad.`,
});

const prioritizationFlow = ai.defineFlow(
  {
    name: 'prioritizationFlow',
    inputSchema: AIPoweredTaskPrioritizationInputSchema,
    outputSchema: AIPoweredTaskPrioritizationOutputSchema,
  },
  async (input) => {
    const { output } = await prioritizationPrompt(input);
    return output!;
  }
);
