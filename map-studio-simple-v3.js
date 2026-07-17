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

  const drawer = createDrawer(
    "mapStudioGoogleDrawer",
    "Map Studio",
    "Search, drag, pinch, zoom, and add markers only when you choose"
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
      <input id="mapxMarkerLabel" type="text" placeholder="Marker label · optional" aria-label="Marker label">
      <button id="mapxMarkerButton" type="button">Add marker</button>
      <button id="mapxClearMarkers" type="button">Clear markers</button>
      <span id="mapxModeHint">Drag to move · pinch or use + / − to zoom</span>
    </div>
    <div id="mapxMap" class="mapx-map" aria-label="Interactive map"></div>
    <div id="mapxMarkerList" class="mapx-marker-list"><span>No markers yet.</span></div>
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
      html: '<span class="mapx-pin-dot"></span>',
      iconSize: [28, 36],
      iconAnchor: [14, 34],
      popupAnchor: [0, -32]
    });
  }

  function setMarkerMode(enabled) {
    markerMode = Boolean(enabled);
    controls.markerButton.classList.toggle("active", markerMode);
    controls.markerButton.textContent = markerMode ? "Cancel marker" : "Add marker";
    q("#mapxMap").classList.toggle("placing-marker", markerMode);
    controls.modeHint.textContent = markerMode
      ? "Tap once to place the marker · dragging or zooming cancels"
      : "Drag to move · pinch or use + / − to zoom";
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
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "mapx-marker-remove";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        map.removeLayer(record.marker);
        const index = markers.indexOf(record);
        if (index >= 0) markers.splice(index, 1);
        renderMarkerList();
      });
      row.append(name, remove);
      controls.markerList.appendChild(row);
    });
  }

  function addMarker(latlng, requestedLabel = "") {
    const label = requestedLabel.trim() || `Marker ${++markerCounter}`;
    const marker = window.L.marker(latlng, { icon: markerIcon(), draggable: true }).addTo(map);
    marker.bindTooltip(label, {
      permanent: true,
      direction: "right",
      offset: [10, -15],
      className: "mapx-marker-tooltip"
    });
    const record = { id: `marker:${Date.now()}:${Math.random()}`, label, marker };
    marker.on("dragstart", () => setMarkerMode(false));
    markers.push(record);
    renderMarkerList();
    controls.markerLabel.value = "";
    setMarkerMode(false);
    setStatus(`${label} added. Normal map movement cannot add another marker.`);
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
        const x = point.x * scaleX;
        const y = point.y * scaleY;
        const group = svgNode("g", { transform: `translate(${x} ${y})` });
        group.appendChild(svgNode("path", {
          d: "M0 16 C-17 -3 -18 -25 0 -34 C18 -25 17 -3 0 16Z",
          fill: COLORS.primary,
          stroke: COLORS.text,
          "stroke-width": 2
        }));
        group.appendChild(svgNode("circle", { cx: 0, cy: -18, r: 5, fill: COLORS.white }));
        const labelWidth = Math.max(82, Math.min(280, record.label.length * 8 + 24));
        group.appendChild(svgNode("rect", {
          x: 13,
          y: -38,
          width: labelWidth,
          height: 29,
          rx: 7,
          fill: COLORS.white,
          stroke: COLORS.line,
          "stroke-width": 1.2,
          opacity: 0.96
        }));
        group.appendChild(svgNode("text", {
          x: 24,
          y: -19,
          fill: COLORS.text,
          "font-size": 14,
          "font-weight": 650
        }, record.label));
        root.appendChild(group);
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
          notes: `Exact current map view embedded with ${markers.length} marker(s).`
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
    markers.splice(0).forEach(record => map?.removeLayer(record.marker));
    renderMarkerList();
    setMarkerMode(false);
    setStatus("All markers cleared. The map position and zoom stayed exactly where they were.");
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
    .mapx-search input,.mapx-markerbar input,.mapx-basemap select,.mapx-option-grid input[type=text]{min-width:0;min-height:39px;border:1px solid ${COLORS.line};border-radius:8px;background:${COLORS.white};padding:8px 10px;color:${COLORS.text}}
    .mapx-search button,.mapx-markerbar button,.mapx-actions button{min-height:39px;border:1px solid ${COLORS.line};border-radius:8px;background:${COLORS.white};padding:8px 11px;color:${COLORS.text}}
    .mapx-search button:hover,.mapx-markerbar button:hover,.mapx-actions button:hover{background:${COLORS.surface}}
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
    .mapx-leaflet-marker::before{content:"";display:block;width:24px;height:32px;border-radius:50% 50% 50% 0;background:${COLORS.primary};border:2px solid ${COLORS.text};transform:rotate(-45deg);box-sizing:border-box;box-shadow:0 2px 5px rgba(0,0,0,.24)}
    .mapx-pin-dot{position:absolute;left:8px;top:7px;width:8px;height:8px;border-radius:50%;background:${COLORS.white};z-index:2}
    .mapx-marker-tooltip{border:1px solid ${COLORS.line};border-radius:7px;background:rgba(255,255,255,.96);box-shadow:none;color:${COLORS.text};font-size:11px;font-weight:650;padding:5px 8px}
    .mapx-marker-list{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;min-height:28px;align-items:center;color:${COLORS.muted};font-size:10px}
    .mapx-marker-row{display:flex;border:1px solid #d9e0e9;border-radius:999px;overflow:hidden;background:${COLORS.white}}
    .mapx-marker-row button{border:0;background:transparent;padding:6px 9px;font-size:9px;color:${COLORS.text}}
    .mapx-marker-name{font-weight:650}.mapx-marker-remove{border-left:1px solid #e2e8f0!important;color:${COLORS.muted}!important}
    .mapx-options{margin:8px 0;border:1px solid #d9e0e9;border-radius:9px;background:${COLORS.panel};padding:8px 10px}
    .mapx-options summary{cursor:pointer;color:${COLORS.text};font-size:10px;font-weight:650}
    .mapx-option-grid{display:grid;grid-template-columns:1fr auto auto auto;gap:10px;align-items:center;margin-top:9px}
    .mapx-option-grid label{display:flex;align-items:center;gap:6px;color:#596579;font-size:10px}.mapx-option-grid label:first-child{display:grid;gap:5px}
    .mapx-actions{display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-top:9px}
    .mapx-actions .primary{background:${COLORS.primary};border-color:${COLORS.primary};color:${COLORS.white};font-weight:700}
    .mapx-actions .primary:hover{background:${COLORS.primaryDark}}
    @media(max-width:760px){
      .mapx-topbar{grid-template-columns:1fr}.mapx-markerbar{grid-template-columns:1fr 1fr}.mapx-markerbar input,.mapx-markerbar>span{grid-column:1/-1}.mapx-markerbar>span{text-align:left}.mapx-option-grid{grid-template-columns:1fr 1fr}.mapx-option-grid label:first-child{grid-column:1/-1}.mapx-map{min-height:330px}.mapx-actions{grid-template-columns:1fr}
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
      setStatus("Search or move the map. A marker can only be created after pressing “Add marker.”");
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
    button.innerHTML = "<strong>Interactive maps</strong><small>Search, drag, pinch, satellite, terrain, and explicit markers</small>";
    return true;
  }
  if (!polishInsertButton()) {
    new MutationObserver((_, observer) => {
      if (polishInsertButton()) observer.disconnect();
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
