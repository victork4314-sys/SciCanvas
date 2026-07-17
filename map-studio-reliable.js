(() => {
  if (typeof createDrawer !== "function") return;

  const WIDTH = 900;
  const HEIGHT = 560;
  const RAW_ROOT = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
  const D3_URL = "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js";
  const DETAIL_ORDER = ["10m", "50m", "110m"];
  const dataCache = new Map();
  const selectedCities = [];
  let previewVersion = 0;
  let lastMarkup = "";
  let lastTitle = "Map";
  let searchTimer = 0;
  let previewTimer = 0;

  const COLORS = Object.freeze({
    water: "#f4f7fb",
    land: "#eef4ff",
    border: "#4b5563",
    primary: "#2563eb",
    primaryDark: "#1d4ed8",
    text: "#253044",
    muted: "#6b7280",
    line: "#cfd7e3",
    white: "#ffffff",
    panel: "#f9fbfd"
  });

  const FILES = {
    countries: detail => `ne_${detail}_admin_0_countries.geojson`,
    states: () => "ne_10m_admin_1_states_provinces.geojson",
    lakes: detail => `ne_${detail}_lakes.geojson`,
    rivers: detail => `ne_${detail}_rivers_lake_centerlines.geojson`,
    marine: detail => `ne_${detail}_geography_marine_polys.geojson`,
    cities: () => "ne_10m_populated_places.geojson"
  };

  function loadScript(url, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(script => script.src === url);
      if (existing) {
        existing.addEventListener("load", () => resolve(window[globalName]), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Could not load ${globalName}.`)), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.addEventListener("load", () => resolve(window[globalName]), { once: true });
      script.addEventListener("error", () => reject(new Error(`Could not load ${globalName}.`)), { once: true });
      document.head.appendChild(script);
    });
  }

  function fallbackDetails(requested) {
    const index = DETAIL_ORDER.indexOf(requested);
    return index < 0 ? ["50m", "110m"] : DETAIL_ORDER.slice(index);
  }

  async function fetchGeoJson(key, requestedDetail = "50m", { optional = false } = {}) {
    const details = ["states", "cities"].includes(key) ? ["10m"] : fallbackDetails(requestedDetail);
    let finalError = null;

    for (const detail of details) {
      const filename = FILES[key](detail);
      const cacheKey = `${key}:${filename}`;
      if (!dataCache.has(cacheKey)) {
        const request = fetch(`${RAW_ROOT}/${filename}`, { cache: "force-cache" })
          .then(async response => {
            if (!response.ok) throw new Error(`${filename} returned ${response.status}.`);
            const data = await response.json();
            if (!data || !Array.isArray(data.features)) throw new Error(`${filename} was not valid GeoJSON.`);
            return { data, detail };
          })
          .catch(error => {
            dataCache.delete(cacheKey);
            throw error;
          });
        dataCache.set(cacheKey, request);
      }
      try {
        return await dataCache.get(cacheKey);
      } catch (error) {
        finalError = error;
      }
    }

    if (optional) return { data: { type: "FeatureCollection", features: [] }, detail: null, error: finalError };
    throw new Error(`${key[0].toUpperCase()}${key.slice(1)} map data could not be loaded. ${finalError?.message || ""}`.trim());
  }

  const drawer = createDrawer(
    "mapStudioReliableDrawer",
    "Map Studio",
    "Detailed editable maps with working cities, water, and administrative layers"
  );
  drawer.classList.add("map-studio-reliable");
  drawer.querySelector(".utility-body").innerHTML = `
    <div class="mapr-intro">
      <strong>Build a map from real vector layers</strong>
      <span>Pick the area and detail, search or add cities, then switch boundaries, lakes, rivers, seas, labels, and map furniture on or off.</span>
    </div>

    <div class="mapr-grid mapr-grid-3">
      <label>View
        <select id="maprMode">
          <option value="world">World</option>
          <option value="country" selected>Country / region</option>
          <option value="city">City / local area</option>
        </select>
      </label>
      <label>Detail
        <select id="maprDetail">
          <option value="110m">Fast overview</option>
          <option value="50m" selected>Detailed</option>
          <option value="10m">Ultra detailed</option>
        </select>
      </label>
      <label id="maprCountryLabel">Country
        <select id="maprCountry"><option value="">Open Map Studio to load countries…</option></select>
      </label>
    </div>

    <section class="mapr-section">
      <div class="mapr-heading">
        <strong>Cities and study sites</strong>
        <span>Search the built-in city index, add several markers, or enter an exact custom location.</span>
      </div>
      <div class="mapr-city-search">
        <input id="maprCitySearch" type="search" placeholder="Search Stavanger, Oslo, Tokyo…" autocomplete="off">
        <button id="maprFindCity" type="button">Find</button>
      </div>
      <div id="maprCityResults" class="mapr-city-results"></div>
      <details class="mapr-custom">
        <summary>Add an exact city or site</summary>
        <div class="mapr-grid mapr-grid-3">
          <label>Label<input id="maprCustomLabel" type="text" placeholder="Sampling site"></label>
          <label>Latitude<input id="maprCustomLat" type="number" min="-90" max="90" step="0.000001" placeholder="58.969"></label>
          <label>Longitude<input id="maprCustomLon" type="number" min="-180" max="180" step="0.000001" placeholder="5.733"></label>
        </div>
        <button id="maprAddCustom" class="mapr-full-button" type="button">Add exact marker</button>
      </details>
      <div id="maprSelectedCities" class="mapr-city-chips"><span class="mapr-empty">No city markers yet.</span></div>
    </section>

    <section class="mapr-section">
      <div class="mapr-heading">
        <strong>Layers</strong>
        <span>Optional layers fail softly: the base map still renders if one remote dataset is temporarily unavailable.</span>
      </div>
      <div class="mapr-layers">
        <label><input id="maprBorders" type="checkbox" checked> Country borders</label>
        <label><input id="maprStates" type="checkbox"> States / provinces</label>
        <label><input id="maprLakes" type="checkbox" checked> Lakes</label>
        <label><input id="maprRivers" type="checkbox"> Rivers</label>
        <label><input id="maprMarine" type="checkbox" checked> Ocean / sea labels</label>
        <label><input id="maprNearbyCities" type="checkbox"> Nearby cities</label>
        <label><input id="maprCityLabels" type="checkbox" checked> Marker labels</label>
        <label><input id="maprGraticule" type="checkbox"> Latitude / longitude grid</label>
        <label><input id="maprNorth" type="checkbox" checked> North arrow</label>
        <label><input id="maprScale" type="checkbox" checked> Scale bar</label>
        <label><input id="maprTitleToggle" type="checkbox" checked> Title</label>
      </div>
      <label id="maprDensityLabel" class="mapr-full-field" hidden>Nearby-city density
        <select id="maprDensity">
          <option value="major">Major cities</option>
          <option value="medium" selected>More cities</option>
          <option value="all">Most available cities</option>
        </select>
      </label>
    </section>

    <div class="mapr-grid">
      <label>Title<input id="maprTitle" type="text" placeholder="Study area"></label>
      <label id="maprFocusLabel" hidden>City focus
        <select id="maprFocus">
          <option value="country">Show country context</option>
          <option value="local">Zoom around selected markers</option>
        </select>
      </label>
    </div>

    <div class="mapr-preview-wrap">
      <svg id="maprPreview" viewBox="0 0 900 560" role="img" aria-label="Detailed map preview"></svg>
      <span>Preview updates automatically</span>
    </div>
    <div class="mapr-actions">
      <button id="maprRefresh" type="button">Refresh preview</button>
      <button id="maprAdd" class="primary" type="button">Add editable map</button>
    </div>
    <p id="maprStatus" class="tool-note">Map data loads only when Map Studio is opened.</p>
  `;

  const q = selector => drawer.querySelector(selector);
  const controls = {
    mode: q("#maprMode"),
    detail: q("#maprDetail"),
    country: q("#maprCountry"),
    countryLabel: q("#maprCountryLabel"),
    citySearch: q("#maprCitySearch"),
    cityResults: q("#maprCityResults"),
    selectedCities: q("#maprSelectedCities"),
    customLabel: q("#maprCustomLabel"),
    customLat: q("#maprCustomLat"),
    customLon: q("#maprCustomLon"),
    borders: q("#maprBorders"),
    states: q("#maprStates"),
    lakes: q("#maprLakes"),
    rivers: q("#maprRivers"),
    marine: q("#maprMarine"),
    nearbyCities: q("#maprNearbyCities"),
    cityLabels: q("#maprCityLabels"),
    density: q("#maprDensity"),
    densityLabel: q("#maprDensityLabel"),
    graticule: q("#maprGraticule"),
    north: q("#maprNorth"),
    scale: q("#maprScale"),
    titleToggle: q("#maprTitleToggle"),
    title: q("#maprTitle"),
    focus: q("#maprFocus"),
    focusLabel: q("#maprFocusLabel"),
    preview: q("#maprPreview"),
    status: q("#maprStatus"),
    add: q("#maprAdd")
  };

  function svgNode(tag, attrs = {}, text = "") {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
    if (text) element.textContent = text;
    return element;
  }

  function countryName(feature) {
    const p = feature?.properties || {};
    return p.NAME || p.ADMIN || p.NAME_EN || p.SOVEREIGNT || "Unnamed country";
  }

  function countryCode(feature) {
    const p = feature?.properties || {};
    return p.ADM0_A3 || p.SOV_A3 || p.ISO_A3 || countryName(feature);
  }

  function stateCountryCode(feature) {
    const p = feature?.properties || {};
    return p.adm0_a3 || p.ADM0_A3 || p.sov_a3 || p.SOV_A3 || "";
  }

  function cityFromFeature(feature) {
    const p = feature?.properties || {};
    const coordinates = feature?.geometry?.coordinates || [Number(p.LONGITUDE), Number(p.LATITUDE)];
    return {
      id: String(p.NE_ID || p.WIKIDATAID || `${coordinates[0]}:${coordinates[1]}:${p.NAME || ""}`),
      name: p.NAME || p.NAMEASCII || p.NAMEPAR || "Unnamed place",
      admin: p.ADM1NAME || "",
      country: p.ADM0NAME || p.SOV0NAME || "",
      countryCode: p.ADM0_A3 || p.SOV_A3 || "",
      population: Number(p.POP_MAX || p.POP_MIN || 0),
      coordinates: coordinates.map(Number),
      custom: false
    };
  }

  function selectedCountryFeature(countries) {
    return countries.features.find(feature => countryCode(feature) === controls.country.value) || countries.features[0] || null;
  }

  function boundsPolygon(bounds, padding = 0) {
    const [[west, south], [east, north]] = bounds;
    return {
      type: "Polygon",
      coordinates: [[
        [west - padding, south - padding],
        [east + padding, south - padding],
        [east + padding, north + padding],
        [west - padding, north + padding],
        [west - padding, south - padding]
      ]]
    };
  }

  function cityFocusGeometry(selectedCountry) {
    if (controls.mode.value !== "city" || controls.focus.value !== "local" || !selectedCities.length) return selectedCountry;
    const lons = selectedCities.map(city => city.coordinates[0]).filter(Number.isFinite);
    const lats = selectedCities.map(city => city.coordinates[1]).filter(Number.isFinite);
    if (!lons.length || !lats.length) return selectedCountry;
    const lonSpan = Math.max(...lons) - Math.min(...lons);
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const span = Math.max(lonSpan, latSpan, 0.35);
    const padding = Math.max(0.18, span * 0.65);
    return boundsPolygon([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], padding);
  }

  function pointInsideBounds(coordinates, bounds) {
    const [lon, lat] = coordinates;
    const [[west, south], [east, north]] = bounds;
    const lonInside = west <= east ? lon >= west && lon <= east : lon >= west || lon <= east;
    return lonInside && lat >= south && lat <= north;
  }

  function featureIntersects(feature, bounds) {
    try {
      const featureBounds = window.d3.geoBounds(feature);
      const [[west, south], [east, north]] = bounds;
      const [[fWest, fSouth], [fEast, fNorth]] = featureBounds;
      if (west <= east && fWest <= fEast) {
        return !(fEast < west || fWest > east || fNorth < south || fSouth > north);
      }
      return true;
    } catch {
      return true;
    }
  }

  function appendPaths(root, features, projection, attrs, className) {
    const path = window.d3.geoPath(projection);
    const group = svgNode("g", { class: className });
    for (const feature of features) {
      const d = path(feature);
      if (d) group.append(svgNode("path", { d, ...attrs, "vector-effect": "non-scaling-stroke" }));
    }
    root.append(group);
  }

  function appendNorthArrow(root) {
    if (!controls.north.checked || controls.mode.value === "world") return;
    const group = svgNode("g", { transform: `translate(${WIDTH - 66} 76)` });
    group.append(svgNode("path", {
      d: "M0 30 L14 -10 L28 30 L14 21Z",
      fill: COLORS.primary,
      stroke: COLORS.text,
      "stroke-width": 2
    }));
    group.append(svgNode("text", {
      x: 14, y: -18, "text-anchor": "middle", fill: COLORS.text, "font-size": 16, "font-weight": 700
    }, "N"));
    root.append(group);
  }

  function appendScaleBar(root, projection) {
    if (!controls.scale.checked || controls.mode.value === "world" || typeof projection.invert !== "function") return;
    const center = projection.invert([WIDTH / 2, HEIGHT / 2]);
    if (!center) return;
    const kmPerDegree = Math.max(1, 111.32 * Math.cos(center[1] * Math.PI / 180));
    const p1 = projection(center);
    const p2 = projection([center[0] + 1, center[1]]);
    if (!p1 || !p2) return;
    const pixelsPerKm = Math.abs(p2[0] - p1[0]) / kmPerDegree;
    const choices = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    const distance = choices.reduce((best, value) =>
      Math.abs(value * pixelsPerKm - 115) < Math.abs(best * pixelsPerKm - 115) ? value : best
    , choices[0]);
    const pixels = Math.max(30, Math.min(180, distance * pixelsPerKm));
    const group = svgNode("g", { transform: `translate(34 ${HEIGHT - 38})` });
    group.append(svgNode("line", { x1: 0, y1: 0, x2: pixels, y2: 0, stroke: COLORS.text, "stroke-width": 4 }));
    group.append(svgNode("line", { x1: 0, y1: -5, x2: 0, y2: 5, stroke: COLORS.text, "stroke-width": 2 }));
    group.append(svgNode("line", { x1: pixels, y1: -5, x2: pixels, y2: 5, stroke: COLORS.text, "stroke-width": 2 }));
    group.append(svgNode("text", {
      x: pixels / 2, y: -9, "text-anchor": "middle", fill: COLORS.text, "font-size": 12
    }, `${distance} km`));
    root.append(group);
  }

  function labelForCity(city) {
    return `${city.name}${city.admin ? `, ${city.admin}` : ""}`;
  }

  function appendCityMarker(group, city, projection, { subtle = false } = {}) {
    const point = projection(city.coordinates);
    if (!point || !point.every(Number.isFinite)) return;
    const [x, y] = point;
    const radius = subtle ? 2.7 : 6;
    group.append(svgNode("circle", {
      cx: x, cy: y, r: radius, fill: COLORS.primary,
      stroke: COLORS.white, "stroke-width": subtle ? 1 : 2, opacity: subtle ? 0.82 : 1
    }));
    if (!subtle) group.append(svgNode("circle", {
      cx: x, cy: y, r: 9, fill: "none", stroke: COLORS.primary, "stroke-width": 1, opacity: 0.6
    }));
    if (!controls.cityLabels.checked) return;
    const label = labelForCity(city);
    const fontSize = subtle ? 8.5 : 11;
    const boxWidth = Math.max(50, Math.min(subtle ? 150 : 220, label.length * (subtle ? 5.2 : 6.4) + 16));
    group.append(svgNode("rect", {
      x: x + (subtle ? 5 : 9), y: y - (subtle ? 14 : 20),
      width: boxWidth, height: subtle ? 18 : 24, rx: 5,
      fill: COLORS.white, stroke: COLORS.line, "stroke-width": 0.8, opacity: 0.94
    }));
    group.append(svgNode("text", {
      x: x + (subtle ? 10 : 17), y: y - (subtle ? 2 : 4),
      fill: COLORS.text, "font-size": fontSize, "font-weight": subtle ? 500 : 650
    }, label));
  }

  function nearbyCityThreshold() {
    if (controls.density.value === "major") return 1_000_000;
    if (controls.density.value === "medium") return 100_000;
    return 0;
  }

  async function buildMap(version) {
    await loadScript(D3_URL, "d3");
    const requestedDetail = controls.detail.value;
    const countriesResult = await fetchGeoJson("countries", requestedDetail);
    if (version !== previewVersion) return null;
    const countries = countriesResult.data;
    const selectedCountry = selectedCountryFeature(countries);
    if (!selectedCountry) throw new Error("No country boundary was available.");

    const focus = controls.mode.value === "world"
      ? countries
      : cityFocusGeometry(selectedCountry);
    const projection = controls.mode.value === "world"
      ? window.d3.geoNaturalEarth1()
      : window.d3.geoMercator();
    projection.fitExtent([[28, 44], [WIDTH - 28, HEIGHT - 36]], focus);

    const root = svgNode("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: `0 0 ${WIDTH} ${HEIGHT}`
    });
    root.append(svgNode("rect", { width: WIDTH, height: HEIGHT, rx: 12, fill: COLORS.water }));

    if (controls.graticule.checked) {
      const d = window.d3.geoPath(projection)(window.d3.geoGraticule10());
      root.append(svgNode("path", {
        d: d || "", fill: "none", stroke: COLORS.line, "stroke-width": 0.55,
        opacity: 0.8, "vector-effect": "non-scaling-stroke"
      }));
    }

    const visibleBounds = window.d3.geoBounds(focus);
    const countryFeatures = controls.mode.value === "world" ? countries.features : [selectedCountry];
    appendPaths(root, countryFeatures, projection, {
      fill: COLORS.land,
      stroke: controls.borders.checked ? COLORS.border : "none",
      "stroke-width": controls.mode.value === "world" ? 0.7 : 1.1
    }, "map-land");

    const warnings = [];
    const actualDetails = new Set([countriesResult.detail].filter(Boolean));

    if (controls.states.checked && controls.mode.value !== "world") {
      const result = await fetchGeoJson("states", "10m", { optional: true });
      if (result.error) warnings.push("states/provinces");
      const code = countryCode(selectedCountry);
      const name = countryName(selectedCountry);
      const matchingCountry = result.data.features.filter(feature => {
        const p = feature.properties || {};
        return stateCountryCode(feature) === code || p.admin === name || p.ADMIN === name;
      });
      const candidates = (matchingCountry.length ? matchingCountry : result.data.features)
        .filter(feature => featureIntersects(feature, visibleBounds));
      appendPaths(root, candidates, projection, {
        fill: "none", stroke: COLORS.border, "stroke-width": 0.55, opacity: 0.75
      }, "map-states");
    }

    if (controls.lakes.checked) {
      const result = await fetchGeoJson("lakes", requestedDetail, { optional: true });
      if (result.error) warnings.push("lakes");
      if (result.detail) actualDetails.add(result.detail);
      const features = controls.mode.value === "world"
        ? result.data.features
        : result.data.features.filter(feature => featureIntersects(feature, visibleBounds));
      appendPaths(root, features, projection, {
        fill: COLORS.white, stroke: COLORS.line, "stroke-width": 0.55
      }, "map-lakes");
    }

    if (controls.rivers.checked) {
      const result = await fetchGeoJson("rivers", requestedDetail, { optional: true });
      if (result.error) warnings.push("rivers");
      if (result.detail) actualDetails.add(result.detail);
      const features = controls.mode.value === "world"
        ? result.data.features
        : result.data.features.filter(feature => featureIntersects(feature, visibleBounds));
      appendPaths(root, features, projection, {
        fill: "none", stroke: COLORS.primary, "stroke-width": 0.65, opacity: 0.72
      }, "map-rivers");
    }

    if (controls.marine.checked) {
      const result = await fetchGeoJson("marine", requestedDetail, { optional: true });
      if (result.error) warnings.push("ocean/sea labels");
      if (result.detail) actualDetails.add(result.detail);
      const group = svgNode("g", { class: "map-marine-labels" });
      const features = controls.mode.value === "world"
        ? result.data.features
        : result.data.features.filter(feature => featureIntersects(feature, visibleBounds));
      for (const feature of features) {
        const p = feature.properties || {};
        const label = p.name || p.NAME || p.name_en || p.NAME_EN;
        if (!label) continue;
        const point = projection(window.d3.geoCentroid(feature));
        if (!point || !point.every(Number.isFinite)) continue;
        group.append(svgNode("text", {
          x: point[0], y: point[1], "text-anchor": "middle",
          fill: COLORS.muted, "font-size": 10, "font-style": "italic", opacity: 0.8
        }, label));
      }
      root.append(group);
    }

    const cityGroup = svgNode("g", { class: "map-city-markers" });
    if (controls.nearbyCities.checked) {
      const result = await fetchGeoJson("cities", "10m", { optional: true });
      if (result.error) warnings.push("nearby cities");
      const code = countryCode(selectedCountry);
      const threshold = nearbyCityThreshold();
      const limit = controls.mode.value === "world" ? 45 : controls.mode.value === "city" ? 90 : 65;
      const nearby = result.data.features
        .map(cityFromFeature)
        .filter(city => Number.isFinite(city.coordinates[0]) && Number.isFinite(city.coordinates[1]))
        .filter(city => city.population >= threshold)
        .filter(city => {
          if (controls.mode.value === "world") return true;
          if (controls.mode.value === "city" && controls.focus.value === "local") {
            return pointInsideBounds(city.coordinates, visibleBounds);
          }
          return city.countryCode === code && pointInsideBounds(city.coordinates, visibleBounds);
        })
        .sort((a, b) => b.population - a.population)
        .slice(0, limit);
      for (const city of nearby) {
        if (!selectedCities.some(selected => selected.id === city.id)) appendCityMarker(cityGroup, city, projection, { subtle: true });
      }
    }
    for (const city of selectedCities) appendCityMarker(cityGroup, city, projection);
    root.append(cityGroup);

    appendNorthArrow(root);
    appendScaleBar(root, projection);

    const fallbackTitle = controls.mode.value === "world"
      ? "World map"
      : controls.mode.value === "city" && selectedCities.length
        ? selectedCities.map(city => city.name).join(" · ")
        : countryName(selectedCountry);
    const title = controls.title.value.trim() || fallbackTitle;
    lastTitle = title;
    if (controls.titleToggle.checked) {
      root.append(svgNode("text", {
        x: 28, y: 29, fill: COLORS.text, "font-size": 22, "font-weight": 750
      }, title));
    }

    root.append(svgNode("text", {
      x: WIDTH - 15, y: HEIGHT - 12, "text-anchor": "end",
      fill: COLORS.muted, "font-size": 9
    }, "Natural Earth · public domain"));

    return {
      root,
      warnings,
      detailText: [...actualDetails].join(" / ") || requestedDetail
    };
  }

  async function updatePreview({ throwOnFailure = false } = {}) {
    const version = ++previewVersion;
    controls.status.classList.remove("error");
    controls.status.textContent = controls.detail.value === "10m"
      ? "Loading ultra-detailed vector layers…"
      : "Loading selected vector layers…";
    controls.add.disabled = true;

    try {
      const result = await buildMap(version);
      if (!result || version !== previewVersion) return false;
      controls.preview.replaceChildren(...[...result.root.childNodes].map(child => document.importNode(child, true)));
      lastMarkup = result.root.innerHTML;
      const warningText = result.warnings.length
        ? ` · skipped unavailable: ${[...new Set(result.warnings)].join(", ")}`
        : "";
      controls.status.textContent =
        `Map ready · detail ${result.detailText} · ${selectedCities.length} selected marker${selectedCities.length === 1 ? "" : "s"}${warningText}.`;
      return true;
    } catch (error) {
      console.error(error);
      if (version === previewVersion) {
        lastMarkup = "";
        controls.preview.replaceChildren();
        controls.status.classList.add("error");
        controls.status.textContent = error.message;
      }
      if (throwOnFailure) throw error;
      return false;
    } finally {
      if (version === previewVersion) controls.add.disabled = false;
    }
  }

  function schedulePreview(delay = 160) {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => updatePreview(), delay);
  }

  async function populateCountries() {
    await loadScript(D3_URL, "d3");
    const previous = controls.country.value;
    const result = await fetchGeoJson("countries", controls.detail.value);
    const features = [...result.data.features].sort((a, b) => countryName(a).localeCompare(countryName(b)));
    controls.country.replaceChildren(...features.map(feature => new Option(countryName(feature), countryCode(feature))));
    const preferred = features.find(feature => countryCode(feature) === previous)
      || features.find(feature => countryName(feature) === "Norway")
      || features[0];
    if (preferred) controls.country.value = countryCode(preferred);
  }

  function renderSelectedCities() {
    controls.selectedCities.replaceChildren();
    if (!selectedCities.length) {
      const empty = document.createElement("span");
      empty.className = "mapr-empty";
      empty.textContent = "No city markers yet.";
      controls.selectedCities.appendChild(empty);
      return;
    }

    for (const city of selectedCities) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "mapr-city-chip";
      chip.textContent = `${city.name}${city.country ? `, ${city.country}` : ""} ×`;
      chip.title = "Remove marker";
      chip.addEventListener("click", () => {
        const index = selectedCities.findIndex(item => item.id === city.id);
        if (index >= 0) selectedCities.splice(index, 1);
        renderSelectedCities();
        schedulePreview(0);
      });
      controls.selectedCities.appendChild(chip);
    }
  }

  function addCity(city) {
    if (!selectedCities.some(item => item.id === city.id)) selectedCities.push(city);
    controls.mode.value = "city";
    updateVisibility();
    renderSelectedCities();
    controls.citySearch.value = "";
    controls.cityResults.replaceChildren();
    schedulePreview(0);
  }

  async function findCities() {
    const query = controls.citySearch.value.trim().toLowerCase();
    controls.cityResults.replaceChildren();
    if (query.length < 2) return;
    controls.cityResults.textContent = "Searching the city index…";

    try {
      const result = await fetchGeoJson("cities", "10m");
      const selectedCountryText = controls.country.options[controls.country.selectedIndex]?.text || "";
      const matches = result.data.features
        .map(cityFromFeature)
        .filter(city => `${city.name} ${city.admin} ${city.country}`.toLowerCase().includes(query))
        .sort((a, b) =>
          Number(b.country === selectedCountryText) - Number(a.country === selectedCountryText)
          || b.population - a.population
        )
        .slice(0, 16);

      controls.cityResults.replaceChildren();
      for (const city of matches) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mapr-city-result";
        const title = document.createElement("strong");
        title.textContent = city.name;
        const description = document.createElement("span");
        description.textContent = [city.admin, city.country, city.population ? city.population.toLocaleString() : ""]
          .filter(Boolean).join(" · ");
        button.append(title, description);
        button.addEventListener("click", () => addCity(city));
        controls.cityResults.appendChild(button);
      }

      if (!matches.length) {
        controls.cityResults.textContent =
          "No indexed city matched. Use “Add an exact city or site” below with its latitude and longitude.";
      }
    } catch (error) {
      controls.cityResults.textContent = `City search could not load: ${error.message}`;
    }
  }

  function addCustomCity() {
    const name = controls.customLabel.value.trim() || "Custom site";
    const lat = Number(controls.customLat.value);
    const lon = Number(controls.customLon.value);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      alert("Enter a latitude from −90 to 90 and a longitude from −180 to 180.");
      return;
    }
    addCity({
      id: `custom:${Date.now()}:${lon}:${lat}`,
      name,
      admin: "",
      country: "",
      countryCode: "",
      population: 0,
      coordinates: [lon, lat],
      custom: true
    });
    controls.customLabel.value = "";
    controls.customLat.value = "";
    controls.customLon.value = "";
  }

  function updateVisibility() {
    const world = controls.mode.value === "world";
    const city = controls.mode.value === "city";
    controls.countryLabel.hidden = world;
    controls.focusLabel.hidden = !city;
    controls.states.closest("label").hidden = world;
    controls.north.closest("label").hidden = world;
    controls.scale.closest("label").hidden = world;
    controls.densityLabel.hidden = !controls.nearbyCities.checked;
  }

  async function addMap() {
    const ready = await updatePreview({ throwOnFailure: true });
    if (!ready || !lastMarkup) throw new Error("The map preview could not be prepared.");
    const canvasSize = window.currentCanvasSize?.() || { width: 1200, height: 750 };
    const width = Math.min(canvasSize.width * 0.78, 850);
    const height = width * HEIGHT / WIDTH;
    const enabledLayers = [
      controls.states.checked && "states/provinces",
      controls.lakes.checked && "lakes",
      controls.rivers.checked && "rivers",
      controls.marine.checked && "oceans/seas",
      controls.nearbyCities.checked && "nearby cities"
    ].filter(Boolean);

    const item = {
      id: uid(),
      type: "svg",
      name: lastTitle,
      x: Math.max(20, (canvasSize.width - width) / 2),
      y: Math.max(20, (canvasSize.height - height) / 2),
      width,
      height,
      svgMarkup: lastMarkup,
      svgViewBox: `0 0 ${WIDTH} ${HEIGHT}`,
      svgColorMode: "original",
      fill: COLORS.primary,
      stroke: COLORS.text,
      opacity: 1,
      rotation: 0,
      visible: true,
      metadata: {
        sourcePack: "Natural Earth",
        sourceName: lastTitle,
        sourceUrl: "https://www.naturalearthdata.com/",
        license: "Public domain",
        attribution: "Map layers from Natural Earth, public domain.",
        notes: `Figureloom vector map. Enabled layers: ${enabledLayers.join(", ") || "base map"}. Selected markers: ${selectedCities.length}.`
      }
    };

    pushHistory();
    state.objects.push(item);
    state.selectedId = item.id;
    render();
    renderPages?.();
    scheduleSave();
    drawer.classList.remove("open");
  }

  const style = document.createElement("style");
  style.textContent = `
    #mapStudioDrawer,#mapStudioDetailedDrawer{display:none!important}
    #mapStudioReliableDrawer{width:min(880px,calc(100vw - 20px))}
    .mapr-intro{padding:10px 11px;border:1px solid #d9e0e9;border-radius:9px;background:#f4f7fb;margin-bottom:10px}
    .mapr-intro strong,.mapr-intro span,.mapr-heading strong,.mapr-heading span{display:block}
    .mapr-intro strong,.mapr-heading strong{color:#253044;font-size:12px}
    .mapr-intro span,.mapr-heading span{margin-top:2px;color:#6b7280;font-size:10px;line-height:1.4}
    .mapr-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:9px}
    .mapr-grid-3{grid-template-columns:repeat(3,1fr)}
    .mapr-grid label,.mapr-full-field{display:grid;gap:5px;color:#596579;font-size:10px}
    .mapr-grid select,.mapr-grid input,.mapr-full-field select,.mapr-city-search input{
      min-width:0;min-height:37px;border:1px solid #cfd7e3;border-radius:8px;background:white;padding:7px 9px;color:#253044
    }
    .mapr-section{margin:9px 0;padding:10px;border:1px solid #d9e0e9;border-radius:9px;background:#f9fbfd}
    .mapr-heading{margin-bottom:8px}
    .mapr-city-search{display:grid;grid-template-columns:1fr auto;gap:7px}
    .mapr-city-search button,.mapr-actions button,.mapr-full-button{
      border:1px solid #cfd7e3;border-radius:8px;background:white;color:#253044;padding:8px 11px
    }
    .mapr-city-search button:hover,.mapr-actions button:hover,.mapr-full-button:hover{background:#f4f7fb}
    .mapr-city-results{display:grid;gap:5px;max-height:200px;overflow:auto;margin-top:7px}
    .mapr-city-result{display:grid;gap:2px;text-align:left;border:1px solid #d9e0e9;border-radius:7px;background:white;padding:7px 9px;color:#253044}
    .mapr-city-result:hover{background:#f4f7fb;border-color:#7aa0ed}
    .mapr-city-result strong{font-size:11px}.mapr-city-result span{font-size:9px;color:#6b7280}
    .mapr-custom{margin-top:8px;border-top:1px solid #e4e9f0;padding-top:8px}
    .mapr-custom summary{cursor:pointer;color:#315aa8;font-size:10px;font-weight:650;margin-bottom:8px}
    .mapr-full-button{width:100%}
    .mapr-city-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
    .mapr-city-chip{border:1px solid #7aa0ed;border-radius:999px;background:#eef4ff;color:#1d4ed8;padding:5px 8px;font-size:9px}
    .mapr-empty{color:#8a94a3;font-size:10px}
    .mapr-layers{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .mapr-layers label{display:flex;align-items:center;gap:6px;color:#596579;font-size:10px}
    .mapr-preview-wrap{position:relative;border:1px solid #cfd7e3;border-radius:10px;overflow:hidden;background:#f4f7fb}
    .mapr-preview-wrap svg{display:block;width:100%;height:auto;min-height:280px;max-height:490px}
    .mapr-preview-wrap>span{position:absolute;right:9px;bottom:8px;border:1px solid #d9e0e9;border-radius:6px;background:rgba(255,255,255,.94);padding:5px 7px;color:#6b7280;font-size:9px}
    .mapr-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}
    .mapr-actions .primary{background:#2563eb;border-color:#2563eb;color:white}
    .mapr-actions .primary:hover{background:#1d4ed8}
    @media(max-width:680px){
      .mapr-grid,.mapr-grid-3,.mapr-layers{grid-template-columns:1fr}
      .mapr-preview-wrap svg{min-height:220px}
    }
  `;
  document.head.appendChild(style);

  q("#maprFindCity").addEventListener("click", findCities);
  controls.citySearch.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(findCities, 180);
  });
  controls.citySearch.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      findCities();
    }
  });
  q("#maprAddCustom").addEventListener("click", addCustomCity);
  q("#maprRefresh").addEventListener("click", () => updatePreview());
  q("#maprAdd").addEventListener("click", () => {
    addMap().catch(error => alert(`Could not add map: ${error.message}`));
  });

  [
    controls.mode, controls.country, controls.borders, controls.states, controls.lakes,
    controls.rivers, controls.marine, controls.nearbyCities, controls.cityLabels,
    controls.density, controls.graticule, controls.north, controls.scale,
    controls.titleToggle, controls.focus
  ].forEach(control => control.addEventListener("change", () => {
    updateVisibility();
    schedulePreview();
  }));

  controls.detail.addEventListener("change", async () => {
    try {
      await populateCountries();
      schedulePreview(0);
    } catch (error) {
      controls.status.classList.add("error");
      controls.status.textContent = error.message;
    }
  });
  controls.title.addEventListener("input", () => schedulePreview(220));

  async function openReliableMapStudio() {
    document.getElementById("mapStudioDrawer")?.classList.remove("open");
    document.getElementById("mapStudioDetailedDrawer")?.classList.remove("open");
    drawer.classList.add("open");
    updateVisibility();
    controls.status.classList.remove("error");
    controls.status.textContent = "Loading map engine and country boundaries…";
    try {
      await loadScript(D3_URL, "d3");
      await populateCountries();
      await updatePreview();
    } catch (error) {
      controls.status.classList.add("error");
      controls.status.textContent = error.message;
    }
  }

  window.openMapStudio = openReliableMapStudio;
  window.openDetailedMapStudio = openReliableMapStudio;
  window.openReliableMapStudio = openReliableMapStudio;

  document.addEventListener("click", event => {
    const button = event.target.closest?.("#insertMapStudio");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.getElementById("insertDrawer")?.classList.remove("open");
    openReliableMapStudio();
  }, true);

  function polishInsertButton() {
    const button = document.getElementById("insertMapStudio");
    if (!button) return false;
    button.innerHTML = "<strong>Detailed maps</strong><small>Countries, cities, lakes, rivers, seas, and regions</small>";
    return true;
  }
  if (!polishInsertButton()) {
    new MutationObserver((_, observer) => {
      if (polishInsertButton()) observer.disconnect();
    }).observe(document.body, { childList: true, subtree: true });
  }

  updateVisibility();
})();
