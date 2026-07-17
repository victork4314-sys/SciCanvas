(() => {
  if (window.__figureloomIntuitiveUxInstalled) return;
  window.__figureloomIntuitiveUxInstalled = true;

  const COLORS = Object.freeze({
    primary: "#2563eb",
    primaryDark: "#1d4ed8",
    text: "#253044",
    muted: "#6b7280",
    line: "#cfd7e3",
    white: "#ffffff",
    surface: "#f4f7fb"
  });

  const QUICK_START_HIDDEN = "figureloom-quick-start-hidden-v1";
  const ONCE_PREFIX = "figureloom-intuitive-tip:";
  let updateQueued = false;
  let finderIndex = 0;
  let finderMatches = [];

  function storageGet(key) {
    try { return sessionStorage.getItem(key); } catch { return null; }
  }

  function storageSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch { /* private mode */ }
  }

  function toast(message, kind = "info") {
    if (typeof window.SciCanvasToast === "function") window.SciCanvasToast(message, kind);
  }

  function showOnce(key, message, kind = "info") {
    const storageKey = `${ONCE_PREFIX}${key}`;
    if (storageGet(storageKey)) return;
    storageSet(storageKey, "shown");
    toast(message, kind);
  }

  function topLevelDrawers() {
    return [...document.body.children].filter(node =>
      node instanceof HTMLElement &&
      node.classList.contains("open") &&
      (node.matches(".utility-drawer,#scienceDrawer,.packs-drawer") || /Drawer$/.test(node.id))
    );
  }

  function closeDrawers(except = null) {
    topLevelDrawers().forEach(drawer => {
      if (drawer !== except) drawer.classList.remove("open");
    });
  }

  function openDrawer(id) {
    const drawer = document.getElementById(id);
    if (!drawer) return false;
    closeDrawers(drawer);
    drawer.classList.add("open");
    return true;
  }

  function openScience() {
    const drawer = document.getElementById("scienceDrawer");
    if (!drawer) return;
    closeDrawers(drawer);
    drawer.classList.add("open");
    document.querySelectorAll(".ribbon-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.tab === "science"));
  }

  function openTab(name) {
    document.querySelector(`.ribbon-tab[data-tab="${name}"]`)?.click();
  }

  function openProjectFile() {
    const file = document.getElementById("projectFile");
    if (file) {
      file.click();
      return;
    }
    openDrawer("projectDrawer");
  }

  function openTool(name, fallback) {
    const action = window[name];
    if (typeof action === "function") action();
    else fallback?.();
  }

  function selectedItems() {
    const viaSelection = window.SciCanvasSelection?.objects?.();
    if (Array.isArray(viaSelection) && viaSelection.length) return viaSelection;
    if (typeof state === "undefined" || !Array.isArray(state.objects)) return [];
    const item = state.objects.find(object => object.id === state.selectedId);
    return item ? [item] : [];
  }

  function selectionHint(item, count) {
    if (!item) return "Select an object on the canvas or in Layers to edit it.";
    if (count > 1) return `${count} objects selected. Use Layout to align, space, group, or size them together.`;
    if (item.type === "text") return "Tap the text itself and type. Drag it to move; use Format for typography and size.";
    if (item.type === "shape") return "Drag to move. Use the resize handles or Format fields to change its size, fill, and outline.";
    if (item.type === "arrow" || item.type === "connector") return "Drag to move. Use Layout or the quick menu for alignment, layering, and connections.";
    if (item.type === "chart") return "Double-click the chart to edit its data. Use Format for size and appearance.";
    if (item.type === "image") return "Drag to move and use the handles to resize. The original image remains embedded in the project.";
    if (item.type === "science" || item.type === "svg") return "Drag to move and use the handles to resize. Use Design or Format to adjust its appearance.";
    if (item.type === "annotation") return "Edit the label and leader in the annotation controls, then drag it into position.";
    return "Drag to move. Use the quick menu above the object for common actions, or Format for precise changes.";
  }

  function installCoreLabels() {
    const labels = [
      ["bringForwardButton", "Bring forward", "Move the selected object one layer forward"],
      ["sendBackwardButton", "Send backward", "Move the selected object one layer backward"],
      ["fitButton", "Fit page", "Fit the whole page in the workspace"],
      ["deleteButton", "Delete", "Delete the selected object"],
      ["exportButton", "Export", "Export or publish the current figure"],
      ["undoButton", "Undo", "Undo the last change · Ctrl/⌘ Z"],
      ["redoButton", "Redo", "Redo the last undone change · Ctrl/⌘ Shift Z"]
    ];
    labels.forEach(([id, text, title]) => {
      const button = document.getElementById(id);
      if (!button) return;
      if (button.textContent.trim() !== text) button.textContent = text;
      button.title = title;
      button.setAttribute("aria-label", title);
    });

    const tabs = {
      home: "Add text, shapes, arrows, and everyday objects",
      insert: "Insert images, files, equations, maps, and other content",
      science: "Browse scientific illustrations and chemical structures",
      layout: "Align, group, distribute, resize, and arrange objects",
      design: "Change colors, fonts, styles, and themes",
      data: "Create charts, tables, and data-driven figures",
      review: "Check accessibility, consistency, and export readiness"
    };
    document.querySelectorAll(".ribbon-tab[data-tab]").forEach(tab => {
      const description = tabs[tab.dataset.tab];
      if (!description) return;
      tab.title = description;
      tab.setAttribute("aria-label", `${tab.textContent.trim()}. ${description}`);
    });
    const collaborate = document.getElementById("collaborateRibbonButton");
    if (collaborate) collaborate.title = "Share access and collaborate on this project";

    const documentName = document.getElementById("documentName");
    if (documentName) {
      documentName.placeholder = "Name this figure";
      documentName.title = "Figure or project name";
      documentName.setAttribute("aria-label", "Figure or project name");
    }

    const inspectorLabels = {
      positionX: "Horizontal position",
      positionY: "Vertical position",
      objectWidth: "Object width",
      objectHeight: "Object height",
      fillColor: "Fill or text color",
      strokeColor: "Outline color",
      opacity: "Object opacity"
    };
    Object.entries(inspectorLabels).forEach(([id, label]) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.title = label;
      input.setAttribute("aria-label", label);
    });
  }

  function enhanceDrawer(drawer) {
    if (!(drawer instanceof HTMLElement) || drawer.dataset.intuitiveDrawer === "true") return;
    const head = drawer.querySelector(":scope > .utility-head, :scope > .science-head, :scope > .packs-head");
    if (!head) return;
    drawer.dataset.intuitiveDrawer = "true";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "false");
    const title = head.querySelector("strong");
    if (title) {
      title.id ||= `${drawer.id || "figureloom-drawer"}-title`;
      drawer.setAttribute("aria-labelledby", title.id);
    }
    const close = head.querySelector("button");
    if (close) {
      close.classList.add("intuitive-drawer-close");
      close.title = "Close and return to the canvas";
      close.setAttribute("aria-label", "Close and return to the canvas");
      if (["×", "✕", "x"].includes(close.textContent.trim().toLowerCase())) {
        close.innerHTML = '<span aria-hidden="true">×</span><span class="intuitive-close-word">Close</span>';
      }
    }
  }

  function installSelectionCoach() {
    const selectionName = document.getElementById("selectionName");
    if (!selectionName || document.getElementById("figureloomSelectionCoach")) return;
    const coach = document.createElement("p");
    coach.id = "figureloomSelectionCoach";
    coach.setAttribute("aria-live", "polite");
    selectionName.insertAdjacentElement("afterend", coach);
  }

  function installFindButton() {
    const actions = document.querySelector(".title-actions");
    if (!actions || document.getElementById("figureloomFindToolButton")) return;
    const button = document.createElement("button");
    button.id = "figureloomFindToolButton";
    button.type = "button";
    button.innerHTML = '<span>Find tool</span><kbd>⌘K</kbd>';
    button.title = "Search every major Figureloom tool";
    button.setAttribute("aria-label", "Find a tool");
    button.addEventListener("click", openFinder);
    const exportButton = document.getElementById("exportButton");
    actions.insertBefore(button, exportButton || null);
  }

  function installHelpButton() {
    const statusbar = document.querySelector(".statusbar");
    if (!statusbar || document.getElementById("figureloomHelpButton")) return;
    const button = document.createElement("button");
    button.id = "figureloomHelpButton";
    button.type = "button";
    button.textContent = "Help";
    button.title = "Open quick help";
    button.addEventListener("click", openHelp);
    statusbar.appendChild(button);
  }

  function installQuickStart() {
    const canvasArea = document.querySelector(".canvas-area");
    if (!canvasArea || document.getElementById("figureloomQuickStart")) return;
    const panel = document.createElement("section");
    panel.id = "figureloomQuickStart";
    panel.setAttribute("aria-label", "Start a figure");
    panel.innerHTML = `
      <button class="quick-start-dismiss" type="button" aria-label="Hide quick start" title="Hide quick start">×</button>
      <span class="quick-start-kicker">Start here</span>
      <h2>What are you making?</h2>
      <p>Pick the first thing you need. Everything stays editable.</p>
      <div class="quick-start-actions">
        <button type="button" data-quick="text"><strong>Text label</strong><span>Write directly on the canvas</span></button>
        <button type="button" data-quick="science"><strong>Scientific illustration</strong><span>Search biology, chemistry, lab, and more</span></button>
        <button type="button" data-quick="template"><strong>Template</strong><span>Start with an editable structure</span></button>
        <button type="button" data-quick="project"><strong>Open project</strong><span>Continue from a Figureloom file</span></button>
      </div>
      <button class="quick-start-find" type="button">Find any other tool</button>
    `;
    canvasArea.appendChild(panel);
    panel.querySelector(".quick-start-dismiss").addEventListener("click", () => {
      storageSet(QUICK_START_HIDDEN, "true");
      updateExperience();
    });
    panel.querySelector('[data-quick="text"]').addEventListener("click", () => document.getElementById("addTextButton")?.click());
    panel.querySelector('[data-quick="science"]').addEventListener("click", openScience);
    panel.querySelector('[data-quick="template"]').addEventListener("click", () => openDrawer("templateDrawer"));
    panel.querySelector('[data-quick="project"]').addEventListener("click", openProjectFile);
    panel.querySelector(".quick-start-find").addEventListener("click", openFinder);
  }

  function installHelpDrawer() {
    if (document.getElementById("intuitiveHelpDrawer") || typeof createDrawer !== "function") return;
    const drawer = createDrawer("intuitiveHelpDrawer", "Quick help", "The fastest way to do the common things");
    drawer.classList.add("intuitive-help-drawer");
    drawer.querySelector(".utility-body").innerHTML = `
      <div class="intuitive-help-steps">
        <section><span>1</span><div><strong>Add something</strong><p>Use Insert for files and maps, or Science for illustrations and chemical structures.</p></div></section>
        <section><span>2</span><div><strong>Edit it directly</strong><p>Tap an object to select it. Tap text and type. Drag objects to move them and use the handles to resize.</p></div></section>
        <section><span>3</span><div><strong>Use the object menu</strong><p>The small menu above a selected object handles duplicate, layer order, rotate, lock, design, and delete.</p></div></section>
        <section><span>4</span><div><strong>Find anything</strong><p>Press Find tool or Ctrl/⌘ K and type what you are trying to do.</p></div></section>
        <section><span>5</span><div><strong>Finish safely</strong><p>Your project saves locally as you work. Export when the figure is ready, or use Project vault for a portable backup.</p></div></section>
      </div>
      <div class="intuitive-help-actions">
        <button type="button" data-help="find">Find a tool</button>
        <button type="button" data-help="science">Browse illustrations</button>
        <button type="button" data-help="templates">Open templates</button>
      </div>
      <details class="intuitive-shortcuts">
        <summary>Keyboard and touch shortcuts</summary>
        <p><strong>Ctrl/⌘ K</strong> find a tool · <strong>Ctrl/⌘ Z</strong> undo · <strong>Shift + arrow</strong> move 10 units · <strong>Space + drag</strong> pan · <strong>Pinch</strong> zoom · <strong>Esc</strong> close.</p>
      </details>
    `;
    drawer.querySelector('[data-help="find"]').addEventListener("click", () => { drawer.classList.remove("open"); openFinder(); });
    drawer.querySelector('[data-help="science"]').addEventListener("click", () => { drawer.classList.remove("open"); openScience(); });
    drawer.querySelector('[data-help="templates"]').addEventListener("click", () => { drawer.classList.remove("open"); openDrawer("templateDrawer"); });
    enhanceDrawer(drawer);
  }

  function openHelp() {
    installHelpDrawer();
    openDrawer("intuitiveHelpDrawer");
  }

  const commands = [
    { label: "Add text", detail: "Place an editable text label", keywords: "write label type", action: () => document.getElementById("addTextButton")?.click() },
    { label: "Add shape", detail: "Place an editable rounded shape", keywords: "rectangle box panel", action: () => document.getElementById("addShapeButton")?.click() },
    { label: "Add arrow", detail: "Place a flow arrow or connector", keywords: "flow connector line", action: () => document.getElementById("addArrowButton")?.click() },
    { label: "Browse scientific illustrations", detail: "Biology, lab equipment, anatomy, water, and more", keywords: "science icons library bioicons", action: openScience },
    { label: "Search chemical structures", detail: "Find dopamine, ATP, drugs, molecules, and PubChem compounds", keywords: "chemistry molecule pubchem dopamine", action: () => openTool("openPubChemLibrary", openScience) },
    { label: "Browse the large SVG library", detail: "Search thousands of licensed scientific SVGs", keywords: "bioicons 2829 svg pack", action: () => openTool("openExpandedLibrary", openScience) },
    { label: "Create an interactive map", detail: "Search, zoom, use satellite imagery, and annotate sites", keywords: "map satellite city marker", action: () => openTool("openMapStudio") },
    { label: "Start from a template", detail: "Choose an editable publication or workflow layout", keywords: "layout starter graphical abstract", action: () => openDrawer("templateDrawer") },
    { label: "Import a Figureloom project", detail: "Open a portable project backup", keywords: "open file backup scicanvas", action: openProjectFile },
    { label: "Project vault", detail: "Download backups and restore local snapshots", keywords: "backup recovery project", action: () => openDrawer("projectDrawer") },
    { label: "Figure Assistant", detail: "Build a figure from a guided prompt", keywords: "assistant diagram generate", action: () => openTool("openFigureAssistant") },
    { label: "Data and charts", detail: "Create charts, tables, and data-driven graphics", keywords: "csv graph plot table", action: () => openTool("openDataLab", () => openTab("data")) },
    { label: "Design and themes", detail: "Change colors, fonts, and visual style", keywords: "color typography theme", action: () => openTab("design") },
    { label: "Layout and alignment", detail: "Align, distribute, group, and arrange objects", keywords: "align distribute group size", action: () => openTab("layout") },
    { label: "Review and accessibility", detail: "Check consistency and export readiness", keywords: "review accessibility diagnostics", action: () => openTab("review") },
    { label: "Collaborate", detail: "Share access and project links", keywords: "share invite access", action: () => document.getElementById("collaborateRibbonButton")?.click() },
    { label: "Account and project gallery", detail: "Sign in or open cloud projects", keywords: "profile login gallery cloud", action: () => document.getElementById("accountProfileButton")?.click() },
    { label: "Export", detail: "Export the current figure", keywords: "png svg pptx publish", action: () => document.getElementById("exportButton")?.click() },
    { label: "Fit page", detail: "Show the entire page in the workspace", keywords: "zoom view canvas", action: () => document.getElementById("fitButton")?.click() },
    { label: "Workspace and recovery", detail: "Move page content, recover work, and run diagnostics", keywords: "recovery pages diagnostics reset", action: () => openTool("openWorkspaceRecovery") },
    { label: "Office import and export", detail: "Work with PowerPoint and office files", keywords: "powerpoint pptx excel office", action: () => window.SciCanvasOffice?.open?.() },
    { label: "Present pages", detail: "Start a full-screen presentation", keywords: "slideshow presentation", action: () => openTool("startSciCanvasPresentation") },
    { label: "Quick help", detail: "See the basic Figureloom workflow", keywords: "help tutorial how", action: openHelp }
  ];

  function installFinder() {
    if (document.getElementById("figureloomToolFinder")) return;
    const finder = document.createElement("section");
    finder.id = "figureloomToolFinder";
    finder.setAttribute("aria-hidden", "true");
    finder.innerHTML = `
      <div class="tool-finder-box" role="dialog" aria-modal="true" aria-label="Find a Figureloom tool">
        <div class="tool-finder-head"><div><strong>Find a tool</strong><span>Describe what you are trying to do</span></div><button type="button" aria-label="Close tool finder">×</button></div>
        <input type="search" autocomplete="off" placeholder="Try map, dopamine, align, export, template…" aria-label="Search Figureloom tools">
        <div class="tool-finder-results" role="listbox"></div>
        <small>↑↓ choose · Enter open · Esc close</small>
      </div>
    `;
    document.body.appendChild(finder);
    const input = finder.querySelector("input");
    finder.querySelector(".tool-finder-head button").addEventListener("click", closeFinder);
    finder.addEventListener("pointerdown", event => { if (event.target === finder) closeFinder(); });
    input.addEventListener("input", () => { finderIndex = 0; renderFinder(); });
    input.addEventListener("keydown", event => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        finderIndex = Math.min(Math.max(0, finderMatches.length - 1), finderIndex + 1);
        renderFinder();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        finderIndex = Math.max(0, finderIndex - 1);
        renderFinder();
      } else if (event.key === "Enter") {
        event.preventDefault();
        finderMatches[finderIndex]?.action();
        closeFinder();
      } else if (event.key === "Escape") {
        closeFinder();
      }
    });
  }

  function renderFinder() {
    const finder = document.getElementById("figureloomToolFinder");
    if (!finder) return;
    const input = finder.querySelector("input");
    const results = finder.querySelector(".tool-finder-results");
    const query = input.value.toLowerCase().trim();
    finderMatches = commands.filter(command => `${command.label} ${command.detail} ${command.keywords}`.toLowerCase().includes(query)).slice(0, 12);
    if (!query) finderMatches = commands.slice(0, 12);
    finderIndex = Math.min(finderIndex, Math.max(0, finderMatches.length - 1));
    results.replaceChildren();
    if (!finderMatches.length) {
      const empty = document.createElement("p");
      empty.className = "tool-finder-empty";
      empty.textContent = "No exact tool matched. Try a simpler word like map, text, science, data, or export.";
      results.appendChild(empty);
      return;
    }
    finderMatches.forEach((command, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = index === finderIndex ? "active" : "";
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(index === finderIndex));
      button.innerHTML = `<strong>${command.label}</strong><span>${command.detail}</span>`;
      button.addEventListener("pointerenter", () => { finderIndex = index; renderFinder(); });
      button.addEventListener("click", () => { closeFinder(); command.action(); });
      results.appendChild(button);
    });
    results.children[finderIndex]?.scrollIntoView({ block: "nearest" });
  }

  function openFinder() {
    installFinder();
    closeDrawers();
    const oldPalette = document.getElementById("scCommandPalette");
    oldPalette?.classList.remove("open");
    const finder = document.getElementById("figureloomToolFinder");
    const input = finder.querySelector("input");
    finder.classList.add("open");
    finder.setAttribute("aria-hidden", "false");
    input.value = "";
    finderIndex = 0;
    renderFinder();
    setTimeout(() => input.focus(), 0);
  }

  function closeFinder() {
    const finder = document.getElementById("figureloomToolFinder");
    finder?.classList.remove("open");
    finder?.setAttribute("aria-hidden", "true");
  }

  function currentExperienceBlocked() {
    return Boolean(
      document.querySelector("#scWelcome.open,#scicanvasTour.open,#figureloomToolFinder.open") ||
      document.querySelector(".figureloom-direct-label-editor,.figureloom-inline-label-editor")
    );
  }

  function updateExperience() {
    updateQueued = false;
    installCoreLabels();
    installSelectionCoach();
    installFindButton();
    installHelpButton();
    installQuickStart();
    installHelpDrawer();
    installFinder();
    document.querySelectorAll(".utility-drawer,#scienceDrawer,.packs-drawer").forEach(enhanceDrawer);

    const items = selectedItems();
    const coach = document.getElementById("figureloomSelectionCoach");
    if (coach) coach.textContent = selectionHint(items[0], items.length);

    const rightPanel = document.querySelector(".right-panel");
    rightPanel?.classList.toggle("intuitive-no-selection", items.length === 0);
    rightPanel?.classList.toggle("intuitive-has-selection", items.length > 0);

    const actionButtons = ["deleteButton", "bringForwardButton", "sendBackwardButton"];
    actionButtons.forEach(id => {
      const button = document.getElementById(id);
      if (!button) return;
      button.disabled = items.length === 0;
      if (items.length === 0) button.title = "Select an object first";
    });
    if (items.length) installCoreLabels();

    const quickStart = document.getElementById("figureloomQuickStart");
    if (quickStart) {
      const empty = typeof state !== "undefined" && Array.isArray(state.objects) && state.objects.length === 0;
      const hidden = storageGet(QUICK_START_HIDDEN) === "true";
      quickStart.classList.toggle("open", empty && !hidden && !currentExperienceBlocked());
    }

    const layersEmpty = document.querySelector("#layersList .empty-state");
    if (layersEmpty) layersEmpty.textContent = "Nothing on this page yet. Start with text, an illustration, or a template.";
    document.querySelectorAll("#layersList .layer-item").forEach(row => {
      row.title ||= `Select ${row.textContent.trim()}`;
    });
  }

  function queueUpdate() {
    if (updateQueued) return;
    updateQueued = true;
    requestAnimationFrame(updateExperience);
  }

  function installOneTimeGuidance() {
    document.getElementById("addTextButton")?.addEventListener("click", () => showOnce("text", "Text added. Tap the text itself and type."));
    document.getElementById("addShapeButton")?.addEventListener("click", () => showOnce("shape", "Shape added. Drag it to move, then use the handles to resize."));
    document.getElementById("addArrowButton")?.addEventListener("click", () => showOnce("arrow", "Arrow added. Use Layout when you need precise alignment."));
    document.addEventListener("click", event => {
      if (event.target.closest?.(".science-card,.pack-icon")) showOnce("science", "Illustration added. It stays editable on the canvas.");
    });
  }

  const style = document.createElement("style");
  style.id = "figureloomIntuitiveUxStyle";
  style.textContent = `
    :where(button,input,select,textarea):focus-visible{outline:3px solid ${COLORS.primary}!important;outline-offset:2px!important}
    #figureloomFindToolButton{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
    #figureloomFindToolButton kbd{padding:2px 5px;border:1px solid ${COLORS.line};border-radius:5px;background:${COLORS.surface};font:inherit;font-size:8px;color:${COLORS.muted}}
    #figureloomHelpButton{margin-left:auto;border:0;background:transparent;color:inherit;font-size:10px;text-decoration:underline;text-underline-offset:2px}
    #figureloomSelectionCoach{margin:5px 0 0;color:${COLORS.muted};font-size:10px;line-height:1.4}
    .right-panel.intuitive-no-selection .inspector-section:not(:first-of-type){opacity:.56}
    .right-panel.intuitive-no-selection .inspector-section:not(:first-of-type)::after{content:"Select an object to use these controls";display:block;margin-top:7px;color:${COLORS.muted};font-size:9px}
    .intuitive-drawer-close{display:inline-flex!important;align-items:center!important;gap:5px!important;min-width:auto!important;padding:5px 7px!important;border:1px solid transparent!important;border-radius:7px!important;font-size:15px!important;line-height:1!important}
    .intuitive-drawer-close .intuitive-close-word{font-size:9px;font-weight:650}
    #figureloomQuickStart{position:absolute;z-index:8;left:50%;top:50%;display:none;width:min(610px,calc(100% - 38px));padding:20px;border:1px solid ${COLORS.line};border-radius:16px;background:rgba(255,255,255,.96);box-shadow:0 18px 48px rgba(37,48,68,.18);transform:translate(-50%,-50%);text-align:left;backdrop-filter:blur(12px)}
    #figureloomQuickStart.open{display:block}.quick-start-dismiss{position:absolute;right:10px;top:9px;width:32px;height:32px;border:0;background:transparent;font-size:21px;color:${COLORS.muted}}
    .quick-start-kicker{display:inline-block;margin-bottom:6px;color:${COLORS.primaryDark};font-size:9px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
    #figureloomQuickStart h2{margin:0;color:${COLORS.text};font-size:21px;letter-spacing:-.025em}#figureloomQuickStart>p{margin:6px 0 14px;color:${COLORS.muted};font-size:11px}
    .quick-start-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.quick-start-actions button{display:grid;gap:3px;min-height:72px;padding:11px;border:1px solid ${COLORS.line};border-radius:10px;background:${COLORS.white};text-align:left;color:${COLORS.text}}
    .quick-start-actions button:hover{border-color:${COLORS.primary};background:${COLORS.surface}}.quick-start-actions strong,.quick-start-actions span{display:block}.quick-start-actions strong{font-size:11px}.quick-start-actions span{color:${COLORS.muted};font-size:9px;line-height:1.35}
    .quick-start-find{width:100%;margin-top:8px;padding:9px;border:1px dashed ${COLORS.line};border-radius:9px;background:transparent;color:${COLORS.primaryDark};font-size:10px;font-weight:650}
    #figureloomToolFinder{position:fixed;inset:0;z-index:4000;display:none;place-items:start center;padding-top:min(15vh,130px);background:rgba(37,48,68,.3);backdrop-filter:blur(4px)}#figureloomToolFinder.open{display:grid}
    .tool-finder-box{width:min(620px,calc(100vw - 24px));padding:10px;border:1px solid ${COLORS.line};border-radius:14px;background:${COLORS.white};box-shadow:0 28px 90px rgba(37,48,68,.34)}
    .tool-finder-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:3px 3px 9px}.tool-finder-head strong,.tool-finder-head span{display:block}.tool-finder-head strong{color:${COLORS.text};font-size:13px}.tool-finder-head span{margin-top:2px;color:${COLORS.muted};font-size:9px}.tool-finder-head button{width:34px;height:34px;border:0;background:transparent;color:${COLORS.muted};font-size:22px}
    .tool-finder-box>input{width:100%;min-height:46px;padding:11px 12px;border:1px solid ${COLORS.line};border-radius:10px;background:${COLORS.white};color:${COLORS.text};font-size:14px}
    .tool-finder-results{display:grid;gap:3px;max-height:52vh;overflow:auto;margin-top:8px}.tool-finder-results button{display:grid;gap:2px;padding:9px 11px;border:1px solid transparent;border-radius:8px;background:${COLORS.white};text-align:left;color:${COLORS.text}}.tool-finder-results button:hover,.tool-finder-results button.active{border-color:${COLORS.line};background:${COLORS.surface}}
    .tool-finder-results strong{font-size:11px}.tool-finder-results span{color:${COLORS.muted};font-size:9px}.tool-finder-empty{margin:0;padding:14px;color:${COLORS.muted};font-size:10px;line-height:1.45}.tool-finder-box>small{display:block;margin:8px 4px 2px;color:${COLORS.muted};font-size:8px}
    .intuitive-help-drawer{width:min(620px,calc(100vw - 20px))!important}.intuitive-help-steps{display:grid;gap:8px}.intuitive-help-steps section{display:grid;grid-template-columns:28px 1fr;gap:9px;padding:9px;border:1px solid ${COLORS.line};border-radius:9px;background:${COLORS.white}}.intuitive-help-steps section>span{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:${COLORS.surface};color:${COLORS.primaryDark};font-size:10px;font-weight:800}.intuitive-help-steps strong{font-size:11px;color:${COLORS.text}}.intuitive-help-steps p{margin:3px 0 0;color:${COLORS.muted};font-size:9px;line-height:1.4}
    .intuitive-help-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.intuitive-help-actions button{min-height:39px;border:1px solid ${COLORS.line};border-radius:8px;background:${COLORS.surface};color:${COLORS.text};padding:8px}.intuitive-shortcuts{margin-top:10px;padding:9px;border:1px solid ${COLORS.line};border-radius:9px}.intuitive-shortcuts summary{cursor:pointer;color:${COLORS.text};font-size:10px;font-weight:650}.intuitive-shortcuts p{margin:8px 0 0;color:${COLORS.muted};font-size:9px;line-height:1.5}
    @media(max-width:760px){#figureloomFindToolButton kbd{display:none}.quick-start-actions{grid-template-columns:1fr}.intuitive-help-actions{grid-template-columns:1fr}.tool-finder-box{max-height:86vh}.tool-finder-results{max-height:58vh}}
    @media(max-width:560px){#figureloomFindToolButton span{font-size:0}#figureloomFindToolButton span::after{content:"Find";font-size:10px}#figureloomQuickStart{top:53%;padding:15px}.quick-start-actions button{min-height:60px}.intuitive-drawer-close .intuitive-close-word{display:none}}
  `;
  document.head.appendChild(style);

  installCoreLabels();
  installSelectionCoach();
  installFindButton();
  installHelpButton();
  installQuickStart();
  installHelpDrawer();
  installFinder();
  installOneTimeGuidance();

  const observer = new MutationObserver(queueUpdate);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "disabled"] });

  window.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      event.stopImmediatePropagation();
      openFinder();
      return;
    }
    if (event.key !== "Escape") return;
    const finder = document.getElementById("figureloomToolFinder");
    if (finder?.classList.contains("open")) {
      closeFinder();
      return;
    }
    if (document.activeElement?.matches?.(".figureloom-direct-label-editor,.figureloom-inline-label-editor")) return;
    const drawers = topLevelDrawers();
    drawers.at(-1)?.classList.remove("open");
  }, true);

  window.openFigureloomToolFinder = openFinder;
  window.openFigureloomHelp = openHelp;
  queueUpdate();
})();
