/**
 * Shared utility functions for tool implementations
 */

import type { Task, Project, Label } from '../types.js';

/**
 * Format a date string to a human-readable format
 */
function isNullDate(dateStr: string): boolean {
  // Vikunja uses 0001-01-01T00:00:00Z to represent "no date set"
  return dateStr.startsWith('0001-01-01');
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr || isNullDate(dateStr)) return 'None';

  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}

export function hasDate(dateStr: string | undefined): boolean {
  return !!dateStr && !isNullDate(dateStr);
}

/**
 * Format priority as a human-readable string
 * Vikunja priorities: Higher number = higher priority
 */
export function formatPriority(priority: number): string {
  if (priority === 0) return 'None';
  if (priority === 1) return 'Low';
  if (priority === 2) return 'Medium';
  if (priority === 3) return 'High';
  if (priority >= 4) return 'Urgent';
  return String(priority);
}

/**
 * Format a task for display (content-first, ID last pattern)
 */
export function formatTask(task: Task): string {
  const lines: string[] = [];

  // Title (most important)
  lines.push(task.title);
  lines.push('');

  // Description (if present)
  if (task.description && task.description.trim()) {
    lines.push(task.description);
    lines.push('');
  }

  // Key metadata
  if (hasDate(task.due_date)) {
    lines.push(`Due: ${formatDate(task.due_date)}`);
  }

  if (task.priority > 0) {
    lines.push(`Priority: ${formatPriority(task.priority)}`);
  }

  if (task.done) {
    lines.push(`Status: Completed ${task.done_at ? `(${formatDate(task.done_at)})` : ''}`);
  } else {
    lines.push('Status: Incomplete');
  }

  if (task.percent_done !== undefined && task.percent_done > 0) {
    lines.push(`Progress: ${task.percent_done}%`);
  }

  lines.push(`Project ID: ${task.project_id}`);

  // Labels (if present)
  if (task.labels && task.labels.length > 0) {
    lines.push(`Labels: ${task.labels.map(l => l.title).join(', ')}`);
  }

  // Assignees (if present)
  if (task.assignees && task.assignees.length > 0) {
    lines.push(`Assignees: ${task.assignees.map(a => a.username).join(', ')}`);
  }

  // Subtasks (if present)
  const subtasks = task.related_tasks?.subtask;
  if (subtasks && subtasks.length > 0) {
    lines.push(`Subtasks (${subtasks.length}):`);
    subtasks.forEach(st => {
      const status = st.done ? '✓' : '○';
      lines.push(`  ${status} ${st.title} [ID: ${st.id}]`);
    });
  }

  // ID at the end
  lines.push('');
  lines.push(`[Task ID: ${task.id}, Project ID: ${task.project_id}]`);

  return lines.join('\n');
}

/**
 * Format a list of tasks for display
 */
export function formatTaskList(tasks: Task[], limit?: number): string {
  if (tasks.length === 0) {
    return 'No tasks found.';
  }

  const displayTasks = limit && limit > 0 ? tasks.slice(0, limit) : tasks;
  const lines: string[] = [];

  lines.push(`Found ${tasks.length} task(s)`);
  if (limit && tasks.length > limit) {
    lines.push(`Showing first ${limit} results`);
  }
  lines.push('');

  displayTasks.forEach((task, index) => {
    lines.push(`${index + 1}. ${task.title}`);

    // Add key info on same line
    const info: string[] = [];
    if (task.done) {
      info.push('✓ Done');
    }
    if (hasDate(task.due_date)) {
      info.push(`Due: ${formatDate(task.due_date)}`);
    }
    if (task.priority > 0) {
      info.push(`Priority: ${formatPriority(task.priority)}`);
    }

    const subtasks = task.related_tasks?.subtask;
    if (subtasks && subtasks.length > 0) {
      const done = subtasks.filter(s => s.done).length;
      info.push(`${done}/${subtasks.length} subtasks done`);
    }

    if (info.length > 0) {
      lines.push(`   ${info.join(' | ')}`);
    }

    lines.push(`   [Task ID: ${task.id}, Project ID: ${task.project_id}]`);

    // Show subtasks inline
    if (subtasks && subtasks.length > 0) {
      subtasks.forEach(st => {
        const status = st.done ? '✓' : '○';
        lines.push(`     ${status} ${st.title} [Task ID: ${st.id}]`);
      });
    }

    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Format a project for display
 */
export function formatProject(project: Project): string {
  const lines: string[] = [];

  lines.push(project.title);
  lines.push('');

  if (project.description) {
    lines.push(project.description);
    lines.push('');
  }

  if (project.parent_project_id) {
    lines.push(`Parent Project ID: ${project.parent_project_id}`);
  }

  if (project.hex_color) {
    lines.push(`Color: ${project.hex_color}`);
  }

  if (project.is_archived) {
    lines.push('Status: Archived');
  }

  if (project.is_favorite) {
    lines.push('⭐ Favorite');
  }

  lines.push(`Owner: ${project.owner.username}`);
  lines.push(`Created: ${formatDate(project.created)}`);
  lines.push('');
  lines.push(`[ID: ${project.id}]`);

  return lines.join('\n');
}

/**
 * Format a list of projects for display
 */
export function formatProjectList(projects: Project[]): string {
  if (projects.length === 0) {
    return 'No projects found.';
  }

  const lines: string[] = [];
  lines.push(`Found ${projects.length} project(s)`);
  lines.push('');

  projects.forEach((project, index) => {
    const info: string[] = [];
    if (project.is_favorite) info.push('⭐');
    if (project.is_archived) info.push('Archived');
    if (project.parent_project_id) info.push(`Parent: ${project.parent_project_id}`);

    lines.push(`${index + 1}. ${project.title}${info.length > 0 ? ' (' + info.join(', ') + ')' : ''}`);
    lines.push(`   [ID: ${project.id}]`);
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Format a label for display
 */
export function formatLabel(label: Label): string {
  const lines: string[] = [];

  lines.push(label.title);
  lines.push('');

  if (label.description) {
    lines.push(label.description);
    lines.push('');
  }

  if (label.hex_color) {
    lines.push(`Color: ${label.hex_color}`);
  }

  lines.push(`Created: ${formatDate(label.created)}`);
  lines.push('');
  lines.push(`[ID: ${label.id}]`);

  return lines.join('\n');
}

/**
 * Format a list of labels for display
 */
export function formatLabelList(labels: Label[]): string {
  if (labels.length === 0) {
    return 'No labels found.';
  }

  const lines: string[] = [];
  lines.push(`Found ${labels.length} label(s)`);
  lines.push('');

  labels.forEach((label, index) => {
    const colorInfo = label.hex_color ? ` (${label.hex_color})` : '';
    lines.push(`${index + 1}. ${label.title}${colorInfo}`);
    lines.push(`   [ID: ${label.id}]`);
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Parse and validate a date string
 * Accepts formats: YYYY-MM-DD, ISO 8601
 */
export function parseDate(dateStr: string): string {
  // Try to parse the date
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: "${dateStr}". Use YYYY-MM-DD or ISO 8601 format.`);
  }

  // Return ISO 8601 format for API
  return date.toISOString();
}

/**
 * Format before/after comparison for updates
 */
export function formatBeforeAfter(
  label: string,
  before: string | number | boolean | undefined,
  after: string | number | boolean | undefined
): string {
  const beforeStr = before !== undefined ? String(before) : 'None';
  const afterStr = after !== undefined ? String(after) : 'None';

  if (beforeStr === afterStr) {
    return `${label}: ${beforeStr} (unchanged)`;
  }

  return `${label}:\n  Before: ${beforeStr}\n  After:  ${afterStr}`;
}
