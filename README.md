# Figureloom

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-663399.svg)](LICENSE)
[![Use Figureloom](https://img.shields.io/badge/open-figureloom.org-0c2e28.svg)](https://figureloom.org/)
[![Free and open source](https://img.shields.io/badge/free%20%26%20open%20source-yes-2ea44f.svg)](LICENSE)

**A free, local-first scientific figure editor for people who need their diagrams editable, not held hostage by a watermark.**

Figureloom runs directly in the browser. You can open it, make a figure, save locally, and export without creating an account. No paywall. No “contact sales.” No mysterious university pricing ritual.

It feels familiar if you have used PowerPoint, Keynote, or another office-style editor, but it is built around scientific work: pathways, plots, equations, maps, microscopy layouts, annotations, references, and all the gloriously specific nonsense research eventually demands.

## The useful bits

- Multi-page, layer-based vector editor
- Local autosave, recovery snapshots, and downloadable `.scicanvas` backups
- Text, shapes, arrows, connectors, groups, smart guides, grids, alignment, and distribution
- Poster, print, screen, presentation, square, and custom physical page sizes
- Editable charts and tables from pasted spreadsheet data
- Bar, line, scatter, box, violin, volcano, heatmap, PCA-style, Kaplan–Meier, forest, radar, bubble, Gantt, timeline, and flow-cytometry-style plots
- TeX equations rendered as editable SVG artwork
- SVG path editing and break-apart tools
- World maps, country maps, study-site locators, and GeoJSON import
- PowerPoint and spreadsheet import/export tools
- Publication checks for contrast, tiny text, grayscale, color-vision previews, alt text, references, attribution, and journal sizing
- Fullscreen multi-page presentation mode

## Scientific artwork without the warehouse

Figureloom includes original programmatic artwork and can load outside libraries such as Bioicons, Healthicons, and other compatible packs on demand.

That is why the repository is suspiciously tiny: much of the artwork is either drawn from compact vector instructions or fetched only when someone actually asks for it. Tiny art factory, not giant image warehouse.

Imported SVGs are sanitized before being added. Available creator, source, licence, and attribution information stays attached to the artwork.

## Figure Assistant

Describe a pathway, cycle, workflow, comparison, environmental system, or laboratory process and Figure Assistant assembles an **editable** starting figure.

It does not hand you one flattened AI picture and flee the scene. The result is made from normal Figureloom objects that can be moved, resized, recolored, relabeled, and rearranged.

A compatible browser may optionally use an on-device language model to clean up vague prompts. The deterministic assistant still works without it.

## Accounts, cloud projects, and collaboration

An account is optional.

Without signing in, projects can stay entirely in browser storage. With an account, Figureloom can provide:

- An encrypted cloud project gallery
- Owned and shared projects
- Owner, editor, reviewer, and viewer roles
- Named live presence and remote cursors
- Encrypted project broadcasts and review comments
- Explicit conflict controls instead of silently overwriting active work

Project contents are encrypted in the browser before cloud storage. Titles, ownership, timestamps, roles, and revision metadata remain visible so the gallery can function. This is application-layer encryption, not a zero-knowledge system.

Deployment details live in [`docs/CLOUD_SETUP.md`](docs/CLOUD_SETUP.md).

## Privacy, in normal-person language

Local projects, uploads, fonts, embedded workbooks, comments, references, components, checkpoints, recovery copies, gallery copies, and preferences stay in browser storage unless the user deliberately saves a cloud copy.

The browser receives the public Supabase URL and publishable key only. Service-role keys, database passwords, SMTP credentials, and other server secrets do not belong in client code.

## Run it locally

There is no build ritual.

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

Most editor features work locally. Cloud authentication redirects need the local URL added to the Supabase allow list.

## Testing

Normal pushes and pull requests run fast checks for things such as:

- JavaScript syntax
- Required files and script order
- Duplicate IDs
- Offline-shell completeness
- SVG and asset trust markers
- Refresh-safe restoration
- Account, gallery, collaboration, TeX, pathway, and local-model wiring

Longer desktop and iPhone-sized browser tests remain available through manual workflow dispatch.

## Contributing

Bug fixes, scientific asset improvements, accessibility work, import/export fixes, and aggressively niche research-tool ideas are welcome.

Please keep contributions understandable, preserve source and licence metadata for external artwork, and avoid turning the interface into a cockpit unless the cockpit is genuinely necessary.

## Licence

Figureloom's original code and project-authored artwork are released under the **GNU Affero General Public License v3.0 only** (`AGPL-3.0-only`).

[Read the full licence](LICENSE).

In practical terms: people may use, study, modify, and share Figureloom. When someone operates a modified version over a network, the AGPL requires that version's corresponding source code to be made available to its users.

External asset packs keep their own licences and attribution requirements. Review [`docs/ASSET_PACKS.md`](docs/ASSET_PACKS.md) before publishing work that uses them.

## More documentation

- [`docs/PRO_TOOLS.md`](docs/PRO_TOOLS.md)
- [`docs/POWERPOINT_EXPORT.md`](docs/POWERPOINT_EXPORT.md)
- [`docs/FEATURE_AUDIT.md`](docs/FEATURE_AUDIT.md)
- [`docs/CLOUD_SETUP.md`](docs/CLOUD_SETUP.md)
- [`docs/ASSET_PACKS.md`](docs/ASSET_PACKS.md)
