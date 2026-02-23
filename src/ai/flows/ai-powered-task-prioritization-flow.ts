'use server';
/**
 * @fileOverview An AI agent for prioritizing tasks based on deadlines, effort, and user energy levels.
 *
 * - prioritizeTasks - A function that handles the task prioritization process.
 * - AIPoweredTaskPrioritizationInput - The input type for the prioritizeTasks function.
 * - AIPoweredTaskPrioritizationOutput - The return type for the prioritizeTasks function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TaskSchema = z.object({
  id: z.string().describe('Unique identifier for the task.'),
  name: z.string().describe('The name or description of the task.'),
  deadline: z.string().describe('The deadline for the task (e.g., 