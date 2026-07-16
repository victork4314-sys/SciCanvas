(() => {
  function openOffice() { window.SciCanvasOffice?.open?.(); }
  function clickOffice(selector) {
    openOffice();
    requestAnimationFrame(() => document.querySelector(selector)?.click());
  }

  const actions = document.querySelector('.title-actions');
  const exportButton = document.getElementById('exportButton');
  if (actions && exportButton && !document.getElementById('importButton')) {
    const button = document.createElement('button');
    button.id = 'importButton';
    button.type = 'button';
    button.textContent = 'Import';
    button.title = 'Import PowerPoint, Excel, ODS, CSV, TSV, images, SVGs, or SciCanvas projects';
    button.addEventListener('click', openOffice);
    actions.insertBefore(button, exportButton);
  }

  const exportMenuNode = window.exportMenu || document.getElementById('exportMenu');
  if (exportMenuNode && !exportMenuNode.querySelector('[data-office-export="editable-pptx"]')) {
    const editable = document.createElement('button');
    editable.type = 'button';
    editable.dataset.officeExport = 'editable-pptx';
    editable.innerHTML = '<strong>PowerPoint (.pptx) · editable</strong><small>Native text, shapes, arrows, charts, and tables</small>';
    editable.addEventListener('click', () => {
      exportMenuNode.classList.remove('open');
      clickOffice('#officeExportPptx');
    });

    const flat = document.createElement('button');
    flat.type = 'button';
    flat.dataset.officeExport = 'flat-pptx';
    flat.innerHTML = '<strong>PowerPoint (.pptx) · compatibility</strong><small>Flattened slides for maximum visual fidelity</small>';
    flat.addEventListener('click', () => {
      exportMenuNode.classList.remove('open');
      clickOffice('#officeExportFlatPptx');
    });

    const anchor = exportMenuNode.querySelector('small');
    exportMenuNode.insertBefore(editable, anchor);
    exportMenuNode.insertBefore(flat, anchor);
  }

  function installOfficeTourStep() {
    const overlay = document.getElementById('scicanvasTour');
    const next = overlay?.querySelector('[data-tour="next"]');
    if (!overlay || !next || next.dataset.officeTourInstalled) return;
    next.dataset.officeTourInstalled = '1';
    let showingOffice = false;

    next.addEventListener('click', event => {
      const progress = overlay.querySelector('.tour-progress')?.textContent?.trim();
      if (!showingOffice && progress === '6 of 6') {
        event.preventDefault();
        event.stopImmediatePropagation();
        showingOffice = true;
        overlay.querySelector('#tourTitle').textContent = 'PowerPoint and spreadsheets';
        overlay.querySelector('#tourText').textContent = 'Use Import beside Export for PowerPoint, Excel, ODS, CSV, and TSV. Export also includes explicit editable and compatibility PowerPoint options.';
        overlay.querySelector('.tour-progress').textContent = '7 of 7';
        next.textContent = 'Done';
        const back = overlay.querySelector('[data-tour="back"]');
        if (back) back.disabled = false;
        const target = document.getElementById('importButton') || document.getElementById('officeBridgeButton');
        const highlight = overlay.querySelector('.tour-highlight');
        if (target && highlight) {
          const rect = target.getBoundingClientRect();
          highlight.hidden = false;
          highlight.style.left = `${Math.max(4, rect.left - 5)}px`;
          highlight.style.top = `${Math.max(4, rect.top - 5)}px`;
          highlight.style.width = `${rect.width + 10}px`;
          highlight.style.height = `${rect.height + 10}px`;
        }
      } else if (showingOffice) {
        showingOffice = false;
      }
    }, true);

    overlay.querySelector('[data-tour="back"]')?.addEventListener('click', event => {
      if (!showingOffice) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showingOffice = false;
      overlay.querySelector('#tourTitle').textContent = 'Export and backup';
      overlay.querySelector('#tourText').textContent = 'Export SVG, PNG, PowerPoint, or the complete editable project. The Export button always stays visible in the top bar.';
      overlay.querySelector('.tour-progress').textContent = '6 of 6';
      next.textContent = 'Next';
    }, true);
  }
  setTimeout(installOfficeTourStep, 50);

  const style = document.createElement('style');
  style.textContent = `
    #importButton{display:inline-flex!important;visibility:visible!important;align-items:center;justify-content:center;background:#f8fafc!important;color:#2454ad!important;border-color:#9db6e5!important;font-weight:700}
    [data-office-export]{display:grid!important;gap:2px!important;text-align:left!important;background:#eef4ff!important;border-color:#8da9df!important;white-space:normal!important}
    [data-office-export] strong{font-size:12px;color:#204c9e}[data-office-export] small{font-size:10px;color:#60749a}
    @media(max-width:520px){#importButton{padding-inline:9px!important}}
  `;
  document.head.appendChild(style);
})();