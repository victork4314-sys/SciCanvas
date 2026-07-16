# SciCanvas

SciCanvas is a local-first scientific illustration and figure editor designed to feel familiar to people who know Microsoft Office or Apple Keynote.

This repository contains a functional MVP rather than a static mock-up. It is a dependency-free web app that can run locally or deploy directly to GitHub Pages.

## What works now

- Searchable built-in scientific asset library with original programmatic SVG artwork
- Microbiology, virology, immunology, molecular biology, cell biology, laboratory equipment, pathway symbols, and specialist scientific search terms
- Add built-in assets to an editable SVG canvas
- Upload PNG, JPEG, WebP, and SVG images into a reusable personal library stored on the device
- Continuous local autosave using IndexedDB with a localStorage fallback
- Manual and automatic recovery snapshots
- Multiple editable pages
- Layers with visibility, ordering, duplication, renaming, and deletion
- Optional grid, adjustable spacing and style, magnetic grid/object snapping, and alignment guides
- Move, resize through the inspector, rotate, recolor, rename, and annotate objects
- Editable text, rectangles, ellipses, arrows, inhibition lines, attached object-to-object connectors, and tidy-up alignment
- Scientific metadata fields and attribution reporting
- Editable templates for graphical abstracts, workflows, pathways, host-pathogen interactions, and publication panels
- PNG, SVG, and complete `.scicanvas` project exports
- Offline application shell through a registered service worker
- Simple and Advanced interface modes
- GitHub Actions workflows for JavaScript syntax validation and GitHub Pages deployment

## Run locally

No build step is required.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Data safety

Projects and uploaded images are stored locally in the browser's IndexedDB vault. The app also maintains a lightweight localStorage fallback when the project is small enough. Use **Create recovery snapshot** for named restore points and download a `.scicanvas` project backup for storage outside the browser.

Browser storage is not a substitute for true account-based cloud backup. A later backend phase should add authenticated encrypted synchronization and shared lab libraries.

## Asset licensing

The initial built-in scientific illustrations are original programmatic SVG drawings created for this project. Do not import third-party scientific icon libraries without recording each asset's source, author, license, attribution requirements, and modification history. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Near-term roadmap

1. Account-based encrypted cloud vault and shared lab workspaces
2. Configurable smart biological components with scientifically constrained variants
3. Curated third-party and commissioned asset packs with per-item licensing records
4. Better text layout, equations, chemical notation, and gene/protein formatting rules
5. Collaborative comments and publication-figure review
6. Accessible figure descriptions and machine-readable pathway export
7. Browser-level interaction tests and compatibility testing
8. Grouping, multi-selection, masking, and richer vector editing
