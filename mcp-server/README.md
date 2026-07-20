# FigureLoom MCP server

This package lets MCP-compatible clients operate FigureLoom through the same editor state and history path used by the web app.

The server supports two workspaces:

- **Scratch project**, created automatically for every new MCP session. It is isolated from saved FigureLoom work.
- **Authorized FigureLoom project**, available only after the user explicitly authorizes that exact project under **Settings → MCP & AI access**.

All browser editor writes run through the FigureLoom command registry. A write creates a normal undo checkpoint, updates the page, re-renders the editor, and schedules the same autosave used by human actions.

## What is included

- Stdio transport for locally spawned MCP clients
- Streamable HTTP transport for remote MCP clients
- Authenticated browser bridge between the MCP server and an open FigureLoom editor
- Optional HTTPS and secure WebSocket support
- Read-only and full-access modes
- Separate permission for destructive actions
- Exact per-project authorization
- Multiple simultaneous MCP sessions and browser windows
- Structured project, page, selection, object, settings, and metadata reads
- SVG and PNG page rendering for visual verification
- SVG, PNG, PDF, and PPTX export
- Projects, pages, objects, groups, connectors, assets, templates, imports, review, sharing, clipboard, history, view state, and FigureLoom helper tools
- Discoverable command registry for future editor capabilities

## Requirements

- Node.js 20.11 or newer
- A modern browser for the FigureLoom editor bridge
- An MCP-compatible client

## Install and build

```bash
cd mcp-server
npm install
npm run typecheck
npm run build
```

The built entry point is:

```text
mcp-server/dist/index.js
```

## Local stdio server

Stdio is the normal choice for desktop MCP clients.

Use a fixed pairing token so the client configuration and FigureLoom Settings can use the same value:

```json
{
  "mcpServers": {
    "figureloom": {
      "command": "node",
      "args": [
        "/absolute/path/to/Figureloom/mcp-server/dist/index.js",
        "--stdio"
      ],
      "env": {
        "FIGURELOOM_PAIRING_TOKEN": "replace-with-a-long-random-token",
        "FIGURELOOM_MCP_HOST": "127.0.0.1",
        "FIGURELOOM_MCP_PORT": "3210"
      }
    }
  }
}
```

Starting the stdio server also starts the browser bridge at:

```text
ws://127.0.0.1:3210/figureloom
```

The MCP client can immediately use its isolated scratch project. It cannot see saved FigureLoom work until the user authorizes a project.

## Connect FigureLoom

1. Open FigureLoom.
2. Open **Settings**.
3. Select **MCP & AI access**.
4. Enable the MCP bridge.
5. Enter the browser bridge address.
6. Paste the pairing token used by the server.
7. Choose **Read-only** or **Full editor access**.
8. Enable **Authorize this project** only for the project the client may access.
9. Enable destructive actions separately only when required.
10. Select **Save and connect**.

Authorization follows the project ID. Opening another project does not transfer permission to it.

## Select an authorized project

Every MCP session starts in scratch. Call `get_session_access` to see authorized browser projects, then call `select_workspace`:

```json
{
  "workspace": "current",
  "project_id": "the-authorized-project-id"
}
```

When exactly one project is authorized, `project_id` may be omitted. When multiple browser windows expose projects, the project ID is required so a session cannot silently attach to the wrong window.

## Streamable HTTP server

```bash
FIGURELOOM_PAIRING_TOKEN="replace-with-a-long-random-token" \
FIGURELOOM_MCP_AUTH_TOKEN="replace-with-a-different-long-random-token" \
npm run start:http
```

Defaults:

```text
MCP endpoint: http://127.0.0.1:3210/mcp
Browser bridge: ws://127.0.0.1:3210/figureloom
Authorization: Bearer value from FIGURELOOM_MCP_AUTH_TOKEN
```

Do not expose an unencrypted HTTP server to the public internet.

## HTTPS and secure WebSockets

The server can provide HTTPS and WSS directly when certificate paths are supplied:

```bash
FIGURELOOM_MCP_HOST="0.0.0.0" \
FIGURELOOM_MCP_PORT="3210" \
FIGURELOOM_PAIRING_TOKEN="replace-with-a-long-random-token" \
FIGURELOOM_MCP_AUTH_TOKEN="replace-with-a-different-long-random-token" \
FIGURELOOM_TLS_CERT="/absolute/path/fullchain.pem" \
FIGURELOOM_TLS_KEY="/absolute/path/privkey.pem" \
npm run start:http
```

This produces endpoints in this form:

```text
https://your-host.example:3210/mcp
wss://your-host.example:3210/figureloom
```

Use the WSS address in FigureLoom Settings. The certificate must be trusted by the browser.

## Main MCP tools

The server exposes a compact set of composable tools:

- `get_session_access`
- `select_workspace`
- `list_commands`
- `get_document_structure`
- `get_full_project`
- `get_page_state`
- `get_selected_objects`
- `render_page`
- `search_assets`
- `manage_project`
- `manage_page`
- `document_settings`
- `document_metadata`
- `create_object`
- `modify_object`
- `delete_objects`
- `duplicate_objects`
- `group_objects`
- `set_object_state`
- `edit_text`
- `apply_style`
- `replace_asset`
- `insert_asset`
- `import_svg`
- `manage_connector`
- `manage_templates`
- `import_content`
- `review_project`
- `manage_share`
- `run_ai_helper`
- `arrange_objects`
- `set_selection`
- `clipboard`
- `history`
- `set_view`
- `export_document`
- `execute_command`

`list_commands` exposes the command registry for the selected workspace. `execute_command` can call newly registered FigureLoom capabilities without adding another hard-coded MCP tool.

## Observability and undo

Create and modify operations return the affected object ID and current geometry:

```json
{
  "id": "object-id",
  "type": "shape",
  "geometry": {
    "x": 100,
    "y": 120,
    "w": 300,
    "h": 180,
    "rotation": 0
  }
}
```

Use `get_page_state` for the complete structured object tree. Use `render_page` after layout changes to inspect an SVG or PNG result.

Browser writes execute through `FigureLoomCommands.execute`. Scratch writes use the scratch workspace history and can be undone with the same `history` tool.

## Security behavior

- New MCP sessions always start in an isolated scratch project.
- Opening a real editor project requires explicit authorization for that exact project ID.
- Read-only sessions cannot call write commands.
- Delete, clear, project import, and replacement-style template operations require destructive permission.
- Saving to the cloud is a write operation.
- Pairing tokens and project authorization stay on the browser device where they were entered.
- Pending commands are rejected if the authorized FigureLoom window disconnects or changes projects.
- Revoking MCP access disconnects the bridge and removes the saved token and project authorization.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `FIGURELOOM_MCP_HOST` | HTTP and bridge bind address | `127.0.0.1` |
| `FIGURELOOM_MCP_PORT` | HTTP and bridge port | `3210` |
| `FIGURELOOM_PAIRING_TOKEN` | Authenticates the browser bridge | Random at startup |
| `FIGURELOOM_MCP_AUTH_TOKEN` | Authenticates Streamable HTTP clients | Random at startup |
| `FIGURELOOM_DEFAULT_ACCESS` | Scratch access, `read` or `full` | `full` |
| `FIGURELOOM_ALLOW_DESTRUCTIVE_SCRATCH` | Permit destructive scratch commands when set to `1` | Off |
| `FIGURELOOM_TLS_CERT` | TLS certificate path | Disabled |
| `FIGURELOOM_TLS_KEY` | TLS private key path | Disabled |

## Troubleshooting

### The client only sees a scratch project

That is the safe default. Authorize the open project under FigureLoom Settings, call `get_session_access`, and select it with `select_workspace`.

### FigureLoom says a pairing token is required

Enter the exact `FIGURELOOM_PAIRING_TOKEN` value under Settings, then select **Save and connect**.

### The browser refuses a `ws://` address

Use a trusted local bridge or configure TLS and use a trusted `wss://` endpoint. Do not point the HTTPS-hosted editor at an untrusted public WebSocket server.

### A delete command is denied

Full editor access and **Allow destructive actions** must both be enabled for the authorized project.

### A project changes during a command

The server rejects the result instead of applying it to another project. Select the intended project again and retry.

## Development

```bash
npm run typecheck
npm run build
npm run dev:stdio
npm run dev:http
```

The GitHub workflow in `.github/workflows/mcp-server.yml` checks the browser MCP modules, installs server dependencies, type-checks the TypeScript source, and builds the server.