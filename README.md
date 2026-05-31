# Vikunja MCP Server

[![npm version](https://img.shields.io/npm/v/@aimbitgmbh/vikunja-mcp)](https://npmjs.com/package/@aimbitgmbh/vikunja-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

This is a Model Context Protocol (MCP) server that provides integration with [Vikunja](https://vikunja.io/), a self-hosted open-source task management application. It enables MCP clients to interact with Vikunja tasks, projects, labels, and collaboration features.

Tested and optimized for **gpt-oss:20b**.

## Prerequisites

- Node.js >= 18.0.0
- A running Vikunja instance (self-hosted or cloud)
- Vikunja API token

## Features

- Complete task and project management via MCP
- Advanced features: kanban views, buckets, saved filters, bulk operations
- Safety controls: destructive operations disabled by default
- Type-safe implementation with TypeScript and Zod validation

## Installation

### NPM Package

```bash
npx @aimbitgmbh/vikunja-mcp
```

### MCP Client Configuration

Add to your MCP client configuration:

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

**Important:** The `VIKUNJA_URL` must include `/api/v1` at the end.

## Configuration

### Generate API Token

1. Log into your Vikunja instance
2. Navigate to Settings > API Tokens
3. Click "Create a new token"
4. Copy the token value

### Environment Variables

For local development, create a `.env` file:

```bash
# Vikunja API configuration (required)
VIKUNJA_URL=https://your-vikunja-instance.com/api/v1
VIKUNJA_API_TOKEN=your-api-token-here

# Optional settings
VERIFY_SSL=true

# Safety controls (default: false - safe mode)
ENABLE_PROJECT_DELETE=false
ENABLE_LABEL_DELETE=false
ENABLE_TASK_DELETE=false
```

## Available Tools

### Tasks
- `tasks_list` - List tasks with filtering
- `tasks_list_all` - List tasks across all projects
- `tasks_get` - Get task details
- `tasks_create` - Create new task
- `tasks_update` - Update existing task
- `task_complete` - Mark task as complete
- `task_delete` - Delete task (requires opt-in)
- `tasks_bulk_update` - Update multiple tasks

### Projects
- `projects_list` - List all projects
- `project_get` - Get project details
- `project_create` - Create new project
- `project_update` - Update project
- `project_archive` - Archive project
- `project_delete` - Delete project (requires opt-in)
- `project_duplicate` - Duplicate project with contents

### Labels
- `labels_list` - List all labels
- `label_get` - Get label details
- `label_create` - Create new label
- `label_update` - Update label
- `label_delete` - Delete label (requires opt-in)
- `label_add_to_task` - Add label to task
- `label_remove_from_task` - Remove label from task
- `labels_bulk_set_on_task` - Set all labels on task

### Collaboration
- Comments: `comments_list`, `comments_get`, `comments_create`, `comments_update`, `comments_delete`
- Assignees: `assignees_list`, `assignees_add`, `assignees_add_bulk`, `assignees_remove`
- Relations: `relations_create`, `relations_delete`

### Advanced
- Project Views: `views_list`, `views_get`, `views_create`, `views_update`, `views_delete`
- Kanban Buckets: `buckets_list`, `buckets_create`, `buckets_update`, `buckets_delete`
- Saved Filters: `filter_get`, `filter_create`, `filter_update`, `filter_delete`
- Notifications: `notifications_list`, `notifications_get`, `notifications_delete`
- Subscriptions: `subscription_get`, `subscription_create`, `subscription_delete`

## Troubleshooting

### Connection Issues

If the server fails to connect:
- Verify `VIKUNJA_URL` includes `/api/v1` at the end
- Check your Vikunja API token is valid
- Ensure your Vikunja instance is accessible

### SSL Certificate Errors

For self-signed certificates, add to your configuration:

```bash
VERIFY_SSL=false
```

## Safety Controls

Vikunja has no trash or recovery system. This server implements safety controls to prevent accidental data loss.

### Default Behavior

All destructive operations are disabled by default:

| Operation | Default Behavior | Alternative |
|-----------|-----------------|-------------|
| `project_delete` | Archives the project | Use `project_archive` |
| `task_delete` | Marks task as completed | Use `task_complete` |
| `label_delete` | Operation blocked | Use `label_update` |

### Enabling Destructive Operations

To enable permanent deletion, add to your environment configuration:

```bash
ENABLE_PROJECT_DELETE=true  # Deletes project and all tasks
ENABLE_LABEL_DELETE=true    # Removes label from all tasks
ENABLE_TASK_DELETE=true     # Permanently deletes tasks
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT © [aimbit GmbH](https://aimbit.de)

See [LICENSE](LICENSE) file for details.

## Links

- [GitHub Repository](https://github.com/aimbitgmbh/vikunja-mcp)
- [npm Package](https://npmjs.com/package/@aimbitgmbh/vikunja-mcp)
- [Report Issues](https://github.com/aimbitgmbh/vikunja-mcp/issues)
- [Vikunja Project](https://vikunja.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [aimbit GmbH](https://aimbit.de)
