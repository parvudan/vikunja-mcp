# Vikunja MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A [Model Context Protocol](https://modelcontextprotocol.io/) server for [Vikunja](https://vikunja.io/), enabling AI assistants to manage tasks and projects via MCP.

This fork extends the [original aimbitgmbh/vikunja-mcp](https://github.com/aimbitgmbh/vikunja-mcp) with:
- **Vikunja v1.0.0+ compatibility** (API endpoint changes)
- **Native HTTP transport** for OpenWebUI and remote clients (no supergateway)
- **Docker containerization** with security hardening
- **Subtask visibility** in task listings
- **Task moving** between projects via `task_update`
- **Fixed bulk update** to match the Vikunja v1.0.0 API format

---

## Prerequisites

- A running Vikunja instance v1.0.0+ (self-hosted)
- Vikunja API token
- Docker (for containerized deployment) or Node.js >= 18

---

## Quick Start — Docker (recommended)

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
VIKUNJA_URL=https://your-vikunja-instance.com/api/v1
VIKUNJA_API_TOKEN=your-api-token-here
```

> **Note:** `VIKUNJA_URL` must include `/api/v1` at the end.

### 2. Build and run

```bash
docker compose up --build -d
```

The server starts on port **8000** and exposes:
- `http://localhost:8000/mcp` — MCP Streamable HTTP endpoint
- `http://localhost:8000/health` — health check

---

## Transport modes

The server supports two transport modes selected via the `PORT` environment variable:

| Mode | When | Use case |
|------|------|----------|
| **HTTP** (Streamable HTTP) | `PORT` is set (default: 8000 in Docker) | OpenWebUI, remote clients |
| **stdio** | `PORT` is unset | Claude Desktop, local MCP clients |

---

## Connecting to OpenWebUI

In OpenWebUI go to **Admin Panel → Settings → Tools** and add:

```
http://<host-ip>:8000/mcp
```

Replace `<host-ip>` with the IP of the machine running the container, reachable from the OpenWebUI server.

### Recommended system prompt

Add this to your model's system prompt for reliable tool use:

```
You have access to Vikunja task management tools. Follow these rules strictly.

## IDs
- Task IDs and Project IDs are different numbers. Listings show [Task ID: X, Project ID: Y].
- Never guess or infer a task ID from position in a list or from context.

## Workflow for any write operation (complete, update, delete)
1. Call tasks_list_all to get the current list with IDs.
2. Use the search parameter to find tasks by name.
3. Tasks can have subtasks — check the listing for indented entries.
4. Call task_get to confirm the current state before acting.
5. If already in the desired state, report it and do nothing.

## Completing a task
- Use task_complete with the exact task ID.
- If already complete, confirm this instead of acting.

## Moving tasks between projects
- Use task_update with projectId to move a task.
- Use projects_list to find the target project ID first.

## Bulk updates
- tasks_bulk_update updates ONE field across multiple tasks per call.
- For multiple fields, call it once per field.

## Creating tasks
- projectId is required. Get project IDs from projects_list first.
```

---

## Connecting to Claude Desktop / Claude Code (stdio mode)

For stdio-based clients, omit the `PORT` variable and use the npx command:

```json
{
  "mcpServers": {
    "vikunja": {
      "command": "npx",
      "args": ["-y", "@aimbitgmbh/vikunja-mcp"],
      "env": {
        "VIKUNJA_URL": "https://your-vikunja-instance.com/api/v1",
        "VIKUNJA_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

For a locally built version via Claude Code, add `.mcp.json` at the project root:

```json
{
  "mcpServers": {
    "vikunja": {
      "type": "http",
      "url": "http://<host-ip>:8000/mcp"
    }
  }
}
```

---

## Configuration

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VIKUNJA_URL` | Yes | — | Vikunja API URL including `/api/v1` |
| `VIKUNJA_API_TOKEN` | Yes | — | API token from Vikunja Settings → API Tokens |
| `PORT` | No | — | Set to enable HTTP mode (e.g. `8000`) |
| `VERIFY_SSL` | No | `true` | Set to `false` for self-signed certificates |
| `ENABLE_TASK_DELETE` | No | `false` | Enable permanent task deletion |
| `ENABLE_PROJECT_DELETE` | No | `false` | Enable permanent project deletion |
| `ENABLE_LABEL_DELETE` | No | `false` | Enable permanent label deletion |

---

## Available tools

### Tasks
| Tool | Description |
|------|-------------|
| `tasks_list` | List tasks in a specific project |
| `tasks_list_all` | List tasks across all projects with subtask visibility |
| `task_get` | Get full task details including subtasks |
| `task_create` | Create a new task |
| `task_update` | Update task fields or move to a different project (`projectId`) |
| `task_complete` | Mark a task as complete |
| `task_delete` | Delete a task (requires `ENABLE_TASK_DELETE=true`) |
| `tasks_bulk_update` | Update one field across multiple tasks |

### Projects
| Tool | Description |
|------|-------------|
| `projects_list` | List all projects |
| `project_get` | Get project details |
| `project_create` | Create a project |
| `project_update` | Update a project |
| `project_archive` | Archive a project |
| `project_delete` | Delete a project (requires `ENABLE_PROJECT_DELETE=true`) |
| `project_duplicate` | Duplicate a project with its tasks |

### Labels
`labels_list`, `label_get`, `label_create`, `label_update`, `label_delete`, `label_add_to_task`, `label_remove_from_task`, `labels_bulk_set_on_task`

### Collaboration
- **Comments:** `comments_list`, `comment_get`, `comment_create`, `comment_update`, `comment_delete`
- **Assignees:** `assignees_list`, `assignee_add`, `assignees_add_bulk`, `assignee_remove`
- **Relations:** `relation_create`, `relation_delete`

### Advanced
- **Kanban:** `views_list`, `view_get`, `view_create`, `view_update`, `view_delete`, `buckets_list`, `bucket_create`, `bucket_update`, `bucket_delete`
- **Filters:** `filter_get`, `filter_create`, `filter_update`, `filter_delete`
- **Notifications:** `notifications_list`, `notification_get`, `notification_delete`
- **Subscriptions:** `subscription_get`, `subscription_create`, `subscription_delete`

---

## Docker security

The container is hardened by default:

- Runs as non-root user `mcp`
- Read-only root filesystem (`read_only: true`)
- All Linux capabilities dropped (`cap_drop: ALL`)
- No privilege escalation (`no-new-privileges:true`)
- Memory limit: 256MB, CPU limit: 0.5 cores
- Pinned base image: `node:20.19-alpine3.22`

---

## Vikunja v1.0.0 compatibility

Vikunja v1.0.0 renamed the `GET /tasks/all` endpoint to `GET /tasks`. This fork patches both affected methods in the client so existing tool code works without changes. If you are on an older Vikunja version and see 404 errors on task listing, revert `src/client.ts` lines 138 and 436 back to `/tasks/all`.

---

## Safety controls

Vikunja has no trash or recovery. Destructive operations are disabled by default:

| Operation | Default | Enable with |
|-----------|---------|-------------|
| `task_delete` | Marks complete instead | `ENABLE_TASK_DELETE=true` |
| `project_delete` | Archives instead | `ENABLE_PROJECT_DELETE=true` |
| `label_delete` | Blocked | `ENABLE_LABEL_DELETE=true` |

---

## Development

```bash
npm install
npm run dev       # stdio mode with hot reload
PORT=8000 npm run dev  # HTTP mode with hot reload
npm run build
npm run typecheck
```

---

## License

MIT — original work © [aimbit GmbH](https://aimbit.de), modifications in this fork are also MIT.

- [Original repository](https://github.com/aimbitgmbh/vikunja-mcp)
- [Vikunja](https://vikunja.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
