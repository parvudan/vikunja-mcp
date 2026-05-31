/**
 * TypeScript types for Vikunja API
 * Based on Vikunja API docs.json (Swagger 2.0)
 */

/**
 * User represents a Vikunja user
 */
export interface User {
  id: number;
  username: string;
  name?: string;
  email?: string;
  created: string;
  updated: string;
}

/**
 * Project represents a Vikunja project (previously called "list" in older versions)
 */
export interface Project {
  id: number;
  title: string;
  description?: string;
  owner: User;
  parent_project_id?: number;
  created: string;
  updated: string;
  is_archived?: boolean;
  is_favorite?: boolean;
  hex_color?: string;
  position?: number;
}

/**
 * Label represents a task label/tag
 */
export interface Label {
  id: number;
  title: string;
  description?: string;
  hex_color?: string;
  created_by: User;
  created: string;
  updated: string;
}

/**
 * TaskAttachment represents a file attached to a task
 */
export interface TaskAttachment {
  id: number;
  task_id: number;
  file_id: number;
  created_by: User;
  created: string;
}

/**
 * TaskComment represents a comment on a task
 */
export interface TaskComment {
  id: number;
  comment: string;
  author: User;
  task_id: number;
  created: string;
  updated: string;
}

/**
 * TaskReminder represents a reminder for a task
 */
export interface TaskReminder {
  id: number;
  reminder: string; // ISO 8601 date
  relative_to?: string;
  relative_period?: number;
}

/**
 * Task represents a Vikunja task
 */
export interface Task {
  id: number;
  title: string;
  description?: string;
  done: boolean;
  done_at?: string;
  due_date?: string;
  start_date?: string;
  end_date?: string;
  priority: number;
  percent_done?: number;
  project_id: number;
  created: string;
  updated: string;
  created_by: User;

  // Extended fields (may require 'expand' parameter)
  assignees?: User[];
  labels?: Label[];
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  reminders?: TaskReminder[];
  related_tasks?: RelatedTaskMap;
  reactions?: ReactionMap;
  bucket_id?: number;
  position?: number;
  hex_color?: string;
  repeat_after?: number;
  repeat_mode?: TaskRepeatMode;
  is_favorite?: boolean;
  comment_count?: number;
  cover_image_attachment_id?: number;
}

/**
 * TaskAssignee represents an assignment of a user to a task
 */
export interface TaskAssignee {
  id?: number;
  user_id: number;
  task_id?: number;
  assignee?: User;
  created?: string;
}

/**
 * RelationKind defines the type of relationship between tasks
 */
export enum RelationKind {
  Unknown = 'unknown',
  Subtask = 'subtask',
  ParentTask = 'parenttask',
  Related = 'related',
  DuplicateOf = 'duplicateof',
  Duplicates = 'duplicates',
  Blocking = 'blocking',
  Blocked = 'blocked',
  Precedes = 'precedes',
  Follows = 'follows',
  CopiedFrom = 'copiedfrom',
  CopiedTo = 'copiedto',
}

/**
 * TaskRelation represents a relationship between two tasks
 */
export interface TaskRelation {
  task_id: number;
  other_task_id: number;
  relation_kind: RelationKind | string;
  created_by?: User;
  created?: string;
  // The related task object (when fetched)
  other_task?: Task;
}

/**
 * TaskRepeatMode defines how a task repeats
 */
export enum TaskRepeatMode {
  RepeatAfter = 0,
  RepeatMonthly = 1,
  RepeatFromCurrentDate = 2,
}

/**
 * RelatedTaskMap maps relation kinds to related tasks
 */
export interface RelatedTaskMap {
  [relationKind: string]: Task[];
}

/**
 * ReactionMap maps reaction values to users who reacted
 */
export interface ReactionMap {
  [reaction: string]: User[];
}

/**
 * TaskCreateParams for creating a new task
 */
export interface TaskCreateParams {
  title: string;
  description?: string;
  project_id?: number;
  done?: boolean;
  due_date?: string;
  priority?: number;
  labels?: number[]; // Label IDs
  assignees?: number[]; // User IDs
  start_date?: string;
  end_date?: string;
  repeat_after?: number;
  hex_color?: string;
  percent_done?: number;
}

/**
 * TaskUpdateParams for updating an existing task
 */
export interface TaskUpdateParams {
  title?: string;
  description?: string;
  done?: boolean;
  due_date?: string;
  priority?: number;
  start_date?: string;
  end_date?: string;
  repeat_after?: number;
  hex_color?: string;
  percent_done?: number;
  bucket_id?: number;
  position?: number;
  project_id?: number;
}

/**
 * ProjectCreateParams for creating a new project
 */
export interface ProjectCreateParams {
  title: string;
  description?: string;
  parent_project_id?: number;
  hex_color?: string;
  is_archived?: boolean;
  is_favorite?: boolean;
}

/**
 * ProjectUpdateParams for updating an existing project
 */
export interface ProjectUpdateParams {
  title?: string;
  description?: string;
  parent_project_id?: number;
  hex_color?: string;
  is_archived?: boolean;
  is_favorite?: boolean;
}

/**
 * LabelCreateParams for creating a new label
 */
export interface LabelCreateParams {
  title: string;
  description?: string;
  hex_color?: string;
}

/**
 * API Error Response
 */
export interface APIError {
  code: number;
  message: string;
}

/**
 * Pagination headers returned by the API
 */
export interface PaginationHeaders {
  'x-pagination-total-pages'?: string;
  'x-pagination-result-count'?: string;
}

/**
 * Task filter/query parameters for listing tasks
 */
export interface TaskQueryParams {
  page?: number;
  per_page?: number;
  s?: string; // Search query
  filter?: string; // Filter query
  filter_by?: string[];
  filter_value?: string[];
  filter_comparator?: string[];
  filter_concat?: string;
  filter_include_nulls?: boolean;
  sort_by?: string[];
  order_by?: string[];
}

/**
 * Comment create/update params
 */
export interface CommentParams {
  comment: string;
}

/**
 * Assignee create params
 */
export interface AssigneeParams {
  user_id: number;
}

/**
 * Bulk assignees params
 */
export interface BulkAssigneesParams {
  assignees: Array<{ user_id: number }>;
}

/**
 * Relation create params
 */
export interface RelationParams {
  other_task_id: number;
  relation_kind: RelationKind | string;
}

/**
 * TaskCollection represents filter criteria for tasks
 */
export interface TaskCollection {
  filter?: string;
  filter_include_nulls?: boolean;
  order_by?: string[];
  s?: string;
  sort_by?: string[];
}

/**
 * SavedFilter represents a saved filter/view in Vikunja
 */
export interface SavedFilter {
  id: number;
  title: string;
  description?: string;
  filters: TaskCollection;
  is_favorite: boolean;
  owner: User;
  created: string;
  updated: string;
}

/**
 * SavedFilter create/update params
 */
export interface SavedFilterParams {
  title?: string;
  description?: string;
  filters?: TaskCollection;
  is_favorite?: boolean;
}

/**
 * BulkTask represents bulk task update parameters
 */
export interface BulkTaskParams {
  task_ids: number[];
  field: string;
  value: unknown;
}

/**
 * RepeatMode enum for the repeat_mode field in Task
 */
export enum RepeatMode {
  RepeatAfter = 0,
  RepeatMonthly = 1,
  RepeatFromCurrentDate = 2,
}

/**
 * Notification represents a user notification
 */
export interface Notification {
  id: number;
  name?: string;
  notification?: string;
  read: boolean;
  read_at?: string;
  created: string;
}

/**
 * Subscription represents a subscription to an entity (task or project)
 */
export interface Subscription {
  id: number;
  entity: string;
  entity_id: number;
  created: string;
  user?: User;
}

/**
 * ServerInfo represents Vikunja server information
 */
export interface ServerInfo {
  version?: string;
  frontend_url?: string;
  motd?: string;
  max_file_size?: number;
  registration_enabled?: boolean;
  task_attachments_enabled?: boolean;
  email_reminders_enabled?: boolean;
  user_deletion_enabled?: boolean;
  totp_enabled?: boolean;
}

/**
 * ProjectView represents a view in a project (list, kanban, gantt, table)
 */
export interface ProjectView {
  id: number;
  title: string;
  project_id: number;
  view_kind: string;
  filter?: string;
  position: number;
  bucket_configuration_mode?: number;
  default_bucket_id?: number;
  done_bucket_id?: number;
  created: string;
  updated: string;
}

/**
 * ProjectView create/update params
 */
export interface ProjectViewParams {
  title?: string;
  view_kind?: string;
  filter?: string;
  position?: number;
}

/**
 * Bucket represents a kanban column
 */
export interface Bucket {
  id: number;
  title: string;
  project_view_id: number;
  limit: number;
  position: number;
  count?: number;
  created: string;
  updated: string;
  created_by?: User;
  tasks?: Task[];
}

/**
 * Bucket create/update params
 */
export interface BucketParams {
  title?: string;
  limit?: number;
  position?: number;
}

/**
 * ProjectDuplicate result
 */
export interface ProjectDuplicateResult {
  duplicated_project: Project;
  parent_project_id?: number;
}
