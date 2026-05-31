/**
 * Task relation management tools for Vikunja MCP server
 * Implements: create, delete operations for task relationships
 */

import { z } from 'zod';
import type { VikunjaClient } from '../client.js';
import { RelationKind } from '../types.js';

// =============================================================================
// Zod Schemas (for runtime validation)
// =============================================================================

const RelationCreateSchema = z.object({
  taskId: z.number().describe(
    'The PRIMARY task ID — direction depends on relationKind. ' +
    'For "subtask": taskId is the PARENT, otherTaskId becomes the child/subtask. ' +
    'For "parenttask": taskId is the CHILD, otherTaskId becomes its parent. ' +
    'For "blocking": taskId blocks otherTaskId. ' +
    'Example to make task 20 a subtask of task 5: taskId=5, otherTaskId=20, relationKind="subtask".'
  ),
  otherTaskId: z.number().describe(
    'The SECONDARY task ID. ' +
    'For "subtask": this task becomes the child (subtask) of taskId. ' +
    'For "parenttask": this task becomes the parent of taskId.'
  ),
  relationKind: z.enum([
    'subtask',
    'parenttask',
    'related',
    'duplicateof',
    'duplicates',
    'blocking',
    'blocked',
    'precedes',
    'follows',
    'copiedfrom',
    'copiedto',
  ]).describe(
    'Type of relationship. ' +
    '"subtask" = otherTaskId is a child of taskId. ' +
    '"parenttask" = otherTaskId is the parent of taskId. ' +
    '"related" = bidirectional loose relation.'
  ),
});

const RelationDeleteSchema = z.object({
  taskId: z.number().describe('Source task ID'),
  otherTaskId: z.number().describe('Related task ID'),
  relationKind: z.enum([
    'subtask',
    'parenttask',
    'related',
    'duplicateof',
    'duplicates',
    'blocking',
    'blocked',
    'precedes',
    'follows',
    'copiedfrom',
    'copiedto',
  ]).describe('Type of relationship to remove'),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format relation kind as human-readable text
 */
function formatRelationKind(kind: string): string {
  const descriptions: Record<string, string> = {
    subtask: 'is a subtask of',
    parenttask: 'is a parent task of',
    related: 'is related to',
    duplicateof: 'is a duplicate of',
    duplicates: 'duplicates',
    blocking: 'is blocking',
    blocked: 'is blocked by',
    precedes: 'precedes (comes before)',
    follows: 'follows (comes after)',
    copiedfrom: 'was copied from',
    copiedto: 'was copied to',
  };

  return descriptions[kind] || kind;
}

/**
 * Get relation kind explanation
 */
function getRelationExplanation(kind: string): string {
  const explanations: Record<string, string> = {
    subtask: 'Task A is a subtask of Task B (Task B contains Task A)',
    parenttask: 'Task A is a parent of Task B (Task A contains Task B)',
    related: 'Tasks are related but have no specific dependency',
    duplicateof: 'Task A is a duplicate of Task B',
    duplicates: 'Task A duplicates Task B',
    blocking: 'Task A blocks Task B (Task B cannot complete until Task A is done)',
    blocked: 'Task A is blocked by Task B (Task A cannot complete until Task B is done)',
    precedes: 'Task A must be done before Task B can start',
    follows: 'Task A can only start after Task B is done',
    copiedfrom: 'Task A was copied from Task B',
    copiedto: 'Task A was copied to Task B',
  };

  return explanations[kind] || 'Relationship type';
}

// =============================================================================
// Tool Functions
// =============================================================================

/**
 * Create a relation between two tasks
 */
export async function relationCreate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = RelationCreateSchema.parse(args);

  try {
    // Get both tasks to show their titles
    const [task1, task2] = await Promise.all([
      client.getTask(params.taskId),
      client.getTask(params.otherTaskId),
    ]);

    // Create the relation
    await client.createRelation(params.taskId, {
      other_task_id: params.otherTaskId,
      relation_kind: params.relationKind,
    });

    const lines: string[] = [];
    lines.push(`Created relationship`);
    lines.push('');

    // Use explicit role labels to avoid ambiguity
    if (params.relationKind === 'subtask') {
      lines.push(`PARENT: "${task1.title}" (ID: ${params.taskId})`);
      lines.push(`SUBTASK (child): "${task2.title}" (ID: ${params.otherTaskId})`);
    } else if (params.relationKind === 'parenttask') {
      lines.push(`CHILD: "${task1.title}" (ID: ${params.taskId})`);
      lines.push(`PARENT: "${task2.title}" (ID: ${params.otherTaskId})`);
    } else {
      lines.push(`Task A: "${task1.title}" (ID: ${params.taskId})`);
      lines.push(`  ${formatRelationKind(params.relationKind)}`);
      lines.push(`Task B: "${task2.title}" (ID: ${params.otherTaskId})`);
    }

    lines.push('');
    lines.push('TIP: Use task_get to confirm the relation appears correctly.');

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create relation: ${message}`);
  }
}

/**
 * Delete a relation between two tasks
 */
export async function relationDelete(client: VikunjaClient, args: unknown): Promise<string> {
  const params = RelationDeleteSchema.parse(args);

  try {
    // Get both tasks to show their titles
    const [task1, task2] = await Promise.all([
      client.getTask(params.taskId),
      client.getTask(params.otherTaskId),
    ]);

    // Delete the relation
    await client.deleteRelation(params.taskId, params.relationKind, params.otherTaskId);

    const lines: string[] = [];
    lines.push(`Removed relationship between tasks`);
    lines.push('');
    lines.push(`Task A: "${task1.title}" (ID: ${params.taskId})`);
    lines.push(`  no longer ${formatRelationKind(params.relationKind)}`);
    lines.push(`Task B: "${task2.title}" (ID: ${params.otherTaskId})`);
    lines.push('');
    lines.push(`Removed: ${params.relationKind} relationship`);

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete relation: ${message}`);
  }
}

// =============================================================================
// JSON Schema Definitions (manually defined for MCP compatibility)
// =============================================================================

const RelationCreateJsonSchema = {
  type: 'object' as const,
  properties: {
    taskId: {
      type: 'number' as const,
      description: 'PRIMARY task. For "subtask": this is the PARENT. For "parenttask": this is the CHILD. Example: to make task 20 a subtask of task 5, use taskId=5, otherTaskId=20, relationKind="subtask".',
    },
    otherTaskId: {
      type: 'number' as const,
      description: 'SECONDARY task. For "subtask": this task becomes the child/subtask. For "parenttask": this task becomes the parent.',
    },
    relationKind: {
      type: 'string' as const,
      enum: [
        'subtask',
        'parenttask',
        'related',
        'duplicateof',
        'duplicates',
        'blocking',
        'blocked',
        'precedes',
        'follows',
        'copiedfrom',
        'copiedto',
      ],
      description: '"subtask" = otherTaskId becomes a child of taskId. "parenttask" = otherTaskId becomes the parent of taskId. "related" = bidirectional loose link.',
    },
  },
  required: ['taskId', 'otherTaskId', 'relationKind'],
};

const RelationDeleteJsonSchema = {
  type: 'object' as const,
  properties: {
    taskId: {
      type: 'number' as const,
      description: 'PRIMARY task ID — same value used when the relation was created.',
    },
    otherTaskId: {
      type: 'number' as const,
      description: 'SECONDARY task ID — same value used when the relation was created.',
    },
    relationKind: {
      type: 'string' as const,
      enum: [
        'subtask',
        'parenttask',
        'related',
        'duplicateof',
        'duplicates',
        'blocking',
        'blocked',
        'precedes',
        'follows',
        'copiedfrom',
        'copiedto',
      ],
      description: 'Exact relation kind to remove — must match what was used when creating.',
    },
  },
  required: ['taskId', 'otherTaskId', 'relationKind'],
};

// =============================================================================
// Tool Definitions Export
// =============================================================================

export const relationTools = [
  {
    name: 'relation_create',
    description:
      'Create a relationship between two tasks. Types: subtask, blocking, precedes, related. ' +
      'WHEN TO USE: Linking dependent tasks, creating subtasks, tracking blockers. ' +
      'EXAMPLE: {taskId: 10, otherTaskId: 15, relationKind: "blocking"}',
    inputSchema: RelationCreateJsonSchema,
  },
  {
    name: 'relation_delete',
    description:
      'Remove a relationship between two tasks. Requires exact relation type.',
    inputSchema: RelationDeleteJsonSchema,
  },
];
