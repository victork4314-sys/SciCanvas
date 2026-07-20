# FAQ

## Do I need an account?

No. Local projects, autosave, backups, imports, exports, and most editing features work without an account.

An account adds encrypted cloud projects, account invitations, guest-link creation, persistent collaboration comments, presence, live updates, and hosted MCP access.

## Is FigureLoom free?

Yes. FigureLoom is free and open source under AGPL-3.0-only.

## Where are local projects stored?

In the browser profile on the current device.

They do not automatically follow you to another device. Download `.figureloom` backups.

## What is a `.figureloom` file?

It is the complete editable project backup. Use it to reopen, archive, or move a project.

It is not the same as an SVG export.

## Are older project backups supported?

Yes. Import the older backup, check the project, and download a new `.figureloom` copy.

## Can FigureLoom work offline?

Much of the editor can work offline after the application shell and required files are cached.

Cloud features, outside libraries, authentication, collaboration, hosted MCP, MathJax, and optional providers can require a connection.

## Is it an AI image generator?

No. FigureLoom is an editor.

Loomy is an optional helper that creates an editable starting layout from normal FigureLoom objects. The editor does not depend on it.

## What is MCP in FigureLoom?

MCP lets a compatible external assistant inspect or edit the current cloud project through a private project-specific connection link.

The connection can be read-only or full access. Destructive actions use a separate permission. MCP is optional and separate from Loomy.

## Can I use FigureLoom on a phone?

Yes. Phone mode uses a compact header, scrollable tabs, a full-screen Add panel, a bottom dock, touch-friendly sheets, safe areas, and mobile canvas controls.

Dense poster work and advanced path editing are still easier on a larger screen.

## Which interface modes are available?

Open Settings and choose:

- Automatic
- Desktop
- Tablet
- Phone

Desktop is compact. Tablet keeps the full editor with roomier touch targets. Phone uses the dock and sliding panels.

## Where are Undo and Redo?

On Desktop and Tablet, Undo and Redo sit beside Delete in the selected-object action group.

On Phone, Undo and Redo remain in the compact header.

## Can I move a project between devices?

Yes. Download the `.figureloom` backup on the first device and import it on the second.

Local imported fonts may need to be imported again.

## Does autosave mean I never need a backup?

No. Autosave belongs to the browser. Download backups outside the browser.

## Can I open PowerPoint files?

FigureLoom can import many common PowerPoint elements. Complex slides can require correction or flattening.

Always compare the import with the original.

## Can I export PowerPoint?

Not from the current finished export panel.

Export SVG from FigureLoom and convert it in PowerPoint, Keynote, LibreOffice Impress, or another application when a `.pptx` file is required.

## Can I export PNG, PDF, or TIFF directly?

Not from the current finished export panel.

Use **Editable SVG (per page)** or **Export all pages as SVG**, check the SVG, and convert it in another trusted application.

## Can I import Excel files?

Yes. Common workbook and delimited formats are supported through the office and data tools.

Macros do not run, and formulas should be recalculated before import.

## Does FigureLoom calculate statistics?

No. It can create editable charts and specialist plot layouts, but statistical analysis should be completed and validated in appropriate software.

## Can I make equations?

Yes. Use quick notation helpers for short labels or the MathJax TeX workspace for rendered SVG equations with retained source.

## Can I edit SVG paths?

Yes, within the supported path-command editor. It can inspect commands, change coordinates, select anchors, and break compound artwork apart.

It is not a full desktop Bezier editor.

## Can I make maps?

Yes. Map Studio supports world and country maps, study-site locators, and GeoJSON import.

It is not a replacement for GIS analysis.

## Are scientific illustrations free to use?

Built-in and outside assets have their own source and licensing conditions.

Review the metadata and license for the exact asset. FigureLoom can collect attribution information where available.

## Does FigureLoom add a watermark?

No.

## Can I use custom fonts?

Yes, supported local font files can be imported.

The font may not be available on another device, and font licensing still applies.

## Can I collaborate live?

Yes, in a configured cloud deployment. Roles control viewing, commenting, editing, broadcasting, and access management.

The owner can invite an email account or create an expiring guest link. A guest enters a display name and does not need an email account. The owner can add an optional 4 to 12 digit PIN.

## Are cloud projects encrypted?

Editable payloads and persistent comment bodies are encrypted in the browser before storage.

The system uses application-layer encryption, not zero-knowledge encryption. Gallery and permission metadata remains visible.

## Can a collaborator keep a copy after access is removed?

Yes. Access removal cannot delete exports or backups already downloaded by that person.

## Can FigureLoom guarantee journal compliance?

No. It provides generic presets and readiness checks. Verify the current journal, conference, or printer requirements.

## Why does a project look different on another device?

Common causes include missing local fonts, browser differences, stale cached app files, unavailable outside assets, or a different interface mode.

## Why is the favicon still old on Safari?

Safari can keep a site icon cached separately from normal page files. The editor itself can update while an old icon remains. Closing all tabs, restarting Safari, or waiting for Safari's icon cache to refresh can be necessary.

## Where should I report a bug?

Use the GitHub repository issue tracker. Include exact steps, device, browser, interface mode, and a minimal non-confidential example.
