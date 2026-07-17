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

  const BASEMAPS = Object.freeze({
    satellite: {
      label: "Satellite",
      service: "World_Imagery",
      tile: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      referenceService: "Reference/World_Boundaries_and_Places",
      referenceTile: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      attribution: "Imagery © Esri"
    },
    streets: {
      label: "Streets",
      service: "World_Street_Map",
      tile: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles © Esri"
    },
    terrain: {
      label: "Terrain",
      service: "World_Topo_Map",
      tile: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles © Esri"
    }
  });

  let map = null;
  let baseLayer = null;
  let referenceLayer = null;
  let markerArmed = false;
  let markerCounter = 0;
  let searchController = null;
  let dragRecentlyEnded = false;
  const sites = [];

  function loadStyle(url) {
    const exists = [...document.querySelectorAll('link[rel="stylesheet"]')].some(link => link.href === url);
    if (exists) return;
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
    "mapStudioSimpleV2Drawer",
    "Map Studio",
    "Search, drag, zoom, and deliberately add map sites"
  );
  drawer.classList.add("map-studio-simple-v2");
  drawer.querySelector(".utility-body").innerHTML = `
    <div class="mapv2-topbar">
      <form id="mapv2SearchForm" class="mapv2-search">
        <input id="mapv2SearchInput" type="search" autocomplete="off" placeholder="Search Stavanger, an address, hospital, lake…" aria-label="Search map">
        <button type="submit">Search</button>
      </form>
      <label class="mapv2-basemap">Map
        <select id="mapv2Basemap">
          <option value="satellite" selected>Satellite</option>
          <option value="streets">Streets</option>
          <option value="terrain">Terrain</option>
        </select>
      </label>
    </div>
    <div id="mapv2SearchResults" class="mapv2-results"></div>
    <div class="mapv2-sitebar">
      <input id="mapv2SiteLabel" type="text" placeholder="Site label · optional" aria-label="Map site label">
      <button id="mapv2SiteButton" type="button">Add map site</button>
      <button id="mapv2ClearSites" type="button">Clear sites</button>
      <span id="mapv2ModeHint">Drag to move · pinch, scroll, double-tap, or use +/− to zoom</span>
    </div>
    <div id="mapv2Map" class="mapv2-map" aria-label="Interactive map"></div>
    <div id="mapv2SiteList" class="mapv2-site-list"><span>No map sites added.</span></div>
    <details class="mapv2-options">
      <summary>Map options</summary>
      <div class="mapv2-option-grid">
        <label>Title<input id="mapv2Title" type="text" placeholder="Study area"></label>
        <label><input id="mapv2ShowTitle" type="checkbox" checked> Show title</label>
        <label><input id="mapv2ShowNorth" type="checkbox" checked> North arrow</label>
        <label><input id="mapv2SatelliteLabels" type="checkbox" checked> Labels on satellite</label>
      </div>
    </details>
    <div class="mapv2-actions">
      <button id="mapv2Reset" type="button">Reset world view</button>
      <button id="mapv2AddToCanvas" class="primary" type="button">Add current map to canvas</button>
    </div>
    <p id="mapv2Status" class="tool-note">Satellite is the default. Search and movement never add sites.</p>
  `;

  const q = selector => drawer.querySelector(selector);
  const controls = {
    searchForm: q("#mapv2SearchForm"),
    searchInput: q("#mapv2SearchInput"),
    results: q("#mapv2SearchResults"),
    basemap: q("#mapv2Basemap"),
    siteLabel: q("#mapv2SiteLabel"),
    siteButton: q("#mapv2SiteButton"),
    clearSites: q("#mapv2ClearSites"),
    modeHint: q("#mapv2ModeHint"),
    siteList: q("#mapv2SiteList"),
    title: q("#mapv2Title"),
    showTitle: q("#mapv2ShowTitle"),
    showNorth: q("#mapv2ShowNorth"),
    satelliteLabels: q("#mapv2SatelliteLabels"),
    reset: q("#mapv2Reset"),
    add: q("#mapv2AddToCanvas"),
    status: q("#mapv2Status")
  };

  function setStatus(message, error = false) {
    controls.status.textContent = message;
    controls.status.classList.toggle("error", error);
  }

  function setSiteMode(enabled) {
    markerArmed = Boolean(enabled);
    controls.siteButton.classList.toggle("active", markerArmed);
    controls.siteButton.textContent = markerArmed ? "Cancel site" : "Add map site";
    q("#mapv2Map").classList.toggle("placing-site", markerArmed);
    controls.modeHint.textContent = markerArmed
      ? "Tap once to place one site · dragging and zooming still move the map"
      : "Drag to move · pinch, scroll, double-tap, or use +/− to zoom";
  }

  function siteIcon() {
    return window.L.divIcon({
      className: "mapv2-leaflet-site",
      html: '<span class="mapv2-site-dot"></span>',
      iconSize: [28, 36],
      iconAnchor: [14, 34],
      popupAnchor: [0, -32]
    });
  }

  function renderSites() {
    controls.siteList.replaceChildren();
    if (!sites.length) {
      const empty = document.createElement("span");
      empty.textContent = "No map sites added.";
      controls.siteList.appendChild(empty);
      return;
    }
    sites.forEach(record => {
      const row = document.createElement("div");
      row.className = "mapv2-site-row";
      const name = document.createElement("button");
      name.type = "button";
      name.className = "mapv2-site-name";
      name.textContent = record.label;
      name.title = "Centre the map on this site";
      name.addEventListener("click", () => {
        setSiteMode(false);
        map.setView(record.marker.getLatLng(), Math.max(map.getZoom(), 16), { animate: false });
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "mapv2-site-remove";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        map.removeLayer(record.marker);
        const index = sites.indexOf(record);
        if (index >= 0) sites.splice(index, 1);
        renderSites();
      });
      row.append(name, remove);
      controls.siteList.appendChild(row);
    });
  }

  function addSite(latlng) {
    if (!markerArmed) return;
    const label = controls.siteLabel.value.trim() || `Site ${++markerCounter}`;
    const marker = window.L.marker(latlng, {
      icon: siteIcon(),
      draggable: true,
      keyboard: true,
      autoPan: true
    }).addTo(map);
    marker.bindTooltip(label, {
      permanent: true,
      direction: "right",
      offset: [10, -15],
      className: "mapv2-site-tooltip"
    });
    const record = { id: `site:${Date.now()}:${Math.random()}`, label, marker };
    sites.push(record);
    marker.on("dragend", renderSites);
    controls.siteLabel.value = "";
    setSiteMode(false);
    renderSites();
    setStatus(`${label} added. Normal tapping, dragging, and zooming cannot add another site.`);
  }

  function removeBasemapLayers() {
    if (baseLayer) map.removeLayer(baseLayer);
    if (referenceLayer) map.removeLayer(referenceLayer);
    baseLayer = null;
    referenceLayer = null;
  }

  function tileOptions(attribution, pane) {
    return {
      maxZoom: 19,
      minZoom: 2,
      attribution,
      crossOrigin: true,
      updateWhenZooming: false,
      updateWhenIdle: true,
      keepBuffer: 8,
      detectRetina: true,
      noWrap: false,
      pane
    };
  }

  function setBasemap(kind) {
    if (!map) return;
    setSiteMode(false);
    removeBasemapLayers();
    const config = BASEMAPS[kind] || BASEMAPS.satellite;
    baseLayer = window.L.tileLayer(config.tile, tileOptions(config.attribution)).addTo(map);
    if (kind === "satellite" && controls.satelliteLabels.checked && config.referenceTile) {
      referenceLayer = window.L.tileLayer(
        config.referenceTile,
        tileOptions("Reference © Esri", "overlayPane")
      ).addTo(map);
    }
    sites.forEach(record => record.marker.bringToFront?.());
    setStatus(`${config.label} map active. Move and zoom normally; sites require the Add map site button.`);
  }

  async function ensureMap() {
    loadStyle(LEAFLET_CSS);
    await loadScript(LEAFLET_JS, "L");
    if (map) {
      requestAnimationFrame(() => map.invalidateSize({ animate: false, pan: false }));
      return map;
    }

    map = window.L.map("mapv2Map", {
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
      inertiaMaxSpeed: 1500,
      easeLinearity: 0.25,
      bounceAtZoomLimits: false,
      zoomSnap: 1,
      zoomDelta: 1,
      wheelDebounceTime: 35,
      wheelPxPerZoomLevel: 80
    });

    window.L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
    controls.basemap.value = "satellite";
    setBasemap("satellite");

    map.on("dragstart", () => {
      dragRecentlyEnded = true;
    });
    map.on("dragend", () => {
      window.setTimeout(() => {
        dragRecentlyEnded = false;
      }, 180);
    });
    map.on("zoomstart", () => {
      dragRecentlyEnded = true;
    });
    map.on("zoomend", () => {
      window.setTimeout(() => {
        dragRecentlyEnded = false;
      }, 180);
      const center = map.getCenter();
      setStatus(`Zoom ${map.getZoom()} · centre ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}.`);
    });
    map.on("moveend", () => {
      if (map._animatingZoom) return;
      const center = map.getCenter();
      setStatus(`Map centred at ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)} · zoom ${map.getZoom()}.`);
    });
    map.on("click", event => {
      if (!markerArmed || dragRecentlyEnded) return;
      addSite(event.latlng);
    });

    requestAnimationFrame(() => map.invalidateSize({ animate: false, pan: false }));
    return map;
  }

  function zoomForResult(result) {
    const type = String(result.type || "").toLowerCase();
    const category = String(result.category || "").toLowerCase();
    const combined = `${type} ${category}`;
    if (/house|building|hospital|school|station|amenity|address/.test(combined)) return 18;
    if (/suburb|neighbourhood|quarter/.test(combined)) return 16;
    if (/city|town|village|municipality/.test(combined)) return 14;
    if (/county|state|province|region/.test(combined)) return 9;
    if (/country/.test(combined)) return 5;
    return 14;
  }

  async function searchPlaces(query) {
    const clean = String(query || "").trim();
    if (!clean) return;
    await ensureMap();
    setSiteMode(false);
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
        limit: "8",
        dedupe: "1",
        "accept-language": document.documentElement.lang || navigator.language || "en"
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
        button.className = "mapv2-result";
        const title = document.createElement("strong");
        title.textContent = result.name || String(result.display_name || "").split(",")[0] || "Place";
        const description = document.createElement("span");
        description.textContent = result.display_name || "";
        button.append(title, description);
        button.addEventListener("click", () => {
          const lat = Number(result.lat);
          const lon = Number(result.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
          const label = title.textContent;
          setSiteMode(false);
          controls.siteLabel.value = label;
          controls.title.value = label;
          controls.results.replaceChildren();
          map.stop();
          map.setView([lat, lon], zoomForResult(result), { animate: false, reset: true });
          window.setTimeout(() => map.invalidateSize({ animate: false, pan: false }), 0);
          setStatus(`${label} selected. The map moved there without adding a site.`);
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
    setSiteMode(false);
    controls.add.disabled = true;
    const originalText = controls.add.textContent;
    controls.add.textContent = "Embedding current view…";
    setStatus("Embedding the exact current map view…");

    try {
      const size = map.getSize();
      const exportHeight = Math.max(500, Math.round(EXPORT_WIDTH * size.y / Math.max(1, size.x)));
      const config = BASEMAPS[controls.basemap.value] || BASEMAPS.satellite;
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
      sites.forEach(record => {
        const point = map.latLngToContainerPoint(record.marker.getLatLng());
        const x = point.x * scaleX;
        const y = point.y * scaleY;
        if (x < -40 || x > EXPORT_WIDTH + 40 || y < -40 || y > exportHeight + 40) return;
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
          x: 13, y: -38, width: labelWidth, height: 29, rx: 7,
          fill: COLORS.white, stroke: COLORS.line, "stroke-width": 1.2, opacity: 0.96
        }));
        group.appendChild(svgNode("text", {
          x: 24, y: -19, fill: COLORS.text, "font-size": 14, "font-weight": 650
        }, record.label));
        root.appendChild(group);
      });

      const title = controls.title.value.trim() || "Map";
      if (controls.showTitle.checked) {
        const titleWidth = Math.max(180, Math.min(700, title.length * 14 + 36));
        root.appendChild(svgNode("rect", {
          x: 22, y: 20, width: titleWidth, height: 48, rx: 10,
          fill: COLORS.white, opacity: 0.9
        }));
        root.appendChild(svgNode("text", {
          x: 40, y: 52, fill: COLORS.text, "font-size": 25, "font-weight": 750
        }, title));
      }

      if (controls.showNorth.checked) {
        const group = svgNode("g", { transform: `translate(${EXPORT_WIDTH - 78} 76)` });
        group.appendChild(svgNode("path", {
          d: "M0 34 L15 -12 L30 34 L15 24Z",
          fill: COLORS.primary, stroke: COLORS.text, "stroke-width": 2
        }));
        group.appendChild(svgNode("text", {
          x: 15, y: -21, "text-anchor": "middle",
          fill: COLORS.text, "font-size": 17, "font-weight": 750
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
          notes: `Exact current map view embedded with ${sites.length} deliberately added site(s).`
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
  controls.siteButton.addEventListener("click", () => setSiteMode(!markerArmed));
  controls.clearSites.addEventListener("click", () => {
    sites.splice(0).forEach(record => map?.removeLayer(record.marker));
    renderSites();
    setSiteMode(false);
    setStatus("All map sites cleared. The map centre and zoom did not change.");
  });
  controls.reset.addEventListener("click", () => {
    ensureMap().then(() => {
      setSiteMode(false);
      map.stop();
      map.setView([20, 0], 2, { animate: false, reset: true });
    });
  });
  controls.add.addEventListener("click", addMapToCanvas);

  const style = document.createElement("style");
  style.textContent = `
    #mapStudioDrawer,#mapStudioDetailedDrawer,#mapStudioReliableDrawer,#mapStudioSimpleDrawer{display:none!important}
    #mapStudioSimpleV2Drawer{width:min(980px,calc(100vw - 18px))}
    .mapv2-topbar{display:grid;grid-template-columns:1fr 130px;gap:8px;align-items:end}
    .mapv2-search{display:grid;grid-template-columns:1fr auto;gap:7px}
    .mapv2-search input,.mapv2-sitebar input,.mapv2-basemap select,.mapv2-option-grid input[type=text]{min-width:0;min-height:39px;border:1px solid ${COLORS.line};border-radius:8px;background:${COLORS.white};padding:8px 10px;color:${COLORS.text}}
    .mapv2-search button,.mapv2-sitebar button,.mapv2-actions button{min-height:39px;border:1px solid ${COLORS.line};border-radius:8px;background:${COLORS.white};padding:8px 11px;color:${COLORS.text}}
    .mapv2-search button:hover,.mapv2-sitebar button:hover,.mapv2-actions button:hover{background:${COLORS.surface}}
    .mapv2-basemap{display:grid;gap:5px;color:#596579;font-size:10px}
    .mapv2-results{display:grid;gap:5px;max-height:190px;overflow:auto;margin:7px 0}
    .mapv2-results>p{margin:0;padding:8px;color:${COLORS.muted};font-size:10px}
    .mapv2-result{display:grid;gap:2px;text-align:left;border:1px solid #d9e0e9;border-radius:7px;background:${COLORS.white};padding:8px 10px;color:${COLORS.text}}
    .mapv2-result:hover{background:${COLORS.surface};border-color:#7aa0ed}
    .mapv2-result strong{font-size:11px}.mapv2-result span{font-size:9px;color:${COLORS.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mapv2-sitebar{display:grid;grid-template-columns:minmax(140px,1fr) auto auto minmax(230px,auto);gap:7px;align-items:center;margin:8px 0}
    .mapv2-sitebar>span{color:${COLORS.muted};font-size:10px;text-align:right}
    .mapv2-sitebar button.active{background:${COLORS.primary};border-color:${COLORS.primary};color:${COLORS.white}}
    .mapv2-map{height:min(60vh,590px);min-height:390px;border:1px solid ${COLORS.line};border-radius:10px;overflow:hidden;background:${COLORS.surface}}
    .mapv2-map.placing-site,.mapv2-map.placing-site .leaflet-grab{cursor:crosshair!important}
    .mapv2-map .leaflet-tile{transition:none!important;animation:none!important}
    .mapv2-map .leaflet-zoom-animated{transition:none!important}
    .mapv2-leaflet-site{background:none!important;border:none!important}
    .mapv2-leaflet-site::before{content:"";display:block;width:24px;height:32px;border-radius:50% 50% 50% 0;background:${COLORS.primary};border:2px solid ${COLORS.text};transform:rotate(-45deg);box-sizing:border-box;box-shadow:0 2px 5px rgba(0,0,0,.24)}
    .mapv2-site-dot{position:absolute;left:8px;top:7px;width:8px;height:8px;border-radius:50%;background:${COLORS.white};z-index:2}
    .mapv2-site-tooltip{border:1px solid ${COLORS.line};border-radius:7px;background:rgba(255,255,255,.96);box-shadow:none;color:${COLORS.text};font-size:11px;font-weight:650;padding:5px 8px}
    .mapv2-site-list{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;min-height:28px;align-items:center;color:${COLORS.muted};font-size:10px}
    .mapv2-site-row{display:flex;border:1px solid #d9e0e9;border-radius:999px;overflow:hidden;background:${COLORS.white}}
    .mapv2-site-row button{border:0;background:transparent;padding:6px 9px;font-size:9px;color:${COLORS.text}}
    .mapv2-site-name{font-weight:650}.mapv2-site-remove{border-left:1px solid #e2e8f0!important;color:${COLORS.muted}!important}
    .mapv2-options{margin:8px 0;border:1px solid #d9e0e9;border-radius:9px;background:${COLORS.panel};padding:8px 10px}
    .mapv2-options summary{cursor:pointer;color:${COLORS.text};font-size:10px;font-weight:650}
    .mapv2-option-grid{display:grid;grid-template-columns:1fr auto auto auto;gap:10px;align-items:center;margin-top:9px}
    .mapv2-option-grid label{display:flex;align-items:center;gap:6px;color:#596579;font-size:10px}.mapv2-option-grid label:first-child{display:grid;gap:5px}
    .mapv2-actions{display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-top:9px}
    .mapv2-actions .primary{background:${COLORS.primary};border-color:${COLORS.primary};color:${COLORS.white};font-weight:700}
    .mapv2-actions .primary:hover{background:${COLORS.primaryDark}}
    @media(max-width:760px){
      .mapv2-topbar{grid-template-columns:1fr}.mapv2-sitebar{grid-template-columns:1fr 1fr}.mapv2-sitebar input,.mapv2-sitebar>span{grid-column:1/-1}.mapv2-sitebar>span{text-align:left}.mapv2-option-grid{grid-template-columns:1fr 1fr}.mapv2-option-grid label:first-child{grid-column:1/-1}.mapv2-map{min-height:350px}.mapv2-actions{grid-template-columns:1fr}
    }
  `;
  document.head.appendChild(style);

  async function openMapStudioV2() {
    document.getElementById("mapStudioDrawer")?.classList.remove("open");
    document.getElementById("mapStudioDetailedDrawer")?.classList.remove("open");
    document.getElementById("mapStudioReliableDrawer")?.classList.remove("open");
    document.getElementById("mapStudioSimpleDrawer")?.classList.remove("open");
    drawer.classList.add("open");
    setSiteMode(false);
    setStatus("Loading satellite map…");
    try {
      await ensureMap();
      controls.basemap.value = "satellite";
      if (!baseLayer || controls.basemap.value !== "satellite") setBasemap("satellite");
      window.setTimeout(() => map.invalidateSize({ animate: false, pan: false }), 60);
      setStatus("Satellite ready. Search or move freely; press Add map site only when you want to place one.");
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  window.openMapStudio = openMapStudioV2;
  window.openDetailedMapStudio = openMapStudioV2;
  window.openReliableMapStudio = openMapStudioV2;
  window.openSimpleMapStudio = openMapStudioV2;
  window.openMapStudioV2 = openMapStudioV2;

  document.addEventListener("click", event => {
    const button = event.target.closest?.("#insertMapStudio");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.getElementById("insertDrawer")?.classList.remove("open");
    openMapStudioV2();
  }, true);

  function polishInsertButton() {
    const button = document.getElementById("insertMapStudio");
    if (!button) return false;
    button.innerHTML = "<strong>Interactive maps</strong><small>Satellite first · search, drag, zoom, then deliberately add sites</small>";
    return true;
  }
  if (!polishInsertButton()) {
    new MutationObserver((_, observer) => {
      if (polishInsertButton()) observer.disconnect();
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
