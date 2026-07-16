# SciCanvas

SciCanvas is a local-first scientific illustration and figure editor designed to feel familiar to people who know Microsoft Office or Apple Keynote.

This repository contains the first functional foundation rather than a static mock-up. It runs as a dependency-free web app and can be hosted directly on GitHub Pages.

## What works now

- Searchable built-in scientific asset library with original editable SVG artwork
- Microbiology, virology, immunology, molecular biology, cell biology, laboratory equipment, and pathway symbols
- Click or drag assets onto an SVG canvas
- Upload PNG, JPEG, WebP, and SVG images into a persistent personal library
- Continuous local autosave using IndexedDB with a localStorage fallback
- Named and automatic recovery snapshots
- Multiple pages
- Layers, visibility, ordering, grouping, duplication, and deletion
- Optional grid, adjustable spacing, magnetic grid snapping, object-edge snapping, and alignment guides
- Move, resize, rotate, recolor, rename, and annotate objects
- Text, rectangles, ellipses, arrows, object-to-object connectors, and tidy-up alignment
- Scientific metadata fields and lightweight naming/metadata reports
- Editable templates for workflows, signaling pathways, host-pathogen interactions, and plate assays
- PNG, SVG, and complete `.scicanvas.json` project exports
- Offline application shell through a service worker
- Simple and Advanced interface modes

## Run locally

No build step is required.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Data safety

Projects and uploaded images are stored locally in the browser's IndexedDB vault. The app also maintains a lightweight localStorage fallback when the project is small enough. Use **Save snapshot** for named restore points and export a `.scicanvas.json` backup package for storage outside the browser.

Browser storage is not a substitute for true account-based cloud backup. A later backend phase should add authenticated encrypted synchronization and shared lab libraries.

## Asset licensing

The initial built-in scientific illustrations are original SVG drawings created for this project. Do not import third-party scientific icon libraries without recording each asset's source, author, license, attribution requirements, and modification history. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Near-term roadmap

1. Account-based cloud vault and lab workspaces
2. Rich connector routing with attached arrows and inhibition lines
3. Smart biological components with configurable structures
4. Asset packs with per-item licensing and automatic attribution reports
5. Better text layout, equations, chemical notation, and species/gene formatting rules
6. Collaborative comments and publication figure review
7. Accessible figure descriptions and machine-readable pathway export
8. Automated tests and browser compatibility checks
