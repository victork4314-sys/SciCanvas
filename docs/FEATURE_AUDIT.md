# SciCanvas feature audit

This document maps the original product requirements to the current implementation. It is intentionally explicit so that the repository does not claim features that are only planned.

## Scientific illustration library

- **Built-in editable scientific objects:** Implemented.
- **Basic biology and microbiology objects:** Implemented.
- **Specialist search terms and organism aliases:** Implemented.
- **Large external scientific package:** Implemented through the complete Bioicons index with 2,829 individually licensed SVG entries.
- **Whole-package downloads:** Implemented for Bioicons source ZIP and the Servier Medical Art complete slide-set ZIP.
- **Additional reputable sources:** NIH BioArt Source and Reactome are linked with licence warnings.
- **Search by name, category, author, and licence:** Implemented for Bioicons.
- **Per-item attribution metadata:** Implemented for Bioicons imports.
- **Automatic detailed attribution report:** Implemented.

## Asset handling and data safety

- **Upload PNG, JPEG, WebP, and SVG:** Implemented.
- **Reusable personal upload library:** Implemented with IndexedDB.
- **Project embeds selected external SVGs:** Implemented.
- **Continuous autosave:** Implemented with IndexedDB and a localStorage fallback.
- **Manual recovery snapshots:** Implemented.
- **Automatic recovery snapshots:** Implemented.
- **Complete editable project download/import:** Implemented.
- **Persistent-storage request:** Implemented where supported by the browser.
- **Registered offline application shell:** Implemented.
- **True account-based cloud backup:** Not implemented; requires a backend and authentication.
- **Shared lab libraries and collaboration:** Not implemented.

## Canvas and editing

- **Optional grid:** Implemented.
- **Adjustable grid spacing and line/dot style:** Implemented.
- **Grid snapping:** Implemented.
- **Magnetic object edge/centre snapping:** Implemented.
- **Alignment guides:** Implemented.
- **Move objects by dragging:** Implemented.
- **Position and size fields:** Implemented.
- **Rotation:** Implemented.
- **Opacity, fill, and stroke controls:** Implemented.
- **Layer visibility and ordering:** Implemented.
- **Duplicate, rename, delete, and tidy:** Implemented.
- **Undo and redo:** Implemented.
- **Attached arrows and inhibition connectors:** Implemented.
- **Multiple pages:** Implemented.
- **Zoom and fit:** Implemented.
- **Grouping and multi-selection:** Not implemented.
- **Freeform vector node editing, masks, and Boolean operations:** Not implemented.

## Text and scientific formatting

- **Text boxes:** Implemented.
- **Editable text content:** Implemented.
- **Font family, size, bold, and italic controls:** Implemented.
- **Species-name italic style helper:** Implemented.
- **Scientific metadata fields:** Implemented.
- **Equation editor, chemical notation, superscript/subscript, and automatic gene/protein rules:** Not implemented.
- **Labels physically attached to arbitrary objects:** Not implemented as a dedicated object relationship.

## Templates and interface

- **Blank canvas:** Implemented.
- **Graphical abstract template:** Implemented.
- **Experimental workflow template:** Implemented.
- **Host-pathogen template:** Implemented.
- **Molecular pathway template:** Implemented.
- **Publication panel template:** Implemented.
- **Microsoft-style ribbon:** Implemented.
- **Keynote-style right inspector:** Implemented.
- **Simple and Advanced modes:** Implemented.
- **Large labelled controls for less technical users:** Implemented in the MVP layout.

## Export

- **Editable SVG export:** Implemented.
- **Standard and high-resolution PNG export:** Implemented.
- **Optional grid in exported graphics:** Implemented.
- **Complete editable project export:** Implemented.
- **Detailed attribution report:** Implemented.
- **PDF, PowerPoint, and TIFF export:** Not implemented.
- **Machine-readable SBGN/BioPAX/SBML export:** Not implemented.

## Next priority areas

1. Browser-level interaction tests and automated deployment verification.
2. Account-based encrypted cloud storage.
3. Grouping, multi-selection, resize handles, and richer vector editing.
4. Equations, chemical notation, and scientific text rules.
5. A normalized import pipeline for additional licensed packs.
6. Collaborative lab workspaces, comments, and review history.
7. Accessible figure descriptions and standards-based pathway export.
