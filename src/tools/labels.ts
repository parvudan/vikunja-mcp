/**
 * Label management tools for Vikunja MCP server
 * Implements: list, get, create, update, delete operations
 */

import { z } from 'zod';
import type { VikunjaClient } from '../client.js';
import { formatLabel, formatLabelList, formatBeforeAfter } from './helpers.js';
import { config } from '../config.js';

// =============================================================================
// Zod Schemas (for runtime validation)
// =============================================================================

const LabelsListSchema = z.object({
  search: z.string().optional().describe('Search in label title and description'),
  sortBy: z.enum(['title', 'created', 'updated']).optional().describe('Sort by field: title, created, or updated (default: title)'),
  sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction: asc (ascending) or desc (descending) (default: asc)'),
  limit: z.number().optional().describe('Maximum number of labels to return (default: all)'),
});

const LabelGetSchema = z.object({
  id: z.number().describe('Label ID'),
});

const LabelCreateSchema = z.object({
  title: z.string().min(1).describe('Label title (required)'),
  description: z.string().optional().describe('Label description'),
  hexColor: z.string().optional().describe('Color in hex format (e.g., #00ff00)'),
});

const LabelUpdateSchema = z.object({
  id: z.number().describe('Label ID to update'),
  title: z.string().min(1).optional().describe('New label title'),
  description: z.string().optional().describe('New label description'),
  hexColor: z.string().optional().describe('New color in hex format (e.g., #00ff00)'),
});

const LabelDeleteSchema = z.object({
  id: z.number().describe('Label ID to delete'),
});

const LabelAddToTaskSchema = z.object({
  labelId: z.number().describe('Label ID to add'),
  taskId: z.number().describe('Task ID to add the label to'),
});

const LabelRemoveFromTaskSchema = z.object({
  labelId: z.number().describe('Label ID to remove'),
  taskId: z.number().describe('Task ID to remove the label from'),
});

const LabelsBulkSetOnTaskSchema = z.object({
  taskId: z.number().describe('Task ID to update labels for'),
  labelIds: z.array(z.number()).describe('Array of label IDs to set on this task (replaces all existing labels)'),
});

// =============================================================================
// Tool Functions
// =============================================================================

/**
 * List all labels
 */
export async function labelsList(client: VikunjaClient, args: unknown): Promise<string> {
  const params = LabelsListSchema.parse(args);

  try {
    let labels = await client.getLabels();

    // Handle null response (when no labels exist)
    if (!labels || labels === null) {
      labels = [];
    }

    // Search in title and description if specified
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      labels = labels.filter(l =>
        l.title.toLowerCase().includes(searchLower) ||
        (l.description && l.description.toLowerCase().includes(searchLower))
      );
    }

    // Sort labels
    const sortBy = params.sortBy || 'title';
    const sortDirection = params.sortDirection || 'asc';

    labels.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'created':
          comparison = a.created.localeCompare(b.created);
          break;
        case 'updated':
          comparison = a.updated.localeCompare(b.updated);
          break;
        default:
          comparison = a.title.localeCompare(b.title);
          break;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    // Apply limit if specified
    if (params.limit !== undefined && params.limit > 0) {
      labels = labels.slice(0, params.limit);
    }

    return formatLabelList(labels);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list labels: ${message}`);
  }
}

/**
 * Get a single label by ID
 */
export async function labelGet(client: VikunjaClient, args: unknown): Promise<string> {
  const params = LabelGetSchema.parse(args);

  try {
    const label = await client.getLabel(params.id);
    return formatLabel(label);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get label: ${message}`);
  }
}

/**
 * Create a new label
 */
export async function labelCreate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = LabelCreateSchema.parse(args);

  try {
    const labelData: any = {
      title: params.title,
      description: params.description,
    };

    if (params.hexColor) {
      labelData.hex_color = params.hexColor;
    }

    const label = await client.createLabel(labelData);

    const lines: string[] = [];
    lines.push(`Created label "${label.title}"`);
    lines.push('');
    lines.push(`ID: ${label.id}`);
    if (label.description) {
      lines.push(`Description: ${label.description}`);
    }
    if (label.hex_color) {
      lines.push(`Color: ${label.hex_color}`);
    }
    lines.push('');
    lines.push('TIP: Use labels_add_to_task to add this label to tasks.');

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create label: ${message}`);
  }
}

/**
 * Update an existing label
 */
export async function labelUpdate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = LabelUpdateSchema.parse(args);

  try {
    // Get current label state
    const labelBefore = await client.getLabel(params.id);

    // Build update payload
    const updateData: any = {};

    if (params.title !== undefined) {
      updateData.title = params.title;
    }

    if (params.description !== undefined) {
      updateData.description = params.description;
    }

    if (params.hexColor !== undefined) {
      updateData.hex_color = params.hexColor;
    }

    // Update label
    const labelAfter = await client.updateLabel(params.id, updateData);

    // Format before/after comparison
    const lines: string[] = [];
    lines.push(`Updated label "${labelAfter.title}"`);
    lines.push('');

    if (params.title !== undefined) {
      lines.push(formatBeforeAfter('Title', labelBefore.title, labelAfter.title));
    }

    if (params.description !== undefined) {
      lines.push(formatBeforeAfter('Description', labelBefore.description, labelAfter.description));
    }

    if (params.hexColor !== undefined) {
      lines.push(formatBeforeAfter('Color', labelBefore.hex_color, labelAfter.hex_color));
    }

    lines.push('');
    lines.push(`[ID: ${params.id}]`);

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update label: ${message}`);
  }
}

/**
 * Delete a label
 */
export async function labelDelete(client: VikunjaClient, args: unknown): Promise<string> {
  const params = LabelDeleteSchema.parse(args);

  try {
    // Safety check: if deletion is disabled, block operation
    if (!config.enableLabelDelete) {
      const label = await client.getLabel(params.id);
      return [
        'WARNING: LABEL DELETION IS DISABLED',
        '',
        `Cannot delete label "${label.title}" (ID: ${params.id})`,
        '',
        'This operation would remove the label from ALL tasks workspace-wide.',
        'Label deletion is disabled in safe mode.',
        '',
        'Alternatives:',
        '  - Use label_update to rename or change the label',
        '  - Use label_remove_from_task to remove from specific tasks',
        '',
        'To enable permanent deletion, set ENABLE_LABEL_DELETE=true in .env',
      ].join('\n');
    }

    // Get label info before deletion
    const label = await client.getLabel(params.id);

    // Delete the label
    await client.deleteLabel(params.id);

    return [
      `Deleted label "${label.title}"`,
      '',
      `ID: ${params.id}`,
      '',
      'NOTE: The label has been removed from all tasks that used it.',
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete label: ${message}`);
  }
}

/**
 * Add a label to a task
 */
export async function labelAddToTask(client: VikunjaClient, args: unknown): Promise<string> {
  const params = LabelAddToTaskSchema.parse(args);

  try {
    // Get label and task info for confirmation
    const [label, task] = await Promise.all([
      client.getLabel(params.labelId),
      client.getTask(params.taskId),
    ]);

    // Add label to task
    await client.addLabelToTask(params.taskId, params.labelId);

    return [
      `Added label "${label.title}" to task "${task.title}"`,
      '',
      `Task ID: ${params.taskId}`,
      `Label ID: ${params.labelId}`,
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to add label to task: ${message}`);
  }
}

/**
 * Remove a label from a task
 */
export async function labelRemoveFromTask(client: VikunjaClient, args: unknown): Promise<string> {
  const params = LabelRemoveFromTaskSchema.parse(args);

  try {
    // Get label and task info for confirmation
    const [label, task] = await Promise.all([
      client.getLabel(params.labelId),
      client.getTask(params.taskId),
    ]);

    // Remove label from task
    await client.removeLabelFromTask(params.taskId, params.labelId);

    return [
      `Removed label "${label.title}" from task "${task.title}"`,
      '',
      `Task ID: ${params.taskId}`,
      `Label ID: ${params.labelId}`,
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to remove label from task: ${message}`);
  }
}

/**
 * Set all labels on a task at once (bulk operation)
 */
export async function labelsBulkSetOnTask(client: VikunjaClient, args: unknown): Promise<string> {
  const params = LabelsBulkSetOnTaskSchema.parse(args);

  try {
    // Get task info and current labels
    const task = await client.getTask(params.taskId);
    const currentLabelIds = task.labels?.map(l => l.id) || [];

    // Get label details for the new labels
    const newLabels = await Promise.all(
      params.labelIds.map(id => client.getLabel(id))
    );

    // Perform bulk update
    await client.bulkSetLabelsOnTask(params.taskId, params.labelIds);

    const lines: string[] = [];
    lines.push(`Updated all labels on task "${task.title}"`);
    lines.push('');
    lines.push(`Task ID: ${params.taskId}`);
    lines.push('');

    if (currentLabelIds.length > 0) {
      lines.push(`Removed: ${currentLabelIds.length} label(s)`);
    }

    if (params.labelIds.length > 0) {
      lines.push(`Added: ${params.labelIds.length} label(s)`);
      lines.push('');
      lines.push('New labels:');
      newLabels.forEach((label, index) => {
        lines.push(`${index + 1}. ${label.title}${label.hex_color ? ` [${label.hex_color}]` : ''}`);
      });
    } else {
      lines.push('Removed all labels from this task.');
    }

    lines.push('');
    lines.push('NOTE: This operation replaces ALL existing labels. Use labels_add_to_task to add individual labels.');

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to bulk set labels on task: ${message}`);
  }
}

// =============================================================================
// JSON Schema Definitions (manually defined for MCP compatibility)
// =============================================================================

const LabelsListJsonSchema = {
  type: 'object' as const,
  properties: {
    search: {
      type: 'string' as const,
      description: 'Search query to filter labels by title or description',
    },
    sortBy: {
      type: 'string' as const,
      enum: ['title', 'created', 'updated'],
      description: 'Sort by field: title (alphabetical), created (creation date), updated (last modified). Default: title',
    },
    sortDirection: {
      type: 'string' as const,
      enum: ['asc', 'desc'],
      description: 'Sort direction: asc (ascending/A-Z/oldest first) or desc (descending/Z-A/newest first). Default: asc',
    },
    limit: {
      type: 'number' as const,
      description: 'Maximum number of labels to return. Omit or use 0 for all labels.',
    },
  },
};

const LabelGetJsonSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'number' as const,
      description: 'Label ID',
    },
  },
  required: ['id'],
};

const LabelCreateJsonSchema = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      description: 'Label title (required)',
    },
    description: {
      type: 'string' as const,
      description: 'Label description',
    },
    hexColor: {
      type: 'string' as const,
      description: 'Color in hex format (e.g., #00ff00)',
    },
  },
  required: ['title'],
};

const LabelUpdateJsonSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'number' as const,
      description: 'Label ID to update',
    },
    title: {
      type: 'string' as const,
      description: 'New label title',
    },
    description: {
      type: 'string' as const,
      description: 'New label description',
    },
    hexColor: {
      type: 'string' as const,
      description: 'New color in hex format (e.g., #00ff00)',
    },
  },
  required: ['id'],
};

const LabelDeleteJsonSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'number' as const,
      description: 'Label ID to delete',
    },
  },
  required: ['id'],
};

const LabelAddToTaskJsonSchema = {
  type: 'object' as const,
  properties: {
    labelId: {
      type: 'number' as const,
      description: 'Label ID to add',
    },
    taskId: {
      type: 'number' as const,
      description: 'Task ID to add the label to',
    },
  },
  required: ['labelId', 'taskId'],
};

const LabelRemoveFromTaskJsonSchema = {
  type: 'object' as const,
  properties: {
    labelId: {
      type: 'number' as const,
      description: 'Label ID to remove',
    },
    taskId: {
      type: 'number' as const,
      description: 'Task ID to remove the label from',
    },
  },
  required: ['labelId', 'taskId'],
};

const LabelsBulkSetOnTaskJsonSchema = {
  type: 'object' as const,
  properties: {
    taskId: {
      type: 'number' as const,
      description: 'Task ID to update labels for',
    },
    labelIds: {
      type: 'array' as const,
      items: {
        type: 'number' as const,
      },
      description: 'Array of label IDs to set on this task. This REPLACES all existing labels.',
    },
  },
  required: ['taskId', 'labelIds'],
};

// =============================================================================
// Tool Definitions Export
// =============================================================================

export const labelTools = [
  {
    name: 'labels_list',
    description:
      'List all labels with filtering and sorting. Shows labels sorted alphabetically by default. ' +
      'FILTERS: search (text in title/description). ' +
      'SORTING: sortBy (title|created|updated), sortDirection (asc|desc). ' +
      'PAGINATION: limit (max results). ' +
      'WHEN TO USE: Finding label IDs, searching labels, browsing available labels, sorting by date/name. ' +
      'EXAMPLES: {search: "urgent"} | {sortBy: "created", sortDirection: "desc"} | {limit: 10}',
    inputSchema: LabelsListJsonSchema,
  },
  {
    name: 'label_get',
    description:
      'Get detailed information about a specific label by ID. Shows title, description, and color.',
    inputSchema: LabelGetJsonSchema,
  },
  {
    name: 'label_create',
    description:
      'Create a new label. Only requires title, description and color are optional. ' +
      'EXAMPLE: {title: "urgent", hexColor: "#ff0000"}',
    inputSchema: LabelCreateJsonSchema,
  },
  {
    name: 'label_update',
    description:
      'Update an existing label. Can modify title, description, or color. Shows before/after comparison.',
    inputSchema: LabelUpdateJsonSchema,
  },
  {
    name: 'label_delete',
    description:
      'Permanently delete a label and remove from ALL tasks workspace-wide. Cannot be undone. ' +
      'WHEN TO USE: Removing obsolete labels, cleaning up duplicates, deleting test labels.',
    inputSchema: LabelDeleteJsonSchema,
  },
  {
    name: 'label_add_to_task',
    description:
      'Add a label to a task. Both label and task must exist. ' +
      'EXAMPLE: {taskId: 123, labelId: 5}',
    inputSchema: LabelAddToTaskJsonSchema,
  },
  {
    name: 'label_remove_from_task',
    description:
      'Remove a label from a task. Label remains available for other tasks.',
    inputSchema: LabelRemoveFromTaskJsonSchema,
  },
  {
    name: 'labels_bulk_set_on_task',
    description:
      'Set all labels on a task at once. REPLACES all existing labels. Pass empty array to remove all labels. ' +
      'WHEN TO USE: More efficient than adding/removing individual labels. ' +
      'EXAMPLE: {taskId: 123, labelIds: [1, 5, 8]}',
    inputSchema: LabelsBulkSetOnTaskJsonSchema,
  },
];
