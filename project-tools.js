const templateDefinitions = [
  {
    id: "blank", name: "Blank canvas", description: "Start from an empty figure.",
    objects: []
  },
  {
    id: "graphical-abstract", name: "Graphical abstract", description: "Question, mechanism and outcome.",
    objects: [
      { type:"text",name:"Title",x:80,y:55,width:420,height:55,fill:"#172033",stroke:"#26324a",opacity:1,text:"Graphical abstract" },
      { type:"shape",name:"Question panel",x:70,y:155,width:280,height:390,fill:"#eef4ff",stroke:"#5f78b8",opacity:1 },
      { type:"shape",name:"Mechanism panel",x:460,y:155,width:280,height:390,fill:"#f4efff",stroke:"#7c5fb8",opacity:1 },
      { type:"shape",name:"Outcome panel",x:850,y:155,width:280,height:390,fill:"#ecfbf4",stroke:"#4e9270",opacity:1 },
      { type:"arrow",name:"Flow arrow",x:365,y:320,width:80,height:50,fill:"#4b68b5",stroke:"#26324a",opacity:1 },
      { type:"arrow",name:"Flow arrow",x:755,y:320,width:80,height:50,fill:"#4b68b5",stroke:"#26324a",opacity:1 },
      { type:"text",name:"Question label",x:120,y:190,width:180,height:55,fill:"#32405d",stroke:"#26324a",opacity:1,text:"Question" },
      { type:"text",name:"Mechanism label",x:505,y:190,width:190,height:55,fill:"#473761",stroke:"#26324a",opacity:1,text:"Mechanism" },
      { type:"text",name:"Outcome label",x:910,y:190,width:160,height:55,fill:"#315e48",stroke:"#26324a",opacity:1,text:"Outcome" }
    ]
  },
  {
    id: "host-pathogen", name: "Host–pathogen interaction", description: "Microbe, host cell and response.",
    objects: [
      { type:"text",name:"Title",x:330,y:60,width:520,height:55,fill:"#172033",stroke:"#26324a",opacity:1,text:"Host–pathogen interaction" },
      { type:"science",asset:"bacterium",name:"Rod bacterium",x:120,y:275,width:240,height:145,fill:"#f59e8b",stroke:"#6b3030",opacity:1 },
      { type:"arrow",name:"Invasion",x:395,y:315,width:180,height:50,fill:"#d14d4d",stroke:"#26324a",opacity:1 },
      { type:"science",asset:"cell",name:"Host cell",x:610,y:210,width:360,height:220,fill:"#9fb7ff",stroke:"#304a84",opacity:1 },
      { type:"arrow",name:"Immune response",x:835,y:470,width:120,height:50,fill:"#4a8f70",stroke:"#26324a",opacity:1 },
      { type:"science",asset:"antibody",name:"Antibody",x:985,y:435,width:140,height:90,fill:"#f4c64e",stroke:"#715d24",opacity:1 }
    ]
  },
  {
    id: "workflow", name: "Experimental workflow", description: "Editable horizontal methods sequence.",
    objects: [
      { type:"text",name:"Title",x:390,y:70,width:420,height:55,fill:"#172033",stroke:"#26324a",opacity:1,text:"Experimental workflow" },
      { type:"science",asset:"tube",name:"Sample",x:85,y:290,width:150,height:100,fill:"#8ea0ff",stroke:"#26324a",opacity:1 },
      { type:"arrow",name:"Step",x:245,y:315,width:110,height:50,fill:"#5772c6",stroke:"#26324a",opacity:1 },
      { type:"science",asset:"pipette",name:"Preparation",x:365,y:280,width:170,height:110,fill:"#8fd2c3",stroke:"#285b52",opacity:1 },
      { type:"arrow",name:"Step",x:540,y:315,width:110,height:50,fill:"#5772c6",stroke:"#26324a",opacity:1 },
      { type:"science",asset:"petri",name:"Culture",x:660,y:280,width:180,height:110,fill:"#f3cc72",stroke:"#705622",opacity:1 },
      { type:"arrow",name:"Step",x:845,y:315,width:110,height:50,fill:"#5772c6",stroke:"#26324a",opacity:1 },
      { type:"science",asset:"microscope",name:"Analysis",x:970,y:275,width:170,height:115,fill:"#a88ee8",stroke:"#493878",opacity:1 }
    ]
  },
  {
    id: "pathway", name: "Molecular pathway", description: "Receptor-to-response pathway skeleton.",
    objects: [
      { type:"text",name:"Title",x:405,y:55,width:390,height:55,fill:"#172033",stroke:"#26324a",opacity:1,text:"Molecular pathway" },
      { type:"science",asset:"membrane",name:"Cell membrane",x:105,y:145,width:990,height:95,fill:"#8ea0ff",stroke:"#31406a",opacity:1 },
      { type:"science",asset:"protein",name:"Receptor",x:180,y:220,width:150,height:100,fill:"#ee8d9f",stroke:"#752e42",opacity:1 },
      { type:"arrow",name:"Activation",x:350,y:260,width:150,height:50,fill:"#536fc2",stroke:"#26324a",opacity:1 },
      { type:"science",asset:"protein",name:"Mediator",x:520,y:235,width:170,height:110,fill:"#8fd2c3",stroke:"#285b52",opacity:1 },
      { type:"arrow",name:"Activation",x:705,y:260,width:150,height:50,fill:"#536fc2",stroke:"#26324a",opacity:1 },
      { type:"science",asset:"dna",name:"Gene expression",x:875,y:225,width:190,height:125,fill:"#bd91ef",stroke:"#50316f",opacity:1 },
      { type:"text",name:"Response",x:470,y:465,width:260,height:55,fill:"#315e48",stroke:"#26324a",opacity:1,text:"Cellular response" }
    ]
  },
  {
    id: "multi-panel", name: "Publication panels", description: "Four-panel figure with labels.",
    objects: [
      { type:"shape",name:"Panel A",x:75,y:90,width:500,height:255,fill:"#ffffff",stroke:"#7a8494",opacity:1 },
      { type:"shape",name:"Panel B",x:625,y:90,width:500,height:255,fill:"#ffffff",stroke:"#7a8494",opacity:1 },
      { type:"shape",name:"Panel C",x:75,y:405,width:500,height:255,fill:"#ffffff",stroke:"#7a8494",opacity:1 },
      { type:"shape",name:"Panel D",x:625,y:405,width:500,height:255,fill:"#ffffff",stroke:"#7a8494",opacity:1 },
      { type:"text",name:"Panel label A",x:95,y:105,width:50,height:55,fill:"#172033",stroke:"#26324a",opacity:1,text:"A" },
      { type:"text",name:"Panel label B",x:645,y:105,width:50,height:55,fill:"#172033",stroke:"#26324a",opacity:1,text:"B" },
      { type:"text",name:"Panel label C",x:95,y:420,width:50,height:55,fill:"#172033",stroke:"#26324a",opacity:1,text:"C" },
      { type:"text",name:"Panel label D",x:645,y:420,width:50,height:55,fill:"#172033",stroke:"#26324a",opacity:1,text:"D" }
    ]
  }
];

function withIds(objects) {
  return objects.map(object => ({ id:uid(), width:200, height:120, ...structuredClone(object) }));
}

function applyTemplate(template) {
  if (state.objects.length && !confirm(`Replace the current canvas with “${template.name}”?`)) return;
  pushHistory();
  state.objects = withIds(template.objects);
  state.selectedId = null;
  documentName.value = template.name;
  render();
  scheduleSave();
  document.getElementById("templateDrawer").classList.remove("open");
}

function createDrawer(id, title, subtitle) {
  const drawer = document.createElement("section");
  drawer.id = id;
  drawer.className = "utility-drawer";
  drawer.innerHTML = `<div class="utility-head"><div><strong>${title}</strong><span>${subtitle}</span></div><button type="button" data-close>×</button></div><div class="utility-body"></div>`;
  drawer.querySelector("[data-close]").addEventListener("click", () => drawer.classList.remove("open"));
  document.body.appendChild(drawer);
  return drawer;
}

const utilityStyle = document.createElement("style");
utilityStyle.textContent = `
.utility-drawer{position:fixed;z-index:29;top:96px;right:14px;bottom:42px;width:390px;display:none;flex-direction:column;background:#fff;border:1px solid #ccd6e3;border-radius:12px;box-shadow:0 22px 55px rgba(28,39,58,.25);overflow:hidden}.utility-drawer.open{display:flex}.utility-head{display:flex;justify-content:space-between;align-items:center;padding:14px 15px;border-bottom:1px solid #e1e6ee}.utility-head strong,.utility-head span{display:block}.utility-head span{font-size:11px;color:#788397;margin-top:2px}.utility-head button{border:0;background:transparent;font-size:25px;color:#586477}.utility-body{padding:12px;overflow:auto}.template-card{width:100%;display:grid;grid-template-columns:86px 1fr;gap:10px;align-items:center;text-align:left;padding:9px;margin-bottom:8px;border:1px solid #d7dfe9;border-radius:9px;background:white}.template-card:hover{border-color:#6f97e7;background:#f5f8ff}.template-thumb{height:58px;border:1px solid #d6dee9;border-radius:5px;background:linear-gradient(135deg,#eef4ff,#f7f2ff);display:grid;place-items:center;color:#617298;font-weight:800}.template-copy strong,.template-copy span{display:block}.template-copy span{margin-top:3px;color:#778397;font-size:11px}.utility-action{width:100%;padding:10px;margin-bottom:8px;border:1px solid #ccd6e3;border-radius:8px;background:#f8fafc;text-align:left}.utility-action.primary{background:#2563eb;border-color:#2563eb;color:white}.snapshot{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid #e6eaf0}.snapshot small{display:block;color:#7b8798;margin-top:2px}.snapshot button{border:1px solid #ccd6e3;border-radius:7px;background:white;padding:6px 8px}.tool-note{font-size:11px;line-height:1.45;color:#768296}
`;
document.head.appendChild(utilityStyle);

const templateDrawer = createDrawer("templateDrawer", "Layouts and templates", "Optional editable starting structures");
const templateBody = templateDrawer.querySelector(".utility-body");
templateDefinitions.forEach((template, index) => {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "template-card";
  card.innerHTML = `<span class="template-thumb">${index === 0 ? "+" : index}</span><span class="template-copy"><strong>${template.name}</strong><span>${template.description}</span></span>`;
  card.addEventListener("click", () => applyTemplate(template));
  templateBody.appendChild(card);
});

const projectDrawer = createDrawer("projectDrawer", "Project vault", "Portable backup and recovery tools");
projectDrawer.querySelector(".utility-body").innerHTML = `
  <button class="utility-action primary" id="downloadProject" type="button">Download complete project</button>
  <button class="utility-action" id="importProject" type="button">Import project file</button>
  <button class="utility-action" id="saveSnapshot" type="button">Create recovery snapshot</button>
  <input id="projectFile" type="file" accept="application/json,.scicanvas" hidden>
  <p class="tool-note">Project files preserve editable objects, uploaded images and document settings. They are separate from exported publication graphics.</p>
`;

const historyDrawer = createDrawer("historyDrawer", "Recovery history", "Restore a local snapshot");

function downloadBlob(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function projectData() {
  return { format:"SciCanvas", version:1, savedAt:new Date().toISOString(), documentName:documentName.value, objects:state.objects };
}

function downloadProject() {
  downloadBlob(JSON.stringify(projectData(), null, 2), "application/json", `${documentName.value.trim() || "SciCanvas-project"}.scicanvas`);
}

function importProject(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.format !== "SciCanvas" || !Array.isArray(data.objects)) throw new Error("Not a SciCanvas project");
      pushHistory();
      state.objects = data.objects;
      state.selectedId = null;
      documentName.value = data.documentName || "Imported project";
      render(); scheduleSave(); createSnapshot("Imported project");
    } catch (error) { alert(`Could not import project: ${error.message}`); }
  };
  reader.readAsText(file);
}

function readSnapshots() {
  try { return JSON.parse(localStorage.getItem("scicanvas-snapshots")) || []; } catch { return []; }
}

function createSnapshot(label = "Manual snapshot") {
  const snapshots = readSnapshots();
  snapshots.unshift({ id:uid(), label, savedAt:new Date().toISOString(), data:projectData() });
  localStorage.setItem("scicanvas-snapshots", JSON.stringify(snapshots.slice(0, 20)));
  drawSnapshots();
}

function restoreSnapshot(snapshotItem) {
  if (!confirm(`Restore snapshot from ${new Date(snapshotItem.savedAt).toLocaleString()}?`)) return;
  pushHistory();
  state.objects = structuredClone(snapshotItem.data.objects);
  state.selectedId = null;
  documentName.value = snapshotItem.data.documentName;
  render(); scheduleSave();
}

function drawSnapshots() {
  const body = historyDrawer.querySelector(".utility-body");
  const snapshots = readSnapshots();
  body.replaceChildren();
  if (!snapshots.length) {
    const message = document.createElement("p"); message.className="tool-note"; message.textContent="No snapshots yet. SciCanvas will also create periodic recovery points while you work."; body.appendChild(message); return;
  }
  snapshots.forEach(snapshotItem => {
    const row = document.createElement("div"); row.className="snapshot";
    row.innerHTML=`<div><strong>${snapshotItem.label}</strong><small>${new Date(snapshotItem.savedAt).toLocaleString()} · ${snapshotItem.data.objects.length} objects</small></div>`;
    const restoreButton=document.createElement("button"); restoreButton.type="button"; restoreButton.textContent="Restore"; restoreButton.addEventListener("click",()=>restoreSnapshot(snapshotItem));
    row.appendChild(restoreButton); body.appendChild(row);
  });
}

projectDrawer.querySelector("#downloadProject").addEventListener("click", downloadProject);
projectDrawer.querySelector("#importProject").addEventListener("click", () => projectDrawer.querySelector("#projectFile").click());
projectDrawer.querySelector("#projectFile").addEventListener("change", event => { const file=event.target.files[0]; if(file) importProject(file); event.target.value=""; });
projectDrawer.querySelector("#saveSnapshot").addEventListener("click", () => createSnapshot("Manual snapshot"));

document.querySelector('[data-tab="layout"]').addEventListener("click", () => templateDrawer.classList.toggle("open"));
document.querySelector('[data-tab="data"]').addEventListener("click", () => projectDrawer.classList.toggle("open"));
document.querySelector('[data-tab="review"]').addEventListener("click", () => { drawSnapshots(); historyDrawer.classList.toggle("open"); });

setInterval(() => {
  if (state.objects.length) createSnapshot("Automatic recovery");
}, 120000);

drawSnapshots();
