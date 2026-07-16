# Illustration packs and licensing

SciCanvas separates its original built-in drawings from external illustration packs. Every imported external asset should retain its source, author, licence, source URL, and attribution text inside the editable project.

## Integrated pack: Bioicons

SciCanvas can load the complete Bioicons search index at runtime and browse all entries from inside the Science library.

- Source: https://bioicons.com/
- Repository: https://github.com/duerrsimon/bioicons
- Complete source package: https://github.com/duerrsimon/bioicons/archive/refs/heads/main.zip
- Machine-readable index: `static/icons/icons.json` in the Bioicons repository
- Formats: SVG
- Licence model: per-icon; currently includes CC0, CC BY, CC BY-SA, MIT, and BSD entries

When a Bioicon is added to a canvas, SciCanvas:

1. Downloads the individual SVG.
2. Removes scripts, event handlers, embedded foreign objects, and unsafe external references.
3. Embeds the cleaned SVG as a data URL inside the project.
4. Stores the original name, category, author, author URL, licence, licence URL, source URL, and attribution wording in the object metadata.
5. Includes the asset in the detailed attribution report.

The search index is cached in IndexedDB. Individual SVGs are embedded only when used, which avoids silently downloading thousands of files while still exposing the complete package.

## Whole-package download: Servier Medical Art

Servier Medical Art provides a complete downloadable slide-set package and category-specific PowerPoint kits.

- Library: https://smart.servier.com/
- Category kits: https://smart.servier.com/image-kits-by-category/
- Complete package: https://smart.servier.com/wp-content/uploads/ServierMedicalArt-all-kits.zip
- Licence: CC BY 4.0

The package is linked from the SciCanvas Packs drawer. It is not automatically unpacked in the browser because it is a large PowerPoint archive rather than a normalized SVG manifest. Individual exported images can be uploaded into the personal asset vault and given licence metadata.

## NIH BioArt Source

- Library: https://bioart.niaid.nih.gov/
- Terms: https://bioart.niaid.nih.gov/terms

NIH BioArt Source contains professional scientific illustrations, vectors, brushes, swatches, and templates. The collection allows broad reuse, but the licence and attribution requirements must be checked for each individual entry. SciCanvas therefore links to the library rather than assigning one licence to the entire collection.

## Reactome Icon Library

- Library: https://reactome.org/icon-lib
- Licence information: https://reactome.org/license

Reactome is linked as a pathway-oriented source. Assets should only be imported after checking the applicable source and icon guidance.

## Attribution reports

The Data drawer contains two reports:

- The general SciCanvas attribution report for built-in and user-supplied content.
- The detailed asset attribution report for external pack assets, including author, licence, licence URL, original source, and prepared credit wording.

Attribution reports help with recordkeeping but do not replace checking the current source terms before publication.
