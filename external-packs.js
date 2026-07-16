(() => {
  const BIOICONS = {
    name: "Bioicons",
    manifest: "https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/icons.json",
    authors: "https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/authors.json",
    source: "https://bioicons.com/",
    repository: "https://github.com/duerrsimon/bioicons",
    download: "https://github.com/duerrsimon/bioicons/archive/refs/heads/main.zip"
  };

  const PACK_LINKS = [
    {
      name: "Bioicons",
      count: "2,829 SVG icons",
      description: "Biology, chemistry, microbiology, cells, viruses, lab equipment, anatomy, organisms and more. Individual licences and authors are retained.",
      browse: "https://bioicons.com/",
      download: BIOICONS.download,
      integrated: true
    },
    {
      name: "Servier Medical Art",
      count: "3,000+ medical illustrations",
      description: "A complete 170 MB PowerPoint slide-set package covering anatomy, cell biology, infectiology, equipment and medical specialties. CC BY 4.0.",
      browse: "https://smart.servier.com/image-kits-by-category/",
      download: "https://smart.servier.com/wp-content/uploads/ServierMedicalArt-all-kits.zip"
    },
    {
      name: "NIH BioArt Source",
      count: "2,000+ professional visuals",
      description: "Viruses, bacteria, cells, proteins, anatomy, equipment, templates, brushes and swatches. Each entry carries its own licence and credit requirements.",
      browse: "https://bioart.niaid.nih.gov/"
    },
    {
      name: "Reactome Icon Library",
      count: "Pathway and cell-component art",
      description: "Curated pathway-oriented illustrations and icons. Use the source licence and icon-specific guidance when importing.",
      browse: "https://reactome.org/icon-lib"
    }
  ];

  const LICENSES = {
    "cc-0": { label: "CC0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
    "cc-by-3.0": { label: "CC BY 3.0", url: "https://creativecommons.org/licenses/by/3.0/" },
    "cc-by-4.0": { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
    "cc-by-sa-3.0": { label: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" },
    "cc-by-sa-4.0": { label: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
    mit: { label: "MIT", url: "https://opensource.org/license/mit" },
    bsd: { label: "BSD 3-Clause", url: "https://opensource.org/license/bsd-3-clause" }
  };

  let bioicons = [];
  let bioiconAuthors = {};
  let visibleLimit = 120;
  let activeCategory = "All";
  let activeLicense = "All";
  let loadingIndex = false;

  function readable(value = "") {
    return value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function encodedPath(value = "") {
    return encodeURIComponent(value).replaceAll("%2F", "/");
  }

  function bioiconUrl(icon) {
    const author = icon.author.replaceAll(" ", "_");
    return `https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/${encodedPath(icon.license)}/${encodedPath(icon.category)}/${encodedPath(author)}/${encodedPath(icon.name)}.svg`;
  }

  function svgToDataUri(svgText) {
    const bytes = new TextEncoder().encode(svgText);
    let binary = "";
    const chunk = 0x8000;
    for (let index = 0; index < bytes.length; index += chunk) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
    }
    return `data:image/svg+xml;base64,${btoa(binary)}`;
  }

  function sanitizeSvg(svgText) {
    const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
    const root = parsed.documentElement;
    if (!root || root.nodeName.toLowerCase() !== "svg" || parsed.querySelector("parsererror")) {
      throw new Error("The downloaded file was not a valid SVG.");
    }

    parsed.querySelectorAll("script, foreignObject, iframe, object, embed").forEach(node => node.remove());
    parsed.querySelectorAll("*").forEach(node => {
      [...node.attributes].forEach(attribute => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim().toLowerCase();
        if (name.startsWith("on")) node.removeAttribute(attribute.name);
        if ((name === "href" || name.endsWith(":href")) && /^(https?:|javascript:|data:text\/html)/.test(value)) {
          node.removeAttribute(attribute.name);
        }
      });
    });
    root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return new XMLSerializer().serializeToString(root);
  }

  function svgSize(svgText) {
    try {
      const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml").documentElement;
      const viewBox = parsed.getAttribute("viewBox")?.trim().split(/[ ,]+/).map(Number);
      const rawWidth = viewBox?.length === 4 ? viewBox[2] : Number.parseFloat(parsed.getAttribute("width")) || 300;
      const rawHeight = viewBox?.length === 4 ? viewBox[3] : Number.parseFloat(parsed.getAttribute("height")) || 220;
      const scale = Math.min(1, 320 / Math.max(rawWidth, rawHeight));
      return {
        width: Math.max(80, Math.round(rawWidth * scale)),
        height: Math.max(60, Math.round(rawHeight * scale))
      };
    } catch {
      return { width: 260, height: 180 };
    }
  }

  async function loadBioicons(force = false) {
    if (loadingIndex) return;
    loadingIndex = true;
    setPackStatus("Loading the Bioicons index…");
    try {
      if (!force) {
        const cached = await vaultRead("pack-bioicons-index").catch(() => null);
        if (cached?.value?.icons?.length) {
          bioicons = cached.value.icons;
          bioiconAuthors = cached.value.authors || {};
          finishIndexLoad("Loaded cached Bioicons index");
          return;
        }
      }

      const [iconsResponse, authorsResponse] = await Promise.all([
        fetch(BIOICONS.manifest, { cache: "no-cache" }),
        fetch(BIOICONS.authors, { cache: "no-cache" })
      ]);
      if (!iconsResponse.ok || !authorsResponse.ok) throw new Error("The Bioicons index could not be downloaded.");
      bioicons = await iconsResponse.json();
      bioiconAuthors = await authorsResponse.json();
      await vaultWrite("pack-bioicons-index", {
        icons: bioicons,
        authors: bioiconAuthors,
        fetchedAt: new Date().toISOString()
      }).catch(() => {});
      finishIndexLoad("Bioicons index updated");
    } catch (error) {
      console.error(error);
      setPackStatus("Could not load Bioicons. Check the internet connection and try Refresh.", true);
    } finally {
      loadingIndex = false;
    }
  }

  function finishIndexLoad(message) {
    populatePackFilters();
    visibleLimit = 120;
    renderBioicons();
    setPackStatus(`${message} · ${bioicons.length.toLocaleString()} icons available`);
  }

  async function importBioicon(icon, button) {
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "Adding…";
    try {
      const assetUrl = bioiconUrl(icon);
      const response = await fetch(assetUrl);
      if (!response.ok) throw new Error(`SVG download failed (${response.status}).`);
      const safeSvg = sanitizeSvg(await response.text());
      const dimensions = svgSize(safeSvg);
      const licence = LICENSES[icon.license] || { label: icon.license, url: "" };
      pushHistory();
      const item = {
        id: uid(),
        type: "image",
        name: readable(icon.name),
        x: 440,
        y: 250,
        width: dimensions.width,
        height: dimensions.height,
        src: svgToDataUri(safeSvg),
        fill: "#ffffff",
        stroke: "#26324a",
        opacity: 1,
        rotation: 0,
        visible: true,
        metadata: {
          sourcePack: "Bioicons",
          sourceName: icon.name,
          sourceUrl: BIOICONS.source,
          sourceAssetUrl: assetUrl,
          author: icon.author,
          authorUrl: bioiconAuthors[icon.author] || "",
          license: licence.label,
          licenseCode: icon.license,
          licenseUrl: licence.url,
          category: readable(icon.category),
          attribution: `${icon.name} icon by ${icon.author}, via Bioicons, licensed under ${licence.label}.`,
          notes: "SVG embedded into the SciCanvas project. Preserve attribution and state modifications when the licence requires it."
        }
      };
      state.objects.push(item);
      state.selectedId = item.id;
      render();
      scheduleSave();
      button.textContent = "Added ✓";
      setTimeout(() => { button.textContent = oldText; button.disabled = false; }, 1000);
    } catch (error) {
      console.error(error);
      alert(`Could not add this Bioicon: ${error.message}`);
      button.textContent = oldText;
      button.disabled = false;
    }
  }

  const packsDrawer = createDrawer("packsDrawer", "Illustration packs", "Licensed online libraries and complete downloads");
  packsDrawer.classList.add("packs-drawer");
  packsDrawer.querySelector(".utility-body").innerHTML = `
    <div id="packSources" class="pack-sources"></div>
    <section class="bioicons-browser">
      <div class="pack-browser-head">
        <div><h3>Browse Bioicons inside SciCanvas</h3><p>Selected SVGs are embedded into the project, so the figure does not depend on the remote file later.</p></div>
        <button id="refreshBioicons" type="button">Refresh index</button>
      </div>
      <div class="pack-controls">
        <input id="packSearch" type="search" placeholder="Search all Bioicons…">
        <select id="packCategory"><option>All</option></select>
        <select id="packLicense"><option>All</option></select>
      </div>
      <p id="packStatus" class="pack-status">Open the pack to load its index.</p>
      <div id="bioiconsGrid" class="pack-grid"></div>
      <button id="loadMoreBioicons" class="utility-action" type="button" hidden>Load more results</button>
    </section>
  `;

  const packStyle = document.createElement("style");
  packStyle.textContent = `
    .packs-drawer{width:min(760px,calc(100vw - 28px))}.pack-sources{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:18px}.pack-source{border:1px solid #d3dce8;border-radius:10px;padding:11px;background:#fbfcfe}.pack-source h3{margin:0;font-size:13px}.pack-source strong{display:block;margin-top:3px;color:#315aa8;font-size:11px}.pack-source p{font-size:11px;line-height:1.45;color:#6f7b8d;min-height:48px}.pack-links{display:flex;flex-wrap:wrap;gap:6px}.pack-links a{border:1px solid #cdd7e4;border-radius:7px;padding:6px 8px;background:white;color:#315aa8;text-decoration:none;font-size:10px}.pack-links a.primary{background:#2563eb;border-color:#2563eb;color:white}.bioicons-browser{border-top:1px solid #dce3ec;padding-top:14px}.pack-browser-head{display:flex;justify-content:space-between;gap:12px;align-items:start}.pack-browser-head h3{margin:0;font-size:14px}.pack-browser-head p{margin:4px 0 10px;font-size:11px;color:#728094}.pack-browser-head button{border:1px solid #ccd6e2;border-radius:7px;background:#f8fafc;padding:7px 9px}.pack-controls{display:grid;grid-template-columns:minmax(180px,1fr) 170px 150px;gap:7px}.pack-controls input,.pack-controls select{min-width:0;border:1px solid #cad4e1;border-radius:8px;background:white;padding:8px}.pack-status{font-size:11px;color:#667386;margin:9px 0}.pack-status.error{color:#a63749}.pack-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.pack-icon{min-width:0;display:flex;flex-direction:column;border:1px solid #d4dde8;border-radius:9px;background:white;overflow:hidden}.pack-preview{height:104px;display:grid;place-items:center;background:#f5f7fa;padding:8px}.pack-preview img{max-width:100%;max-height:100%;object-fit:contain}.pack-icon-copy{padding:8px;display:grid;gap:3px}.pack-icon-copy strong{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pack-icon-copy small{font-size:9px;color:#788496;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pack-icon button{margin:0 8px 8px;border:1px solid #c9d4e2;border-radius:7px;background:#f7f9fc;padding:6px;font-size:10px}.pack-icon button:hover{background:#edf3ff;border-color:#7899da}@media(max-width:700px){.pack-sources{grid-template-columns:1fr}.pack-controls{grid-template-columns:1fr}.pack-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(packStyle);

  const sources = packsDrawer.querySelector("#packSources");
  PACK_LINKS.forEach(pack => {
    const card = document.createElement("article");
    card.className = "pack-source";
    card.innerHTML = `<h3>${pack.name}</h3><strong>${pack.count}</strong><p>${pack.description}</p><div class="pack-links"></div>`;
    const links = card.querySelector(".pack-links");
    const browse = document.createElement("a");
    browse.href = pack.browse;
    browse.target = "_blank";
    browse.rel = "noopener noreferrer";
    browse.textContent = pack.integrated ? "Original library" : "Browse library";
    links.appendChild(browse);
    if (pack.download) {
      const download = document.createElement("a");
      download.href = pack.download;
      download.target = "_blank";
      download.rel = "noopener noreferrer";
      download.className = "primary";
      download.textContent = "Download whole package";
      links.appendChild(download);
    }
    sources.appendChild(card);
  });

  function setPackStatus(message, error = false) {
    const status = packsDrawer.querySelector("#packStatus");
    status.textContent = message;
    status.classList.toggle("error", error);
  }

  function populatePackFilters() {
    const categorySelect = packsDrawer.querySelector("#packCategory");
    const licenseSelect = packsDrawer.querySelector("#packLicense");
    const categories = [...new Set(bioicons.map(icon => icon.category))].sort();
    const licences = [...new Set(bioicons.map(icon => icon.license))].sort();
    categorySelect.replaceChildren(new Option("All", "All"), ...categories.map(category => new Option(readable(category), category)));
    licenseSelect.replaceChildren(new Option("All", "All"), ...licences.map(licence => new Option(LICENSES[licence]?.label || licence, licence)));
    categorySelect.value = categories.includes(activeCategory) ? activeCategory : "All";
    licenseSelect.value = licences.includes(activeLicense) ? activeLicense : "All";
  }

  function matchingBioicons() {
    const query = packsDrawer.querySelector("#packSearch").value.trim().toLowerCase();
    return bioicons.filter(icon => {
      if (activeCategory !== "All" && icon.category !== activeCategory) return false;
      if (activeLicense !== "All" && icon.license !== activeLicense) return false;
      return !query || `${icon.name} ${icon.category} ${icon.author} ${icon.license}`.toLowerCase().includes(query);
    });
  }

  function renderBioicons() {
    const grid = packsDrawer.querySelector("#bioiconsGrid");
    const loadMore = packsDrawer.querySelector("#loadMoreBioicons");
    const matches = matchingBioicons();
    const visible = matches.slice(0, visibleLimit);
    grid.replaceChildren();
    visible.forEach(icon => {
      const card = document.createElement("article");
      card.className = "pack-icon";
      const url = bioiconUrl(icon);
      card.innerHTML = `<div class="pack-preview"><img loading="lazy" crossorigin="anonymous" alt="" src="${url}"></div><div class="pack-icon-copy"><strong title="${readable(icon.name)}">${readable(icon.name)}</strong><small>${readable(icon.category)}</small><small>${icon.author} · ${LICENSES[icon.license]?.label || icon.license}</small></div>`;
      const add = document.createElement("button");
      add.type = "button";
      add.textContent = "Add editable SVG";
      add.addEventListener("click", () => importBioicon(icon, add));
      card.appendChild(add);
      grid.appendChild(card);
    });
    loadMore.hidden = visible.length >= matches.length;
    setPackStatus(`${matches.length.toLocaleString()} matching icons · showing ${visible.length.toLocaleString()}`);
  }

  const packsButton = document.createElement("button");
  packsButton.type = "button";
  packsButton.textContent = "Packs";
  packsButton.title = "Open licensed online illustration packs";
  packsButton.addEventListener("click", () => {
    packsDrawer.classList.toggle("open");
    if (packsDrawer.classList.contains("open") && !bioicons.length) loadBioicons();
  });
  scienceDrawer.querySelector(".science-search").appendChild(packsButton);
  scienceDrawer.querySelector(".science-search").style.gridTemplateColumns = "1fr auto auto auto";

  packsDrawer.querySelector("#refreshBioicons").addEventListener("click", () => loadBioicons(true));
  packsDrawer.querySelector("#packSearch").addEventListener("input", () => { visibleLimit = 120; renderBioicons(); });
  packsDrawer.querySelector("#packCategory").addEventListener("change", event => { activeCategory = event.target.value; visibleLimit = 120; renderBioicons(); });
  packsDrawer.querySelector("#packLicense").addEventListener("change", event => { activeLicense = event.target.value; visibleLimit = 120; renderBioicons(); });
  packsDrawer.querySelector("#loadMoreBioicons").addEventListener("click", () => { visibleLimit += 120; renderBioicons(); });

  const detailedAttributionButton = document.createElement("button");
  detailedAttributionButton.type = "button";
  detailedAttributionButton.className = "utility-action";
  detailedAttributionButton.textContent = "Download detailed asset attribution";
  detailedAttributionButton.addEventListener("click", () => {
    syncPage();
    const objects = state.pages.flatMap(page => page.objects);
    const external = objects.filter(item => item.metadata?.sourcePack);
    const uploads = objects.filter(item => item.type === "image" && !item.metadata?.sourcePack);
    const unique = new Map();
    external.forEach(item => {
      const key = `${item.metadata.sourcePack}|${item.metadata.sourceName}|${item.metadata.author}|${item.metadata.license}`;
      unique.set(key, item.metadata);
    });
    const lines = [
      "SciCanvas detailed asset attribution",
      `Project: ${documentName.value}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "External illustration-pack assets",
      unique.size ? [...unique.values()].map(metadata => [
        `- ${metadata.sourceName || "Untitled asset"}`,
        `  Pack: ${metadata.sourcePack || "Unknown"}`,
        `  Author: ${metadata.author || "Not listed"}`,
        `  Licence: ${metadata.license || "Not listed"}${metadata.licenseUrl ? ` — ${metadata.licenseUrl}` : ""}`,
        `  Source: ${metadata.sourceAssetUrl || metadata.sourceUrl || "Not listed"}`,
        `  Credit: ${metadata.attribution || "Review the source terms."}`
      ].join("\n")).join("\n\n") : "- None used",
      "",
      "User uploads",
      uploads.length ? [...new Set(uploads.map(item => item.name))].map(name => `- ${name} — permission and attribution must be verified by the user`).join("\n") : "- None used"
    ];
    downloadBlob(lines.join("\n"), "text/plain", `${documentName.value.trim() || "SciCanvas"}-detailed-attribution.txt`);
  });
  projectDrawer.querySelector(".utility-body").insertBefore(detailedAttributionButton, projectDrawer.querySelector(".tool-note"));
})();
