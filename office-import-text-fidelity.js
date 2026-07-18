(() => {
  // Text fidelity is handled by office-import-fix.js. Keep this loaded file inert
  // so older cached index pages do not start a second importer and replace it.
  if (window.__figureLoomImporterRuntimeLoaderV1 || window.__figureLoomImporterCoreLoaderV5) return;
})();
