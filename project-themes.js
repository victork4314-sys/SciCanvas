(() => {
  const THEMES = [
    {
      id: 'lab-light', name: 'Lab Light', description: 'Clean journal-ready blue',
      ui: { accent:'#2563eb', accent2:'#7c3aed', workspace:'#e9eef5', surface:'#ffffff', surface2:'#f7f9fc', panel:'#f9fbfd', border:'#d9e0e9', text:'#253044', muted:'#697589' },
      page: { mode:'solid', primary:'#ffffff', secondary:'#edf3ff', angle:135 },
      palette: ['#8ea0ff','#8fd2c3','#f3cc72','#ee8d9f','#bd91ef'], text:'#172033', stroke:'#26324a'
    },
    {
      id: 'fluorescence', name: 'Fluorescence', description: 'Dark microscopy and neon signals',
      ui: { accent:'#20d9b6', accent2:'#9b7cff', workspace:'#0b1020', surface:'#151c2f', surface2:'#101729', panel:'#11192b', border:'#2b3857', text:'#eef5ff', muted:'#9fb0ca' },
      page: { mode:'gradient', primary:'#101729', secondary:'#1d2f50', angle:135 },
      palette: ['#24e0bd','#ff6fb5','#7b9cff','#ffd35a','#b781ff'], text:'#f7fbff', stroke:'#dce8ff'
    },
    {
      id: 'agar-peach', name: 'Agar Peach', description: 'Warm culture-plate tones',
      ui: { accent:'#e56d4d', accent2:'#d9903d', workspace:'#f5e9df', surface:'#fffaf5', surface2:'#fff3e8', panel:'#fff8f1', border:'#e7cfc0', text:'#4a3027', muted:'#8b675a' },
      page: { mode:'gradient', primary:'#fff9f2', secondary:'#ffe1c8', angle:135 },
      palette: ['#ef9a7f','#f0bf67','#d7889f','#8fc5ad','#9aa8df'], text:'#4b3028', stroke:'#6b4133'
    },
    {
      id: 'mint-culture', name: 'Mint Culture', description: 'Fresh microbiology greens',
      ui: { accent:'#278a70', accent2:'#46a8a0', workspace:'#e2f0eb', surface:'#fbfffd', surface2:'#effaf6', panel:'#f6fdf9', border:'#c9dfd6', text:'#24483d', muted:'#66877c' },
      page: { mode:'gradient', primary:'#f4fff9', secondary:'#d4f2e5', angle:135 },
      palette: ['#6cc6a7','#81b9df','#f0c46e','#d98ca5','#9d91dc'], text:'#23463b', stroke:'#315e50'
    },
    {
      id: 'lilac-assay', name: 'Lilac Assay', description: 'Soft molecular biology purple',
      ui: { accent:'#7557c8', accent2:'#b05cb7', workspace:'#eee8f6', surface:'#fffaff', surface2:'#f6f0fb', panel:'#fcf8ff', border:'#ddd0e9', text:'#403251', muted:'#7f6b91' },
      page: { mode:'gradient', primary:'#fffaff', secondary:'#e8dbff', angle:135 },
      palette: ['#a58be5','#d88ebd','#78b7b2','#ecc26f','#83a6dc'], text:'#3f3150', stroke:'#5b476f'
    },
    {
      id: 'ocean-sequencing', name: 'Ocean Sequencing', description: 'Cool cyan and deep genome blue',
      ui: { accent:'#147fa3', accent2:'#315fc5', workspace:'#dcecf3', surface:'#fafdff', surface2:'#edf7fb', panel:'#f4fbfe', border:'#c5dce7', text:'#183d50', muted:'#5d7f90' },
      page: { mode:'gradient', primary:'#f5fcff', secondary:'#cfeaf5', angle:135 },
      palette: ['#4ab1c8','#5d83d9','#72c7a6','#f0b766','#c085d5'], text:'#173b4e', stroke:'#265b72'
    },
    {
      id: 'crimson-pathway', name: 'Crimson Pathway', description: 'Strong signaling and inhibition',
      ui: { accent:'#b8324b', accent2:'#e16a45', workspace:'#f0e2e3', surface:'#fffafa', surface2:'#faeeee', panel:'#fff6f6', border:'#e3c8cc', text:'#4c2930', muted:'#8c6269' },
      page: { mode:'gradient', primary:'#fffafa', secondary:'#f4d9dc', angle:135 },
      palette: ['#d85670','#ee9a62','#8bb8c7','#8fc39f','#aa8bd2'], text:'#4a2830', stroke:'#6d3542'
    },
    {
      id: 'retro-microscope', name: 'Retro Microscope', description: 'Cream paper and vintage instruments',
      ui: { accent:'#3f7d71', accent2:'#b17342', workspace:'#e7dfcb', surface:'#fffaf0', surface2:'#f4ecda', panel:'#fbf5e8', border:'#d6c9ac', text:'#3f3a2e', muted:'#7f7661' },
      page: { mode:'solid', primary:'#fffaf0', secondary:'#efe4c9', angle:135 },
      palette: ['#5f9b8b','#cf8b54','#d3b55f','#7e91b8','#a982a9'], text:'#3e392d', stroke:'#665e49'
    },
    {
      id: 'journal-mono', name: 'Journal Mono', description: 'Black, white, and publication gray',
      ui: { accent:'#333333', accent2:'#777777', workspace:'#e7e7e7', surface:'#ffffff', surface2:'#f3f3f3', panel:'#fafafa', border:'#cfcfcf', text:'#222222', muted:'#707070' },
      page: { mode:'solid', primary:'#ffffff', secondary:'#eeeeee', angle:135 },
      palette: ['#2e2e2e','#676767','#969696','#bcbcbc','#e0e0e0'], text:'#111111', stroke:'#111111'
    },
    {
      id: 'solar-lab', name: 'Solar Lab', description: 'Golden light with teal contrast',
      ui: { accent:'#c07a16', accent2:'#1b8d85', workspace:'#efe7d5', surface:'#fffaf0', surface2:'#f7f0df', panel:'#fcf7eb', border:'#ddcfad', text:'#4a402b', muted:'#837558' },
      page: { mode:'gradient', primary:'#fffaf0', secondary:'#f7dfa5', angle:135 },
      palette: ['#e5a63c','#3aa59c','#d36e7d','#6f91cf','#9b7ac2'], text:'#463d29', stroke:'#675a3e'
    },
    {
      id: 'cytometry-pop', name: 'Cytometry Pop', description: 'Bold gates and bright cell populations',
      ui: { accent:'#f0448b', accent2:'#6a62ff', workspace:'#ece8f4', surface:'#fffaff', surface2:'#f7f1ff', panel:'#fcf8ff', border:'#dacfed', text:'#392c4b', muted:'#77678d' },
      page: { mode:'gradient', primary:'#fff9ff', secondary:'#e6e1ff', angle:45 },
      palette: ['#f05293','#675fff','#21b7a8','#f5b83d','#925fca'], text:'#392c4b', stroke:'#55436c'
    },
    {
      id: 'high-contrast', name: 'High Contrast', description: 'Maximum UI and figure separation',
      ui: { accent:'#005fcc', accent2:'#d10068', workspace:'#d7dce3', surface:'#ffffff', surface2:'#edf1f6', panel:'#ffffff', border:'#6d7785', text:'#000000', muted:'#3f4650' },
      page: { mode:'solid', primary:'#ffffff', secondary:'#e8edf4', angle:135 },
      palette: ['#0066cc','#d0005f','#009267','#e58a00','#6d42c7'], text:'#000000', stroke:'#000000'
    }
  ];

  state.projectTheme ??= 'lab-light';

  function themeById(id = state.projectTheme) {
    return THEMES.find(theme => theme.id === id) || THEMES[0];
  }

  function applyUiTheme(theme = themeById()) {
    const root = document.documentElement;
    const variables = {
      '--sc-accent': theme.ui.accent,
      '--sc-accent-2': theme.ui.accent2,
      '--sc-workspace': theme.ui.workspace,
      '--sc-surface': theme.ui.surface,
      '--sc-surface-2': theme.ui.surface2,
      '--sc-panel': theme.ui.panel,
      '--sc-border': theme.ui.border,
      '--sc-text': theme.ui.text,
      '--sc-muted': theme.ui.muted
    };
    Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value));
    document.body.dataset.projectTheme = theme.id;
  }

  function colorObject(item, theme, index) {
    if (item.type === 'image') return;
    if (item.type === 'svg' && item.svgColorMode !== 'recolor') return;
    if (item.type === 'text') {
      item.fill = theme.text;
      item.stroke = theme.stroke;
      return;
    }
    if (item.type === 'arrow' || item.type === 'inhibition' || item.type === 'connector') {
      item.fill = index % 2 ? theme.ui.accent2 : theme.ui.accent;
      item.stroke = theme.stroke;
      return;
    }
    item.fill = theme.palette[index % theme.palette.length];
    item.stroke = theme.stroke;
  }

  function styleNewObject(item) {
    if (!item) return;
    const theme = themeById();
    colorObject(item, theme, Math.max(0, state.objects.indexOf(item)));
  }
  window.styleNewObjectFromTheme = styleNewObject;

  function applyProjectTheme(id, { recolor = true, backgrounds = true } = {}) {
    const theme = themeById(id);
    pushHistory();
    state.projectTheme = theme.id;
    applyUiTheme(theme);

    state.pages.forEach(page => {
      if (backgrounds) page.background = structuredClone(theme.page);
      if (recolor) page.objects.forEach((item, index) => colorObject(item, theme, index));
    });

    render();
    renderPages();
    window.applyPageBackground?.();
    scheduleSave();
    drawThemeCards();
  }

  const themeStyle = document.createElement('style');
  themeStyle.textContent = `
    body,.workspace{background:var(--sc-workspace)!important;color:var(--sc-text)!important}
    .titlebar,.ribbon,.statusbar,.left-panel,.right-panel,.canvas-toolbar,.utility-drawer,#scienceDrawer,#packsDrawer,#exportMenu{background:var(--sc-surface)!important;color:var(--sc-text)!important;border-color:var(--sc-border)!important}
    .ribbon-tabs{background:var(--sc-surface-2)!important;border-color:var(--sc-border)!important}.left-panel,.right-panel{background:var(--sc-panel)!important}
    .titlebar,.ribbon,.statusbar,.tool-group,.inspector-section,.inspector-tabs,.utility-head,.science-head{border-color:var(--sc-border)!important}
    button,input,select,textarea,.layer-item,.page-thumbnail,.science-card,.template-card,.personal-card,.pack-icon{border-color:var(--sc-border)!important;color:var(--sc-text)}
    .brand-mark{background:linear-gradient(135deg,var(--sc-accent),var(--sc-accent-2))!important}
    #exportButton,.utility-action.primary,.background-mode-row button.active,.science-categories button.active{background:var(--sc-accent)!important;border-color:var(--sc-accent)!important;color:white!important}
    .ribbon-tab.active,.inspector-tab.active{color:var(--sc-accent)!important;border-bottom-color:var(--sc-accent)!important}
    .page-thumbnail.active,.layer-item.active{border-color:var(--sc-accent)!important;background:color-mix(in srgb,var(--sc-accent) 10%,var(--sc-surface))!important}
    .brand span,.document-title span,.tool-group-label,.panel-heading h2,.inspector-section h2,.field-grid label,.full-field,.statusbar,.tool-note{color:var(--sc-muted)!important}
    .canvas-area{background:var(--sc-workspace)!important}#canvas{box-shadow:0 18px 45px color-mix(in srgb,var(--sc-text) 18%,transparent),0 0 0 1px var(--sc-border)!important}
    .project-theme-panel{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--sc-border)}.project-theme-panel h3{margin:0 0 4px;font-size:13px}.project-theme-panel>p{margin:0 0 10px;color:var(--sc-muted);font-size:10px;line-height:1.35}
    .project-theme-options{display:flex;gap:12px;margin-bottom:10px;font-size:10px;color:var(--sc-muted)}.theme-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.theme-card{display:grid;grid-template-columns:42px 1fr;gap:8px;align-items:center;text-align:left;padding:7px;border:1px solid var(--sc-border);border-radius:9px;background:var(--sc-surface)}
    .theme-card.active{box-shadow:0 0 0 2px color-mix(in srgb,var(--sc-accent) 34%,transparent);border-color:var(--sc-accent)!important}.theme-stripes{height:38px;border-radius:6px;display:grid;grid-template-columns:repeat(5,1fr);overflow:hidden}.theme-card strong,.theme-card small{display:block}.theme-card strong{font-size:10px}.theme-card small{margin-top:2px;color:var(--sc-muted);font-size:8px;line-height:1.2}
  `;
  document.head.appendChild(themeStyle);

  const panel = document.createElement('section');
  panel.className = 'project-theme-panel';
  panel.innerHTML = `
    <h3>Project color theme</h3>
    <p>Changes the app chrome, page backgrounds, object palette, text, arrows, and new-object defaults.</p>
    <div class="project-theme-options">
      <label><input id="themeRecolor" type="checkbox" checked> Recolor objects</label>
      <label><input id="themeBackgrounds" type="checkbox" checked> Change every page</label>
    </div>
    <div id="projectThemeGrid" class="theme-grid"></div>
  `;
  designDrawer.querySelector('.utility-body').prepend(panel);
  const themeGrid = panel.querySelector('#projectThemeGrid');

  function drawThemeCards() {
    themeGrid.replaceChildren();
    THEMES.forEach(theme => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `theme-card${theme.id === state.projectTheme ? ' active' : ''}`;
      const colors = [theme.ui.accent, ...theme.palette.slice(0, 4)];
      button.innerHTML = `<span class="theme-stripes">${colors.map(color => `<i style="background:${color}"></i>`).join('')}</span><span><strong>${theme.name}</strong><small>${theme.description}</small></span>`;
      button.addEventListener('click', () => applyProjectTheme(theme.id, {
        recolor: panel.querySelector('#themeRecolor').checked,
        backgrounds: panel.querySelector('#themeBackgrounds').checked
      }));
      themeGrid.appendChild(button);
    });
  }

  const themeBaseMakeObject = makeObject;
  makeObject = function themedMakeObject(type) {
    themeBaseMakeObject(type);
    styleNewObject(selectedObject());
    render();
    scheduleSave();
  };

  const themeBaseScienceAsset = addScienceAsset;
  addScienceAsset = function themedScienceAsset(asset) {
    themeBaseScienceAsset(asset);
    styleNewObject(selectedObject());
    render();
    scheduleSave();
  };

  if (typeof addSpecialObject === 'function') {
    const themeBaseSpecialObject = addSpecialObject;
    addSpecialObject = function themedSpecialObject(type) {
      themeBaseSpecialObject(type);
      styleNewObject(selectedObject());
      render();
      scheduleSave();
    };
  }

  const themeBaseSnapshot = snapshot;
  snapshot = function snapshotWithTheme() {
    const data = JSON.parse(themeBaseSnapshot());
    data.projectTheme = state.projectTheme;
    return JSON.stringify(data);
  };

  const themeBaseRestore = restore;
  restore = function restoreWithTheme(serialized) {
    const data = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
    state.projectTheme = data.projectTheme || state.projectTheme || 'lab-light';
    themeBaseRestore(data);
    applyUiTheme(themeById());
    drawThemeCards();
  };

  const themeBaseProjectData = projectData;
  projectData = function projectDataWithTheme() {
    return { ...themeBaseProjectData(), projectTheme: state.projectTheme };
  };

  applyUiTheme(themeById());
  drawThemeCards();
})();
