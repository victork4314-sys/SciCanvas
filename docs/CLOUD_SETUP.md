# FigureLoom cloud accounts, collaboration, and MCP

FigureLoom uses the Supabase project configured in [`../cloud-config.js`](../cloud-config.js). Local editing continues to work without signing in.

## Cloud features

A configured deployment can provide:

- Email and password account creation and sign-in
- Email confirmation and confirmation resend
- Forgot-password and recovery flows
- Local project gallery without an account
- Encrypted cloud gallery for owned and shared projects
- Profile initials or scientific symbols
- Owner, editor, reviewer, and viewer permissions
- Pending invitations reserved by email address
- Expiring guest collaboration links
- Optional 4 to 12 digit guest-link PIN
- Temporary guest sessions using a display name and no email account
- Private Realtime presence, cursors, and encrypted project broadcasts
- Encrypted persistent review comments
- Hosted project-specific MCP connections
- Row Level Security on every exposed application table

FigureLoom intentionally uses one normal account system: email and password. Apple, Microsoft, and other social sign-in providers are not part of the current setup.

## Browser configuration

The browser receives only the public Supabase project URL and publishable key.

Use the deployment's current configuration shape, for example:

```js
window.FIGURELOOM_CLOUD_CONFIG = {
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-publishable-key',
  redirectUrl: `${window.location.origin}${window.location.pathname}`,
  appName: 'FigureLoom'
};
```

Some source files retain older internal aliases for compatibility. Do not copy old branding into visible interface text or new documentation.

A Supabase publishable key is designed for browser use. Access is enforced by database policies and protected functions. Never put a service-role key, database password, SMTP credential, encryption master key, or other secret in browser code or this repository.

## Database and migrations

The base schema and later migrations provide structures such as:

- `profiles`
- `projects`
- `project_members`
- `project_invitations`
- `project_share_links`
- `collaboration_comments`
- `figureloom_mcp_connections`
- `figureloom_mcp_commands`
- Project-role and access helpers
- Project-key derivation
- Email invitation handling
- Expiring hashed guest tokens
- MCP token hashing and revocation
- Row Level Security policies
- Private Realtime authorization

Apply the base schema and all required migrations in order. Do not assume that copying only one SQL file produces the current deployment.

## Encryption model

Editable project payloads and persistent collaboration comment bodies are encrypted in the browser with AES-GCM before storage.

A protected database function checks project access and derives a stable project-specific key from a random server-side master key in a non-exposed schema. The browser receives only the derived key for a project the current account or accepted guest is allowed to open.

This is application-layer encryption, not a zero-knowledge system. A privileged database operator can derive project keys. Protect database credentials, the master key, and backups accordingly.

Project titles, ownership, timestamps, roles, revision numbers, memberships, guest-link records, and MCP connection status remain visible metadata so the gallery and permission systems can work.

## Email authentication

The browser client uses the normal Supabase client flow for:

- Account creation
- Password sign-in
- Confirmation-email resend
- Password reset email
- Recovery-session detection
- Password replacement

In **Supabase Dashboard → Authentication → URL Configuration**:

- Set the production Site URL to the actual FigureLoom deployment.
- Add the production redirect URL.
- Add local development URLs that are genuinely used, such as `http://localhost:8080/`.
- Remove obsolete domains and old project paths.

Test the complete flow from more than one email provider.

## Email invitations

Project owners can enter an exact email address and choose a role.

- Existing accounts can receive access immediately.
- Unknown emails can remain pending invitations.
- When that exact email creates an account, access can activate automatically.

FigureLoom reserves project access by email. The owner may still need to send the app link separately.

## Guest collaboration links

Guest links do not require the recipient to create an email account.

The owner must be signed in and must save or open a cloud project. The owner chooses a role, expiry, and optional numeric PIN. The generated URL contains the raw guest token while the database stores only its hash.

The recipient:

1. Opens the link.
2. Enters a display name.
3. Enters the optional PIN when one was supplied.
4. Receives a temporary anonymous session.
5. Opens the encrypted project with the selected role.

The frontend uses protected functions for creating, accepting, and revoking project share links.

## Anonymous authentication

Guest joining depends on Supabase anonymous authentication.

Enable it only after the guest-link functions, expiry checks, PIN checks, role checks, and Row Level Security policies have been installed and tested.

When anonymous authentication is disabled, normal email-account invitations can still work.

## Guest-link tests

Test:

- Viewer, reviewer, and editor links
- Link without a PIN
- Link with a 4 to 12 digit PIN
- Wrong PIN
- Expiry
- Revocation
- Existing stronger membership
- Signed-out guest
- Display-name handling
- Anonymous-auth-disabled behavior
- Owner revoking every active link

## Roles

| Role | Open project | Presence and cursors | Comment | Edit and broadcast | Manage access |
|---|---:|---:|---:|---:|---:|
| Viewer | Yes | Yes | No | No | No |
| Reviewer | Yes | Yes | Yes | No | No |
| Editor | Yes | Yes | Yes | Yes | No |
| Owner | Yes | Yes | Yes | Yes | Yes |

Incoming live edits pause when the local user is typing or dragging. The user chooses **Apply remote update** or **Keep mine** instead of being silently overwritten.

## Realtime

Use private channels for:

- Project presence and remote cursors
- Encrypted project broadcasts
- Persistent comment updates
- Hosted MCP command delivery

Keep public Realtime channel access disabled. Test a non-member and a revoked guest directly, not only through the interface.

## Hosted MCP

The hosted MCP workflow connects one exact cloud project to a compatible external client.

The backend needs:

- `figureloom_mcp_connections` for owner, project, access level, destructive permission, current command metadata, status, and revocation
- `figureloom_mcp_commands` for pending, running, completed, expired, and failed commands
- Row Level Security or protected functions that restrict connection and command rows
- Private Realtime delivery for newly queued commands
- A deployed `figureloom-mcp` edge function or equivalent remote MCP endpoint
- Token hashing so the raw private token is not stored as the database credential

The browser creates a project-specific connection, publishes its currently available commands, and processes authorized command rows while the matching project is open.

Test:

1. Sign-in requirement
2. Read-only access
3. Full editor access
4. Destructive action refused when its separate switch is off
5. Successful write using normal history and durable saving
6. Disconnect and reconnect
7. Revocation invalidating the copied link
8. Project switching revoking the old authorization
9. Command expiry
10. Duplicate command claiming

Do not log raw MCP connection links or include them in screenshots, issues, analytics, or documentation examples.

## Email delivery

Supabase's built-in mail service is suitable for initial testing but can be rate-limited and best-effort.

Before public use, configure a reliable SMTP sender and test:

1. Account confirmation
2. Confirmation resend
3. Sign-in after confirmation
4. Forgot-password delivery
5. Recovery-link redirect
6. New-password replacement

Do not place SMTP credentials in browser code.

## Production checklist

- Set the correct production Site URL and redirect allow list.
- Configure and test a custom SMTP sender.
- Keep email confirmations enabled when required by the deployment.
- Deliberately configure anonymous authentication for guest links.
- Test owner, editor, reviewer, viewer, and guest sessions separately.
- Test email invitations and guest links separately.
- Test optional PIN, expiry, and revocation.
- Test one project simultaneously in two browsers.
- Test hosted MCP read-only, full, destructive permission, saving, and revocation.
- Review authentication, database, Realtime, and edge-function rate limits.
- Enable database backups.
- Back up the private encryption master key.
- Define account deletion, retention, privacy, and incident-response policies.
- Re-run Supabase security and performance advisors after schema changes.

## Local-only behavior

If Supabase is unavailable or removed, the editor, autosave, recovery copies, `.figureloom` backups, SVG export, and local project gallery continue to work.

Cloud projects, account collaboration, guest links, and hosted MCP report the connection problem rather than replacing local project data.
