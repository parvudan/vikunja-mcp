/**
 * Assignee management tools for Vikunja MCP server
 * Implements: list, add, add bulk, remove operations for task assignees
 */

import { z } from 'zod';
import type { VikunjaClient } from '../client.js';

// =============================================================================
// Zod Schemas (for runtime validation)
// =============================================================================

const AssigneesListSchema = z.object({
  taskId: z.number().describe('Task ID to get assignees for'),
});

const AssigneeAddSchema = z.object({
  taskId: z.number().describe('Task ID to assign user to'),
  userId: z.number().describe('User ID to assign'),
});

const AssigneeAddBulkSchema = z.object({
  taskId: z.number().describe('Task ID to assign users to'),
  userIds: z.array(z.number()).min(1).describe('Array of user IDs to assign'),
});

const AssigneeRemoveSchema = z.object({
  taskId: z.number().describe('Task ID'),
  userId: z.number().describe('User ID to remove from task'),
});

// =============================================================================
// Tool Functions
// =============================================================================

/**
 * List all assignees for a task
 */
export async function assigneesList(client: VikunjaClient, args: unknown): Promise<string> {
  const params = AssigneesListSchema.parse(args);

  try {
    const assignees = await client.getTaskAssignees(params.taskId);

    // Handle null response (when no assignees exist)
    if (!assignees || assignees === null || assignees.length === 0) {
      return `No assignees found for task ${params.taskId}.`;
    }

    const lines: string[] = [];
    lines.push(`Found ${assignees.length} assignee(s) for task ${params.taskId}`);
    lines.push('');

    assignees.forEach((user, index) => {
      lines.push(`${index + 1}. ${user.username}${user.name ? ` (${user.name})` : ''}`);
      lines.push(`   Email: ${user.email || 'N/A'}`);
      lines.push(`   [User ID: ${user.id}]`);
      lines.push('');
    });

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list assignees: ${message}`);
  }
}

/**
 * Assign a user to a task
 */
export async function assigneeAdd(client: VikunjaClient, args: unknown): Promise<string> {
  const params = AssigneeAddSchema.parse(args);

  try {
    const result = await client.addAssignee(params.taskId, {
      user_id: params.userId,
    });

    // Get the task to show its title
    const task = await client.getTask(params.taskId);

    return [
      `Assigned user ${params.userId} to task "${task.title}"`,
      '',
      `Task ID: ${params.taskId}`,
      `User ID: ${params.userId}`,
      '',
      'TIP: Use assignees_list to see all assignees for this task.',
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to add assignee: ${message}`);
  }
}

/**
 * Assign multiple users to a task at once
 */
export async function assigneesAddBulk(client: VikunjaClient, args: unknown): Promise<string> {
  const params = AssigneeAddBulkSchema.parse(args);

  try {
    const assignees = params.userIds.map(userId => ({ user_id: userId }));
    await client.addAssigneesBulk(params.taskId, { assignees });

    // Get the task to show its title
    const task = await client.getTask(params.taskId);

    return [
      `Assigned ${params.userIds.length} user(s) to task "${task.title}"`,
      '',
      `Task ID: ${params.taskId}`,
      `User IDs: ${params.userIds.join(', ')}`,
      '',
      'TIP: Use assignees_list to see all assignees for this task.',
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to add assignees in bulk: ${message}`);
  }
}

/**
 * Remove an assignee from a task
 */
export async function assigneeRemove(client: VikunjaClient, args: unknown): Promise<string> {
  const params = AssigneeRemoveSchema.parse(args);

  try {
    // Get task and assignees before removal for confirmation
    const [task, assignees] = await Promise.all([
      client.getTask(params.taskId),
      client.getTaskAssignees(params.taskId),
    ]);

    const removedUser = assignees.find(u => u.id === params.userId);

    // Remove assignee
    await client.removeAssignee(params.taskId, params.userId);

    return [
      `Removed user ${removedUser?.username || params.userId} from task "${task.title}"`,
      '',
      `Task ID: ${params.taskId}`,
      `User ID: ${params.userId}`,
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to remove assignee: ${message}`);
  }
}

// =============================================================================
// JSON Schema Definitions (manually defined for MCP compatibility)
// =============================================================================

const AssigneesListJsonSchema = {
  type: 'object' as const,
  properties: {
    taskId: {
      type: 'number' as const,
      description: 'Task ID to get assignees for',
    },
  },
  required: ['taskId'],
};

const AssigneeAddJsonSchema = {
  type: 'object' as const,
  properties: {
    taskId: {
      type: 'number' as const,
      description: 'Task ID to assign user to',
    },
    userId: {
      type: 'number' as const,
      description: 'User ID to assign',
    },
  },
  required: ['taskId', 'userId'],
};

const AssigneeAddBulkJsonSchema = {
  type: 'object' as const,
  properties: {
    taskId: {
      type: 'number' as const,
      description: 'Task ID to assign users to',
    },
    userIds: {
      type: 'array' as const,
      items: {
        type: 'number' as const,
      },
      description: 'Array of user IDs to assign',
    },
  },
  required: ['taskId', 'userIds'],
};

const AssigneeRemoveJsonSchema = {
  type: 'object' as const,
  properties: {
    taskId: {
      type: 'number' as const,
      description: 'Task ID',
    },
    userId: {
      type: 'number' as const,
      description: 'User ID to remove from task',
    },
  },
  required: ['taskId', 'userId'],
};

// =============================================================================
// Tool Definitions Export
// =============================================================================

export const assigneeTools = [
  {
    name: 'assignees_list',
    description:
      'List all users assigned to a task. Shows username, name, and email. ' +
      'WHEN TO USE: Checking task assignments.',
    inputSchema: AssigneesListJsonSchema,
  },
  {
    name: 'assignee_add',
    description:
      'Assign a user to a task. User must have access to the project. ' +
      'EXAMPLE: {taskId: 123, userId: 5}',
    inputSchema: AssigneeAddJsonSchema,
  },
  {
    name: 'assignees_add_bulk',
    description:
      'Assign multiple users to a task at once. More efficient than individual assignments. ' +
      'EXAMPLE: {taskId: 123, userIds: [5, 7, 9]}',
    inputSchema: AssigneeAddBulkJsonSchema,
  },
  {
    name: 'assignee_remove',
    description:
      'Remove an assignee from a task. Task remains, only assignment is removed.',
    inputSchema: AssigneeRemoveJsonSchema,
  },
];
