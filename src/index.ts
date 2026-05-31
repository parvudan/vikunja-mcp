#!/usr/bin/env node
/**
 * Vikunja MCP Server
 * Supports stdio transport (Claude Desktop) and Streamable HTTP transport (OpenWebUI, remote clients).
 * Set PORT env var to enable HTTP mode; omit for stdio mode.
 */

import { config as dotenvConfig } from 'dotenv';
if (!process.env.VIKUNJA_URL || !process.env.VIKUNJA_API_TOKEN) {
  dotenvConfig({ debug: false });
}

import http from 'http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { config } from './config.js';
import { VikunjaClient } from './client.js';
import {
  getToolDefinitions,
  tasksList, tasksListAll, taskGet, taskCreate, taskUpdate, taskComplete, taskDelete,
  projectsList, projectGet, projectCreate, projectUpdate, projectArchive, projectDelete, projectDuplicate,
  labelsList, labelGet, labelCreate, labelUpdate, labelDelete,
  labelAddToTask, labelRemoveFromTask, labelsBulkSetOnTask,
  commentsList, commentGet, commentCreate, commentUpdate, commentDelete,
  assigneesList, assigneeAdd, assigneesAddBulk, assigneeRemove,
  relationCreate, relationDelete,
  filterGet, filterCreate, filterUpdate, filterDelete,
  tasksBulkUpdate,
  notificationsList, notificationGet, notificationDelete,
  subscriptionGet, subscriptionCreate, subscriptionDelete,
  infoGet,
  viewsList, viewGet, viewCreate, viewUpdate, viewDelete,
  bucketsList, bucketCreate, bucketUpdate, bucketDelete,
} from './tools/index.js';

const vikunjaClient = new VikunjaClient(config);

// ---------------------------------------------------------------------------
// MCP server factory — one instance per HTTP request (stateless) or one for stdio
// ---------------------------------------------------------------------------

function createMcpServer(): Server {
  const server = new Server(
    { name: 'vikunja-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getToolDefinitions(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.error(`[Server] Tool call: ${name}`);

    try {
      let result: string;
      switch (name) {
        case 'tasks_list':          result = await tasksList(vikunjaClient, args ?? {}); break;
        case 'task_get':            result = await taskGet(vikunjaClient, args ?? {}); break;
        case 'task_create':         result = await taskCreate(vikunjaClient, args ?? {}); break;
        case 'task_update':         result = await taskUpdate(vikunjaClient, args ?? {}); break;
        case 'task_complete':       result = await taskComplete(vikunjaClient, args ?? {}); break;
        case 'task_delete':         result = await taskDelete(vikunjaClient, args ?? {}); break;
        case 'tasks_list_all':      result = await tasksListAll(vikunjaClient, args ?? {}); break;
        case 'projects_list':       result = await projectsList(vikunjaClient, args ?? {}); break;
        case 'project_get':         result = await projectGet(vikunjaClient, args ?? {}); break;
        case 'project_create':      result = await projectCreate(vikunjaClient, args ?? {}); break;
        case 'project_update':      result = await projectUpdate(vikunjaClient, args ?? {}); break;
        case 'project_archive':     result = await projectArchive(vikunjaClient, args ?? {}); break;
        case 'project_delete':      result = await projectDelete(vikunjaClient, args ?? {}); break;
        case 'project_duplicate':   result = await projectDuplicate(vikunjaClient, args ?? {}); break;
        case 'labels_list':         result = await labelsList(vikunjaClient, args ?? {}); break;
        case 'label_get':           result = await labelGet(vikunjaClient, args ?? {}); break;
        case 'label_create':        result = await labelCreate(vikunjaClient, args ?? {}); break;
        case 'label_update':        result = await labelUpdate(vikunjaClient, args ?? {}); break;
        case 'label_delete':        result = await labelDelete(vikunjaClient, args ?? {}); break;
        case 'label_add_to_task':   result = await labelAddToTask(vikunjaClient, args ?? {}); break;
        case 'label_remove_from_task': result = await labelRemoveFromTask(vikunjaClient, args ?? {}); break;
        case 'labels_bulk_set_on_task': result = await labelsBulkSetOnTask(vikunjaClient, args ?? {}); break;
        case 'comments_list':       result = await commentsList(vikunjaClient, args ?? {}); break;
        case 'comment_get':         result = await commentGet(vikunjaClient, args ?? {}); break;
        case 'comment_create':      result = await commentCreate(vikunjaClient, args ?? {}); break;
        case 'comment_update':      result = await commentUpdate(vikunjaClient, args ?? {}); break;
        case 'comment_delete':      result = await commentDelete(vikunjaClient, args ?? {}); break;
        case 'assignees_list':      result = await assigneesList(vikunjaClient, args ?? {}); break;
        case 'assignee_add':        result = await assigneeAdd(vikunjaClient, args ?? {}); break;
        case 'assignees_add_bulk':  result = await assigneesAddBulk(vikunjaClient, args ?? {}); break;
        case 'assignee_remove':     result = await assigneeRemove(vikunjaClient, args ?? {}); break;
        case 'relation_create':     result = await relationCreate(vikunjaClient, args ?? {}); break;
        case 'relation_delete':     result = await relationDelete(vikunjaClient, args ?? {}); break;
        case 'filter_get':          result = await filterGet(vikunjaClient, args ?? {}); break;
        case 'filter_create':       result = await filterCreate(vikunjaClient, args ?? {}); break;
        case 'filter_update':       result = await filterUpdate(vikunjaClient, args ?? {}); break;
        case 'filter_delete':       result = await filterDelete(vikunjaClient, args ?? {}); break;
        case 'tasks_bulk_update':   result = await tasksBulkUpdate(vikunjaClient, args ?? {}); break;
        case 'notifications_list':  result = await notificationsList(vikunjaClient, args ?? {}); break;
        case 'notification_get':    result = await notificationGet(vikunjaClient, args ?? {}); break;
        case 'notification_delete': result = await notificationDelete(vikunjaClient, args ?? {}); break;
        case 'subscription_get':    result = await subscriptionGet(vikunjaClient, args ?? {}); break;
        case 'subscription_create': result = await subscriptionCreate(vikunjaClient, args ?? {}); break;
        case 'subscription_delete': result = await subscriptionDelete(vikunjaClient, args ?? {}); break;
        case 'info_get':            result = await infoGet(vikunjaClient, args ?? {}); break;
        case 'views_list':          result = await viewsList(vikunjaClient, args ?? {}); break;
        case 'view_get':            result = await viewGet(vikunjaClient, args ?? {}); break;
        case 'view_create':         result = await viewCreate(vikunjaClient, args ?? {}); break;
        case 'view_update':         result = await viewUpdate(vikunjaClient, args ?? {}); break;
        case 'view_delete':         result = await viewDelete(vikunjaClient, args ?? {}); break;
        case 'buckets_list':        result = await bucketsList(vikunjaClient, args ?? {}); break;
        case 'bucket_create':       result = await bucketCreate(vikunjaClient, args ?? {}); break;
        case 'bucket_update':       result = await bucketUpdate(vikunjaClient, args ?? {}); break;
        case 'bucket_delete':       result = await bucketDelete(vikunjaClient, args ?? {}); break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[Server] Tool error: ${msg}`);
      return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
    }
  });

  return server;
}

// ---------------------------------------------------------------------------
// HTTP transport (Streamable HTTP — MCP spec March 2025)
// ---------------------------------------------------------------------------

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString();
        resolve(raw ? JSON.parse(raw) : undefined);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function setCorsHeaders(res: http.ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');
}

async function startHttpServer(port: number): Promise<void> {
  const httpServer = http.createServer(async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'vikunja-mcp' }));
      return;
    }

    if (req.url === '/mcp') {
      // Normalize Accept header — OpenWebUI sends */* but MCP SDK requires explicit media types
      if (!req.headers['accept']?.includes('application/json')) {
        req.headers['accept'] = 'application/json, text/event-stream';
      }

      // Stateless: fresh server + transport per request
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      const mcpServer = createMcpServer();
      res.on('close', () => transport.close());

      try {
        await mcpServer.connect(transport);

        if (req.method === 'POST') {
          const body = await readBody(req);
          await transport.handleRequest(req, res, body);
        } else if (req.method === 'GET' || req.method === 'DELETE') {
          await transport.handleRequest(req, res);
        } else {
          res.writeHead(405, { Allow: 'GET, POST, DELETE, OPTIONS' });
          res.end();
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[Server] HTTP handler error: ${msg}`);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(port, '0.0.0.0', () => {
      console.error(`[Server] ✅ Vikunja MCP Server running (HTTP)`);
      console.error(`[Server]   MCP endpoint : http://0.0.0.0:${port}/mcp`);
      console.error(`[Server]   Health check : http://0.0.0.0:${port}/health`);
      resolve();
    });
  });

  const shutdown = (signal: string) => {
    console.error(`[Server] ${signal} received, shutting down...`);
    httpServer.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ---------------------------------------------------------------------------
// Stdio transport (Claude Desktop / local)
// ---------------------------------------------------------------------------

async function startStdioServer(): Promise<void> {
  const transport = new StdioServerTransport();
  const mcpServer = createMcpServer();
  await mcpServer.connect(transport);

  console.error(`[Server] ✅ Vikunja MCP Server running (stdio)`);

  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.error('[Server] Starting Vikunja MCP Server...');
  console.error(`[Server]   API URL: ${config.apiUrl}`);

  process.on('uncaughtException', (error) => {
    console.error('[Server] Uncaught exception:', error);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[Server] Unhandled rejection:', reason);
    process.exit(1);
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : null;

  if (port) {
    await startHttpServer(port);
  } else {
    await startStdioServer();
  }
}

main().catch((error) => {
  console.error('[Server] Fatal error:', error);
  process.exit(1);
});
