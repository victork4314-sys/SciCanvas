state.settings = state.settings || {
  background: "#ffffff",
  gridSpacing: 20,
  gridType: "lines"
};

function genericGroup(item) {
  const group = createSvg("g", {
    class: "canvas-object",
    "data-id": item.id,
    transform: `translate(${item.x} ${item.y}) rotate(${item.rotation || 0} ${item.width / 2} ${item.height / 2})`,
    opacity: item.opacity
  });
  group.addEventListener("pointerdown", event => beginDrag(event, item.id));
  group.addEventListener("click", event => {
    event.stopPropagation();
    select(item.id);
  });
  return group;
}

const designBaseRenderObject = renderObject;
renderObject = function renderDesignedObject(item) {
  let group;
  if (item.type === "ellipse") {
    group = genericGroup(item);
    group.appendChild(createSvg("ellipse", {
      cx: item.width / 2,
      cy: item.height / 2,
      rx: item.width / 2,
      ry: item.height / 2,
      fill: item.fill,
      stroke: item.stroke,
      "stroke-width": 3
    }));
  } else if (item.type === "inhibition") {
    group = genericGroup(item);
    group.appendChild(createSvg("line", {
      x1: 0, y1: item.height / 2, x2: item.width - 12, y2: item.height / 2,
      stroke: item.fill, "stroke-width": 8, "stroke-linecap": "round"
    }));
    group.appendChild(createSvg("line", {
      x1: item.width - 12, y1: 5, x2: item.width - 12, y2: item.height - 5,
      stroke: item.fill, "stroke-width": 8, "stroke-linecap": "round"
    }));
  } else {
    group = designBaseRenderObject(item);
  }

  if (!group) return group;
  const text = group.querySelector("text");
  if (text && item.type === "text") {
    item.fontSize ??= 30;
    item.fontWeight ??= 650;
    item.fontStyle ??= "normal";
    item.fontFamily ??= "Segoe UI, sans-serif";
    text.setAttribute("font-size", item.fontSize);
    text.setAttribute("font-weight", item.fontWeight);
    text.setAttribute("font-style", item.fontStyle);
    text.setAttribute("font-family", item.fontFamily);
    group.addEventListener("dblclick", event => {
      event.stopPropagation();
      const next = prompt("Edit text", item.text);
      if (next === null) return;
      pushHistory();
      item.text = next;
      item.name = next.trim().slice(0, 40) || "Text label";
      render();
      scheduleSave();
    });
  }
  return group;
};

function addSpecialObject(type) {
  pushHistory();
  const item = {
    id: uid(), type,
    name: type === "ellipse" ? "Ellipse" : "Inhibition line",
    x: 430, y: 290,
    width: type === "ellipse" ? 200 : 220,
    height: type === "ellipse" ? 130 : 55,
    fill: type === "ellipse" ? "#9fb7ff" : "#c13f54",
    stroke: "#26324a", opacity: 1, rotation: 0, visible: true
  };
  state.objects.push(item);
  state.selectedId = item.id;
  render();
  scheduleSave();
}

const addGroup = document.querySelectorAll(".tool-group")[0];
const ellipseButton = document.createElement("button");
ellipseButton.type = "button";
ellipseButton.textContent = "Ellipse";
ellipseButton.addEventListener("click", () => addSpecialObject("ellipse"));
const inhibitionButton = document.createElement("button");
inhibitionButton.type = "button";
inhibitionButton.textContent = "Inhibit";
inhibitionButton.addEventListener("click", () => addSpecialObject("inhibition"));
addGroup.append(ellipseButton, inhibitionButton);

const textSection = document.createElement("section");
textSection.className = "inspector-section";
textSection.id = "textInspector";
textSection.innerHTML = `
  <h2>Text</h2>
  <label class="full-field">Content <textarea id="textContent" rows="3" disabled></textarea></label>
  <div class="field-grid">
    <label>Size <input id="fontSize" type="number" min="6" max="180" value="30" disabled></label>
    <label>Family
      <select id="fontFamily" disabled>
        <option value="Segoe UI, sans-serif">Segoe UI</option>
        <option value="Arial, sans-serif">Arial</option>
        <option value="Georgia, serif">Georgia</option>
        <option value="Courier New, monospace">Courier New</option>
      </select>
    </label>
  </div>
  <div class="text-actions">
    <button id="boldText" type="button" disabled>Bold</button>
    <button id="italicText" type="button" disabled>Italic</button>
    <button id="speciesText" type="button" disabled>Species style</button>
  </div>
`;
document.querySelector(".right-panel").appendChild(textSection);

const textControls = {
  content: document.getElementById("textContent"),
  size: document.getElementById("fontSize"),
  family: document.getElementById("fontFamily"),
  bold: document.getElementById("boldText"),
  italic: document.getElementById("italicText"),
  species: document.getElementById("speciesText")
};

const textInspectorStyle = document.createElement("style");
textInspectorStyle.textContent = `
  #textInspector textarea,#textInspector select{width:100%;border:1px solid #cfd7e3;border-radius:6px;padding:7px;background:white}.text-actions{display:flex;gap:6px;margin-top:10px}.text-actions button{flex:1;border:1px solid #cfd7e3;border-radius:7px;background:#f8fafc;padding:7px 4px;font-size:11px}.text-actions button.active{background:#e8efff;border-color:#7095e0;color:#1e4fa8}.palette-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}.palette-swatch{height:34px;border:2px solid white;border-radius:8px;box-shadow:0 0 0 1px #ccd5e0}.design-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}.design-row label{display:grid;gap:5px;font-size:11px;color:#6e798c}.design-row select,.design-row input{width:100%;border:1px solid #ccd6e2;border-radius:7px;padding:7px;background:white}
`;
document.head.appendChild(textInspectorStyle);

const designBaseInspector = updateInspector;
updateInspector = function updateTextInspector() {
  designBaseInspector();
  const item = selectedObject();
  const isText = item?.type === "text";
  Object.values(textControls).forEach(control => control.disabled = !isText);
  if (!isText) {
    textControls.content.value = "";
    textControls.size.value = 30;
    textControls.bold.classList.remove("active");
    textControls.italic.classList.remove("active");
    return;
  }
  textControls.content.value = item.text || "";
  textControls.size.value = item.fontSize || 30;
  textControls.family.value = item.fontFamily || "Segoe UI, sans-serif";
  textControls.bold.classList.toggle("active", (item.fontWeight || 650) >= 700);
  textControls.italic.classList.toggle("active", item.fontStyle === "italic");
};

function updateText(mutator) {
  const item = selectedObject();
  if (!item || item.type !== "text") return;
  pushHistory();
  mutator(item);
  render();
  scheduleSave();
}

textControls.content.addEventListener("change", event => updateText(item => {
  item.text = event.target.value;
  item.name = event.target.value.trim().slice(0, 40) || "Text label";
}));
textControls.size.addEventListener("change", event => updateText(item => item.fontSize = Math.max(6, Number(event.target.value) || 30)));
textControls.family.addEventListener("change", event => updateText(item => item.fontFamily = event.target.value));
textControls.bold.addEventListener("click", () => updateText(item => item.fontWeight = (item.fontWeight || 650) >= 700 ? 400 : 700));
textControls.italic.addEventListener("click", () => updateText(item => item.fontStyle = item.fontStyle === "italic" ? "normal" : "italic"));
textControls.species.addEventListener("click", () => updateText(item => {
  item.fontStyle = "italic";
  item.metadata ??= {};
  item.metadata.formatRule = "scientific-species-name";
}));

const designDrawer = createDrawer("designDrawer", "Canvas design", "Grid, background and figure palettes");
designDrawer.querySelector(".utility-body").innerHTML = `
  <div class="design-row">
    <label>Canvas color <input id="canvasColor" type="color" value="#ffffff"></label>
    <label>Grid spacing
      <select id="gridSpacing">
        <option value="10">10</option><option value="20" selected>20</option><option value="25">25</option><option value="40">40</option><option value="50">50</option>
      </select>
    </label>
  </div>
  <div class="design-row">
    <label>Grid style
      <select id="gridType"><option value="lines">Lines</option><option value="dots">Dots</option></select>
    </label>
  </div>
  <h3>Selected object color</h3>
  <div id="paletteGrid" class="palette-grid"></div>
  <p class="tool-note">Colors change the selected object. Canvas and grid choices are saved with the editable project.</p>
`;

const palettes = ["#4f6fd8","#7c5fd3","#e56b7f","#eaa94b","#3aa47a","#42a5c6","#26324a","#8b95a7","#f1b7c4","#a8d8c7"];
const paletteGrid = designDrawer.querySelector("#paletteGrid");
palettes.forEach(color => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "palette-swatch";
  button.style.background = color;
  button.title = color;
  button.addEventListener("click", () => {
    const item = selectedObject();
    if (!item) return;
    pushHistory();
    item.fill = color;
    render();
    scheduleSave();
  });
  paletteGrid.appendChild(button);
});

function applyGridDesign() {
  const spacing = Number(state.settings.gridSpacing) || 20;
  const type = state.settings.gridType || "lines";
  const small = document.getElementById("smallGrid");
  const large = document.getElementById("grid");
  small.setAttribute("width", spacing);
  small.setAttribute("height", spacing);
  large.setAttribute("width", spacing * 5);
  large.setAttribute("height", spacing * 5);
  small.replaceChildren();
  if (type === "dots") {
    small.appendChild(createSvg("circle", { cx:1.5, cy:1.5, r:1.5, fill:"#d2d9e3" }));
  } else {
    small.appendChild(createSvg("path", { d:`M ${spacing} 0 L 0 0 0 ${spacing}`, fill:"none", stroke:"#e3e8ef", "stroke-width":1 }));
  }
  document.getElementById("canvasBackground").setAttribute("fill", state.settings.background || "#ffffff");
}

designDrawer.querySelector("#canvasColor").addEventListener("input", event => {
  state.settings.background = event.target.value;
  applyGridDesign();
  scheduleSave();
});
designDrawer.querySelector("#gridSpacing").addEventListener("change", event => {
  state.settings.gridSpacing = Number(event.target.value);
  applyGridDesign();
  scheduleSave();
});
designDrawer.querySelector("#gridType").addEventListener("change", event => {
  state.settings.gridType = event.target.value;
  applyGridDesign();
  scheduleSave();
});
document.querySelector('[data-tab="design"]').addEventListener("click", () => designDrawer.classList.toggle("open"));

const designBaseSnapshot = snapshot;
snapshot = function snapshotWithDesign() {
  const data = JSON.parse(designBaseSnapshot());
  data.settings = state.settings;
  return JSON.stringify(data);
};
const designBaseRestore = restore;
restore = function restoreWithDesign(serialized) {
  const data = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
  if (data.settings) state.settings = data.settings;
  designBaseRestore(data);
  applyGridDesign();
  designDrawer.querySelector("#canvasColor").value = state.settings.background || "#ffffff";
  designDrawer.querySelector("#gridSpacing").value = String(state.settings.gridSpacing || 20);
  designDrawer.querySelector("#gridType").value = state.settings.gridType || "lines";
};
const designBaseProjectData = projectData;
projectData = function projectDataWithDesign() {
  return { ...designBaseProjectData(), settings:state.settings };
};

const attributionButton = document.createElement("button");
attributionButton.type = "button";
attributionButton.className = "utility-action";
attributionButton.textContent = "Download attribution report";
attributionButton.addEventListener("click", () => {
  syncPage();
  const allObjects = state.pages.flatMap(page => page.objects);
  const science = [...new Set(allObjects.filter(item => item.type === "science").map(item => item.name))];
  const uploads = [...new Set(allObjects.filter(item => item.type === "image").map(item => item.name))];
  const report = [
    `SciCanvas attribution report`,
    `Project: ${documentName.value}`,
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "Built-in scientific illustrations",
    science.length ? science.map(name => `- ${name} — original SciCanvas programmatic SVG artwork`).join("\n") : "- None used",
    "",
    "User-supplied uploads",
    uploads.length ? uploads.map(name => `- ${name} — licensing/permission must be verified by the user`).join("\n") : "- None used"
  ].join("\n");
  downloadBlob(report, "text/plain", `${documentName.value.trim() || "SciCanvas"}-attribution.txt`);
});
projectDrawer.querySelector(".utility-body").insertBefore(attributionButton, projectDrawer.querySelector(".tool-note"));

applyGridDesign();
render();
