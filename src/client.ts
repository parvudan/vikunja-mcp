/**
 * Vikunja API Client
 * Handles all HTTP communication with the Vikunja REST API
 */

import type { Config } from './config.js';
import type {
  Task,
  TaskCreateParams,
  TaskUpdateParams,
  TaskQueryParams,
  Project,
  ProjectCreateParams,
  ProjectUpdateParams,
  Label,
  LabelCreateParams,
  User,
  TaskComment,
  CommentParams,
  TaskAssignee,
  AssigneeParams,
  BulkAssigneesParams,
  TaskRelation,
  RelationParams,
  SavedFilter,
  SavedFilterParams,
  BulkTaskParams,
  Notification,
  Subscription,
  ServerInfo,
  ProjectView,
  ProjectViewParams,
  Bucket,
  BucketParams,
  ProjectDuplicateResult,
  APIError,
} from './types.js';

/**
 * VikunjaClient handles communication with the Vikunja API
 */
export class VikunjaClient {
  private apiToken: string;
  private apiUrl: string;
  private verifySsl: boolean;

  constructor(config: Config) {
    this.apiToken = config.apiToken;
    // Remove trailing slash for consistent URL building
    // Note: apiUrl should include the full API path (e.g., https://vikunja.com/api/v1)
    this.apiUrl = config.apiUrl.replace(/\/$/, '');
    this.verifySsl = config.verifySsl;
  }

  /**
   * Make an HTTP request to the Vikunja API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean | string[] | undefined>
  ): Promise<T> {
    // Build URL with query parameters
    // apiUrl already includes /api/v1, so just append the path
    let url = `${this.apiUrl}${path}`;

    if (queryParams) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, String(v)));
          } else {
            params.append(key, String(value));
          }
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    console.error(`[Client] ${method} ${url}`);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        // @ts-ignore - Node.js fetch supports rejectUnauthorized
        ...(this.verifySsl ? {} : { rejectUnauthorized: false }),
      });

      // Handle non-2xx responses
      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = (await response.json()) as APIError;
          errorMessage = errorData.message || response.statusText;
        } catch {
          errorMessage = response.statusText;
        }
        throw new Error(
          `Vikunja API error (${response.status}): ${errorMessage}`
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`[Client] Request failed: ${error.message}`);
        throw error;
      }
      throw new Error(`Unknown error during API request: ${String(error)}`);
    }
  }

  // ============================================================================
  // Tasks API
  // ============================================================================

  /**
   * Get all tasks across all projects
   * @param params Query parameters for filtering, sorting, pagination
   */
  async getTasks(params?: TaskQueryParams): Promise<Task[]> {
    return this.request<Task[]>('GET', '/tasks', undefined, params as Record<string, string | number | boolean | string[] | undefined>);
  }

  /**
   * Get a specific task by ID
   */
  async getTask(id: number): Promise<Task> {
    return this.request<Task>('GET', `/tasks/${id}`);
  }

  /**
   * Create a new task
   * @param projectId The project ID to create the task in
   * @param data Task creation parameters
   */
  async createTask(projectId: number, data: TaskCreateParams): Promise<Task> {
    return this.request<Task>('PUT', `/projects/${projectId}/tasks`, data);
  }

  /**
   * Update an existing task
   */
  async updateTask(id: number, data: TaskUpdateParams): Promise<Task> {
    return this.request<Task>('POST', `/tasks/${id}`, data);
  }

  /**
   * Delete a task
   */
  async deleteTask(id: number): Promise<void> {
    await this.request<void>('DELETE', `/tasks/${id}`);
  }

  /**
   * Get tasks for a specific project
   */
  async getProjectTasks(projectId: number, params?: TaskQueryParams): Promise<Task[]> {
    return this.request<Task[]>('GET', `/projects/${projectId}/tasks`, undefined, params as Record<string, string | number | boolean | string[] | undefined>);
  }

  // ============================================================================
  // Projects API
  // ============================================================================

  /**
   * Get all projects
   * @param includeArchived If true, includes archived projects in results. If false, returns only non-archived.
   */
  async getProjects(includeArchived = false): Promise<Project[]> {
    const params: Record<string, string | boolean> = {};
    if (includeArchived) {
      params.is_archived = true;
    }
    return this.request<Project[]>('GET', '/projects', undefined, params);
  }

  /**
   * Get a specific project by ID
   */
  async getProject(id: number): Promise<Project> {
    return this.request<Project>('GET', `/projects/${id}`);
  }

  /**
   * Create a new project
   */
  async createProject(data: ProjectCreateParams): Promise<Project> {
    return this.request<Project>('PUT', '/projects', data);
  }

  /**
   * Update an existing project
   */
  async updateProject(id: number, data: ProjectUpdateParams): Promise<Project> {
    return this.request<Project>('POST', `/projects/${id}`, data);
  }

  /**
   * Delete a project
   */
  async deleteProject(id: number): Promise<void> {
    await this.request<void>('DELETE', `/projects/${id}`);
  }

  // ============================================================================
  // Labels API
  // ============================================================================

  /**
   * Get all labels
   */
  async getLabels(): Promise<Label[]> {
    return this.request<Label[]>('GET', '/labels');
  }

  /**
   * Get a specific label by ID
   */
  async getLabel(id: number): Promise<Label> {
    return this.request<Label>('GET', `/labels/${id}`);
  }

  /**
   * Create a new label
   */
  async createLabel(data: LabelCreateParams): Promise<Label> {
    return this.request<Label>('PUT', '/labels', data);
  }

  /**
   * Update an existing label
   */
  async updateLabel(id: number, data: Partial<LabelCreateParams>): Promise<Label> {
    return this.request<Label>('POST', `/labels/${id}`, data);
  }

  /**
   * Delete a label
   */
  async deleteLabel(id: number): Promise<void> {
    await this.request<void>('DELETE', `/labels/${id}`);
  }

  /**
   * Add a label to a task
   */
  async addLabelToTask(taskId: number, labelId: number): Promise<void> {
    await this.request('PUT', `/tasks/${taskId}/labels`, { label_id: labelId });
  }

  /**
   * Remove a label from a task
   */
  async removeLabelFromTask(taskId: number, labelId: number): Promise<void> {
    await this.request('DELETE', `/tasks/${taskId}/labels/${labelId}`);
  }

  /**
   * Set all labels on a task at once.
   * The bulk endpoint requires JWT auth and rejects API tokens in Vikunja v1.0.0+,
   * so we fall back to individual adds automatically.
   */
  async bulkSetLabelsOnTask(taskId: number, labelIds: number[]): Promise<Label[]> {
    try {
      const labels = labelIds.map(id => ({ id }));
      const response = await this.request<{ labels: Label[] }>('POST', `/tasks/${taskId}/labels/bulk`, { labels });
      return response.labels;
    } catch (error) {
      // Vikunja v1.0.0+: bulk label endpoint requires JWT, falls back to individual adds
      if (error instanceof Error && error.message.includes('401')) {
        console.error(`[Client] Bulk label endpoint requires JWT — falling back to individual adds`);
        const results: Label[] = [];
        for (const labelId of labelIds) {
          try {
            await this.request('PUT', `/tasks/${taskId}/labels`, { label_id: labelId });
          } catch (addError) {
            // 400 "already exists" is fine — label is on the task, which is what we want
            if (!(addError instanceof Error && addError.message.includes('400'))) {
              throw addError;
            }
          }
          results.push({ id: labelId } as Label);
        }
        return results;
      }
      throw error;
    }
  }

  // ============================================================================
  // Comments API
  // ============================================================================

  /**
   * Get all comments on a task
   */
  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    return this.request<TaskComment[]>('GET', `/tasks/${taskId}/comments`);
  }

  /**
   * Get a specific comment
   */
  async getComment(taskId: number, commentId: number): Promise<TaskComment> {
    return this.request<TaskComment>('GET', `/tasks/${taskId}/comments/${commentId}`);
  }

  /**
   * Create a comment on a task
   */
  async createComment(taskId: number, data: CommentParams): Promise<TaskComment> {
    return this.request<TaskComment>('PUT', `/tasks/${taskId}/comments`, data);
  }

  /**
   * Update a comment
   */
  async updateComment(taskId: number, commentId: number, data: CommentParams): Promise<TaskComment> {
    return this.request<TaskComment>('POST', `/tasks/${taskId}/comments/${commentId}`, data);
  }

  /**
   * Delete a comment
   */
  async deleteComment(taskId: number, commentId: number): Promise<void> {
    await this.request<void>('DELETE', `/tasks/${taskId}/comments/${commentId}`);
  }

  // ============================================================================
  // Assignees API
  // ============================================================================

  /**
   * Get all assignees for a task
   */
  async getTaskAssignees(taskId: number): Promise<User[]> {
    return this.request<User[]>('GET', `/tasks/${taskId}/assignees`);
  }

  /**
   * Assign a user to a task
   */
  async addAssignee(taskId: number, data: AssigneeParams): Promise<TaskAssignee> {
    return this.request<TaskAssignee>('PUT', `/tasks/${taskId}/assignees`, data);
  }

  /**
   * Assign multiple users to a task
   */
  async addAssigneesBulk(taskId: number, data: BulkAssigneesParams): Promise<TaskAssignee[]> {
    return this.request<TaskAssignee[]>('POST', `/tasks/${taskId}/assignees/bulk`, data);
  }

  /**
   * Remove an assignee from a task
   */
  async removeAssignee(taskId: number, userId: number): Promise<void> {
    await this.request<void>('DELETE', `/tasks/${taskId}/assignees/${userId}`);
  }

  // ============================================================================
  // Relations API
  // ============================================================================

  /**
   * Create a relation between two tasks
   */
  async createRelation(taskId: number, data: RelationParams): Promise<TaskRelation> {
    return this.request<TaskRelation>('PUT', `/tasks/${taskId}/relations`, data);
  }

  /**
   * Delete a relation between two tasks
   */
  async deleteRelation(taskId: number, relationKind: string, otherTaskId: number): Promise<void> {
    await this.request<void>('DELETE', `/tasks/${taskId}/relations/${relationKind}/${otherTaskId}`);
  }

  // ============================================================================
  // Saved Filters API
  // ============================================================================

  /**
   * Get a specific saved filter by ID
   */
  async getSavedFilter(id: number): Promise<SavedFilter> {
    return this.request<SavedFilter>('GET', `/filters/${id}`);
  }

  /**
   * Create a new saved filter
   */
  async createSavedFilter(data: SavedFilterParams): Promise<SavedFilter> {
    return this.request<SavedFilter>('PUT', '/filters', data);
  }

  /**
   * Update an existing saved filter
   */
  async updateSavedFilter(id: number, data: SavedFilterParams): Promise<SavedFilter> {
    return this.request<SavedFilter>('POST', `/filters/${id}`, data);
  }

  /**
   * Delete a saved filter
   */
  async deleteSavedFilter(id: number): Promise<void> {
    await this.request<void>('DELETE', `/filters/${id}`);
  }

  // ============================================================================
  // Bulk Operations API
  // ============================================================================

  /**
   * Update multiple tasks at once
   */
  async bulkUpdateTasks(data: BulkTaskParams): Promise<unknown> {
    return this.request<unknown>('POST', '/tasks/bulk', data);
  }

  // ============================================================================
  // Tasks - Additional Operations
  // ============================================================================

  /**
   * Get tasks from all projects the user has access to
   */
  async getAllTasks(queryParams?: any): Promise<Task[]> {
    let query = '';
    if (queryParams) {
      const params = new URLSearchParams();
      Object.keys(queryParams).forEach(key => {
        if (Array.isArray(queryParams[key])) {
          queryParams[key].forEach((val: string) => params.append(key, val));
        } else if (queryParams[key] !== undefined) {
          params.append(key, String(queryParams[key]));
        }
      });
      query = '?' + params.toString();
    }
    return this.request<Task[]>('GET', `/tasks${query}`);
  }

  // ============================================================================
  // Notifications API
  // ============================================================================

  /**
   * Get all notifications for the current user
   */
  async getNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>('GET', '/notifications');
  }

  /**
   * Get a specific notification
   */
  async getNotification(id: number): Promise<Notification> {
    return this.request<Notification>('GET', `/notifications/${id}`);
  }

  /**
   * Delete/dismiss a notification
   */
  async deleteNotification(id: number): Promise<void> {
    await this.request<void>('DELETE', `/notifications/${id}`);
  }

  // ============================================================================
  // Subscriptions API
  // ============================================================================

  /**
   * Get subscription status for an entity
   */
  async getSubscription(entity: string, entityId: number): Promise<Subscription | null> {
    try {
      return await this.request<Subscription>('GET', `/subscriptions/${entity}/${entityId}`);
    } catch (error) {
      // If not subscribed, API returns 404
      return null;
    }
  }

  /**
   * Subscribe to an entity (task or project)
   */
  async createSubscription(entity: string, entityId: number): Promise<Subscription> {
    return this.request<Subscription>('POST', `/subscriptions/${entity}/${entityId}`);
  }

  /**
   * Unsubscribe from an entity
   */
  async deleteSubscription(entity: string, entityId: number): Promise<void> {
    await this.request<void>('DELETE', `/subscriptions/${entity}/${entityId}`);
  }

  // ============================================================================
  // Server Info API
  // ============================================================================

  /**
   * Get server information
   */
  async getServerInfo(): Promise<ServerInfo> {
    return this.request<ServerInfo>('GET', '/info');
  }

  // ============================================================================
  // Project Views API
  // ============================================================================

  /**
   * Get all views for a project
   */
  async getProjectViews(projectId: number): Promise<ProjectView[]> {
    return this.request<ProjectView[]>('GET', `/projects/${projectId}/views`);
  }

  /**
   * Get a specific project view
   */
  async getProjectView(projectId: number, viewId: number): Promise<ProjectView> {
    return this.request<ProjectView>('GET', `/projects/${projectId}/views/${viewId}`);
  }

  /**
   * Create a new project view
   */
  async createProjectView(projectId: number, data: ProjectViewParams): Promise<ProjectView> {
    return this.request<ProjectView>('PUT', `/projects/${projectId}/views`, data);
  }

  /**
   * Update a project view
   */
  async updateProjectView(projectId: number, viewId: number, data: ProjectViewParams): Promise<ProjectView> {
    return this.request<ProjectView>('POST', `/projects/${projectId}/views/${viewId}`, data);
  }

  /**
   * Delete a project view
   */
  async deleteProjectView(projectId: number, viewId: number): Promise<void> {
    await this.request<void>('DELETE', `/projects/${projectId}/views/${viewId}`);
  }

  // ============================================================================
  // Buckets API
  // ============================================================================

  /**
   * Get all buckets for a project view
   */
  async getBuckets(projectId: number, viewId: number): Promise<Bucket[]> {
    return this.request<Bucket[]>('GET', `/projects/${projectId}/views/${viewId}/buckets`);
  }

  /**
   * Create a new bucket
   */
  async createBucket(projectId: number, viewId: number, data: BucketParams): Promise<Bucket> {
    return this.request<Bucket>('PUT', `/projects/${projectId}/views/${viewId}/buckets`, data);
  }

  /**
   * Update a bucket
   */
  async updateBucket(projectId: number, viewId: number, bucketId: number, data: BucketParams): Promise<Bucket> {
    return this.request<Bucket>('POST', `/projects/${projectId}/views/${viewId}/buckets/${bucketId}`, data);
  }

  /**
   * Delete a bucket
   */
  async deleteBucket(projectId: number, viewId: number, bucketId: number): Promise<void> {
    await this.request<void>('DELETE', `/projects/${projectId}/views/${viewId}/buckets/${bucketId}`);
  }

  // ============================================================================
  // Project Advanced Operations
  // ============================================================================

  /**
   * Duplicate a project
   * @param projectId The project to duplicate
   * @param parentProjectId Optional parent for the duplicated project. If not provided, preserves original parent.
   */
  async duplicateProject(projectId: number, parentProjectId?: number): Promise<ProjectDuplicateResult> {
    // If parentProjectId not specified, get the original project's parent to preserve it
    let parentToUse = parentProjectId;
    if (parentToUse === undefined) {
      const originalProject = await this.getProject(projectId);
      parentToUse = originalProject.parent_project_id;
    }

    const data: any = {
      parent_project_id: parentToUse,
    };

    return this.request<ProjectDuplicateResult>('PUT', `/projects/${projectId}/duplicate`, data);
  }
}
