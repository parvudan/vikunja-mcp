/**
 * Tool exports and aggregation
 * Provides a single interface for all MCP tools
 */

// Export all tool functions - Tasks
export {
  tasksList,
  tasksListAll,
  taskGet,
  taskCreate,
  taskUpdate,
  taskComplete,
  taskDelete,
  taskTools,
} from './tasks.js';

// Export all tool functions - Projects
export {
  projectsList,
  projectGet,
  projectCreate,
  projectUpdate,
  projectArchive,
  projectDelete,
  projectTools,
} from './projects.js';

// Export all tool functions - Labels
export {
  labelsList,
  labelGet,
  labelCreate,
  labelUpdate,
  labelDelete,
  labelAddToTask,
  labelRemoveFromTask,
  labelsBulkSetOnTask,
  labelTools,
} from './labels.js';

// Export all tool functions - Comments
export {
  commentsList,
  commentGet,
  commentCreate,
  commentUpdate,
  commentDelete,
  commentTools,
} from './comments.js';

// Export all tool functions - Assignees
export {
  assigneesList,
  assigneeAdd,
  assigneesAddBulk,
  assigneeRemove,
  assigneeTools,
} from './assignees.js';

// Export all tool functions - Relations
export {
  relationCreate,
  relationDelete,
  relationTools,
} from './relations.js';

// Export all tool functions - Filters
export {
  filterGet,
  filterCreate,
  filterUpdate,
  filterDelete,
  filterTools,
} from './filters.js';

// Export all tool functions - Bulk Operations
export {
  tasksBulkUpdate,
} from './bulk.js';

// Export all tool functions - Notifications
export {
  notificationsList,
  notificationGet,
  notificationDelete,
  notificationTools,
} from './notifications.js';

// Export all tool functions - Subscriptions
export {
  subscriptionGet,
  subscriptionCreate,
  subscriptionDelete,
  subscriptionTools,
} from './subscriptions.js';

// Export all tool functions - Info
export {
  infoGet,
  infoTools,
} from './info.js';

// Export all tool functions - Projects Advanced
export {
  projectDuplicate,
} from './projects-advanced.js';

// Export all tool functions - Views
export {
  viewsList,
  viewGet,
  viewCreate,
  viewUpdate,
  viewDelete,
  viewTools,
} from './views.js';

// Export all tool functions - Buckets
export {
  bucketsList,
  bucketCreate,
  bucketUpdate,
  bucketDelete,
  bucketTools,
} from './buckets.js';

// Re-export tool definitions
import { taskTools } from './tasks.js';
import { projectTools } from './projects.js';
import { labelTools } from './labels.js';
import { commentTools } from './comments.js';
import { assigneeTools } from './assignees.js';
import { relationTools } from './relations.js';
import { filterTools } from './filters.js';
import { notificationTools } from './notifications.js';
import { subscriptionTools } from './subscriptions.js';
import { infoTools } from './info.js';
import { viewTools } from './views.js';
import { bucketTools } from './buckets.js';

/**
 * Get all tool definitions for MCP server
 */
export function getToolDefinitions() {
  return [
    ...taskTools,
    ...projectTools,
    ...labelTools,
    ...commentTools,
    ...assigneeTools,
    ...relationTools,
    ...filterTools,
    ...notificationTools,
    ...subscriptionTools,
    ...infoTools,
    ...viewTools,
    ...bucketTools,
  ];
}
