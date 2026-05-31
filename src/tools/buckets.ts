/**
 * Bucket (Kanban column) management tools for Vikunja MCP server
 * Implements: list, create, update, delete operations for kanban buckets
 */

import { z } from 'zod';
import type { VikunjaClient } from '../client.js';

// =============================================================================
// Zod Schemas (for runtime validation)
// =============================================================================

const BucketsListSchema = z.object({
  projectId: z.number().describe('Project ID'),
  viewId: z.number().describe('View ID (kanban view)'),
});

const BucketCreateSchema = z.object({
  projectId: z.number().describe('Project ID'),
  viewId: z.number().describe('View ID (kanban view)'),
  title: z.string().min(1).describe('Bucket title (required)'),
  limit: z.number().optional().describe('Max tasks in this bucket (0 for unlimited)'),
});

const BucketUpdateSchema = z.object({
  projectId: z.number().describe('Project ID'),
  viewId: z.number().describe('View ID (kanban view)'),
  bucketId: z.number().describe('Bucket ID to update'),
  title: z.string().min(1).optional().describe('New bucket title'),
  limit: z.number().optional().describe('New max tasks limit (0 for unlimited)'),
});

const BucketDeleteSchema = z.object({
  projectId: z.number().describe('Project ID'),
  viewId: z.number().describe('View ID (kanban view)'),
  bucketId: z.number().describe('Bucket ID to delete'),
});

// =============================================================================
// Tool Functions
// =============================================================================

/**
 * List all buckets in a kanban view
 */
export async function bucketsList(client: VikunjaClient, args: unknown): Promise<string> {
  const params = BucketsListSchema.parse(args);

  try {
    const buckets = await client.getBuckets(params.projectId, params.viewId);

    // Handle null response (when no buckets exist)
    if (!buckets || buckets === null || buckets.length === 0) {
      return `No buckets found for view ${params.viewId} in project ${params.projectId}.`;
    }

    const lines: string[] = [];
    lines.push(`Found ${buckets.length} bucket(s) in kanban view ${params.viewId}`);
    lines.push('');

    buckets.forEach((bucket, index) => {
      lines.push(`${index + 1}. ${bucket.title}`);
      lines.push(`   Tasks: ${bucket.count || 0}`);
      if (bucket.limit > 0) {
        lines.push(`   Limit: ${bucket.limit} tasks max`);
      } else {
        lines.push(`   Limit: Unlimited`);
      }
      lines.push(`   Position: ${bucket.position}`);
      lines.push(`   [Bucket ID: ${bucket.id}]`);
      lines.push('');
    });

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list buckets: ${message}`);
  }
}

/**
 * Create a new bucket
 */
export async function bucketCreate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = BucketCreateSchema.parse(args);

  try {
    const bucket = await client.createBucket(params.projectId, params.viewId, {
      title: params.title,
      limit: params.limit || 0,
    });

    return [
      `Created kanban bucket "${bucket.title}"`,
      '',
      `Bucket ID: ${bucket.id}`,
      `View ID: ${params.viewId}`,
      `Limit: ${bucket.limit > 0 ? `${bucket.limit} tasks max` : 'Unlimited'}`,
      '',
      'TIP: Use buckets_list to see all buckets in this view.',
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create bucket: ${message}`);
  }
}

/**
 * Update an existing bucket
 */
export async function bucketUpdate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = BucketUpdateSchema.parse(args);

  try {
    // Get bucket before update
    const buckets = await client.getBuckets(params.projectId, params.viewId);
    const bucketBefore = buckets.find(b => b.id === params.bucketId);

    if (!bucketBefore) {
      throw new Error(`Bucket ${params.bucketId} not found`);
    }

    const updateData: any = {};
    if (params.title !== undefined) {
      updateData.title = params.title;
    }
    if (params.limit !== undefined) {
      updateData.limit = params.limit;
    }

    const bucketAfter = await client.updateBucket(params.projectId, params.viewId, params.bucketId, updateData);

    const lines: string[] = [];
    lines.push(`Updated bucket`);
    lines.push('');

    if (params.title !== undefined) {
      lines.push(`Title: "${bucketBefore.title}" → "${bucketAfter.title}"`);
    }

    if (params.limit !== undefined) {
      const beforeLimit = bucketBefore.limit > 0 ? `${bucketBefore.limit} tasks` : 'Unlimited';
      const afterLimit = bucketAfter.limit > 0 ? `${bucketAfter.limit} tasks` : 'Unlimited';
      lines.push(`Limit: ${beforeLimit} → ${afterLimit}`);
    }

    lines.push('');
    lines.push(`[Bucket ID: ${params.bucketId}]`);

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update bucket: ${message}`);
  }
}

/**
 * Delete a bucket
 */
export async function bucketDelete(client: VikunjaClient, args: unknown): Promise<string> {
  const params = BucketDeleteSchema.parse(args);

  try {
    // Get bucket info before deletion
    const buckets = await client.getBuckets(params.projectId, params.viewId);
    const bucket = buckets.find(b => b.id === params.bucketId);

    if (!bucket) {
      throw new Error(`Bucket ${params.bucketId} not found`);
    }

    await client.deleteBucket(params.projectId, params.viewId, params.bucketId);

    return [
      `Deleted bucket "${bucket.title}"`,
      '',
      `Bucket ID: ${params.bucketId}`,
      `Tasks in bucket: ${bucket.count || 0}`,
      '',
      'NOTE: Tasks from this bucket remain in the project but are no longer in this column.',
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete bucket: ${message}`);
  }
}

// =============================================================================
// JSON Schema Definitions
// =============================================================================

const BucketsListJsonSchema = {
  type: 'object' as const,
  properties: {
    projectId: {
      type: 'number' as const,
      description: 'Project ID',
    },
    viewId: {
      type: 'number' as const,
      description: 'View ID (must be a kanban view)',
    },
  },
  required: ['projectId', 'viewId'],
};

const BucketCreateJsonSchema = {
  type: 'object' as const,
  properties: {
    projectId: {
      type: 'number' as const,
      description: 'Project ID',
    },
    viewId: {
      type: 'number' as const,
      description: 'View ID (must be a kanban view)',
    },
    title: {
      type: 'string' as const,
      description: 'Bucket title (required) - typically status names like "To Do", "In Progress", "Done"',
    },
    limit: {
      type: 'number' as const,
      description: 'Max tasks allowed in this bucket (0 for unlimited, useful for WIP limits)',
    },
  },
  required: ['projectId', 'viewId', 'title'],
};

const BucketUpdateJsonSchema = {
  type: 'object' as const,
  properties: {
    projectId: {
      type: 'number' as const,
      description: 'Project ID',
    },
    viewId: {
      type: 'number' as const,
      description: 'View ID (must be a kanban view)',
    },
    bucketId: {
      type: 'number' as const,
      description: 'Bucket ID to update',
    },
    title: {
      type: 'string' as const,
      description: 'New bucket title',
    },
    limit: {
      type: 'number' as const,
      description: 'New max tasks limit (0 for unlimited)',
    },
  },
  required: ['projectId', 'viewId', 'bucketId'],
};

const BucketDeleteJsonSchema = {
  type: 'object' as const,
  properties: {
    projectId: {
      type: 'number' as const,
      description: 'Project ID',
    },
    viewId: {
      type: 'number' as const,
      description: 'View ID (must be a kanban view)',
    },
    bucketId: {
      type: 'number' as const,
      description: 'Bucket ID to delete',
    },
  },
  required: ['projectId', 'viewId', 'bucketId'],
};

// =============================================================================
// Tool Definitions Export
// =============================================================================

export const bucketTools = [
  {
    name: 'buckets_list',
    description:
      'List all buckets (columns) in a kanban view. Shows task count and WIP limits per bucket. ' +
      'NOTE: New kanban views have 3 default buckets: "To-Do", "Doing", and "Done". ' +
      'WHEN TO USE: Viewing kanban board structure, checking workflow columns.',
    inputSchema: BucketsListJsonSchema,
  },
  {
    name: 'bucket_create',
    description:
      'Create a new bucket (column) in a kanban view. Can set WIP limits. ' +
      'WHEN TO USE: Adding workflow stages like "Code Review", "Testing", "Blocked". ' +
      'EXAMPLE: {projectId: 5, viewId: 10, title: "In Review", limit: 3}',
    inputSchema: BucketCreateJsonSchema,
  },
  {
    name: 'bucket_update',
    description:
      'Update an existing bucket. Rename or change task limits. Shows before/after comparison.',
    inputSchema: BucketUpdateJsonSchema,
  },
  {
    name: 'bucket_delete',
    description:
      'Delete a bucket (kanban column). Tasks remain in project but are removed from column. ' +
      'IMPORTANT: Cannot delete the last bucket in a view - must have at least one bucket. ' +
      'WHEN TO USE: Reorganizing workflow stages. If you need to replace all buckets, create new ones first, then delete old ones.',
    inputSchema: BucketDeleteJsonSchema,
  },
];
