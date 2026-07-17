(() => {
  if (typeof createDrawer !== "function") return;

  const LEAFLET_JS = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
  const LEAFLET_CSS = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
  const SEARCH_URL = "https://nominatim.openstreetmap.org/search";
  const EXPORT_WIDTH = 1200;

  const COLORS = Object.freeze({
    primary: "#2563eb",
    primaryDark: "#1d4ed8",
    text: "#253044",
    muted: "#6b7280",
    line: "#cfd7e3",
    white: "#ffffff",
    panel: "#f9fbfd",
    surface: "#f4f7fb"
  });

  const BASEMAPS = {
    streets: {
      label: "Streets",
      service: "World_Street_Map",
      tile: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles © Esri"
    },
    satellite: {
      label: "Satellite",
      service: "World_Imagery",
      tile: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      referenceService: "Reference/World_Boundaries_and_Places",
      referenceTile: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      attribution: "Imagery © Esri"
    },
    terrain: {
      label: "Terrain",
      service: "World_Topo_Map",
      tile: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles © Esri"
    }
  };

  let map = null;
  let baseLayer = null;
  let referenceLayer = null;
  let markerMode = false;
  let markerCounter = 0;
  let searchController = null;
  let editingMarker = null;
  const markers = [];

  function loadStyle(url) {
    if ([...document.styleSheets].some(sheet => sheet.href === url)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }

  function loadScript(url, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    const existing = [...document.scripts].find(script => script.src === url);
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", () => resolve(window[globalName]), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Could not load ${globalName}.`)), { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.addEventListener("load", () => resolve(window[globalName]), { once: true });
      script.addEventListener("error", () => reject(new Error(`Could not load ${globalName}.`)), { once: true });
      document.head.appendChild(script);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error("Could not read map image."));
      reader.readAsDataURL(blob);
    });
  }

  function escapeText(value) {
    return String(value || "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[character]));
  }

  const drawer = createDrawer(
    "mapStudioGoogleDrawer",
    "Map Studio",
    "Search, drag, pinch, zoom, and add annotated markers only when you choose"
  );
  drawer.classList.add("map-studio-google");
  drawer.querySelector(".utility-body").innerHTML = `
    <div class="mapx-topbar">
      <form id="mapxSearchForm" class="mapx-search">
        <input id="mapxSearchInput" type="search" autocomplete="off" placeholder="Search Stavanger, an address, a hospital…" aria-label="Search map">
        <button type="submit">Search</button>
      </form>
      <label class="mapx-basemap">Map
        <select id="mapxBasemap">
          <option value="streets">Streets</option>
          <option value="satellite">Satellite</option>
          <option value="terrain">Terrain</option>
        </select>
      </label>
    </div>
    <div id="mapxSearchResults" class="mapx-results"></div>
    <div class="mapx-markerbar">
      <input id="mapxMarkerLabel" type="text" placeholder="Marker name · optional" aria-label="Marker name">
      <button id="mapxMarkerButton" type="button">Add marker</button>
      <button id="mapxClearMarkers" type="button">Clear markers</button>
      <span id="mapxModeHint">Drag to move · pinch or use + / − to zoom</span>
    </div>
    <div id="mapxMap" class="mapx-map" aria-label="Interactive map"></div>
    <div id="mapxMarkerList" class="mapx-marker-list"><span>No markers yet.</span></div>
    <section id="mapxMarkerEditor" class="mapx-marker-editor" hidden>
      <div class="mapx-editor-heading">
        <div><strong>Edit marker</strong><span>Add the finished description and callout here.</span></div>
        <button id="mapxEditorClose" type="button" aria-label="Close marker editor">×</button>
      </div>
      <div class="mapx-editor-grid">
        <label>Name<input id="mapxEditLabel" type="text" maxlength="80"></label>
        <label>Callout position
          <select id="mapxEditPosition">
            <option value="right">Right</option>
            <option value="left">Left</option>
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
        </label>
      </div>
      <label class="mapx-description-field">Description<textarea id="mapxEditDescription" rows="3" maxlength="500" placeholder="What happened here, what was sampled, or why this site matters…"></textarea></label>
      <label class="mapx-show-callout"><input id="mapxEditShowCallout" type="checkbox" checked> Show the name and description on the map</label>
      <div class="mapx-editor-actions">
        <button id="mapxEditorCancel" type="button">Cancel</button>
        <button id="mapxEditorSave" class="primary" type="button">Save marker</button>
      </div>
    </section>
    <details class="mapx-options">
      <summary>Map options</summary>
      <div class="mapx-option-grid">
        <label>Title<input id="mapxTitle" type="text" placeholder="Study area"></label>
        <label><input id="mapxShowTitle" type="checkbox" checked> Show title</label>
        <label><input id="mapxShowNorth" type="checkbox" checked> North arrow</label>
        <label><input id="mapxSatelliteLabels" type="checkbox" checked> Labels on satellite</label>
      </div>
    </details>
    <div class="mapx-actions">
      <button id="mapxReset" type="button">Reset world view</button>
      <button id="mapxAddToCanvas" class="primary" type="button">Add current map to canvas</button>
    </div>
    <p id="mapxStatus" class="tool-note">Moving and zooming never creates markers. Press “Add marker,” then tap once where it belongs.</p>
  `;

  const q = selector => drawer.querySelector(selector);
  const controls = {
    searchForm: q("#mapxSearchForm"),
    searchInput: q("#mapxSearchInput"),
    results: q("#mapxSearchResults"),
    basemap: q("#mapxBasemap"),
    markerLabel: q("#mapxMarkerLabel"),
    markerButton: q("#mapxMarkerButton"),
    clearMarkers: q("#mapxClearMarkers"),
    modeHint: q("#mapxModeHint"),
    markerList: q("#mapxMarkerList"),
    markerEditor: q("#mapxMarkerEditor"),
    editorClose: q("#mapxEditorClose"),
    editorCancel: q("#mapxEditorCancel"),
    editorSave: q("#mapxEditorSave"),
    editLabel: q("#mapxEditLabel"),
    editDescription: q("#mapxEditDescription"),
    editPosition: q("#mapxEditPosition"),
    editShowCallout: q("#mapxEditShowCallout"),
    title: q("#mapxTitle"),
    showTitle: q("#mapxShowTitle"),
    showNorth: q("#mapxShowNorth"),
    satelliteLabels: q("#mapxSatelliteLabels"),
    reset: q("#mapxReset"),
    add: q("#mapxAddToCanvas"),
    status: q("#mapxStatus")
  };

  function setStatus(message, error = false) {
    controls.status.textContent = message;
    controls.status.classList.toggle("error", error);
  }

  function markerIcon() {
    return window.L.divIcon({
      className: "mapx-leaflet-marker",
      html: '<span class="mapx-marker-circle"></span>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -16]
    });
  }

  function tooltipDirection(position) {
    return ({ left: "left", above: "top", below: "bottom", right: "right" })[position] || "right";
  }

  function tooltipOffset(position) {
    return ({ left: [-14, 0], above: [0, -14], below: [0, 14], right: [14, 0] })[position] || [14, 0];
  }

  function tooltipHtml(record) {
    const description = record.description.trim();
    return `<div class="mapx-callout-content"><strong>${escapeText(record.label)}</strong>${description ? `<span>${escapeText(description)}</span>` : ""}</div>`;
  }

  function updateMarkerPresentation(record) {
    record.marker.setIcon(markerIcon());
    record.marker.unbindTooltip();
    if (!record.showCallout) return;
    record.marker.bindTooltip(tooltipHtml(record), {
      permanent: true,
      direction: tooltipDirection(record.calloutPosition),
      offset: tooltipOffset(record.calloutPosition),
      className: "mapx-marker-tooltip",
      opacity: 1
    });
  }

  function setMarkerMode(enabled) {
    markerMode = Boolean(enabled);
    controls.markerButton.classList.toggle("active", markerMode);
    controls.markerButton.textContent = markerMode ? "Cancel marker" : "Add marker";
    q("#mapxMap").classList.toggle("placing-marker", markerMode);
    controls.modeHint.textContent = markerMode
      ? "Tap once to place the circle · dragging or zooming cancels"
      : "Drag to move · pinch or use + / − to zoom";
  }

  function closeMarkerEditor() {
    editingMarker = null;
    controls.markerEditor.hidden = true;
  }

  function openMarkerEditor(record) {
    editingMarker = record;
    controls.editLabel.value = record.label;
    controls.editDescription.value = record.description;
    controls.editPosition.value = record.calloutPosition;
    controls.editShowCallout.checked = record.showCallout;
    controls.markerEditor.hidden = false;
    controls.editLabel.focus({ preventScroll: true });
    controls.markerEditor.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function saveMarkerEditor() {
    if (!editingMarker) return;
    editingMarker.label = controls.editLabel.value.trim() || `Marker ${editingMarker.number}`;
    editingMarker.description = controls.editDescription.value.trim();
    editingMarker.calloutPosition = controls.editPosition.value;
    editingMarker.showCallout = controls.editShowCallout.checked;
    updateMarkerPresentation(editingMarker);
    const savedName = editingMarker.label;
    closeMarkerEditor();
    renderMarkerList();
    setStatus(`${savedName} updated. Its callout will be included in the exported map.`);
  }

  function renderMarkerList() {
    controls.markerList.replaceChildren();
    if (!markers.length) {
      const empty = document.createElement("span");
      empty.textContent = "No markers yet.";
      controls.markerList.appendChild(empty);
      return;
    }
    markers.forEach(record => {
      const row = document.createElement("div");
      row.className = "mapx-marker-row";
      const name = document.createElement("button");
      name.type = "button";
      name.className = "mapx-marker-name";
      name.textContent = record.label;
      name.title = "Centre map on this marker";
      name.addEventListener("click", () => {
        setMarkerMode(false);
        map.stop();
        map.setView(record.marker.getLatLng(), Math.max(map.getZoom(), 16), { animate: false });
      });
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "mapx-marker-edit";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => openMarkerEditor(record));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "mapx-marker-remove";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        if (editingMarker === record) closeMarkerEditor();
        map.removeLayer(record.marker);
        const index = markers.indexOf(record);
        if (index >= 0) markers.splice(index, 1);
        renderMarkerList();
      });
      row.append(name, edit, remove);
      controls.markerList.appendChild(row);
    });
  }

  function addMarker(latlng, requestedLabel = "") {
    const number = ++markerCounter;
    const record = {
      id: `marker:${Date.now()}:${Math.random()}`,
      number,
      label: requestedLabel.trim() || `Marker ${number}`,
      description: "",
      calloutPosition: "right",
      showCallout: true,
      marker: null
    };
    record.marker = window.L.marker(latlng, { icon: markerIcon(), draggable: true }).addTo(map);
    record.marker.on("dragstart", () => setMarkerMode(false));
    markers.push(record);
    updateMarkerPresentation(record);
    renderMarkerList();
    controls.markerLabel.value = "";
    setMarkerMode(false);
    setStatus(`${record.label} added. Press Edit to add its description and choose the callout position.`);
  }

  function removeBasemapLayers() {
    if (baseLayer) map.removeLayer(baseLayer);
    if (referenceLayer) map.removeLayer(referenceLayer);
    baseLayer = null;
    referenceLayer = null;
  }

  function setBasemap(kind) {
    if (!map) return;
    setMarkerMode(false);
    removeBasemapLayers();
    const config = BASEMAPS[kind] || BASEMAPS.streets;
    const sharedOptions = {
      maxZoom: 19,
      attribution: config.attribution,
      crossOrigin: true,
      updateWhenZooming: false,
      updateWhenIdle: true,
      keepBuffer: 8
    };
    baseLayer = window.L.tileLayer(config.tile, sharedOptions).addTo(map);
    if (kind === "satellite" && controls.satelliteLabels.checked && config.referenceTile) {
      referenceLayer = window.L.tileLayer(config.referenceTile, {
        ...sharedOptions,
        attribution: "Reference © Esri",
        pane: "overlayPane"
      }).addTo(map);
    }
    markers.forEach(record => record.marker.bringToFront?.());
  }

  async function ensureMap() {
    loadStyle(LEAFLET_CSS);
    await loadScript(LEAFLET_JS, "L");
    if (map) {
      requestAnimationFrame(() => map.invalidateSize({ pan: false }));
      return map;
    }
    map = window.L.map("mapxMap", {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 19,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      touchZoom: true,
      dragging: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      worldCopyJump: true,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      inertia: true,
      inertiaDeceleration: 3400,
      preferCanvas: true
    });
    window.L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
    setBasemap(controls.basemap.value);

    map.on("dragstart zoomstart movestart", () => {
      if (markerMode) setMarkerMode(false);
    });
    map.on("click", event => {
      if (!markerMode) return;
      addMarker(event.latlng, controls.markerLabel.value);
    });
    map.on("moveend zoomend", () => {
      const center = map.getCenter();
      setStatus(`Centre ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)} · zoom ${map.getZoom()}.`);
    });
    requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    return map;
  }

  function resultKind(result) {
    return [result.addresstype, result.type, result.category, result.class]
      .map(value => String(value || "").toLowerCase())
      .join(" ");
  }

  function zoomForResult(result) {
    const kind = resultKind(result);
    if (/(house|building|hospital|school|station|amenity|shop|office|address)/.test(kind)) return 18;
    if (/(neighbourhood|neighborhood|suburb|quarter|borough)/.test(kind)) return 16;
    if (/(city|town|village|hamlet)/.test(kind)) return 15;
    if (/(municipality|county|district)/.test(kind)) return 13;
    if (/(state|province|region)/.test(kind)) return 9;
    if (/country/.test(kind)) return 5;
    return 15;
  }

  function moveToResult(result) {
    const lat = Number(result.lat);
    const lon = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    setMarkerMode(false);
    map.stop();
    map.setView([lat, lon], zoomForResult(result), { animate: false, reset: true });
    requestAnimationFrame(() => map.invalidateSize({ pan: false }));
  }

  async function searchPlaces(query) {
    const clean = String(query || "").trim();
    if (!clean) return;
    await ensureMap();
    setMarkerMode(false);
    searchController?.abort();
    searchController = new AbortController();
    controls.results.replaceChildren();
    const loading = document.createElement("p");
    loading.textContent = `Searching for “${clean}”…`;
    controls.results.appendChild(loading);
    setStatus(`Searching for “${clean}”…`);
    try {
      const params = new URLSearchParams({
        q: clean,
        format: "jsonv2",
        addressdetails: "1",
        namedetails: "1",
        limit: "8",
        dedupe: "1"
      });
      const response = await fetch(`${SEARCH_URL}?${params}`, {
        signal: searchController.signal,
        headers: { Accept: "application/json" },
        cache: "no-cache"
      });
      if (!response.ok) throw new Error(`Place search returned ${response.status}.`);
      const results = await response.json();
      controls.results.replaceChildren();
      if (!results.length) {
        const empty = document.createElement("p");
        empty.textContent = "No place matched that search.";
        controls.results.appendChild(empty);
        setStatus("No place matched that search.", true);
        return;
      }
      results.forEach(result => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mapx-result";
        const title = document.createElement("strong");
        title.textContent = result.name || result.namedetails?.name || String(result.display_name || "").split(",")[0] || "Place";
        const description = document.createElement("span");
        description.textContent = result.display_name || "";
        button.append(title, description);
        button.addEventListener("click", () => {
          moveToResult(result);
          controls.title.value = title.textContent;
          controls.results.replaceChildren();
          setStatus(`${title.textContent} selected. The map moved there without adding a marker.`);
        });
        controls.results.appendChild(button);
      });
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error(error);
      controls.results.replaceChildren();
      const failed = document.createElement("p");
      failed.textContent = `Search failed: ${error.message}`;
      controls.results.appendChild(failed);
      setStatus(`Search failed: ${error.message}`, true);
    }
  }

  async function exportServiceImage(servicePath, bounds, width, height, transparent = false) {
    const params = new URLSearchParams({
      bbox: `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`,
      bboxSR: "4326",
      imageSR: "3857",
      size: `${width},${height}`,
      format: "png32",
      transparent: transparent ? "true" : "false",
      dpi: "96",
      f: "image"
    });
    const url = `https://services.arcgisonline.com/ArcGIS/rest/services/${servicePath}/MapServer/export?${params}`;
    const response = await fetch(url, { mode: "cors", cache: "no-cache" });
    if (!response.ok) throw new Error(`Map image returned ${response.status}.`);
    return blobToDataUrl(await response.blob());
  }

  function svgNode(tag, attrs = {}, text = "") {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text) node.textContent = text;
    return node;
  }

  function wrapDescription(value, maxCharacters = 42) {
    const words = String(value || "").trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    for (const word of words) {
      const proposed = current ? `${current} ${word}` : word;
      if (proposed.length > maxCharacters && current) {
        lines.push(current);
        current = word;
      } else {
        current = proposed;
      }
    }
    if (current) lines.push(current);
    return lines.slice(0, 7);
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function appendExportMarker(root, record, point, scaleX, scaleY, exportHeight) {
    const x = point.x * scaleX;
    const y = point.y * scaleY;
    root.appendChild(svgNode("circle", {
      cx: x,
      cy: y,
      r: 10,
      fill: COLORS.primary,
      stroke: COLORS.white,
      "stroke-width": 3
    }));
    root.appendChild(svgNode("circle", {
      cx: x,
      cy: y,
      r: 13,
      fill: "none",
      stroke: COLORS.text,
      "stroke-width": 1.5,
      opacity: 0.8
    }));

    if (!record.showCallout) return;
    const descriptionLines = wrapDescription(record.description);
    const longestLine = Math.max(record.label.length, ...descriptionLines.map(line => line.length), 10);
    const boxWidth = clamp(longestLine * 7.3 + 34, 130, 340);
    const boxHeight = descriptionLines.length ? 48 + descriptionLines.length * 18 : 42;
    const gap = 28;
    let boxX = x + gap;
    let boxY = y - boxHeight / 2;
    if (record.calloutPosition === "left") {
      boxX = x - boxWidth - gap;
      boxY = y - boxHeight / 2;
    } else if (record.calloutPosition === "above") {
      boxX = x - boxWidth / 2;
      boxY = y - boxHeight - gap;
    } else if (record.calloutPosition === "below") {
      boxX = x - boxWidth / 2;
      boxY = y + gap;
    }
    boxX = clamp(boxX, 10, EXPORT_WIDTH - boxWidth - 10);
    boxY = clamp(boxY, 10, exportHeight - boxHeight - 10);
    const lineEndX = clamp(x, boxX, boxX + boxWidth);
    const lineEndY = clamp(y, boxY, boxY + boxHeight);

    root.appendChild(svgNode("line", {
      x1: x,
      y1: y,
      x2: lineEndX,
      y2: lineEndY,
      stroke: COLORS.text,
      "stroke-width": 2
    }));
    root.appendChild(svgNode("rect", {
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      rx: 8,
      fill: COLORS.white,
      stroke: COLORS.line,
      "stroke-width": 1.4,
      opacity: 0.96
    }));
    root.appendChild(svgNode("text", {
      x: boxX + 15,
      y: boxY + 25,
      fill: COLORS.text,
      "font-size": 15,
      "font-weight": 700
    }, record.label));
    if (descriptionLines.length) {
      const text = svgNode("text", {
        x: boxX + 15,
        y: boxY + 47,
        fill: COLORS.text,
        "font-size": 12,
        "font-weight": 400
      });
      descriptionLines.forEach((line, index) => {
        text.appendChild(svgNode("tspan", {
          x: boxX + 15,
          dy: index === 0 ? 0 : 18
        }, line));
      });
      root.appendChild(text);
    }
  }

  async function addMapToCanvas() {
    await ensureMap();
    setMarkerMode(false);
    controls.add.disabled = true;
    const originalText = controls.add.textContent;
    controls.add.textContent = "Embedding current view…";
    setStatus("Embedding the exact current map view…");
    try {
      const size = map.getSize();
      const exportHeight = Math.max(500, Math.round(EXPORT_WIDTH * size.y / Math.max(1, size.x)));
      const config = BASEMAPS[controls.basemap.value] || BASEMAPS.streets;
      const bounds = map.getBounds();
      const mainImage = await exportServiceImage(config.service, bounds, EXPORT_WIDTH, exportHeight, false);
      let referenceImage = null;
      if (controls.basemap.value === "satellite" && controls.satelliteLabels.checked && config.referenceService) {
        referenceImage = await exportServiceImage(config.referenceService, bounds, EXPORT_WIDTH, exportHeight, true);
      }

      const root = svgNode("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: `0 0 ${EXPORT_WIDTH} ${exportHeight}`
      });
      root.appendChild(svgNode("image", {
        href: mainImage,
        x: 0,
        y: 0,
        width: EXPORT_WIDTH,
        height: exportHeight,
        preserveAspectRatio: "none"
      }));
      if (referenceImage) {
        root.appendChild(svgNode("image", {
          href: referenceImage,
          x: 0,
          y: 0,
          width: EXPORT_WIDTH,
          height: exportHeight,
          preserveAspectRatio: "none"
        }));
      }

      const scaleX = EXPORT_WIDTH / Math.max(1, size.x);
      const scaleY = exportHeight / Math.max(1, size.y);
      markers.forEach(record => {
        const point = map.latLngToContainerPoint(record.marker.getLatLng());
        if (point.x < 0 || point.x > size.x || point.y < 0 || point.y > size.y) return;
        appendExportMarker(root, record, point, scaleX, scaleY, exportHeight);
      });

      const title = controls.title.value.trim() || "Map";
      if (controls.showTitle.checked) {
        const titleWidth = Math.max(180, Math.min(700, title.length * 14 + 36));
        root.appendChild(svgNode("rect", {
          x: 22,
          y: 20,
          width: titleWidth,
          height: 48,
          rx: 10,
          fill: COLORS.white,
          opacity: 0.9
        }));
        root.appendChild(svgNode("text", {
          x: 40,
          y: 52,
          fill: COLORS.text,
          "font-size": 25,
          "font-weight": 750
        }, title));
      }
      if (controls.showNorth.checked) {
        const group = svgNode("g", { transform: `translate(${EXPORT_WIDTH - 78} 76)` });
        group.appendChild(svgNode("path", {
          d: "M0 34 L15 -12 L30 34 L15 24Z",
          fill: COLORS.primary,
          stroke: COLORS.text,
          "stroke-width": 2
        }));
        group.appendChild(svgNode("text", {
          x: 15,
          y: -21,
          "text-anchor": "middle",
          fill: COLORS.text,
          "font-size": 17,
          "font-weight": 750
        }, "N"));
        root.appendChild(group);
      }
      root.appendChild(svgNode("text", {
        x: EXPORT_WIDTH - 14,
        y: exportHeight - 12,
        "text-anchor": "end",
        fill: COLORS.white,
        stroke: COLORS.text,
        "stroke-width": 2.5,
        "paint-order": "stroke",
        "font-size": 10
      }, `${config.label} basemap © Esri`));

      const canvasSize = window.currentCanvasSize?.() || { width: 1200, height: 750 };
      const objectWidth = Math.min(canvasSize.width * 0.82, 900);
      const objectHeight = objectWidth * exportHeight / EXPORT_WIDTH;
      const item = {
        id: uid(),
        type: "svg",
        name: title,
        x: Math.max(20, (canvasSize.width - objectWidth) / 2),
        y: Math.max(20, (canvasSize.height - objectHeight) / 2),
        width: objectWidth,
        height: objectHeight,
        svgMarkup: root.innerHTML,
        svgViewBox: `0 0 ${EXPORT_WIDTH} ${exportHeight}`,
        svgColorMode: "original",
        fill: COLORS.primary,
        stroke: COLORS.text,
        opacity: 1,
        rotation: 0,
        visible: true,
        metadata: {
          sourcePack: "Interactive Map Studio",
          sourceName: title,
          sourceUrl: `https://services.arcgisonline.com/ArcGIS/rest/services/${config.service}/MapServer`,
          license: "Esri basemap attribution required",
          attribution: `${config.label} basemap © Esri. Place search © OpenStreetMap contributors.`,
          notes: `Exact current map view embedded with ${markers.length} annotated marker(s).`
        }
      };
      pushHistory();
      state.objects.push(item);
      state.selectedId = item.id;
      render();
      renderPages?.();
      scheduleSave();
      drawer.classList.remove("open");
    } catch (error) {
      console.error(error);
      setStatus(`Could not add map: ${error.message}`, true);
      alert(`Could not add map: ${error.message}`);
    } finally {
      controls.add.disabled = false;
      controls.add.textContent = originalText;
    }
  }

  controls.searchForm.addEventListener("submit", event => {
    event.preventDefault();
    searchPlaces(controls.searchInput.value);
  });
  controls.basemap.addEventListener("change", () => setBasemap(controls.basemap.value));
  controls.satelliteLabels.addEventListener("change", () => {
    if (controls.basemap.value === "satellite") setBasemap("satellite");
  });
  controls.markerButton.addEventListener("click", () => setMarkerMode(!markerMode));
  controls.clearMarkers.addEventListener("click", () => {
    closeMarkerEditor();
    markers.splice(0).forEach(record => map?.removeLayer(record.marker));
    renderMarkerList();
    setMarkerMode(false);
    setStatus("All markers cleared. The map position and zoom stayed exactly where they were.");
  });
  controls.editorClose.addEventListener("click", closeMarkerEditor);
  controls.editorCancel.addEventListener("click", closeMarkerEditor);
  controls.editorSave.addEventListener("click", saveMarkerEditor);
  controls.editLabel.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveMarkerEditor();
    }
  });
  controls.reset.addEventListener("click", () => {
    setMarkerMode(false);
    ensureMap().then(() => {
      map.stop();
      map.setView([20, 0], 2, { animate: false });
    });
  });
  controls.add.addEventListener("click", addMapToCanvas);

  const style = document.createElement("style");
  style.textContent = `
    #mapStudioDrawer,#mapStudioDetailedDrawer,#mapStudioReliableDrawer,#mapStudioSimpleDrawer,#mapStudioSimpleV2Drawer{display:none!important}
    #mapStudioGoogleDrawer{width:min(980px,calc(100vw - 18px))}
    .mapx-topbar{display:grid;grid-template-columns:1fr 130px;gap:8px;align-items:end}
    .mapx-search{display:grid;grid-template-columns:1fr auto;gap:7px}
    .mapx-search input,.mapx-markerbar input,.mapx-basemap select,.mapx-option-grid input[type=text],.mapx-editor-grid input,.mapx-editor-grid select,.mapx-description-field textarea{min-width:0;min-height:39px;border:1px solid ${COLORS.line};border-radius:8px;background:${COLORS.white};padding:8px 10px;color:${COLORS.text}}
    .mapx-search button,.mapx-markerbar button,.mapx-actions button,.mapx-editor-actions button,.mapx-editor-heading button{min-height:39px;border:1px solid ${COLORS.line};border-radius:8px;background:${COLORS.white};padding:8px 11px;color:${COLORS.text}}
    .mapx-search button:hover,.mapx-markerbar button:hover,.mapx-actions button:hover,.mapx-editor-actions button:hover{background:${COLORS.surface}}
    .mapx-basemap{display:grid;gap:5px;color:#596579;font-size:10px}
    .mapx-results{display:grid;gap:5px;max-height:190px;overflow:auto;margin:7px 0}
    .mapx-results>p{margin:0;padding:8px;color:${COLORS.muted};font-size:10px}
    .mapx-result{display:grid;gap:2px;text-align:left;border:1px solid #d9e0e9;border-radius:7px;background:${COLORS.white};padding:8px 10px;color:${COLORS.text}}
    .mapx-result:hover{background:${COLORS.surface};border-color:#7aa0ed}
    .mapx-result strong{font-size:11px}.mapx-result span{font-size:9px;color:${COLORS.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mapx-markerbar{display:grid;grid-template-columns:minmax(140px,1fr) auto auto minmax(220px,auto);gap:7px;align-items:center;margin:8px 0}
    .mapx-markerbar>span{color:${COLORS.muted};font-size:10px;text-align:right}
    .mapx-markerbar button.active{background:${COLORS.primary};border-color:${COLORS.primary};color:${COLORS.white}}
    .mapx-map{height:min(58vh,560px);min-height:360px;border:1px solid ${COLORS.line};border-radius:10px;overflow:hidden;background:${COLORS.surface};touch-action:none;overscroll-behavior:contain}
    .mapx-map.placing-marker,.mapx-map.placing-marker .leaflet-grab{cursor:crosshair!important}
    .mapx-map .leaflet-tile{transition:none!important}
    .mapx-map .leaflet-zoom-animated{transition:none!important}
    .mapx-leaflet-marker{background:none!important;border:none!important}
    .mapx-marker-circle{display:block;width:22px;height:22px;border-radius:50%;background:${COLORS.primary};border:3px solid ${COLORS.white};box-shadow:0 0 0 1.5px ${COLORS.text},0 2px 6px rgba(0,0,0,.28);box-sizing:border-box}
    .mapx-marker-tooltip{border:1px solid ${COLORS.line};border-radius:8px;background:rgba(255,255,255,.97);box-shadow:0 3px 10px rgba(0,0,0,.14);color:${COLORS.text};padding:7px 9px;max-width:270px}
    .mapx-callout-content{display:grid;gap:3px}.mapx-callout-content strong{font-size:11px}.mapx-callout-content span{font-size:9px;line-height:1.35;white-space:pre-wrap;color:${COLORS.text}}
    .mapx-marker-list{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;min-height:28px;align-items:center;color:${COLORS.muted};font-size:10px}
    .mapx-marker-row{display:flex;border:1px solid #d9e0e9;border-radius:999px;overflow:hidden;background:${COLORS.white}}
    .mapx-marker-row button{border:0;background:transparent;padding:6px 9px;font-size:9px;color:${COLORS.text}}
    .mapx-marker-name{font-weight:650}.mapx-marker-edit,.mapx-marker-remove{border-left:1px solid #e2e8f0!important}.mapx-marker-edit{color:${COLORS.primaryDark}!important}.mapx-marker-remove{color:${COLORS.muted}!important}
    .mapx-marker-editor{margin:8px 0;padding:11px;border:1px solid #d9e0e9;border-radius:10px;background:${COLORS.panel}}
    .mapx-editor-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:9px}.mapx-editor-heading strong,.mapx-editor-heading span{display:block}.mapx-editor-heading strong{font-size:12px;color:${COLORS.text}}.mapx-editor-heading span{margin-top:2px;font-size:9px;color:${COLORS.muted}}.mapx-editor-heading button{min-width:36px;min-height:34px;padding:2px;font-size:20px;line-height:1}
    .mapx-editor-grid{display:grid;grid-template-columns:1fr 150px;gap:8px}.mapx-editor-grid label,.mapx-description-field{display:grid;gap:5px;color:#596579;font-size:10px}.mapx-description-field{margin-top:8px}.mapx-description-field textarea{resize:vertical;line-height:1.35}
    .mapx-show-callout{display:flex;align-items:center;gap:6px;margin:9px 0;color:#596579;font-size:10px}.mapx-editor-actions{display:grid;grid-template-columns:1fr 2fr;gap:8px}.mapx-editor-actions .primary{background:${COLORS.primary};border-color:${COLORS.primary};color:${COLORS.white};font-weight:700}
    .mapx-options{margin:8px 0;border:1px solid #d9e0e9;border-radius:9px;background:${COLORS.panel};padding:8px 10px}
    .mapx-options summary{cursor:pointer;color:${COLORS.text};font-size:10px;font-weight:650}
    .mapx-option-grid{display:grid;grid-template-columns:1fr auto auto auto;gap:10px;align-items:center;margin-top:9px}
    .mapx-option-grid label{display:flex;align-items:center;gap:6px;color:#596579;font-size:10px}.mapx-option-grid label:first-child{display:grid;gap:5px}
    .mapx-actions{display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-top:9px}
    .mapx-actions .primary{background:${COLORS.primary};border-color:${COLORS.primary};color:${COLORS.white};font-weight:700}
    .mapx-actions .primary:hover{background:${COLORS.primaryDark}}
    @media(max-width:760px){
      .mapx-topbar{grid-template-columns:1fr}.mapx-markerbar{grid-template-columns:1fr 1fr}.mapx-markerbar input,.mapx-markerbar>span{grid-column:1/-1}.mapx-markerbar>span{text-align:left}.mapx-option-grid{grid-template-columns:1fr 1fr}.mapx-option-grid label:first-child{grid-column:1/-1}.mapx-map{min-height:330px}.mapx-actions,.mapx-editor-actions,.mapx-editor-grid{grid-template-columns:1fr}
    }
  `;
  document.head.appendChild(style);

  async function openMapStudioGoogle() {
    document.getElementById("mapStudioDrawer")?.classList.remove("open");
    document.getElementById("mapStudioDetailedDrawer")?.classList.remove("open");
    document.getElementById("mapStudioReliableDrawer")?.classList.remove("open");
    document.getElementById("mapStudioSimpleDrawer")?.classList.remove("open");
    document.getElementById("mapStudioSimpleV2Drawer")?.classList.remove("open");
    setMarkerMode(false);
    drawer.classList.add("open");
    setStatus("Loading interactive map…");
    try {
      await ensureMap();
      setTimeout(() => map.invalidateSize({ pan: false }), 80);
      setStatus("Add a circle with Add marker, then press Edit to add its description and callout.");
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  window.openMapStudio = openMapStudioGoogle;
  window.openDetailedMapStudio = openMapStudioGoogle;
  window.openReliableMapStudio = openMapStudioGoogle;
  window.openSimpleMapStudio = openMapStudioGoogle;
  window.openMapStudioGoogle = openMapStudioGoogle;

  document.addEventListener("click", event => {
    const button = event.target.closest?.("#insertMapStudio");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.getElementById("insertDrawer")?.classList.remove("open");
    openMapStudioGoogle();
  }, true);

  function polishInsertButton() {
    const button = document.getElementById("insertMapStudio");
    if (!button) return false;
    button.innerHTML = "<strong>Interactive maps</strong><small>Search, drag, pinch, circles, descriptions, satellite, and terrain</small>";
    return true;
  }
  if (!polishInsertButton()) {
    new MutationObserver((_, observer) => {
      if (polishInsertButton()) observer.disconnect();
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
