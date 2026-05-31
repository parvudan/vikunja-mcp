/**
 * Server info tool for Vikunja MCP server
 * Implements: get server version and configuration information
 */

import { z } from 'zod';
import type { VikunjaClient } from '../client.js';

// =============================================================================
// Zod Schemas (for runtime validation)
// =============================================================================

const InfoGetSchema = z.object({
  // No parameters needed
});

// =============================================================================
// Tool Functions
// =============================================================================

/**
 * Get Vikunja server information
 */
export async function infoGet(client: VikunjaClient, args: unknown): Promise<string> {
  InfoGetSchema.parse(args);

  try {
    const info = await client.getServerInfo();

    const lines: string[] = [];
    lines.push('Vikunja Server Information');
    lines.push('');

    if (info.version) {
      lines.push(`Version: ${info.version}`);
    }

    if (info.frontend_url) {
      lines.push(`Frontend URL: ${info.frontend_url}`);
    }

    if (info.motd) {
      lines.push('');
      lines.push('Message of the Day:');
      lines.push(info.motd);
    }

    if (info.max_file_size) {
      lines.push('');
      lines.push(`Max File Upload Size: ${Math.round(info.max_file_size / 1024 / 1024)} MB`);
    }

    if (info.registration_enabled !== undefined) {
      lines.push(`Registration Enabled: ${info.registration_enabled ? 'Yes' : 'No'}`);
    }

    if (info.task_attachments_enabled !== undefined) {
      lines.push(`Task Attachments: ${info.task_attachments_enabled ? 'Enabled' : 'Disabled'}`);
    }

    if (info.email_reminders_enabled !== undefined) {
      lines.push(`Email Reminders: ${info.email_reminders_enabled ? 'Enabled' : 'Disabled'}`);
    }

    if (info.user_deletion_enabled !== undefined) {
      lines.push(`User Deletion: ${info.user_deletion_enabled ? 'Enabled' : 'Disabled'}`);
    }

    if (info.totp_enabled !== undefined) {
      lines.push(`Two-Factor Auth: ${info.totp_enabled ? 'Enabled' : 'Disabled'}`);
    }

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get server info: ${message}`);
  }
}

// =============================================================================
// JSON Schema Definitions (manually defined for MCP compatibility)
// =============================================================================

const InfoGetJsonSchema = {
  type: 'object' as const,
  properties: {},
};

// =============================================================================
// Tool Definitions Export
// =============================================================================

export const infoTools = [
  // Disabled: info_get is not necessary for typical workflows
  // Uncomment to re-enable:
  // {
  //   name: 'info_get',
  //   description:
  //     'Get Vikunja server information including version, settings, and capabilities. ' +
  //     'Useful for debugging, checking server features, or displaying server details.',
  //   inputSchema: InfoGetJsonSchema,
  // },
];
