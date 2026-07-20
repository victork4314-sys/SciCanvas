(() => {
  if (window.__figureLoomExportMenuLoaderV2) return;
  window.__figureLoomExportMenuLoaderV2 = true;
  window.__figureLoomLegacyPptxExporterRetired = true;
  const script = document.createElement('script');
  script.src = 'export-menu-final.js?v=20260720-v2';
  script.async = false;
  document.head.appendChild(script);
})();