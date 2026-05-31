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
  ]).describe('Type of relationship'),
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
    lines.push(`Created relationship between tasks`);
    lines.push('');
    lines.push(`Task A: "${task1.title}" (ID: ${params.taskId})`);
    lines.push(`  ${formatRelationKind(params.relationKind)}`);
    lines.push(`Task B: "${task2.title}" (ID: ${params.otherTaskId})`);
    lines.push('');
    lines.push(`Relationship: ${getRelationExplanation(params.relationKind)}`);
    lines.push('');
    lines.push('TIP: Use tasks_get with the task ID to see all related tasks.');

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
      description: 'Source task ID',
    },
    otherTaskId: {
      type: 'number' as const,
      description: 'Related task ID',
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
      description: 'Type of relationship: subtask, parenttask, related, duplicateof, duplicates, blocking, blocked, precedes, follows, copiedfrom, copiedto',
    },
  },
  required: ['taskId', 'otherTaskId', 'relationKind'],
};

const RelationDeleteJsonSchema = {
  type: 'object' as const,
  properties: {
    taskId: {
      type: 'number' as const,
      description: 'Source task ID',
    },
    otherTaskId: {
      type: 'number' as const,
      description: 'Related task ID',
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
      description: 'Type of relationship to remove',
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
