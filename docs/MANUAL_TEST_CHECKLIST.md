# Manual test checklist

Use this checklist after deployment or before publishing a release.

## Application shell

- Open the deployed app without visible runtime errors.
- Confirm the ribbon, page panel, canvas, layers panel, and inspector are visible.
- Reload once so the latest service worker takes control.
- Confirm the hosted Help center opens at `/wiki/#Home`.
- Search the Help center for `MCP` and open the MCP page from the result.

## Interface modes

- Test Automatic, Desktop, Tablet, and Phone from Settings.
- Confirm Desktop uses the compact layout.
- Confirm Tablet keeps the full editor with roomier touch targets.
- Confirm Phone uses the compact header, dock, and sliding panels.
- Confirm switching modes does not change project contents.

## Built-in editing

- Add text, a shape, an arrow, and a built-in scientific object.
- Drag an object and confirm grid and object snapping can be toggled.
- Change position, size, fill, stroke, opacity, and rotation.
- Duplicate, reorder, hide, and delete an object.
- On Desktop and Tablet, confirm Undo and Redo sit beside Delete.
- On Phone, confirm Undo and Redo remain in the compact header.
- Move a text box on Desktop and confirm it follows the pointer smoothly.
- Edit, save, reload, and confirm text is not clipped or unexpectedly resized.

## Projects and tabs

- Open more than one project tab.
- Confirm each close control remains inside the same bordered tab box as its title.
- Close a tab and confirm the saved project is not silently deleted.
- Download and reopen a `.figureloom` backup.

## Illustration packs

- Open the illustration library and any configured outside packs.
- Search for `bacteria`, `virus`, `microscope`, and `mitochondria`.
- Filter by category and license where supported.
- Add one public-domain asset and one attribution-required asset.
- Reload and confirm imported SVGs remain embedded in the project.
- Download the attribution report and confirm it contains available name, author, license, and source details.

## Upload library and recovery

- Upload PNG and SVG files.
- Confirm they appear in the reusable upload library and can be inserted again.
- Create a recovery snapshot.
- Download a `.figureloom` project, reload, and import it.
- Confirm all embedded images and pages return.

## Current export

- Export the active page with **Editable SVG (per page)**.
- Enable **Print page dimensions** and inspect the SVG dimensions.
- Enable **Include editor grid** and confirm the grid appears only when selected.
- Create a project with at least three pages.
- Use **Export all pages as SVG**.
- Confirm the download contains one SVG for every page, including the final page.
- Open the first, middle, and final SVG in another viewer.
- Confirm the current export panel does not present removed direct PNG or PowerPoint actions as supported output.

## Collaboration

- Sign in and save a cloud project.
- Create an email invitation and test the selected role.
- Create a guest link without a PIN.
- Join it in a signed-out browser using only a display name.
- Create a guest link with a 4 to 12 digit PIN.
- Confirm an incorrect PIN is refused.
- Confirm Create link and Revoke links stay in one horizontal row.
- Revoke a guest link and confirm it no longer works.
- Test presence, cursors, comments, and remote-update conflict handling.

## MCP

- Sign in and open the exact cloud project to authorize.
- Create a read-only MCP connection and confirm write commands are refused.
- Create a full-access connection and confirm an ordinary write succeeds.
- Confirm the successful write appears in Undo history and remains after reopening the project.
- Confirm a destructive command is refused while its separate permission is off.
- Enable destructive permission only for a deliberate test and confirm it works.
- Confirm no MCP pointer or arrow is displayed over the editor.
- Disconnect and reconnect the same project.
- Revoke the connection and confirm the copied link stops working.
- Switch projects and confirm the old project authorization does not follow.

## Hosted wiki validation

- Run `node scripts/validate-wiki.mjs`.
- Confirm every Markdown page is registered in `wiki/wiki.js`.
- Confirm there are no duplicate hosted slugs.
- Confirm `wiki/wiki.js` passes `node --check`.
- Confirm the obsolete `wiki/wiki-mcp.js` patch does not exist or load.

## Offline behavior

- Load the app online, then disconnect the device.
- Reload and confirm the application shell opens.
- Confirm previously embedded project assets remain available.
- Confirm local editing, autosave, and `.figureloom` backup remain available.
- Confirm cloud, new outside-library downloads, guest links, and hosted MCP fail clearly without losing the current project.
