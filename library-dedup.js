(() => {
  if (typeof scienceAssets === "undefined" || !Array.isArray(scienceAssets)) return;

  const conceptCount = scienceAssets.length;
  const grouped = new Map();

  scienceAssets.forEach(asset => {
    const key = asset.id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        ...asset,
        aliases: [],
        tags: `${asset.tags || ""} ${asset.name || ""}`.trim()
      });
      return;
    }

    const canonical = grouped.get(key);
    canonical.aliases.push(asset.name);
    canonical.tags = `${canonical.tags} ${asset.name || ""} ${asset.tags || ""} ${asset.organism || ""}`.trim();
  });

  const distinctAssets = [...grouped.values()];
  scienceAssets.splice(0, scienceAssets.length, ...distinctAssets);

  function decorateCards() {
    document.querySelectorAll("#scienceGrid .science-card").forEach(card => {
      const label = card.querySelector("small")?.textContent?.trim();
      const asset = scienceAssets.find(item => item.name === label);
      if (!asset || !asset.aliases?.length || card.querySelector(".concept-count")) return;

      const badge = document.createElement("span");
      badge.className = "concept-count";
      badge.textContent = `Searches ${asset.aliases.length + 1} concepts`;
      badge.title = [asset.name, ...asset.aliases].join(" · ");
      card.appendChild(badge);
    });
  }

  const heading = scienceDrawer?.querySelector(".science-head span");
  if (heading) {
    heading.textContent = `${distinctAssets.length} distinct built-in drawings · ${conceptCount} scientific concepts searchable`;
  }

  const style = document.createElement("style");
  style.textContent = `
    .science-card .concept-count{display:block;padding:3px 6px;border-radius:999px;background:#edf3ff;color:#46689e;font-size:9px;line-height:1.2}
  `;
  document.head.appendChild(style);

  document.getElementById("scienceSearch")?.dispatchEvent(new Event("input"));
  decorateCards();
  const grid = document.getElementById("scienceGrid");
  if (grid) new MutationObserver(decorateCards).observe(grid, { childList: true });
})();