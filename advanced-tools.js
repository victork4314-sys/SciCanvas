const initialPage = {
  id: uid(),
  name: "Figure 1",
  objects: state.objects
};
state.pages = [initialPage];
state.activePage = 0;

const pagesHeading = document.querySelector(".left-panel .panel-heading");
const oldPageButton = document.querySelector(".page-thumbnail");
const pagesList = document.createElement("div");
pagesList.id = "pagesList";
oldPageButton.replaceWith(pagesList);

function currentPage() {
  return state.pages[state.activePage];
}

function syncPage() {
  if (currentPage()) currentPage().objects = state.objects;
}

function renderPages() {
  pagesList.replaceChildren();
  state.pages.forEach((page, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `page-thumbnail${index === state.activePage ? " active" : ""}`;
    button.innerHTML = `<span class="page-number">${index + 1}</span><span class="mini-page"><span>${page.objects.length}</span></span><span>${page.name}</span>`;
    button.addEventListener("click", () => switchPage(index));
    button.addEventListener("dblclick", () => {
      const name = prompt("Page name", page.name);
      if (!name?.trim()) return;
      page.name = name.trim();
      renderPages();
      scheduleSave();
    });
    pagesList.appendChild(button);
  });
  const status = document.querySelector(".statusbar span:first-child");
  status.textContent = `Page ${state.activePage + 1} of ${state.pages.length}`;
}

function switchPage(index) {
  if (index === state.activePage || !state.pages[index]) return;
  syncPage();
  state.activePage = index;
  state.objects = state.pages[index].objects;
  state.selectedId = null;
  render();
  renderPages();
  scheduleSave();
}

function addPage() {
  syncPage();
  const page = { id:uid(), name:`Figure ${state.pages.length + 1}`, objects:[] };
  state.pages.push(page);
  state.activePage = state.pages.length - 1;
  state.objects = page.objects;
  state.selectedId = null;
  render();
  renderPages();
  scheduleSave();
}

document.getElementById("addPageButton").addEventListener("click", addPage);

const baseSnapshot = snapshot;
snapshot = function snapshotWithPages() {
  syncPage();
  return JSON.stringify({
    version: 2,
    documentName: documentName.value,
    pages: state.pages,
    activePage: state.activePage
  });
};

restore = function restoreWithPages(serialized) {
  const data = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
  documentName.value = data.documentName || "Untitled figure";
  if (Array.isArray(data.pages) && data.pages.length) {
    state.pages = data.pages;
    state.activePage = Math.min(data.activePage || 0, state.pages.length - 1);
    state.objects = state.pages[state.activePage].objects;
  } else {
    state.pages = [{ id:uid(), name:"Figure 1", objects:data.objects || [] }];
    state.activePage = 0;
    state.objects = state.pages[0].objects;
  }
  state.selectedId = null;
  render();
  renderPages();
  scheduleSave();
};

const baseProjectData = projectData;
projectData = function projectDataWithPages() {
  syncPage();
  return {
    format: "SciCanvas",
    version: 2,
    savedAt: new Date().toISOString(),
    documentName: documentName.value,
    pages: state.pages,
    activePage: state.activePage,
    objects: state.objects
  };
};

importProject = function importProjectWithPages(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.format !== "SciCanvas") throw new Error("Not a SciCanvas project");
      pushHistory();
      restore(data);
      createSnapshot("Imported project");
    } catch (error) {
      alert(`Could not import project: ${error.message}`);
    }
  };
  reader.readAsText(file);
};

restoreSnapshot = function restoreMultiPageSnapshot(snapshotItem) {
  if (!confirm(`Restore snapshot from ${new Date(snapshotItem.savedAt).toLocaleString()}?`)) return;
  pushHistory();
  restore(structuredClone(snapshotItem.data));
};

const baseApplyTemplate = applyTemplate;
applyTemplate = function applyTemplateToPage(template) {
  baseApplyTemplate(template);
  syncPage();
  renderPages();
};

const baseRenderObjectAdvanced = renderObject;
renderObject = function renderAdvancedObject(item) {
  const group = baseRenderObjectAdvanced(item);
  if (!group) return group;
  item.rotation ??= 0;
  item.visible ??= true;
  group.setAttribute("transform", `translate(${item.x} ${item.y}) rotate(${item.rotation} ${item.width / 2} ${item.height / 2})`);
  if (!item.visible) group.style.display = "none";
  return group;
};

const baseRenderLayers = renderLayers;
renderLayers = function renderAdvancedLayers() {
  layersList.replaceChildren();
  if (!state.objects.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No objects yet.";
    layersList.appendChild(empty);
    return;
  }

  [...state.objects].reverse().forEach(item => {
    const row = document.createElement("div");
    row.className = `layer-item${item.id === state.selectedId ? " active" : ""}`;

    const visibility = document.createElement("button");
    visibility.type = "button";
    visibility.className = "layer-eye";
    visibility.textContent = item.visible === false ? "○" : "●";
    visibility.title = item.visible === false ? "Show object" : "Hide object";
    visibility.addEventListener("click", event => {
      event.stopPropagation();
      item.visible = item.visible === false;
      render();
      scheduleSave();
    });

    const name = document.createElement("button");
    name.type = "button";
    name.className = "layer-name";
    name.textContent = item.name;
    name.addEventListener("click", () => select(item.id));
    name.addEventListener("dblclick", () => {
      const next = prompt("Object name", item.name);
      if (!next?.trim()) return;
      item.name = next.trim();
      render();
      scheduleSave();
    });

    row.append(visibility, name);
    layersList.appendChild(row);
  });
};

const inspectorSelection = document.querySelector(".inspector-section");
const identitySection = document.createElement("section");
identitySection.className = "inspector-section advanced-only";
identitySection.innerHTML = `
  <h2>Object identity</h2>
  <label class="full-field">Layer name <input id="objectName" type="text" disabled></label>
  <label class="full-field">Rotation <input id="objectRotation" type="number" min="-360" max="360" step="1" disabled></label>
`;
inspectorSelection.after(identitySection);

const metadataSection = document.createElement("section");
metadataSection.className = "inspector-section advanced-only";
metadataSection.innerHTML = `
  <h2>Scientific metadata</h2>
  <label class="full-field">Scientific name <input id="scientificName" type="text" disabled></label>
  <label class="full-field">Organism / system <input id="organismName" type="text" disabled></label>
  <label class="full-field">Identifier <input id="scienceIdentifier" type="text" placeholder="UniProt, NCBI, strain…" disabled></label>
  <label class="full-field">Notes <textarea id="scienceNotes" rows="3" disabled></textarea></label>
`;
document.querySelector(".right-panel").appendChild(metadataSection);

const advancedStyle = document.createElement("style");
advancedStyle.textContent = `
  #pagesList{display:grid;gap:8px}.mini-page{position:relative;display:grid;place-items:center;color:#a1aaba;font-size:11px}.layer-item{display:grid;grid-template-columns:25px 1fr;padding:3px}.layer-eye,.layer-name{border:0;background:transparent}.layer-eye{color:#5873ac;padding:4px}.layer-name{text-align:left;padding:5px;color:#303c51;overflow:hidden;text-overflow:ellipsis}.full-field input[type=text],.full-field textarea{width:100%;border:1px solid #cfd7e3;border-radius:6px;padding:7px;background:white;resize:vertical}.simple-mode .advanced-only{display:none}.mode-button{border:1px solid #cfd7e3;border-radius:7px;background:#f7f9fc;color:#2d394e;padding:7px 10px}.ribbon-extra{display:flex;gap:7px;align-items:center}
`;
document.head.appendChild(advancedStyle);

const objectNameInput = document.getElementById("objectName");
const rotationInput = document.getElementById("objectRotation");
const metadataInputs = {
  scientificName: document.getElementById("scientificName"),
  organism: document.getElementById("organismName"),
  identifier: document.getElementById("scienceIdentifier"),
  notes: document.getElementById("scienceNotes")
};

const baseUpdateInspector = updateInspector;
updateInspector = function updateAdvancedInspector() {
  baseUpdateInspector();
  const item = selectedObject();
  objectNameInput.disabled = !item;
  rotationInput.disabled = !item;
  Object.values(metadataInputs).forEach(input => input.disabled = !item);
  if (!item) {
    objectNameInput.value = "";
    rotationInput.value = "";
    Object.values(metadataInputs).forEach(input => input.value = "");
    return;
  }
  item.metadata ??= {};
  objectNameInput.value = item.name || "Object";
  rotationInput.value = item.rotation || 0;
  metadataInputs.scientificName.value = item.metadata.scientificName || "";
  metadataInputs.organism.value = item.metadata.organism || "";
  metadataInputs.identifier.value = item.metadata.identifier || "";
  metadataInputs.notes.value = item.metadata.notes || "";
};

objectNameInput.addEventListener("change", event => {
  const item = selectedObject();
  if (!item || !event.target.value.trim()) return;
  pushHistory();
  item.name = event.target.value.trim();
  render();
  scheduleSave();
});
rotationInput.addEventListener("change", event => {
  const item = selectedObject();
  if (!item) return;
  pushHistory();
  item.rotation = Number(event.target.value) || 0;
  render();
  scheduleSave();
});
Object.entries(metadataInputs).forEach(([key, input]) => input.addEventListener("change", event => {
  const item = selectedObject();
  if (!item) return;
  item.metadata ??= {};
  item.metadata[key] = event.target.value;
  scheduleSave();
}));

function duplicateSelected() {
  const item = selectedObject();
  if (!item) return;
  pushHistory();
  const copy = structuredClone(item);
  copy.id = uid();
  copy.name = `${item.name} copy`;
  copy.x = Math.min(1200 - copy.width, copy.x + 30);
  copy.y = Math.min(750 - copy.height, copy.y + 30);
  state.objects.push(copy);
  state.selectedId = copy.id;
  render();
  scheduleSave();
}

function tidyObjects() {
  const items = state.objects.filter(item => item.visible !== false);
  if (items.length < 2) return;
  pushHistory();
  const sorted = [...items].sort((a, b) => a.x - b.x);
  const margin = 70;
  const usable = 1200 - margin * 2;
  const step = usable / Math.max(1, sorted.length - 1);
  sorted.forEach((item, index) => {
    item.x = Math.max(0, Math.min(1200 - item.width, margin + index * step - item.width / 2));
  });
  render();
  scheduleSave();
}

const arrangeGroup = document.querySelectorAll(".tool-group")[1];
const duplicateButton = document.createElement("button");
duplicateButton.type = "button";
duplicateButton.textContent = "Duplicate";
duplicateButton.addEventListener("click", duplicateSelected);
const tidyButton = document.createElement("button");
tidyButton.type = "button";
tidyButton.textContent = "Tidy";
tidyButton.addEventListener("click", tidyObjects);
arrangeGroup.insertBefore(duplicateButton, document.getElementById("deleteButton"));
arrangeGroup.insertBefore(tidyButton, document.getElementById("deleteButton"));

const modeButton = document.createElement("button");
modeButton.type = "button";
modeButton.className = "mode-button";
modeButton.textContent = "Simple mode";
modeButton.addEventListener("click", () => {
  const simple = document.body.classList.toggle("simple-mode");
  modeButton.textContent = simple ? "Advanced mode" : "Simple mode";
  localStorage.setItem("scicanvas-simple-mode", simple ? "1" : "0");
});
document.querySelector(".title-actions").prepend(modeButton);
if (localStorage.getItem("scicanvas-simple-mode") === "1") {
  document.body.classList.add("simple-mode");
  modeButton.textContent = "Advanced mode";
}

document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
    event.preventDefault();
    duplicateSelected();
  }
});

renderPages();
render();
