(() => {
  if (typeof createDrawer !== 'function') return;

  const drawer = createDrawer('insertDrawer', 'Insert', 'Add objects, files, scientific artwork, and pages');
  drawer.querySelector('.utility-body').innerHTML = `
    <div class="insert-section">
      <h3>Basic objects</h3>
      <div class="insert-grid" id="insertBasicGrid"></div>
    </div>
    <div class="insert-section">
      <h3>Files and vectors</h3>
      <div class="insert-grid" id="insertFileGrid"></div>
    </div>
    <div class="insert-section">
      <h3>Scientific artwork</h3>
      <div class="insert-grid" id="insertScienceGrid"></div>
    </div>
    <div class="insert-section">
      <h3>Document</h3>
      <div class="insert-grid" id="insertDocumentGrid"></div>
    </div>
    <p class="tool-note">Science still opens the built-in science library directly. Insert collects all common ways to add something in one place.</p>
  `;

  function closeDrawer() {
    drawer.classList.remove('open');
  }

  function ribbonButton(label) {
    return [...document.querySelectorAll('.ribbon button')]
      .find(button => button.textContent.trim().toLowerCase() === label.toLowerCase());
  }

  function actionButton(label, description, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'insert-action';
    button.innerHTML = `<strong>${label}</strong><small>${description}</small>`;
    button.addEventListener('click', () => {
      action();
      closeDrawer();
    });
    return button;
  }

  const basic = drawer.querySelector('#insertBasicGrid');
  basic.append(
    actionButton('Text', 'Editable text box', () => document.getElementById('addTextButton')?.click()),
    actionButton('Rectangle', 'Rounded shape', () => document.getElementById('addShapeButton')?.click()),
    actionButton('Ellipse', 'Circle or oval', () => ribbonButton('Ellipse')?.click()),
    actionButton('Arrow', 'Process arrow', () => document.getElementById('addArrowButton')?.click()),
    actionButton('Inhibition', 'T-ended pathway line', () => ribbonButton('Inhibit')?.click())
  );

  const files = drawer.querySelector('#insertFileGrid');
  files.append(
    actionButton('Upload image', 'PNG, JPEG, WebP, or SVG', () => document.getElementById('assetFile')?.click()),
    actionButton('Editable SVG library', 'Import or reuse vector artwork', () => document.getElementById('editableSvgDrawer')?.classList.add('open')),
    actionButton('Fonts', 'Choose or import project fonts', () => document.getElementById('fontLibraryDrawer')?.classList.add('open'))
  );

  const science = drawer.querySelector('#insertScienceGrid');
  science.append(
    actionButton('Science library', 'Built-in editable scientific objects', () => {
      document.getElementById('scienceDrawer')?.classList.add('open');
      document.querySelectorAll('.ribbon-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === 'science'));
    }),
    actionButton('Water 32', 'Water and wastewater vectors', () => {
      document.getElementById('scienceDrawer')?.classList.add('open');
      const search = document.getElementById('scienceSearch');
      if (search) {
        search.value = 'water';
        search.dispatchEvent(new Event('input', { bubbles:true }));
      }
    }),
    actionButton('2,829 Bioicons', 'Search the licensed online SVG index', () => {
      const packsDrawer = document.getElementById('packsDrawer');
      if (!packsDrawer?.classList.contains('open')) {
        const packsButton = [...document.querySelectorAll('#scienceDrawer .science-search button')]
          .find(button => /2,829|svg|packs/i.test(button.textContent));
        packsButton?.click();
      }
    }),
    actionButton('Figure Assistant', 'Build an editable diagram from a description', () => document.getElementById('figureAssistantDrawer')?.classList.add('open'))
  );

  const documentGrid = drawer.querySelector('#insertDocumentGrid');
  documentGrid.append(
    actionButton('New page', 'Add another editable page', () => document.getElementById('addPageButton')?.click())
  );

  const insertTab = document.querySelector('[data-tab="insert"]');
  insertTab?.addEventListener('click', () => drawer.classList.toggle('open'));

  document.querySelectorAll('.ribbon-tab').forEach(tab => {
    if (tab === insertTab) return;
    tab.addEventListener('click', () => drawer.classList.remove('open'));
  });

  const style = document.createElement('style');
  style.textContent = `
    #insertDrawer{width:min(520px,calc(100vw - 20px))}
    .insert-section{margin-bottom:15px}.insert-section h3{margin:0 0 8px;color:#526077;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
    .insert-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .insert-action{min-width:0;min-height:58px;display:grid;align-content:center;gap:3px;padding:9px 10px;border:1px solid #d1dae6;border-radius:9px;background:#fff;text-align:left;white-space:normal;overflow-wrap:anywhere}
    .insert-action:hover{border-color:#7699df;background:#f3f7ff}.insert-action strong,.insert-action small{display:block;max-width:100%}.insert-action strong{font-size:11px;color:#2d3a50}.insert-action small{font-size:9px;line-height:1.3;color:#728095}
    @media(max-width:520px){.insert-grid{grid-template-columns:1fr}.insert-action{min-height:52px}}
  `;
  document.head.appendChild(style);
})();