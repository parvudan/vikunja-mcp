/**
 * Comment management tools for Vikunja MCP server
 * Implements: list, get, create, update, delete operations for task comments
 */

import { z } from 'zod';
import type { VikunjaClient } from '../client.js';
import { formatDate } from './helpers.js';

// =============================================================================
// Zod Schemas (for runtime validation)
// =============================================================================

const CommentsListSchema = z.object({
  taskId: z.number().describe('Task ID to get comments for'),
});

const CommentGetSchema = z.object({
  taskId: z.number().describe('Task ID'),
  commentId: z.number().describe('Comment ID'),
});

const CommentCreateSchema = z.object({
  taskId: z.number().describe('Task ID to add comment to'),
  comment: z.string().min(1).describe('Comment text (required)'),
});

const CommentUpdateSchema = z.object({
  taskId: z.number().describe('Task ID'),
  commentId: z.number().describe('Comment ID to update'),
  comment: z.string().min(1).describe('New comment text'),
});

const CommentDeleteSchema = z.object({
  taskId: z.number().describe('Task ID'),
  commentId: z.number().describe('Comment ID to delete'),
});

// =============================================================================
// Tool Functions
// =============================================================================

/**
 * List all comments on a task
 */
export async function commentsList(client: VikunjaClient, args: unknown): Promise<string> {
  const params = CommentsListSchema.parse(args);

  try {
    const comments = await client.getTaskComments(params.taskId);

    // Handle null response (when no comments exist)
    if (!comments || comments === null || comments.length === 0) {
      return `No comments found on task ${params.taskId}.`;
    }

    const lines: string[] = [];
    lines.push(`Found ${comments.length} comment(s) on task ${params.taskId}`);
    lines.push('');

    comments.forEach((comment, index) => {
      lines.push(`${index + 1}. By ${comment.author.username} on ${formatDate(comment.created)}`);
      lines.push(`   ${comment.comment}`);
      lines.push(`   [Comment ID: ${comment.id}]`);
      lines.push('');
    });

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list comments: ${message}`);
  }
}

/**
 * Get a single comment
 */
export async function commentGet(client: VikunjaClient, args: unknown): Promise<string> {
  const params = CommentGetSchema.parse(args);

  try {
    const comment = await client.getComment(params.taskId, params.commentId);

    const lines: string[] = [];
    lines.push(comment.comment);
    lines.push('');
    lines.push(`Author: ${comment.author.username}`);
    lines.push(`Created: ${formatDate(comment.created)}`);
    if (comment.updated && comment.updated !== comment.created) {
      lines.push(`Updated: ${formatDate(comment.updated)}`);
    }
    lines.push('');
    lines.push(`[Comment ID: ${comment.id}, Task ID: ${params.taskId}]`);

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get comment: ${message}`);
  }
}

/**
 * Create a new comment on a task
 */
export async function commentCreate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = CommentCreateSchema.parse(args);

  try {
    const comment = await client.createComment(params.taskId, {
      comment: params.comment,
    });

    return [
      `Created comment on task ${params.taskId}`,
      '',
      `"${comment.comment}"`,
      '',
      `Author: ${comment.author.username}`,
      `Created: ${formatDate(comment.created)}`,
      `[Comment ID: ${comment.id}]`,
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create comment: ${message}`);
  }
}

/**
 * Update an existing comment
 */
export async function commentUpdate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = CommentUpdateSchema.parse(args);

  try {
    // Get before state
    const commentBefore = await client.getComment(params.taskId, params.commentId);

    // Update comment
    const commentAfter = await client.updateComment(params.taskId, params.commentId, {
      comment: params.comment,
    });

    const lines: string[] = [];
    lines.push(`Updated comment ${params.commentId} on task ${params.taskId}`);
    lines.push('');
    lines.push('Before:');
    lines.push(`  "${commentBefore.comment}"`);
    lines.push('');
    lines.push('After:');
    lines.push(`  "${commentAfter.comment}"`);
    lines.push('');
    lines.push(`Updated: ${formatDate(commentAfter.updated)}`);

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update comment: ${message}`);
  }
}

/**
 * Delete a comment
 */
export async function commentDelete(client: VikunjaClient, args: unknown): Promise<string> {
  const params = CommentDeleteSchema.parse(args);

  try {
    // Get comment info before deletion
    const comment = await client.getComment(params.taskId, params.commentId);

    // Delete the comment
    await client.deleteComment(params.taskId, params.commentId);

    return [
      `Deleted comment ${params.commentId} from task ${params.taskId}`,
      '',
      `"${comment.comment}"`,
      '',
      `Author: ${comment.author.username}`,
      `Created: ${formatDate(comment.created)}`,
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete comment: ${message}`);
  }
}

// =============================================================================
// JSON Schema Definitions (manually defined for MCP compatibility)
// =============================================================================

const CommentsListJsonSchema = {
  type: 'object' as const,
  properties: {
    taskId: {
      type: 'number' as const,
      description: 'Task ID to get comments for',
    },
  },
  required: ['taskId'],
};

const CommentGetJsonSchema = {
  type: 'object' as const,
  properties: {
    taskId: {
      type: 'number' as const,
      description: 'Task ID',
    },
    commentId: {
      type: 'number' as const,
      description: 'Comment ID',
    },
  },
  required: ['taskId', 'commentId'],
};

const CommentCreateJsonSchema = {
  type: 'object' as const,
  properties: {
    taskId: {
      type: 'number' as const,
      description: 'Task ID to add comment to',
    },
    comment: {
      type: 'string' as const,
      description: 'Comment text (required)',
    },
  },
  required: ['taskId', 'comment'],
};

const CommentUpdateJsonSchema = {
  type: 'object' as const,
  properties: {
    taskId: {
      type: 'number' as const,
      description: 'Task ID',
    },
    commentId: {
      type: 'number' as const,
      description: 'Comment ID to update',
    },
    comment: {
      type: 'string' as const,
      description: 'New comment text',
    },
  },
  required: ['taskId', 'commentId', 'comment'],
};

const CommentDeleteJsonSchema = {
  type: 'object' as const,
  properties: {
    taskId: {
      type: 'number' as const,
      description: 'Task ID',
    },
    commentId: {
      type: 'number' as const,
      description: 'Comment ID to delete',
    },
  },
  required: ['taskId', 'commentId'],
};

// =============================================================================
// Tool Definitions Export
// =============================================================================

export const commentTools = [
  {
    name: 'comments_list',
    description:
      'List all comments on a task. Shows comment text, author, and timestamp. ' +
      'WHEN TO USE: Viewing discussion, checking task updates.',
    inputSchema: CommentsListJsonSchema,
  },
  {
    name: 'comment_get',
    description:
      'Get detailed information about a specific comment.',
    inputSchema: CommentGetJsonSchema,
  },
  {
    name: 'comment_create',
    description:
      'Add a comment to a task. Useful for updates, notes, or team communication. ' +
      'EXAMPLE: {taskId: 123, comment: "Completed the research phase"}',
    inputSchema: CommentCreateJsonSchema,
  },
  {
    name: 'comment_update',
    description:
      'Edit an existing comment. Shows before/after comparison.',
    inputSchema: CommentUpdateJsonSchema,
  },
  {
    name: 'comment_delete',
    description:
      'Permanently delete a comment. Cannot be undone. ' +
      'WHEN TO USE: Removing spam, duplicates, or irrelevant comments.',
    inputSchema: CommentDeleteJsonSchema,
  },
];
