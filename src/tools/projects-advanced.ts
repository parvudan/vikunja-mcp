/**
 * Advanced project management tools for Vikunja MCP server
 * Implements: duplicate operation
 */

import { z } from 'zod';
import type { VikunjaClient } from '../client.js';

// =============================================================================
// Zod Schemas (for runtime validation)
// =============================================================================

const ProjectDuplicateSchema = z.object({
  projectId: z.number().describe('Project ID to duplicate'),
  parentProjectId: z.number().optional().describe('Parent project ID for the new copy (optional)'),
});

// =============================================================================
// Tool Functions
// =============================================================================

/**
 * Duplicate an existing project with all its contents
 */
export async function projectDuplicate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = ProjectDuplicateSchema.parse(args);

  try {
    // Get original project info
    const originalProject = await client.getProject(params.projectId);

    // Duplicate the project
    const result = await client.duplicateProject(params.projectId, params.parentProjectId);

    const lines: string[] = [];
    lines.push(`Successfully duplicated project "${originalProject.title}"`);
    lines.push('');
    lines.push('Original Project:');
    lines.push(`  Title: ${originalProject.title}`);
    lines.push(`  ID: ${params.projectId}`);
    lines.push('');
    lines.push('New Project:');
    lines.push(`  Title: ${result.duplicated_project.title}`);
    lines.push(`  ID: ${result.duplicated_project.id}`);

    if (params.parentProjectId) {
      lines.push(`  Parent Project ID: ${params.parentProjectId}`);
    }

    lines.push('');
    lines.push('The following have been copied:');
    lines.push('  - All tasks');
    lines.push('  - Task assignees');
    lines.push('  - Task comments');
    lines.push('  - Task labels');
    lines.push('  - Task relations');
    lines.push('  - Task attachments');
    lines.push('  - Kanban buckets and views');
    lines.push('  - User/team permissions');
    lines.push('  - Link shares');
    lines.push('');
    lines.push('TIP: Use projects_get to see the new project details.');

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to duplicate project: ${message}`);
  }
}

// =============================================================================
// JSON Schema Definitions (manually defined for MCP compatibility)
// =============================================================================

const ProjectDuplicateJsonSchema = {
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
};

// =============================================================================
// Tool Definitions Export
// =============================================================================

export const projectsAdvancedTools = [
  {
    name: 'project_duplicate',
    description:
      'Duplicate a project with all contents (tasks, labels, relations, attachments, boards, permissions). ' +
      'WHEN TO USE: Creating templates or backups. ' +
      'EXAMPLE: {projectId: 5, parentProjectId: 10} copies project 5 under project 10.',
    inputSchema: ProjectDuplicateJsonSchema,
  },
];
