(() => {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
    } catch (error) {
      console.warn("SciCanvas offline mode could not be enabled.", error);
    }
  });
})();

(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  function makeScientificPreview(asset) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 200 120");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("science-preview-svg");

    const art = createSvg("g", {});
    drawScienceAsset(art, asset.id, "#7c8cf5", "#26324a");
    svg.appendChild(art);
    return svg;
  }

  function enhanceBuiltInCards() {
    if (typeof scienceAssets === "undefined" || typeof drawScienceAsset !== "function") return;

    document.querySelectorAll("#scienceGrid .science-card").forEach(card => {
      if (card.dataset.vectorPreview === "true") return;
      const label = card.querySelector("small")?.textContent?.trim();
      const asset = scienceAssets.find(item => item.name === label);
      const preview = card.querySelector(".preview");
      if (!asset || !preview) return;

      preview.replaceChildren(makeScientificPreview(asset));
      preview.classList.add("vector-preview");
      card.dataset.vectorPreview = "true";
    });
  }

  function addLibraryShortcut() {
    const drawer = document.getElementById("scienceDrawer");
    const searchRow = drawer?.querySelector(".science-search");
    if (!drawer || !searchRow || drawer.querySelector(".real-library-shortcut")) return;

    const packsButton = [...searchRow.querySelectorAll("button")]
      .find(button => button.textContent.trim() === "Packs");

    if (packsButton) {
      packsButton.textContent = "2,829 SVGs";
      packsButton.title = "Browse 2,829 real licensed scientific SVG illustrations";
    }

    const shortcut = document.createElement("button");
    shortcut.type = "button";
    shortcut.className = "real-library-shortcut";
    shortcut.innerHTML = `
      <span class="shortcut-art" aria-hidden="true">◉</span>
      <span><strong>Browse 2,829 real scientific illustrations</strong><small>Bioicons · searchable SVGs with creator and licence metadata</small></span>
      <span class="shortcut-arrow" aria-hidden="true">→</span>
    `;
    shortcut.addEventListener("click", () => {
      const currentPacksButton = [...searchRow.querySelectorAll("button")]
        .find(button => button.textContent.includes("SVG") || button.textContent.trim() === "Packs");
      currentPacksButton?.click();
    });
    searchRow.insertAdjacentElement("afterend", shortcut);
  }

  const style = document.createElement("style");
  style.textContent = `
    .science-card .preview.vector-preview{width:100%;height:70px;display:grid;place-items:center;font-size:0}
    .science-preview-svg{display:block;width:100%;height:70px;overflow:visible}
    .real-library-shortcut{margin:0 11px 10px;padding:10px 11px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;text-align:left;border:1px solid #9bb5eb;border-radius:10px;background:linear-gradient(135deg,#edf3ff,#f8fbff);color:#263a64}
    .real-library-shortcut:hover{border-color:#547fd5;background:#e7efff}
    .real-library-shortcut .shortcut-art{width:34px;height:34px;display:grid;place-items:center;border-radius:9px;background:#2563eb;color:white;font-size:18px}
    .real-library-shortcut strong,.real-library-shortcut small{display:block}
    .real-library-shortcut strong{font-size:12px}
    .real-library-shortcut small{margin-top:2px;color:#687896;font-size:10px;line-height:1.3}
    .real-library-shortcut .shortcut-arrow{font-size:20px;color:#2563eb}
  `;
  document.head.appendChild(style);

  addLibraryShortcut();
  enhanceBuiltInCards();

  const grid = document.getElementById("scienceGrid");
  if (grid) {
    new MutationObserver(enhanceBuiltInCards).observe(grid, { childList: true });
  }
})();

(() => {
  const NAME_KEY = "scicanvas-user-name-v1";
  function syncPersonalTourTitle() {
    const name = (localStorage.getItem(NAME_KEY) || "").trim();
    const title = document.getElementById("delightTourTitle");
    const counter = document.querySelector("#scicanvasTour .tour-counter")?.textContent || "";
    if (!name || !title) return;
    let desired = "";
    if (counter.startsWith("1 of")) desired = `Hi, ${name}. This is your studio.`;
    if (counter.startsWith("12 of")) desired = `You are ready, ${name}.`;
    if (desired && title.textContent !== desired) title.textContent = desired;
  }
  function repairDnaHeights() {
    document.querySelectorAll("#dnaEasterEgg .dna-pair").forEach(pair => {
      if (pair.style.height) return;
      const wave = Number(pair.style.getPropertyValue("--wave"));
      if (Number.isFinite(wave) && wave > 0) pair.style.height = `${wave}px`;
    });
  }
  const observer = new MutationObserver(() => {
    syncPersonalTourTitle();
    repairDnaHeights();
  });
  observer.observe(document.body, { childList:true, subtree:true, characterData:true });
  document.addEventListener("submit", event => {
    if (event.target.closest?.("#scWelcome")) setTimeout(syncPersonalTourTitle, 320);
  });
})();

(() => {
  const note = document.querySelector("#collaborationDrawer .collab-note");
  if (note) note.textContent = "Only the project owner can change access. Existing accounts get access immediately; new email addresses activate automatically after creating an account.";
  const button = document.getElementById("collabInviteButton");
  if (button) {
    button.textContent = "Grant / reserve access";
    button.title = "Grant access now or reserve it for this email";
  }
})();

(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const XHTML_NS = "http://www.w3.org/1999/xhtml";
  const editorCanvas = document.getElementById("canvas");
  if (!editorCanvas || typeof state === "undefined") return;

  let pointerCandidate = null;
  let pendingEdit = null;
  let pendingTimer = 0;
  let activeEditor = null;

  function textItem(id) {
    const item = state.objects?.find(candidate => candidate.id === id);
    return item?.type === "text" ? item : null;
  }

  function hitText(target) {
    const element = target instanceof Element ? target : target?.parentElement;
    const textNode = element?.closest?.("text");
    const group = textNode?.closest?.(".canvas-object[data-id]");
    const id = group?.dataset?.id;
    return id && textItem(id) ? { id, group, textNode } : null;
  }

  function livePreview(item, value) {
    item.text = value;
    item.name = value.trim().slice(0, 40) || "Text label";
    const group = [...document.querySelectorAll("#objectLayer .canvas-object[data-id]")]
      .find(node => node.dataset.id === item.id);
    const textNode = group?.querySelector("text");
    if (textNode) textNode.textContent = value;
    const inspector = document.getElementById("textContent");
    if (inspector && state.selectedId === item.id) inspector.value = value;
  }

  function closeEditor(commit = true) {
    if (!activeEditor) return;
    const session = activeEditor;
    activeEditor = null;
    session.input.removeEventListener("blur", session.onBlur);
    const item = textItem(session.id);
    if (item) {
      const value = commit ? session.input.value : session.original;
      item.text = value;
      item.name = value.trim().slice(0, 40) || "Text label";
    }
    session.foreignObject.remove();
    render();
    scheduleSave();
    window.syncPage?.();
  }

  function openEditor(id, addHistory = false) {
    const item = textItem(id);
    if (!item) return;
    if (activeEditor?.id === id) {
      activeEditor.input.focus();
      return;
    }
    closeEditor(true);
    if (addHistory) pushHistory();
    if (state.selectedId !== id) select(id);
    state.drag = null;

    const fontSize = Math.max(10, Number(item.fontSize) || 30);
    const width = Math.min(
      1200 - item.x + 8,
      Math.max(Number(item.width) + 28 || 218, Math.min(720, (String(item.text || "").length + 4) * fontSize * 0.58))
    );
    const height = Math.max(Number(item.height) + 18 || 73, fontSize + 24);
    const foreignObject = document.createElementNS(SVG_NS, "foreignObject");
    foreignObject.setAttribute("x", String(Math.max(0, item.x - 8)));
    foreignObject.setAttribute("y", String(Math.max(0, item.y - 8)));
    foreignObject.setAttribute("width", String(Math.max(150, width)));
    foreignObject.setAttribute("height", String(height));
    foreignObject.setAttribute("class", "inline-text-editor");
    foreignObject.style.overflow = "visible";

    const input = document.createElementNS(XHTML_NS, "input");
    input.setAttribute("type", "text");
    input.setAttribute("aria-label", "Edit text label");
    input.value = item.text || "";
    Object.assign(input.style, {
      width: "100%",
      height: `${Math.max(44, fontSize + 14)}px`,
      boxSizing: "border-box",
      border: "2px solid #39786d",
      borderRadius: "9px",
      outline: "none",
      padding: "4px 10px",
      background: "rgba(255,255,255,.97)",
      boxShadow: "0 8px 24px rgba(12,46,40,.22)",
      color: item.fill || "#172033",
      fontFamily: item.fontFamily || "Segoe UI, sans-serif",
      fontSize: `${fontSize}px`,
      fontWeight: String(item.fontWeight || 650),
      fontStyle: item.fontStyle || "normal",
      lineHeight: "1.15"
    });
    foreignObject.appendChild(input);
    editorCanvas.appendChild(foreignObject);

    const session = {
      id,
      original: item.text || "",
      input,
      foreignObject,
      onBlur: () => closeEditor(true)
    };
    activeEditor = session;

    input.addEventListener("input", () => {
      const current = textItem(id);
      if (current) livePreview(current, input.value);
    });
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        closeEditor(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeEditor(false);
      }
      event.stopPropagation();
    });
    input.addEventListener("blur", session.onBlur);
    requestAnimationFrame(() => {
      input.focus({ preventScroll:true });
      input.select();
    });
  }

  editorCanvas.addEventListener("pointerdown", event => {
    if (activeEditor && !activeEditor.foreignObject.contains(event.target)) closeEditor(true);
    const hit = hitText(event.target);
    pointerCandidate = hit ? {
      id: hit.id,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false
    } : null;
  }, true);

  editorCanvas.addEventListener("pointermove", event => {
    if (!pointerCandidate || pointerCandidate.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - pointerCandidate.x, event.clientY - pointerCandidate.y) > 7) {
      pointerCandidate.moved = true;
    }
  }, true);

  editorCanvas.addEventListener("pointerup", event => {
    if (!pointerCandidate || pointerCandidate.pointerId !== event.pointerId) return;
    const candidate = pointerCandidate;
    pointerCandidate = null;
    if (candidate.moved) return;
    pendingEdit = { id:candidate.id };
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      if (!pendingEdit) return;
      const id = pendingEdit.id;
      pendingEdit = null;
      openEditor(id, false);
    }, 0);
  }, true);

  editorCanvas.addEventListener("click", event => {
    if (!pendingEdit) return;
    const id = pendingEdit.id;
    pendingEdit = null;
    clearTimeout(pendingTimer);
    event.preventDefault();
    event.stopImmediatePropagation();
    openEditor(id, false);
  }, true);

  editorCanvas.addEventListener("dblclick", event => {
    const hit = hitText(event.target);
    if (!hit) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openEditor(hit.id, false);
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key !== "Enter" || activeEditor) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) return;
    const item = textItem(state.selectedId);
    if (!item) return;
    event.preventDefault();
    openEditor(item.id, true);
  }, true);
})();
