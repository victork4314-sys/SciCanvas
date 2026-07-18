(() => {
  // Text fidelity is handled by office-import-fix.js. Keep this loaded file inert
  // so older cached index pages do not start a second importer and replace it.
  if (window.__figureLoomImporterCoreLoaderV5) return;
  console.warn('FigureLoom presentation importer entry did not initialize.');
})();
