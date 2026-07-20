# FigureLoom MCP server

This package lets MCP-compatible clients operate FigureLoom through the same editor state and history path used by the web app.

The server supports two workspaces:

- **Scratch project**, created automatically for every new MCP session. It is isolated from saved FigureLoom work.
- **Current FigureLoom project**, available only after the user explicitly authorizes that exact project under **Settings → MCP & AI access**.

All editor writes are executed through the FigureLoom command registry. A write creates a normal undo snapshot, updates the page, re-renders the editor, and schedules the same autosave used by human actions.

## What is included

- Stdio transport for locally spawned MCP clients
- Streamable HTTP transport for remote MCP clients
- Authenticated browser bridge between the MCP server and an open FigureLoom editor
- Read-only and full-access modes
- Separate permission for destructive actions
- Exact per-project authorization
- Multiple simultaneous MCP sessions
- Structured page and object reads
- SVG and PNG page rendering for visual verification
- SVG, PNG, PDF, and PPTX export from scratch projects
- Discoverable command registry for future editor capabilities

## Requirements

- Node.js 20.11 or newer
- A modern browser for the FigureLoom editor bridge

## Install and build

```bash
cd mcp-server
npm install
npm run build
```

## Local stdio server

```bash
node dist/index.js --stdio
```

The process prints a **FigureLoom pairing token** to stderr. Copy that token into:

1. Open FigureLoom.
2. Open **Settings**.
3. Select **MCP & AI access**.
4. Enable the MCP bridge.
5. Keep the bridge address as `ws://127.0.0.1:3210/figureloom`.
6. Paste the pairing token.
7. Choose read-only or full access.
8. Enable **Authorize this project** only when the connected client should use the currently open project.
9. Enable destructive actions separately only when required.

A generic local MCP client configuration looks like this:

```json
{
  "mcpServers": {
    "figureloom": {
      "command": "node",
      "args": ["/absolute/path/to/Figureloom/mcp-server/dist/index.js", "--stdio"]
    }
  }
}
```

The exact configuration file and UI differ between MCP clients, but the command and arguments are the same.

## Streamable HTTP server

```bash
FIGURELOOM_PAIRING_TOKEN="replace-with-a-long-random-token" \
FIGURELOOM_MCP_AUTH_TOKEN="replace-with-a-different-long-random-token" \
npm run start:http
```

Defaults:

- MCP endpoint: `http://127.0.0.1:3210/mcp`
- Browser bridge: `ws://127.0.0.1:3210/figureloom`
- MCP HTTP authorization: `Authorization: Bearer <FIGURELOOM_MCP_AUTH_TOKEN>`

For a public or hosted deployment, terminate TLS at a trusted reverse proxy and expose the endpoints through HTTPS and WSS. Set the bridge address in FigureLoom Settings to the resulting `wss://` URL.

ChatGPT connects to remote MCP servers rather than directly spawning a local stdio process. Use a remote deployment or a supported secure MCP tunnel for ChatGPT. Other desktop clients may use the local stdio configuration directly.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `FIGURELOOM_MCP_HOST` | HTTP and bridge bind address | `127.0.0.1` |
| `FIGURELOOM_MCP_PORT` | HTTP and bridge port | `3210` |
| `FIGURELOOM_PAIRING_TOKEN` | Authenticates the browser bridge | Random at startup |
| `FIGURELOOM_MCP_AUTH_TOKEN` | Authenticates Streamable HTTP clients | Random at startup |
| `FIGURELOOM_DEFAULT_ACCESS` | Scratch project access: `read` or `full` | `full` |
| `FIGURELOOM_ALLOW_DESTRUCTIVE_SCRATCH` | Permit destructive scratch commands when set to `1` | Off |

## Main MCP tools

The server intentionally exposes a compact set of composable tools:

- `get_session_access`
- `select_workspace`
- `list_commands`
- `get_document_structure`
- `get_page_state`
- `get_selected_objects`
- `render_page`
- `search_assets`
- `manage_project`
- `manage_page`
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
- `arrange_objects`
- `set_selection`
- `history`
- `set_view`
- `export_document`
- `execute_command`

`execute_command` calls any action returned by `list_commands`. New FigureLoom features become MCP-callable by registering their capability with `window.FigureLoomCommands.register(...)`.

## Security behavior

- New MCP sessions always start in an isolated scratch project.
- Opening the real editor project requires switching the session to `current` and authorizing that exact project in FigureLoom Settings.
- Authorization is tied to the project ID. Opening or creating another project does not inherit access.
- Read-only sessions cannot call write commands.
- Delete and clear operations require a separate destructive-action permission.
- Pairing tokens are stored only in the browser's local storage on the device where they are entered.
- Revoking MCP access disconnects the bridge and removes the saved pairing token and project authorization.

## Development

```bash
npm run typecheck
npm run build
npm run dev:stdio
npm run dev:http
```

The GitHub workflow in `.github/workflows/mcp-server.yml` checks all browser MCP modules with `node --check`, installs the server dependencies, type-checks the TypeScript source, and builds the server.