/**
 * Project view management tools for Vikunja MCP server
 * Implements: list, get, create, update, delete operations for project views
 */

import { z } from 'zod';
import type { VikunjaClient } from '../client.js';

// =============================================================================
// Zod Schemas (for runtime validation)
// =============================================================================

const ViewsListSchema = z.object({
  projectId: z.number().describe('Project ID to list views for'),
});

const ViewGetSchema = z.object({
  projectId: z.number().describe('Project ID'),
  viewId: z.number().describe('View ID'),
});

const ViewCreateSchema = z.object({
  projectId: z.number().describe('Project ID to create view in'),
  title: z.string().min(1).describe('View title (required)'),
  viewKind: z.enum(['list', 'gantt', 'table', 'kanban']).describe('View type'),
});

const ViewUpdateSchema = z.object({
  projectId: z.number().describe('Project ID'),
  viewId: z.number().describe('View ID to update'),
  title: z.string().min(1).optional().describe('New view title'),
});

const ViewDeleteSchema = z.object({
  projectId: z.number().describe('Project ID'),
  viewId: z.number().describe('View ID to delete'),
});

// =============================================================================
// Tool Functions
// =============================================================================

/**
 * List all views for a project
 */
export async function viewsList(client: VikunjaClient, args: unknown): Promise<string> {
  const params = ViewsListSchema.parse(args);

  try {
    const views = await client.getProjectViews(params.projectId);

    // Handle null response (when no views exist)
    if (!views || views === null || views.length === 0) {
      return `No views found for project ${params.projectId}.`;
    }

    const lines: string[] = [];
    lines.push(`Found ${views.length} view(s) for project ${params.projectId}`);
    lines.push('');

    views.forEach((view, index) => {
      lines.push(`${index + 1}. ${view.title}`);
      lines.push(`   Type: ${view.view_kind}`);
      lines.push(`   Position: ${view.position}`);
      lines.push(`   [View ID: ${view.id}]`);
      lines.push('');
    });

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list views: ${message}`);
  }
}

/**
 * Get a specific view
 */
export async function viewGet(client: VikunjaClient, args: unknown): Promise<string> {
  const params = ViewGetSchema.parse(args);

  try {
    const view = await client.getProjectView(params.projectId, params.viewId);

    const lines: string[] = [];
    lines.push(`View: ${view.title}`);
    lines.push('');
    lines.push(`Type: ${view.view_kind}`);
    lines.push(`Position: ${view.position}`);
    lines.push(`Project ID: ${view.project_id}`);

    if (view.filter) {
      lines.push('');
      lines.push('Filter: ' + view.filter);
    }

    if (view.view_kind === 'kanban') {
      if (view.default_bucket_id) {
        lines.push(`Default Bucket ID: ${view.default_bucket_id}`);
      }
      if (view.done_bucket_id) {
        lines.push(`Done Bucket ID: ${view.done_bucket_id}`);
      }
    }

    lines.push('');
    lines.push(`[View ID: ${view.id}]`);
    lines.push(`Created: ${new Date(view.created).toLocaleString()}`);
    lines.push(`Updated: ${new Date(view.updated).toLocaleString()}`);

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get view: ${message}`);
  }
}

/**
 * Create a new view
 */
export async function viewCreate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = ViewCreateSchema.parse(args);

  try {
    const viewData: any = {
      title: params.title,
      view_kind: params.viewKind,
    };

    // CRITICAL: For kanban views, must set bucket_configuration_mode to "manual"
    // Without this, tasks will appear as headings instead of being in actual columns/buckets
    if (params.viewKind === 'kanban') {
      viewData.bucket_configuration_mode = 'manual';
    }

    const view = await client.createProjectView(params.projectId, viewData);

    const lines = [
      `Created ${params.viewKind} view "${view.title}"`,
      '',
      `View ID: ${view.id}`,
      `Project ID: ${params.projectId}`,
      '',
    ];

    if (params.viewKind === 'kanban') {
      lines.push('NOTE: Kanban view created with manual bucket configuration.');
      lines.push('NOTE: Default buckets "To-Do", "Doing", and "Done" are automatically created.');
      lines.push('TIP: Use buckets_list to see all buckets.');
      lines.push('TIP: Use bucket_update to rename buckets or bucket_create to add new columns.');
      lines.push('');
    }

    lines.push('TIP: Use views_list to see all views for this project.');

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create view: ${message}`);
  }
}

/**
 * Update an existing view
 */
export async function viewUpdate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = ViewUpdateSchema.parse(args);

  try {
    const viewBefore = await client.getProjectView(params.projectId, params.viewId);

    const updateData: any = {};
    if (params.title !== undefined) {
      updateData.title = params.title;
    }

    const viewAfter = await client.updateProjectView(params.projectId, params.viewId, updateData);

    const lines: string[] = [];
    lines.push(`Updated view`);
    lines.push('');

    if (params.title !== undefined) {
      lines.push(`Title: "${viewBefore.title}" → "${viewAfter.title}"`);
    }

    lines.push('');
    lines.push(`[View ID: ${params.viewId}]`);

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update view: ${message}`);
  }
}

/**
 * Delete a view
 */
export async function viewDelete(client: VikunjaClient, args: unknown): Promise<string> {
  const params = ViewDeleteSchema.parse(args);

  try {
    const view = await client.getProjectView(params.projectId, params.viewId);

    await client.deleteProjectView(params.projectId, params.viewId);

    return [
      `Deleted view "${view.title}"`,
      '',
      `View ID: ${params.viewId}`,
      `Type: ${view.view_kind}`,
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete view: ${message}`);
  }
}

// =============================================================================
// JSON Schema Definitions
// =============================================================================

const ViewsListJsonSchema = {
  type: 'object' as const,
  properties: {
    projectId: {
      type: 'number' as const,
      description: 'Project ID to list views for',
    },
  },
  required: ['projectId'],
};

const ViewGetJsonSchema = {
  type: 'object' as const,
  properties: {
    projectId: {
      type: 'number' as const,
      description: 'Project ID',
    },
    viewId: {
      type: 'number' as const,
      description: 'View ID',
    },
  },
  required: ['projectId', 'viewId'],
};

const ViewCreateJsonSchema = {
  type: 'object' as const,
  properties: {
    projectId: {
      type: 'number' as const,
      description: 'Project ID to create view in',
    },
    title: {
      type: 'string' as const,
      description: 'View title (required)',
    },
    viewKind: {
      type: 'string' as const,
      enum: ['list', 'gantt', 'table', 'kanban'],
      description: 'View type: list, gantt, table, or kanban',
    },
  },
  required: ['projectId', 'title', 'viewKind'],
};

const ViewUpdateJsonSchema = {
  type: 'object' as const,
  properties: {
    projectId: {
      type: 'number' as const,
      description: 'Project ID',
    },
    viewId: {
      type: 'number' as const,
      description: 'View ID to update',
    },
    title: {
      type: 'string' as const,
      description: 'New view title',
    },
  },
  required: ['projectId', 'viewId'],
};

const ViewDeleteJsonSchema = {
  type: 'object' as const,
  properties: {
    projectId: {
      type: 'number' as const,
      description: 'Project ID',
    },
    viewId: {
      type: 'number' as const,
      description: 'View ID to delete',
    },
  },
  required: ['projectId', 'viewId'],
};

// =============================================================================
// Tool Definitions Export
// =============================================================================

export const viewTools = [
  {
    name: 'views_list',
    description:
      'List all views for a project. Views represent different task visualizations (list, kanban, gantt, table). ' +
      'IMPORTANT: New projects have 4 default views already created (List, Kanban, Gantt, Table). ' +
      'WHEN TO USE: Checking existing views before creating new ones. ' +
      'EXAMPLE: {projectId: 5}',
    inputSchema: ViewsListJsonSchema,
  },
  {
    name: 'view_get',
    description:
      'Get details of a specific project view. Shows view type, configuration, bucket settings for kanban views, and filters. ' +
      'WHEN TO USE: Checking view configuration before making changes.',
    inputSchema: ViewGetJsonSchema,
  },
  {
    name: 'view_create',
    description:
      'Create a new view for a project. Types: list, kanban, gantt, table. ' +
      'IMPORTANT: New projects already have 4 default views. Use views_list FIRST to check existing views. ' +
      'WHEN TO USE: Creating additional views of the same type (e.g., second kanban board for different workflow). ' +
      'EXAMPLE: {projectId: 5, title: "Sprint Board", viewKind: "kanban"}',
    inputSchema: ViewCreateJsonSchema,
  },
  {
    name: 'view_update',
    description:
      'Update a project view title. Shows before/after comparison.',
    inputSchema: ViewUpdateJsonSchema,
  },
  {
    name: 'view_delete',
    description:
      'Delete a project view. Removes view but does not delete tasks.',
    inputSchema: ViewDeleteJsonSchema,
  },
];
