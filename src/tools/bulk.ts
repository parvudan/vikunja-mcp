/**
 * Bulk operations tools for Vikunja MCP server
 * The Vikunja bulk API updates ONE field across multiple tasks per call.
 * To update multiple fields, call this tool once per field.
 */

import { z } from 'zod';
import type { VikunjaClient } from '../client.js';
import { formatTask } from './helpers.js';

const FIELD_MAP: Record<string, string> = {
  done: 'done',
  priority: 'priority',
  projectId: 'project_id',
  dueDate: 'due_date',
  startDate: 'start_date',
  endDate: 'end_date',
  percentDone: 'percent_done',
  hexColor: 'hex_color',
  repeatAfter: 'repeat_after',
  repeatMode: 'repeat_mode',
  bucketId: 'bucket_id',
  position: 'position',
  isFavorite: 'is_favorite',
  title: 'title',
  description: 'description',
};

const BulkUpdateSchema = z.object({
  taskIds: z.array(z.number()).min(1).describe('Task IDs to update'),
  field: z.enum([
    'done', 'priority', 'projectId', 'dueDate', 'startDate', 'endDate',
    'percentDone', 'hexColor', 'repeatAfter', 'bucketId', 'position',
    'isFavorite', 'title', 'description',
  ]).describe('The single field to update across all tasks'),
  value: z.union([z.string(), z.number(), z.boolean()])
    .describe('New value for the field. For done: true/false. For priority: 0-5. For projectId: numeric ID. For dueDate: ISO 8601 string.'),
});

export async function tasksBulkUpdate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = BulkUpdateSchema.parse(args);

  try {
    const apiField = FIELD_MAP[params.field] ?? params.field;

    const result = await client.bulkUpdateTasks({
      task_ids: params.taskIds,
      field: apiField,
      value: params.value,
    });

    const updatedTasks = Array.isArray(result) ? result : (result as any).tasks ?? [];

    const lines: string[] = [];
    lines.push(`Updated ${params.taskIds.length} task(s)`);
    lines.push(`Field: ${params.field} → ${params.value}`);
    lines.push(`Task IDs: ${params.taskIds.join(', ')}`);

    if (updatedTasks.length > 0) {
      lines.push('');
      lines.push('Updated tasks:');
      updatedTasks.forEach((task: any, i: number) => {
        lines.push(`${i + 1}. ${formatTask(task)}`);
      });
    }

    lines.push('');
    lines.push('TIP: To update multiple fields, call tasks_bulk_update once per field.');

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to bulk update tasks: ${message}`);
  }
}

const BulkUpdateJsonSchema = {
  type: 'object' as const,
  properties: {
    taskIds: {
      type: 'array' as const,
      items: { type: 'number' as const },
      description: 'Array of task IDs to update',
    },
    field: {
      type: 'string' as const,
      enum: [
        'done', 'priority', 'projectId', 'dueDate', 'startDate', 'endDate',
        'percentDone', 'hexColor', 'repeatAfter', 'bucketId', 'position',
        'isFavorite', 'title', 'description',
      ],
      description: 'Single field to update. For multiple fields, call this tool once per field.',
    },
    value: {
      description: 'New value. done=true/false, priority=0-5, projectId=numeric, dueDate=ISO string.',
    },
  },
  required: ['taskIds', 'field', 'value'],
};

export const bulkTools = [
  {
    name: 'tasks_bulk_update',
    description:
      'Update ONE field across multiple tasks in a single call. ' +
      'EXAMPLE: {taskIds: [1,2,3], field: "done", value: true} | {taskIds: [4,5], field: "projectId", value: 7} ' +
      'To update multiple fields, call this tool once per field.',
    inputSchema: BulkUpdateJsonSchema,
  },
];
