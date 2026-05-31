/**
 * Project management tools for Vikunja MCP server
 * Implements: list, get, create, update, delete operations
 */

import { z } from 'zod';
import type { VikunjaClient } from '../client.js';
import { formatProject, formatProjectList, formatBeforeAfter } from './helpers.js';
import { config } from '../config.js';

// =============================================================================
// Zod Schemas (for runtime validation)
// =============================================================================

const ProjectsListSchema = z.object({
  show: z.enum(['active', 'archived', 'all']).optional().describe('Filter by archive status: "active" (default), "archived", or "all"'),
  filter: z.enum(['favorites', 'none']).optional().describe('Additional filter: "favorites" or "none" (default)'),
  parentProjectId: z.number().optional().describe('Filter by parent project ID'),
  search: z.string().optional().describe('Search in project title and description'),
  sortBy: z.enum(['title', 'created', 'updated', 'position']).optional().describe('Sort by field: title, created, updated, or position (default: position)'),
  sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction: asc (ascending) or desc (descending) (default: asc)'),
  limit: z.number().optional().describe('Maximum number of projects to return (default: all)'),
});

const ProjectGetSchema = z.object({
  id: z.number().describe('Project ID'),
});

const ProjectCreateSchema = z.object({
  title: z.string().min(1).describe('Project title (required)'),
  description: z.string().optional().describe('Project description'),
  parentProjectId: z.number().optional().describe('Parent project ID for nested projects'),
  hexColor: z.string().optional().describe('Color in hex format (e.g., #ff0000)'),
  isFavorite: z.boolean().optional().describe('Mark as favorite'),
});

const ProjectUpdateSchema = z.object({
  id: z.number().describe('Project ID to update'),
  title: z.string().min(1).optional().describe('New project title'),
  description: z.string().optional().describe('New project description'),
  parentProjectId: z.number().optional().describe('Move to different parent project (0 for top-level)'),
  hexColor: z.string().optional().describe('New color in hex format (e.g., #ff0000)'),
  isFavorite: z.boolean().optional().describe('Mark as favorite'),
  isArchived: z.boolean().optional().describe('Archive or unarchive the project'),
});

const ProjectDeleteSchema = z.object({
  id: z.number().describe('Project ID to delete'),
});

// =============================================================================
// Tool Functions
// =============================================================================

/**
 * List all projects
 */
export async function projectsList(client: VikunjaClient, args: unknown): Promise<string> {
  const params = ProjectsListSchema.parse(args);

  try {
    // Determine if we need to fetch archived projects
    const showFilter = params.show || 'active';
    const includeArchived = showFilter === 'all' || showFilter === 'archived';

    let projects = await client.getProjects(includeArchived);

    // Handle null response (when no projects exist)
    if (!projects || projects === null) {
      projects = [];
    }

    // Filter by archive status (client-side)
    if (showFilter === 'active') {
      projects = projects.filter(p => !p.is_archived);
    } else if (showFilter === 'archived') {
      projects = projects.filter(p => p.is_archived === true);
    }
    // 'all' = no filtering

    // Filter by favorites if specified
    if (params.filter === 'favorites') {
      projects = projects.filter(p => p.is_favorite === true);
    }

    // Filter by parent project ID if specified
    if (params.parentProjectId !== undefined) {
      projects = projects.filter(p => p.parent_project_id === params.parentProjectId);
    }

    // Search in title and description if specified
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      projects = projects.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        (p.description && p.description.toLowerCase().includes(searchLower))
      );
    }

    // Sort projects
    const sortBy = params.sortBy || 'position';
    const sortDirection = params.sortDirection || 'asc';

    projects.sort((a, b) => {
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
        case 'position':
        default:
          // Favorites first, then by position/ID
          if (a.is_favorite && !b.is_favorite) return -1;
          if (!a.is_favorite && b.is_favorite) return 1;
          if (a.position !== undefined && b.position !== undefined) {
            comparison = a.position - b.position;
          } else {
            comparison = a.id - b.id;
          }
          break;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    // Apply limit if specified
    if (params.limit !== undefined && params.limit > 0) {
      projects = projects.slice(0, params.limit);
    }

    return formatProjectList(projects);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list projects: ${message}`);
  }
}

/**
 * Get a single project by ID
 */
export async function projectGet(client: VikunjaClient, args: unknown): Promise<string> {
  const params = ProjectGetSchema.parse(args);

  try {
    const project = await client.getProject(params.id);
    return formatProject(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get project: ${message}`);
  }
}

/**
 * Create a new project
 */
export async function projectCreate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = ProjectCreateSchema.parse(args);

  try {
    const projectData: any = {
      title: params.title,
      description: params.description,
    };

    if (params.parentProjectId !== undefined) {
      projectData.parent_project_id = params.parentProjectId;
    }

    if (params.hexColor) {
      projectData.hex_color = params.hexColor;
    }

    if (params.isFavorite !== undefined) {
      projectData.is_favorite = params.isFavorite;
    }

    const project = await client.createProject(projectData);

    const lines: string[] = [];
    lines.push(`Created project "${project.title}"`);
    lines.push('');
    lines.push(`ID: ${project.id}`);
    if (project.parent_project_id) {
      lines.push(`Parent Project ID: ${project.parent_project_id}`);
    }
    if (project.description) {
      lines.push(`Description: ${project.description}`);
    }
    if (project.hex_color) {
      lines.push(`Color: ${project.hex_color}`);
    }
    if (project.is_favorite) {
      lines.push('⭐ Favorite');
    }
    lines.push('');
    lines.push('TIP: Use this project ID when creating tasks with tasks_create.');

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create project: ${message}`);
  }
}

/**
 * Update an existing project
 */
export async function projectUpdate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = ProjectUpdateSchema.parse(args);

  try {
    // Get current project state
    const projectBefore = await client.getProject(params.id);

    // Build update payload - always send all fields to preserve existing values
    // Only override fields that are explicitly provided
    const updateData: any = {
      title: params.title !== undefined ? params.title : projectBefore.title,
      description: params.description !== undefined ? params.description : projectBefore.description,
      parent_project_id: params.parentProjectId !== undefined ? params.parentProjectId : projectBefore.parent_project_id,
      hex_color: params.hexColor !== undefined ? params.hexColor : projectBefore.hex_color,
      is_favorite: params.isFavorite !== undefined ? params.isFavorite : projectBefore.is_favorite,
      is_archived: params.isArchived !== undefined ? params.isArchived : projectBefore.is_archived,
    };

    // Update project
    const projectAfter = await client.updateProject(params.id, updateData);

    // Format before/after comparison
    const lines: string[] = [];
    lines.push(`Updated project "${projectAfter.title}"`);
    lines.push('');

    if (params.title !== undefined) {
      lines.push(formatBeforeAfter('Title', projectBefore.title, projectAfter.title));
    }

    if (params.description !== undefined) {
      lines.push(formatBeforeAfter('Description', projectBefore.description, projectAfter.description));
    }

    if (params.parentProjectId !== undefined) {
      const beforeParent = projectBefore.parent_project_id || 'None (top-level)';
      const afterParent = projectAfter.parent_project_id || 'None (top-level)';
      lines.push(formatBeforeAfter('Parent Project', beforeParent, afterParent));
    }

    if (params.hexColor !== undefined) {
      lines.push(formatBeforeAfter('Color', projectBefore.hex_color, projectAfter.hex_color));
    }

    if (params.isFavorite !== undefined) {
      lines.push(formatBeforeAfter('Favorite', projectBefore.is_favorite, projectAfter.is_favorite));
    }

    if (params.isArchived !== undefined) {
      lines.push(formatBeforeAfter('Archived', projectBefore.is_archived, projectAfter.is_archived));
    }

    lines.push('');
    lines.push(`[ID: ${params.id}]`);

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update project: ${message}`);
  }
}

/**
 * Delete a project
 */
export async function projectDelete(client: VikunjaClient, args: unknown): Promise<string> {
  const params = ProjectDeleteSchema.parse(args);

  try {
    // Safety check: if deletion is disabled, archive instead
    if (!config.enableProjectDelete) {
      const result = await projectArchive(client, args);
      return [
        'WARNING: PROJECT DELETION IS DISABLED',
        '',
        'Project has been ARCHIVED instead of deleted (safe mode).',
        'All project data and tasks are preserved.',
        '',
        'To enable permanent deletion, set ENABLE_PROJECT_DELETE=true in .env',
        '',
        '---',
        '',
        result,
      ].join('\n');
    }

    // Get project info before deletion
    const project = await client.getProject(params.id);

    // Delete the project
    await client.deleteProject(params.id);

    return [
      `Deleted project "${project.title}"`,
      '',
      `ID: ${params.id}`,
      '',
      'WARNING: All tasks in this project were also deleted.',
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete project: ${message}`);
  }
}

/**
 * Archive a project (safe alternative to deletion)
 */
export async function projectArchive(client: VikunjaClient, args: unknown): Promise<string> {
  const ProjectArchiveSchema = z.object({
    id: z.number().describe('Project ID to archive'),
  });

  const params = ProjectArchiveSchema.parse(args);

  try {
    // Get current project state
    const projectBefore = await client.getProject(params.id);

    if (projectBefore.is_archived) {
      return [
        `Project "${projectBefore.title}" is already archived.`,
        '',
        `ID: ${params.id}`,
        '',
        'TIP: Use project_update with isArchived: false to unarchive.',
      ].join('\n');
    }

    // Archive the project using update
    const projectAfter = await client.updateProject(params.id, {
      title: projectBefore.title,
      description: projectBefore.description,
      parent_project_id: projectBefore.parent_project_id,
      hex_color: projectBefore.hex_color,
      is_favorite: projectBefore.is_favorite,
      is_archived: true,
    });

    return [
      `Archived project "${projectAfter.title}"`,
      '',
      `ID: ${params.id}`,
      '',
      'The project and all its tasks are now archived and hidden from normal views.',
      'TIP: Use projects_list with show: "archived" to see archived projects.',
      'TIP: Use project_update with isArchived: false to unarchive.',
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to archive project: ${message}`);
  }
}

// =============================================================================
// JSON Schema Definitions (manually defined for MCP compatibility)
// =============================================================================

const ProjectsListJsonSchema = {
  type: 'object' as const,
  properties: {
    show: {
      type: 'string' as const,
      enum: ['active', 'archived', 'all'],
      description: 'Filter by archive status: "active" (default) shows only active projects, "archived" shows only archived projects, "all" shows both',
    },
    filter: {
      type: 'string' as const,
      enum: ['favorites', 'none'],
      description: 'Additional filter: "favorites" shows only favorite projects, "none" (default) shows all projects',
    },
    parentProjectId: {
      type: 'number' as const,
      description: 'Filter by parent project ID (show only children of this project)',
    },
    search: {
      type: 'string' as const,
      description: 'Search query to filter projects by title or description',
    },
    sortBy: {
      type: 'string' as const,
      enum: ['title', 'created', 'updated', 'position'],
      description: 'Sort by field: title (alphabetical), created (creation date), updated (last modified), position (custom order). Default: position',
    },
    sortDirection: {
      type: 'string' as const,
      enum: ['asc', 'desc'],
      description: 'Sort direction: asc (ascending/A-Z/oldest first) or desc (descending/Z-A/newest first). Default: asc',
    },
    limit: {
      type: 'number' as const,
      description: 'Maximum number of projects to return. Omit or use 0 for all projects.',
    },
  },
};

const ProjectGetJsonSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'number' as const,
      description: 'Project ID',
    },
  },
  required: ['id'],
};

const ProjectCreateJsonSchema = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      description: 'Project title (required)',
    },
    description: {
      type: 'string' as const,
      description: 'Project description',
    },
    parentProjectId: {
      type: 'number' as const,
      description: 'Parent project ID for nested/hierarchical projects (optional)',
    },
    hexColor: {
      type: 'string' as const,
      description: 'Color in hex format (e.g., #ff0000)',
    },
    isFavorite: {
      type: 'boolean' as const,
      description: 'Mark as favorite',
    },
  },
  required: ['title'],
};

const ProjectUpdateJsonSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'number' as const,
      description: 'Project ID to update',
    },
    title: {
      type: 'string' as const,
      description: 'New project title',
    },
    description: {
      type: 'string' as const,
      description: 'New project description',
    },
    parentProjectId: {
      type: 'number' as const,
      description: 'Move to different parent project. Use 0 or null for top-level project.',
    },
    hexColor: {
      type: 'string' as const,
      description: 'New color in hex format (e.g., #ff0000)',
    },
    isFavorite: {
      type: 'boolean' as const,
      description: 'Mark as favorite',
    },
    isArchived: {
      type: 'boolean' as const,
      description: 'Archive or unarchive the project',
    },
  },
  required: ['id'],
};

const ProjectArchiveJsonSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'number' as const,
      description: 'Project ID to archive',
    },
  },
  required: ['id'],
};

const ProjectDeleteJsonSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'number' as const,
      description: 'Project ID to delete',
    },
  },
  required: ['id'],
};

// =============================================================================
// Tool Definitions Export
// =============================================================================

export const projectTools = [
  {
    name: 'projects_list',
    description:
      'List projects with comprehensive filtering and sorting. Shows active projects by default, sorted by position. ' +
      'FILTERS: show ("active"|"archived"|"all"), filter ("favorites"|"none"), parentProjectId, search. ' +
      'SORTING: sortBy (title|created|updated|position), sortDirection (asc|desc). ' +
      'PAGINATION: limit (max results). ' +
      'WHEN TO USE: Finding project IDs, searching, listing favorites/archived, viewing hierarchy, sorting by date/name. ' +
      'EXAMPLES: {filter: "favorites", sortBy: "updated", sortDirection: "desc"} | {show: "archived", sortBy: "title"} | {search: "Q1", limit: 10}',
    inputSchema: ProjectsListJsonSchema,
  },
  {
    name: 'project_get',
    description:
      'Get complete details of a specific project by ID. Returns title, description, color, owner, parent, and timestamps. ' +
      'WHEN TO USE: Viewing full project details or checking project hierarchy.',
    inputSchema: ProjectGetJsonSchema,
  },
  {
    name: 'project_create',
    description:
      'Create a new project. Only requires title. Supports description, colors, favorites, and hierarchical nesting via parentProjectId. ' +
      'WHEN TO USE: Creating workspaces, organizing tasks, setting up hierarchies. ' +
      'EXAMPLE: {title: "Q1 2026", description: "First quarter goals", hexColor: "#3498db"}',
    inputSchema: ProjectCreateJsonSchema,
  },
  {
    name: 'project_update',
    description:
      'Update an existing project. Modify title, description, parent, color, favorite, or archive status. Shows before/after comparison. ' +
      'EXAMPLE: {id: 8, isArchived: true}',
    inputSchema: ProjectUpdateJsonSchema,
  },
  {
    name: 'project_archive',
    description:
      'Archive a project and all its tasks. Archived projects are hidden from normal views but can be restored. Safe alternative to deletion. ' +
      'WHEN TO USE: Completing projects, hiding old work, preserving data while decluttering. ' +
      'EXAMPLE: {id: 5}',
    inputSchema: ProjectArchiveJsonSchema,
  },
  {
    name: 'project_delete',
    description:
      'Permanently delete a project and ALL its tasks. Cannot be undone. ' +
      'Prefer project_archive to preserve data. ' +
      'WHEN TO USE: Only for test data, duplicates, or unwanted projects.',
    inputSchema: ProjectDeleteJsonSchema,
  },
  {
    name: 'project_duplicate',
    description:
      'Duplicate a project with all contents (tasks, labels, relations, attachments, boards, permissions). ' +
      'WHEN TO USE: Creating templates or backups. ' +
      'EXAMPLE: {projectId: 5, parentProjectId: 10} copies project 5 under project 10.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'number' as const,
          description: 'Project ID to duplicate',
        },
        parentProjectId: {
          type: 'number' as const,
          description: 'Parent project ID for the new copy (optional - leave blank for root level)',
        },
      },
      required: ['projectId'],
    },
  },
];
