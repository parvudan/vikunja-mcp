/**
 * Saved filter management tools for Vikunja MCP server
 * Implements: get, create, update, delete operations for saved filters
 */

import { z } from 'zod';
import type { VikunjaClient } from '../client.js';

// =============================================================================
// Zod Schemas (for runtime validation)
// =============================================================================

const FilterGetSchema = z.object({
  filterId: z.number().describe('Saved filter ID'),
});

const FilterCreateSchema = z.object({
  title: z.string().min(1).max(250).describe('Filter title (required, max 250 chars)'),
  description: z.string().optional().describe('Filter description'),
  isFavorite: z.boolean().optional().describe('Mark as favorite filter'),
  filters: z.object({
    filter: z.string().optional().describe('Filter query string'),
    filterIncludeNulls: z.boolean().optional().describe('Include tasks with null values'),
    orderBy: z.array(z.string()).optional().describe('Sort order (e.g., ["asc", "desc"])'),
    s: z.string().optional().describe('Search query'),
    sortBy: z.array(z.string()).optional().describe('Sort fields (e.g., ["due_date", "priority"])'),
  }).optional().describe('Filter criteria'),
});

const FilterUpdateSchema = z.object({
  filterId: z.number().describe('Saved filter ID to update'),
  title: z.string().min(1).max(250).optional().describe('Filter title (max 250 chars)'),
  description: z.string().optional().describe('Filter description'),
  isFavorite: z.boolean().optional().describe('Mark as favorite filter'),
  filters: z.object({
    filter: z.string().optional().describe('Filter query string'),
    filterIncludeNulls: z.boolean().optional().describe('Include tasks with null values'),
    orderBy: z.array(z.string()).optional().describe('Sort order'),
    s: z.string().optional().describe('Search query'),
    sortBy: z.array(z.string()).optional().describe('Sort fields'),
  }).optional().describe('Filter criteria'),
});

const FilterDeleteSchema = z.object({
  filterId: z.number().describe('Saved filter ID to delete'),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a saved filter for display
 */
function formatFilter(filter: any): string[] {
  const lines: string[] = [];

  lines.push(`"${filter.title}"`);
  if (filter.description) {
    lines.push(`Description: ${filter.description}`);
  }
  lines.push(`Favorite: ${filter.is_favorite ? 'Yes' : 'No'}`);
  lines.push(`Owner: ${filter.owner.username}`);

  if (filter.filters) {
    lines.push('');
    lines.push('Filter Criteria:');
    if (filter.filters.filter) lines.push(`  Filter: ${filter.filters.filter}`);
    if (filter.filters.s) lines.push(`  Search: ${filter.filters.s}`);
    if (filter.filters.sort_by) lines.push(`  Sort by: ${filter.filters.sort_by.join(', ')}`);
    if (filter.filters.order_by) lines.push(`  Order: ${filter.filters.order_by.join(', ')}`);
  }

  lines.push('');
  lines.push(`[Filter ID: ${filter.id}]`);
  lines.push(`Created: ${new Date(filter.created).toLocaleString()}`);
  lines.push(`Updated: ${new Date(filter.updated).toLocaleString()}`);

  return lines;
}

// =============================================================================
// Tool Functions
// =============================================================================

/**
 * Get a specific saved filter
 */
export async function filterGet(client: VikunjaClient, args: unknown): Promise<string> {
  const params = FilterGetSchema.parse(args);

  try {
    const filter = await client.getSavedFilter(params.filterId);

    const lines: string[] = [];
    lines.push('Saved Filter:');
    lines.push('');
    lines.push(...formatFilter(filter));

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get filter: ${message}`);
  }
}

/**
 * Create a new saved filter
 */
export async function filterCreate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = FilterCreateSchema.parse(args);

  try {
    const filterData: any = {
      title: params.title,
    };

    if (params.description !== undefined) {
      filterData.description = params.description;
    }

    if (params.isFavorite !== undefined) {
      filterData.is_favorite = params.isFavorite;
    }

    if (params.filters) {
      filterData.filters = {
        filter: params.filters.filter,
        filter_include_nulls: params.filters.filterIncludeNulls,
        order_by: params.filters.orderBy,
        s: params.filters.s,
        sort_by: params.filters.sortBy,
      };
    }

    const filter = await client.createSavedFilter(filterData);

    const lines: string[] = [];
    lines.push('Created saved filter:');
    lines.push('');
    lines.push(...formatFilter(filter));
    lines.push('');
    lines.push('TIP: Favorite filters appear in a separate parent project.');

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create filter: ${message}`);
  }
}

/**
 * Update an existing saved filter
 */
export async function filterUpdate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = FilterUpdateSchema.parse(args);

  try {
    // Get filter before update
    const filterBefore = await client.getSavedFilter(params.filterId);

    // Build update data
    const filterData: any = {};

    if (params.title !== undefined) {
      filterData.title = params.title;
    }

    if (params.description !== undefined) {
      filterData.description = params.description;
    }

    if (params.isFavorite !== undefined) {
      filterData.is_favorite = params.isFavorite;
    }

    if (params.filters) {
      filterData.filters = {
        filter: params.filters.filter,
        filter_include_nulls: params.filters.filterIncludeNulls,
        order_by: params.filters.orderBy,
        s: params.filters.s,
        sort_by: params.filters.sortBy,
      };
    }

    const filterAfter = await client.updateSavedFilter(params.filterId, filterData);

    const lines: string[] = [];
    lines.push('Updated saved filter:');
    lines.push('');
    lines.push('BEFORE:');
    lines.push(...formatFilter(filterBefore).map(line => '  ' + line));
    lines.push('');
    lines.push('AFTER:');
    lines.push(...formatFilter(filterAfter).map(line => '  ' + line));

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update filter: ${message}`);
  }
}

/**
 * Delete a saved filter
 */
export async function filterDelete(client: VikunjaClient, args: unknown): Promise<string> {
  const params = FilterDeleteSchema.parse(args);

  try {
    // Get filter before deletion for confirmation
    const filter = await client.getSavedFilter(params.filterId);

    await client.deleteSavedFilter(params.filterId);

    const lines: string[] = [];
    lines.push('Deleted saved filter:');
    lines.push('');
    lines.push(`"${filter.title}" (ID: ${params.filterId})`);
    if (filter.description) {
      lines.push(`Description: ${filter.description}`);
    }

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete filter: ${message}`);
  }
}

// =============================================================================
// JSON Schema Definitions (manually defined for MCP compatibility)
// =============================================================================

const FilterGetJsonSchema = {
  type: 'object' as const,
  properties: {
    filterId: {
      type: 'number' as const,
      description: 'Saved filter ID',
    },
  },
  required: ['filterId'],
};

const FilterCreateJsonSchema = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      description: 'Filter title (required, max 250 chars)',
    },
    description: {
      type: 'string' as const,
      description: 'Filter description',
    },
    isFavorite: {
      type: 'boolean' as const,
      description: 'Mark as favorite filter',
    },
    filters: {
      type: 'object' as const,
      properties: {
        filter: {
          type: 'string' as const,
          description: 'Filter query string',
        },
        filterIncludeNulls: {
          type: 'boolean' as const,
          description: 'Include tasks with null values',
        },
        orderBy: {
          type: 'array' as const,
          items: {
            type: 'string' as const,
          },
          description: 'Sort order (e.g., ["asc", "desc"])',
        },
        s: {
          type: 'string' as const,
          description: 'Search query',
        },
        sortBy: {
          type: 'array' as const,
          items: {
            type: 'string' as const,
          },
          description: 'Sort fields (e.g., ["due_date", "priority"])',
        },
      },
      description: 'Filter criteria',
    },
  },
  required: ['title'],
};

const FilterUpdateJsonSchema = {
  type: 'object' as const,
  properties: {
    filterId: {
      type: 'number' as const,
      description: 'Saved filter ID to update',
    },
    title: {
      type: 'string' as const,
      description: 'Filter title (max 250 chars)',
    },
    description: {
      type: 'string' as const,
      description: 'Filter description',
    },
    isFavorite: {
      type: 'boolean' as const,
      description: 'Mark as favorite filter',
    },
    filters: {
      type: 'object' as const,
      properties: {
        filter: {
          type: 'string' as const,
          description: 'Filter query string',
        },
        filterIncludeNulls: {
          type: 'boolean' as const,
          description: 'Include tasks with null values',
        },
        orderBy: {
          type: 'array' as const,
          items: {
            type: 'string' as const,
          },
          description: 'Sort order',
        },
        s: {
          type: 'string' as const,
          description: 'Search query',
        },
        sortBy: {
          type: 'array' as const,
          items: {
            type: 'string' as const,
          },
          description: 'Sort fields',
        },
      },
      description: 'Filter criteria',
    },
  },
  required: ['filterId'],
};

const FilterDeleteJsonSchema = {
  type: 'object' as const,
  properties: {
    filterId: {
      type: 'number' as const,
      description: 'Saved filter ID to delete',
    },
  },
  required: ['filterId'],
};

// =============================================================================
// Tool Definitions Export
// =============================================================================

export const filterTools = [
  {
    name: 'filter_get',
    description:
      'Get details of a specific saved filter. Shows title, description, criteria, and favorite status. ' +
      'EXAMPLE: {filterId: 123}',
    inputSchema: FilterGetJsonSchema,
  },
  {
    name: 'filter_create',
    description:
      'Create a saved filter with custom search criteria. Supports search text, filter queries, sort options. Favorite filters appear in separate parent project. ' +
      'WHEN TO USE: Saving commonly used task views. ' +
      'EXAMPLE: {title: "High Priority Tasks", filters: {filter: "priority >= 4", sortBy: ["due_date"]}}',
    inputSchema: FilterCreateJsonSchema,
  },
  {
    name: 'filter_update',
    description:
      'Update an existing saved filter. Modify title, description, favorite status, or criteria. Shows before/after comparison.',
    inputSchema: FilterUpdateJsonSchema,
  },
  {
    name: 'filter_delete',
    description:
      'Delete a saved filter permanently. Shows confirmation before deletion.',
    inputSchema: FilterDeleteJsonSchema,
  },
];
