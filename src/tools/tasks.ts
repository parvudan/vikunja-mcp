/**
 * Task management tools for Vikunja MCP server
 * Implements: list, get, create, update, delete operations
 */

import { z } from 'zod';
import type { VikunjaClient } from '../client.js';
import type { Task } from '../types.js';
import { formatTask, formatTaskList, formatBeforeAfter, parseDate, formatDate } from './helpers.js';
import { config, webBaseUrl } from '../config.js';

// =============================================================================
// Zod Schemas (for runtime validation)
// =============================================================================

const TasksListSchema = z.object({
  projectId: z.number().optional().describe('Filter by project ID'),
  show: z.enum(['incomplete', 'completed', 'all']).optional().describe('Filter by completion status: "incomplete" (default), "completed", or "all"'),
  search: z.string().optional().describe('Search query to filter tasks by title or description'),
  sortBy: z.enum(['due_date', 'priority', 'created', 'updated', 'title']).optional().describe('Sort by field: due_date, priority, created, updated, or title (default: due_date)'),
  sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction: asc (ascending) or desc (descending) (default: asc)'),
  limit: z.number().default(50).describe('Max results (default: 50, 0 for all)'),
});

const TasksListAllSchema = z.object({
  show: z.enum(['incomplete', 'completed', 'all']).optional().describe('Filter by completion status: "incomplete" (default), "completed", or "all"'),
  search: z.string().optional().describe('Search query to filter tasks by title or description'),
  filter: z.string().optional().describe('Advanced filter query (see Vikunja filter docs)'),
  sortBy: z.enum(['due_date', 'priority', 'created', 'updated', 'title']).optional().describe('Sort by field: due_date, priority, created, updated, or title (default: due_date)'),
  sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction: asc (ascending) or desc (descending) (default: asc)'),
  limit: z.number().default(100).describe('Max results (default: 100, 0 for all)'),
});

const TaskGetSchema = z.object({
  id: z.number().describe('Task ID'),
});

const TaskCreateSchema = z.object({
  title: z.string().min(1).describe('Task title (required)'),
  description: z.string().optional().describe('Task description'),
  projectId: z.number().optional().describe('Project ID (required if not using default inbox)'),
  dueDate: z.string().optional().describe('Due date (YYYY-MM-DD or ISO 8601)'),
  priority: z.number().min(0).max(5).optional().describe('Priority: 0=None, 1=Low, 2=Medium, 3=High, 4+=Urgent'),
  startDate: z.string().optional().describe('Start date (YYYY-MM-DD or ISO 8601)'),
  endDate: z.string().optional().describe('End date (YYYY-MM-DD or ISO 8601)'),
});

const TaskUpdateSchema = z.object({
  id: z.number().describe('Task ID to update'),
  title: z.string().min(1).optional().describe('New task title'),
  description: z.string().optional().describe('New task description'),
  done: z.boolean().optional().describe('Mark as done (true) or not done (false)'),
  dueDate: z.string().optional().describe('New due date (YYYY-MM-DD or ISO 8601)'),
  priority: z.number().min(0).max(5).optional().describe('New priority: 0=None, 1=Low, 2=Medium, 3=High, 4+=Urgent'),
  percentDone: z.number().min(0).max(100).optional().describe('Progress percentage (0-100)'),
  projectId: z.number().optional().describe('Move task to a different project. Use projects_list to find the target project ID.'),
});

const TaskDeleteSchema = z.object({
  id: z.number().describe('Task ID to delete'),
});

// =============================================================================
// Tool Functions
// =============================================================================

/**
 * List tasks with optional filtering
 */
export async function tasksList(client: VikunjaClient, args: unknown): Promise<string> {
  const params = TasksListSchema.parse(args);

  try {
    let tasks: Task[];

    // Fetch from specific project or all tasks
    if (params.projectId) {
      tasks = await client.getProjectTasks(params.projectId);
    } else {
      tasks = await client.getTasks();
    }

    // Handle null response (when no tasks exist)
    if (!tasks || tasks === null) {
      tasks = [];
    }

    // Apply filters
    let filtered = tasks;

    // Filter by completion status
    const showFilter = params.show || 'incomplete';
    if (showFilter === 'incomplete') {
      filtered = filtered.filter(t => !t.done);
    } else if (showFilter === 'completed') {
      filtered = filtered.filter(t => t.done === true);
    }
    // 'all' = no filtering

    // Apply search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(searchLower) ||
        (t.description && t.description.toLowerCase().includes(searchLower))
      );
    }

    // Sort tasks
    const sortBy = params.sortBy || 'due_date';
    const sortDirection = params.sortDirection || 'asc';

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'due_date':
          // Tasks with due dates first, then by date
          if (a.due_date && !b.due_date) return sortDirection === 'asc' ? -1 : 1;
          if (!a.due_date && b.due_date) return sortDirection === 'asc' ? 1 : -1;
          if (a.due_date && b.due_date) {
            comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          } else {
            comparison = 0;
          }
          break;
        case 'priority':
          comparison = (b.priority || 0) - (a.priority || 0); // Higher priority first
          break;
        case 'created':
          comparison = new Date(a.created).getTime() - new Date(b.created).getTime();
          break;
        case 'updated':
          comparison = new Date(a.updated).getTime() - new Date(b.updated).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return formatTaskList(filtered, params.limit, webBaseUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list tasks: ${message}`);
  }
}

/**
 * List tasks across ALL projects the user has access to
 */
export async function tasksListAll(client: VikunjaClient, args: unknown): Promise<string> {
  const params = TasksListAllSchema.parse(args);

  try {
    // Build query parameters
    const queryParams: any = {};

    if (params.search) {
      queryParams.s = params.search;
    }

    if (params.filter) {
      queryParams.filter = params.filter;
    }

    // Get tasks from all projects
    const tasks = await client.getAllTasks(queryParams);

    // Handle null response (when no tasks exist)
    if (!tasks || tasks === null) {
      return 'No tasks found.';
    }

    // Apply completion filter
    let filtered = tasks;
    const showFilter = params.show || 'incomplete';
    if (showFilter === 'incomplete') {
      filtered = filtered.filter(t => !t.done);
    } else if (showFilter === 'completed') {
      filtered = filtered.filter(t => t.done === true);
    }
    // 'all' = no filtering

    // Sort tasks
    const sortBy = params.sortBy || 'due_date';
    const sortDirection = params.sortDirection || 'asc';

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'due_date':
          // Tasks with due dates first, then by date
          if (a.due_date && !b.due_date) return sortDirection === 'asc' ? -1 : 1;
          if (!a.due_date && b.due_date) return sortDirection === 'asc' ? 1 : -1;
          if (a.due_date && b.due_date) {
            comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          } else {
            comparison = 0;
          }
          break;
        case 'priority':
          comparison = (b.priority || 0) - (a.priority || 0); // Higher priority first
          break;
        case 'created':
          comparison = new Date(a.created).getTime() - new Date(b.created).getTime();
          break;
        case 'updated':
          comparison = new Date(a.updated).getTime() - new Date(b.updated).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return formatTaskList(filtered, params.limit, webBaseUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list all tasks: ${message}`);
  }
}

/**
 * Get a single task by ID
 */
export async function taskGet(client: VikunjaClient, args: unknown): Promise<string> {
  const params = TaskGetSchema.parse(args);

  try {
    const task = await client.getTask(params.id);
    return formatTask(task, webBaseUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get task: ${message}`);
  }
}

/**
 * Create a new task
 */
export async function taskCreate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = TaskCreateSchema.parse(args);

  // Validate project ID is provided
  if (!params.projectId) {
    throw new Error('projectId is required. Use projects_list to find available project IDs.');
  }

  try {
    // Parse dates if provided
    const taskData: any = {
      title: params.title,
      description: params.description,
      priority: params.priority ?? 0,
    };

    if (params.dueDate) {
      taskData.due_date = parseDate(params.dueDate);
    }

    if (params.startDate) {
      taskData.start_date = parseDate(params.startDate);
    }

    if (params.endDate) {
      taskData.end_date = parseDate(params.endDate);
    }

    const task = await client.createTask(params.projectId, taskData);

    const lines: string[] = [];
    lines.push(`Created task "${task.title}"`);
    lines.push('');
    lines.push(`ID: ${task.id}`);
    lines.push(`Project ID: ${task.project_id}`);
    if (task.due_date) {
      lines.push(`Due Date: ${task.due_date.split('T')[0]}`);
    }
    if (task.priority > 0) {
      lines.push(`Priority: ${task.priority}`);
    }
    lines.push('');
    lines.push('TIP: Use tasks_get to view full task details.');

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create task: ${message}`);
  }
}

/**
 * Update an existing task
 */
export async function taskUpdate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = TaskUpdateSchema.parse(args);

  try {
    // Get current task state
    const taskBefore = await client.getTask(params.id);

    // Build update payload - always send all fields to preserve existing values
    // Only override fields that are explicitly provided
    const updateData: any = {
      title: params.title !== undefined ? params.title : taskBefore.title,
      description: params.description !== undefined ? params.description : taskBefore.description,
      done: params.done !== undefined ? params.done : taskBefore.done,
      due_date: params.dueDate !== undefined ? parseDate(params.dueDate) : taskBefore.due_date,
      priority: params.priority !== undefined ? params.priority : taskBefore.priority,
      percent_done: params.percentDone !== undefined ? params.percentDone : taskBefore.percent_done,
      ...(params.projectId !== undefined && { project_id: params.projectId }),
    };

    // Update task
    const taskAfter = await client.updateTask(params.id, updateData);

    // Format before/after comparison
    const lines: string[] = [];
    lines.push(`Updated task "${taskAfter.title}"`);
    lines.push('');

    if (params.title !== undefined) {
      lines.push(formatBeforeAfter('Title', taskBefore.title, taskAfter.title));
    }

    if (params.description !== undefined) {
      lines.push(formatBeforeAfter('Description', taskBefore.description, taskAfter.description));
    }

    if (params.done !== undefined) {
      lines.push(formatBeforeAfter('Status', taskBefore.done ? 'Done' : 'Not Done', taskAfter.done ? 'Done' : 'Not Done'));
    }

    if (params.dueDate !== undefined) {
      lines.push(formatBeforeAfter('Due Date', taskBefore.due_date?.split('T')[0], taskAfter.due_date?.split('T')[0]));
    }

    if (params.priority !== undefined) {
      lines.push(formatBeforeAfter('Priority', taskBefore.priority, taskAfter.priority));
    }

    if (params.percentDone !== undefined) {
      lines.push(formatBeforeAfter('Progress', taskBefore.percent_done, taskAfter.percent_done));
    }

    if (params.projectId !== undefined) {
      lines.push(formatBeforeAfter('Project ID', taskBefore.project_id, taskAfter.project_id));
    }

    lines.push('');
    lines.push(`[Task ID: ${params.id}, Project ID: ${taskAfter.project_id}]`);

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update task: ${message}`);
  }
}

/**
 * Delete a task
 */
export async function taskDelete(client: VikunjaClient, args: unknown): Promise<string> {
  const params = TaskDeleteSchema.parse(args);

  try {
    // Safety check: if deletion is disabled, mark as complete instead
    if (!config.enableTaskDelete) {
      const result = await taskComplete(client, args);
      return [
        'WARNING: TASK DELETION IS DISABLED',
        '',
        'Task has been MARKED AS COMPLETE instead of deleted (safe mode).',
        'All task data is preserved.',
        '',
        'To enable permanent deletion, set ENABLE_TASK_DELETE=true in .env',
        '',
        '---',
        '',
        result,
      ].join('\n');
    }

    // Get task info before deletion
    const task = await client.getTask(params.id);

    // Delete the task
    await client.deleteTask(params.id);

    return [
      `Deleted task "${task.title}"`,
      '',
      `ID: ${params.id}`,
      `Project ID: ${task.project_id}`,
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete task: ${message}`);
  }
}

/**
 * Mark a task as complete (safe alternative to deletion)
 */
export async function taskComplete(client: VikunjaClient, args: unknown): Promise<string> {
  const TaskCompleteSchema = z.object({
    id: z.number().describe('Task ID to mark as complete'),
  });

  const params = TaskCompleteSchema.parse(args);

  try {
    // Get current task state
    const taskBefore = await client.getTask(params.id);

    if (taskBefore.done) {
      return [
        `Task "${taskBefore.title}" is already marked as complete.`,
        '',
        `ID: ${params.id}`,
        `Completed: ${formatDate(taskBefore.done_at)}`,
        '',
        'TIP: Use task_update with done: false to mark as incomplete.',
      ].join('\n');
    }

    // Mark task as complete using update
    const taskAfter = await client.updateTask(params.id, {
      title: taskBefore.title,
      description: taskBefore.description,
      done: true,
      due_date: taskBefore.due_date,
      priority: taskBefore.priority,
      percent_done: 100,
    });

    return [
      `Marked task "${taskAfter.title}" as complete`,
      '',
      `ID: ${params.id}`,
      `Project ID: ${taskAfter.project_id}`,
      `Completed: ${formatDate(taskAfter.done_at)}`,
      '',
      'TIP: Use tasks_list with show: "completed" to see completed tasks.',
      'TIP: Use task_update with done: false to mark as incomplete.',
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to mark task as complete: ${message}`);
  }
}

// =============================================================================
// JSON Schema Definitions (manually defined for MCP compatibility)
// =============================================================================

const TasksListJsonSchema = {
  type: 'object' as const,
  properties: {
    projectId: {
      type: 'number' as const,
      description: 'Filter by project ID',
    },
    show: {
      type: 'string' as const,
      enum: ['incomplete', 'completed', 'all'],
      description: 'Filter by completion status: "incomplete" (default) shows only incomplete tasks, "completed" shows only completed tasks, "all" shows both',
    },
    search: {
      type: 'string' as const,
      description: 'Search query to filter tasks by title or description',
    },
    sortBy: {
      type: 'string' as const,
      enum: ['due_date', 'priority', 'created', 'updated', 'title'],
      description: 'Sort by field: due_date (default), priority (higher first), created (creation date), updated (last modified), title (alphabetical)',
    },
    sortDirection: {
      type: 'string' as const,
      enum: ['asc', 'desc'],
      description: 'Sort direction: asc (ascending/oldest first) or desc (descending/newest first). Default: asc',
    },
    limit: {
      type: 'number' as const,
      description: 'Max results (default: 50, 0 for all)',
    },
  },
};

const TasksListAllJsonSchema = {
  type: 'object' as const,
  properties: {
    show: {
      type: 'string' as const,
      enum: ['incomplete', 'completed', 'all'],
      description: 'Filter by completion status: "incomplete" (default) shows only incomplete tasks, "completed" shows only completed tasks, "all" shows both',
    },
    search: {
      type: 'string' as const,
      description: 'Search query to filter tasks by title or description',
    },
    filter: {
      type: 'string' as const,
      description: 'Advanced filter query (see Vikunja filter documentation for syntax)',
    },
    sortBy: {
      type: 'string' as const,
      enum: ['due_date', 'priority', 'created', 'updated', 'title'],
      description: 'Sort by field: due_date (default), priority (higher first), created (creation date), updated (last modified), title (alphabetical)',
    },
    sortDirection: {
      type: 'string' as const,
      enum: ['asc', 'desc'],
      description: 'Sort direction: asc (ascending/oldest first) or desc (descending/newest first). Default: asc',
    },
    limit: {
      type: 'number' as const,
      description: 'Max results (default: 100, 0 for all)',
    },
  },
};

const TaskGetJsonSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'number' as const,
      description: 'Task ID',
    },
  },
  required: ['id'],
};

const TaskCreateJsonSchema = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      description: 'Task title (required)',
    },
    description: {
      type: 'string' as const,
      description: 'Task description',
    },
    projectId: {
      type: 'number' as const,
      description: 'Project ID (required - use projects_list to find IDs)',
    },
    dueDate: {
      type: 'string' as const,
      description: 'Due date (YYYY-MM-DD or ISO 8601)',
    },
    priority: {
      type: 'number' as const,
      description: 'Priority: 0=None, 1=Low, 2=Medium, 3=High, 4+=Urgent',
    },
    startDate: {
      type: 'string' as const,
      description: 'Start date (YYYY-MM-DD or ISO 8601)',
    },
    endDate: {
      type: 'string' as const,
      description: 'End date (YYYY-MM-DD or ISO 8601)',
    },
  },
  required: ['title', 'projectId'],
};

const TaskUpdateJsonSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'number' as const,
      description: 'Task ID to update',
    },
    title: {
      type: 'string' as const,
      description: 'New task title',
    },
    description: {
      type: 'string' as const,
      description: 'New task description',
    },
    done: {
      type: 'boolean' as const,
      description: 'Mark as done (true) or not done (false)',
    },
    dueDate: {
      type: 'string' as const,
      description: 'New due date (YYYY-MM-DD or ISO 8601)',
    },
    priority: {
      type: 'number' as const,
      description: 'New priority: 0=None, 1=Low, 2=Medium, 3=High, 4+=Urgent',
    },
    percentDone: {
      type: 'number' as const,
      description: 'Progress percentage (0-100)',
    },
    projectId: {
      type: 'number' as const,
      description: 'Move task to a different project by providing the new project ID. Use projects_list to find IDs.',
    },
  },
  required: ['id'],
};

const TaskCompleteJsonSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'number' as const,
      description: 'Task ID to mark as complete',
    },
  },
  required: ['id'],
};

const TaskDeleteJsonSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'number' as const,
      description: 'Task ID to delete',
    },
  },
  required: ['id'],
};

// =============================================================================
// Tool Definitions Export
// =============================================================================

export const taskTools = [
  {
    name: 'tasks_list',
    description:
      'List tasks with comprehensive filtering and sorting. Shows incomplete tasks by default, sorted by due date. ' +
      'FILTERS: projectId, show ("incomplete"|"completed"|"all"), search. ' +
      'SORTING: sortBy (due_date|priority|created|updated|title), sortDirection (asc|desc). ' +
      'PAGINATION: limit (default: 50). ' +
      'WHEN TO USE: Finding tasks in a project, checking due tasks, searching tasks, viewing completed work. ' +
      'EXAMPLES: {projectId: 5, search: "urgent"} | {show: "completed", sortBy: "updated", sortDirection: "desc"} | {sortBy: "priority", sortDirection: "desc", limit: 10}',
    inputSchema: TasksListJsonSchema,
  },
  {
    name: 'tasks_list_all',
    description:
      'List tasks across ALL projects with comprehensive filtering and sorting. Shows incomplete tasks by default. ' +
      'FILTERS: show ("incomplete"|"completed"|"all"), search, filter (advanced Vikunja syntax). ' +
      'SORTING: sortBy (due_date|priority|created|updated|title), sortDirection (asc|desc). ' +
      'PAGINATION: limit (default: 100). ' +
      'WHEN TO USE: Searching across projects, finding tasks when project unknown, global overview, advanced filtering. ' +
      'EXAMPLES: {filter: "priority >= 4", sortBy: "due_date"} | {show: "all", sortBy: "updated", sortDirection: "desc"} | {search: "bug", sortBy: "priority", sortDirection: "desc"}',
    inputSchema: TasksListAllJsonSchema,
  },
  {
    name: 'task_get',
    description:
      'Get complete details of a specific task by ID. Returns full information including title, description, dates, priority, assignees, labels, comments. ' +
      'WHEN TO USE: Reading full task details after listing tasks, or when you have a task ID.',
    inputSchema: TaskGetJsonSchema,
  },
  {
    name: 'task_create',
    description:
      'Create a new task in a project. Requires title and projectId. Supports due dates, priority (0-5), descriptions, and dates. ' +
      'WHEN TO USE: Adding new tasks, creating to-do items, setting up work. ' +
      'EXAMPLE: {title: "Review PR #42", projectId: 5, dueDate: "2026-01-15", priority: 3}',
    inputSchema: TaskCreateJsonSchema,
  },
  {
    name: 'task_update',
    description:
      'Update an existing task. Modify title, description, completion status, dates, priority, or progress. Shows before/after comparison. ' +
      'WHEN TO USE: Marking done, changing due dates, updating progress, adjusting priority. ' +
      'EXAMPLE: {id: 123, done: true, percentDone: 100}',
    inputSchema: TaskUpdateJsonSchema,
  },
  {
    name: 'task_complete',
    description:
      'Mark a task as complete. Sets done: true and percent_done: 100. Safe alternative to deletion preserves all task data. ' +
      'WHEN TO USE: Finishing tasks, closing work items, maintaining completion history. ' +
      'EXAMPLE: {id: 123}',
    inputSchema: TaskCompleteJsonSchema,
  },
  {
    name: 'task_delete',
    description:
      'Permanently delete a task and ALL associated data (comments, relations, labels). Cannot be undone. ' +
      'Prefer task_complete to preserve history. ' +
      'WHEN TO USE: Only for test data, duplicates, or unwanted tasks.',
    inputSchema: TaskDeleteJsonSchema,
  },
  {
    name: 'tasks_bulk_update',
    description:
      'Update multiple tasks atomically with the same values. Efficient for batch operations. ' +
      'All tasks must be writable. The fields array must match keys in values object. ' +
      'WHEN TO USE: Marking many tasks done, changing priority/project, organizing in kanban, marking favorites. ' +
      'EXAMPLE: {taskIds: [1, 2, 3], fields: ["done"], values: {done: true}}',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskIds: {
          type: 'array' as const,
          items: { type: 'number' as const },
          description: 'Array of task IDs to update (required)',
        },
        fields: {
          type: 'array' as const,
          items: { type: 'string' as const },
          description: 'Array of field names to update (must match keys in values object)',
        },
        values: {
          type: 'object' as const,
          properties: {
            title: { type: 'string' as const, description: 'New title for all tasks' },
            description: { type: 'string' as const, description: 'New description for all tasks' },
            done: { type: 'boolean' as const, description: 'Mark all tasks as done (true) or not done (false)' },
            dueDate: { type: 'string' as const, description: 'New due date for all tasks (YYYY-MM-DD or ISO 8601)' },
            priority: { type: 'number' as const, description: 'New priority: 0=None, 1=Low, 2=Medium, 3=High, 4+=Urgent' },
            projectId: { type: 'number' as const, description: 'Move all tasks to this project ID' },
            hexColor: { type: 'string' as const, description: 'Color code in hex format (e.g., "#ff0000")' },
            repeatAfter: { type: 'number' as const, description: 'Repeat interval in seconds' },
            repeatMode: { type: 'number' as const, description: 'Repeat mode: 0=after completion, 1=monthly, 2=from current date' },
            bucketId: { type: 'number' as const, description: 'Kanban bucket/column ID for task positioning' },
            position: { type: 'number' as const, description: 'Position/order number within the list or bucket' },
            isFavorite: { type: 'boolean' as const, description: 'Mark all tasks as favorite (true) or unfavorite (false)' },
          },
          description: 'New values to apply to all specified tasks. Only include fields you want to update.',
        },
      },
      required: ['taskIds', 'fields', 'values'],
    },
  },
];
