/**
 * Subscription management tools for Vikunja MCP server
 * Implements: get, create, delete operations for entity subscriptions
 */

import { z } from 'zod';
import type { VikunjaClient } from '../client.js';

// =============================================================================
// Zod Schemas (for runtime validation)
// =============================================================================

const SubscriptionGetSchema = z.object({
  entity: z.enum(['task', 'project']).describe('Entity type to check subscription for'),
  entityId: z.number().describe('Entity ID (task ID or project ID)'),
});

const SubscriptionCreateSchema = z.object({
  entity: z.enum(['task', 'project']).describe('Entity type to subscribe to'),
  entityId: z.number().describe('Entity ID (task ID or project ID)'),
});

const SubscriptionDeleteSchema = z.object({
  entity: z.enum(['task', 'project']).describe('Entity type to unsubscribe from'),
  entityId: z.number().describe('Entity ID (task ID or project ID)'),
});

// =============================================================================
// Tool Functions
// =============================================================================

/**
 * Get subscription status for an entity
 */
export async function subscriptionGet(client: VikunjaClient, args: unknown): Promise<string> {
  const params = SubscriptionGetSchema.parse(args);

  try {
    const subscription = await client.getSubscription(params.entity, params.entityId);

    const lines: string[] = [];
    lines.push(`Subscription status for ${params.entity} ${params.entityId}:`);
    lines.push('');

    if (subscription && subscription.id) {
      lines.push('Status: ✓ Subscribed');
      lines.push(`Since: ${new Date(subscription.created).toLocaleString()}`);
      lines.push('');
      lines.push('You will receive notifications for updates to this ' + params.entity + '.');
    } else {
      lines.push('Status: ✗ Not subscribed');
      lines.push('');
      lines.push('You will NOT receive notifications for updates to this ' + params.entity + '.');
    }

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get subscription: ${message}`);
  }
}

/**
 * Subscribe to an entity (task or project)
 */
export async function subscriptionCreate(client: VikunjaClient, args: unknown): Promise<string> {
  const params = SubscriptionCreateSchema.parse(args);

  try {
    const subscription = await client.createSubscription(params.entity, params.entityId);

    return [
      `Subscribed to ${params.entity} ${params.entityId}`,
      '',
      'You will now receive notifications when this ' + params.entity + ' is updated.',
      '',
      `Subscription ID: ${subscription.id}`,
      `Created: ${new Date(subscription.created).toLocaleString()}`,
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create subscription: ${message}`);
  }
}

/**
 * Unsubscribe from an entity
 */
export async function subscriptionDelete(client: VikunjaClient, args: unknown): Promise<string> {
  const params = SubscriptionDeleteSchema.parse(args);

  try {
    await client.deleteSubscription(params.entity, params.entityId);

    return [
      `Unsubscribed from ${params.entity} ${params.entityId}`,
      '',
      'You will no longer receive notifications for this ' + params.entity + '.',
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete subscription: ${message}`);
  }
}

// =============================================================================
// JSON Schema Definitions (manually defined for MCP compatibility)
// =============================================================================

const SubscriptionGetJsonSchema = {
  type: 'object' as const,
  properties: {
    entity: {
      type: 'string' as const,
      enum: ['task', 'project'],
      description: 'Entity type to check subscription for',
    },
    entityId: {
      type: 'number' as const,
      description: 'Entity ID (task ID or project ID)',
    },
  },
  required: ['entity', 'entityId'],
};

const SubscriptionCreateJsonSchema = {
  type: 'object' as const,
  properties: {
    entity: {
      type: 'string' as const,
      enum: ['task', 'project'],
      description: 'Entity type to subscribe to (task or project)',
    },
    entityId: {
      type: 'number' as const,
      description: 'Entity ID (task ID or project ID)',
    },
  },
  required: ['entity', 'entityId'],
};

const SubscriptionDeleteJsonSchema = {
  type: 'object' as const,
  properties: {
    entity: {
      type: 'string' as const,
      enum: ['task', 'project'],
      description: 'Entity type to unsubscribe from',
    },
    entityId: {
      type: 'number' as const,
      description: 'Entity ID (task ID or project ID)',
    },
  },
  required: ['entity', 'entityId'],
};

// =============================================================================
// Tool Definitions Export
// =============================================================================

export const subscriptionTools = [
  {
    name: 'subscription_get',
    description:
      'Check subscription status for a task or project. Subscriptions send notifications on updates. ' +
      'EXAMPLE: {entity: "task", entityId: 123}',
    inputSchema: SubscriptionGetJsonSchema,
  },
  {
    name: 'subscription_create',
    description:
      'Subscribe to a task or project to receive notifications on updates. ' +
      'WHEN TO USE: Tracking important tasks/projects without manual checking. ' +
      'EXAMPLE: {entity: "project", entityId: 5}',
    inputSchema: SubscriptionCreateJsonSchema,
  },
  {
    name: 'subscription_delete',
    description:
      'Unsubscribe from a task or project. Stops notifications for updates. ' +
      'EXAMPLE: {entity: "task", entityId: 123}',
    inputSchema: SubscriptionDeleteJsonSchema,
  },
];
