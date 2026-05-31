/**
 * Notification management tools for Vikunja MCP server
 * Implements: list, get, delete operations for notifications
 */

import { z } from 'zod';
import type { VikunjaClient } from '../client.js';

// =============================================================================
// Zod Schemas (for runtime validation)
// =============================================================================

const NotificationsListSchema = z.object({
  limit: z.number().default(50).describe('Max results (default: 50, 0 for all)'),
});

const NotificationGetSchema = z.object({
  id: z.number().describe('Notification ID'),
});

const NotificationDeleteSchema = z.object({
  id: z.number().describe('Notification ID to delete/dismiss'),
});

// =============================================================================
// Tool Functions
// =============================================================================

/**
 * List all notifications
 */
export async function notificationsList(client: VikunjaClient, args: unknown): Promise<string> {
  const params = NotificationsListSchema.parse(args);

  try {
    const notifications = await client.getNotifications();

    // Handle null response (when no notifications exist)
    if (!notifications || notifications === null || notifications.length === 0) {
      return 'No notifications found.';
    }

    const lines: string[] = [];
    lines.push(`Found ${notifications.length} notification(s)`);
    lines.push('');

    const display = params.limit === 0 ? notifications : notifications.slice(0, params.limit);

    display.forEach((notif, index) => {
      lines.push(`${index + 1}. ${notif.name || 'Notification'}`);
      if (notif.notification) {
        lines.push(`   ${notif.notification}`);
      }
      lines.push(`   Created: ${new Date(notif.created).toLocaleString()}`);
      lines.push(`   Read: ${notif.read_at ? 'Yes' : 'No'}`);
      lines.push(`   [ID: ${notif.id}]`);
      lines.push('');
    });

    if (params.limit > 0 && notifications.length > params.limit) {
      lines.push(`... and ${notifications.length - params.limit} more`);
    }

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list notifications: ${message}`);
  }
}

/**
 * Get a specific notification
 */
export async function notificationGet(client: VikunjaClient, args: unknown): Promise<string> {
  const params = NotificationGetSchema.parse(args);

  try {
    const notif = await client.getNotification(params.id);

    const lines: string[] = [];
    lines.push(`Notification: ${notif.name || 'Untitled'}`);
    lines.push('');

    if (notif.notification) {
      lines.push(`Message: ${notif.notification}`);
      lines.push('');
    }

    lines.push(`Created: ${new Date(notif.created).toLocaleString()}`);
    lines.push(`Read: ${notif.read_at ? `Yes (${new Date(notif.read_at).toLocaleString()})` : 'No'}`);
    lines.push('');
    lines.push(`[ID: ${notif.id}]`);

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get notification: ${message}`);
  }
}

/**
 * Delete/dismiss a notification
 */
export async function notificationDelete(client: VikunjaClient, args: unknown): Promise<string> {
  const params = NotificationDeleteSchema.parse(args);

  try {
    // Get notification info before deletion
    const notif = await client.getNotification(params.id);

    // Delete the notification
    await client.deleteNotification(params.id);

    return [
      `Dismissed notification: ${notif.name || 'Untitled'}`,
      '',
      `ID: ${params.id}`,
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete notification: ${message}`);
  }
}

// =============================================================================
// JSON Schema Definitions (manually defined for MCP compatibility)
// =============================================================================

const NotificationsListJsonSchema = {
  type: 'object' as const,
  properties: {
    limit: {
      type: 'number' as const,
      description: 'Max results (default: 50, 0 for all)',
    },
  },
};

const NotificationGetJsonSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'number' as const,
      description: 'Notification ID',
    },
  },
  required: ['id'],
};

const NotificationDeleteJsonSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'number' as const,
      description: 'Notification ID to delete/dismiss',
    },
  },
  required: ['id'],
};

// =============================================================================
// Tool Definitions Export
// =============================================================================

export const notificationTools = [
  {
    name: 'notifications_list',
    description:
      'List all notifications for current user. Shows unread and read notifications. ' +
      'WHEN TO USE: Checking updates on task changes, comments, and assignments.',
    inputSchema: NotificationsListJsonSchema,
  },
  {
    name: 'notification_get',
    description:
      'Get details of a specific notification by ID. Shows full message and read status.',
    inputSchema: NotificationGetJsonSchema,
  },
  {
    name: 'notification_delete',
    description:
      'Dismiss/delete a notification. Use to clear notifications after reading.',
    inputSchema: NotificationDeleteJsonSchema,
  },
];
