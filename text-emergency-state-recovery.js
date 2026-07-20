(() => {
  if (window.__figureLoomTextEmergencyStateRecoveryV1) return;
  window.__figureLoomTextEmergencyStateRecoveryV1 = true;

  function textItems() {
    const items = [];
    try {
      for (const item of state?.objects || []) if (item?.type === 'text') items.push(item);
      for (const page of state?.pages || []) {
        for (const item of page?.objects || []) if (item?.type === 'text' && !items.includes(item)) items.push(item);
      }
    } catch {}
    return items;
  }

  function emergencySize(item) {
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lines = String(item.text ?? item.content ?? '').split(/\r?\n/);
    const longest = Math.max(1, ...lines.map(line => Array.from(line).length));
    return {
      width:Math.ceil(longest * fontSize * .72 + fontSize * 4 + 80),
      height:Math.ceil(Math.max(1, lines.length) * fontSize * 1.55 + fontSize * 3 + 70)
    };
  }

  function closeEnough(a, b) {
    return Math.abs(Number(a) - Number(b)) <= 1;
  }

  function recover() {
    const canvasWidth = Number(document.getElementById('canvas')?.viewBox?.baseVal?.width) || 1200;
    let changed = false;

    for (const item of textItems()) {
      if (item.textFlow !== 'auto-height') continue;
      item.metadata ??= {};
      if (item.metadata.emergencyTextExpansionRecoveredV1) continue;

      const emergency = emergencySize(item);
      const widthMatches = closeEnough(item.width, emergency.width) && closeEnough(item.textBoxWidth, emergency.width);
      const heightMatches = closeEnough(item.height, emergency.height) && closeEnough(item.textBoxHeight, emergency.height);
      if (!widthMatches || !heightMatches) continue;

      const available = Math.max(280, canvasWidth - Math.max(0, Number(item.x) || 0) - 20);
      const width = Math.min(emergency.width, Math.min(480, available));
      item.width = Math.max(280, width);
      item.textBoxWidth = item.width;
      item.height = Math.max(62, Math.ceil((Number(item.fontSize) || 30) * 1.8 + (Number(item.textPadding) || 9) * 2));
      item.textBoxHeight = item.height;
      item.metadata.emergencyTextExpansionRecoveredV1 = true;
      changed = true;
    }

    if (!changed) return false;
    try { window.render?.(); } catch {}
    try { window.scheduleSave?.(); } catch {}
    return true;
  }

  requestAnimationFrame(recover);
  addEventListener('figureloom-project-opened', () => requestAnimationFrame(recover));
  addEventListener('scicanvas-cloud-opened', () => requestAnimationFrame(recover));
  window.FigureLoomTextEmergencyStateRecovery = Object.freeze({ recover });
})();