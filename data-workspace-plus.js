(() => {
  if (window.__figureLoomDataWorkspacePlusV1) return;
  window.__figureLoomDataWorkspacePlusV1 = true;

  const MODULE_ID = 'figureloomDataWorkspacePlus';
  const palettes = {
    scientific:['#4f7fe5','#37a37d','#e6904e','#a36ad8','#d9576f','#45a3bd'],
    colorblind:['#0072B2','#E69F00','#009E73','#CC79A7','#D55E00','#56B4E9','#F0E442'],
    cool:['#3056d3','#0ea5a8','#6d5bd0','#3b82c4','#22a06b','#64748b'],
    warm:['#c84f3d','#e58a2b','#b76bb2','#d45b7a','#9c6b30','#d1a319'],
    mono:['#1f2937','#475569','#64748b','#94a3b8','#cbd5e1','#e2e8f0']
  };

  let drawer = null;
  let source = null;
  let visual = null;
  let panel = null;
  let gridHost = null;
  let activeCell = { row:1, column:0 };
  let syncing = false;

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function parseDelimited(text) {
    const raw = String(text || '').replace(/\r\n?/g, '\n');
    if (!raw.trim()) return [['Column 1','Column 2'],['','']];
    const firstLine = raw.split('\n')[0] || '';
    const counts = {
      '\t':(firstLine.match(/\t/g) || []).length,
      ',':(firstLine.match(/,/g) || []).length,
      ';':(firstLine.match(/;/g) || []).length
    };
    const delimiter = Object.entries(counts).sort((a,b) => b[1] - a[1])[0]?.[0] || ',';
    const rows = [];
    let row = [], value = '', quoted = false;
    for (let index = 0; index < raw.length; index += 1) {
      const char = raw[index];
      if (char === '"') {
        if (quoted && raw[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === delimiter && !quoted) {
        row.push(value);
        value = '';
      } else if (char === '\n' && !quoted) {
        row.push(value);
        rows.push(row);
        row = [];
        value = '';
      } else {
        value += char;
      }
    }
    row.push(value);
    rows.push(row);
    while (rows.length > 1 && rows.at(-1).every(cell => !String(cell).trim())) rows.pop();
    const width = Math.max(2, ...rows.map(item => item.length));
    rows.forEach(item => { while (item.length < width) item.push(''); });
    if (rows.length < 2) rows.push(Array(width).fill(''));
    rows[0] = rows[0].map((cell, index) => String(cell).trim() || `Column ${index + 1}`);
    return rows;
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"','""')}"` : text;
  }

  function serialize(matrix) {
    return matrix.map(row => row.map(csvCell).join(',')).join('\n');
  }

  function matrixFromSource() {
    return parseDelimited(source?.value || '');
  }

  function writeMatrix(matrix, rebuild = true) {
    if (!source) return;
    syncing = true;
    source.value = serialize(matrix);
    source.dispatchEvent(new Event('input', { bubbles:true }));
    syncing = false;
    if (rebuild) renderGrid(matrix);
  }

  function selectedDataObject() {
    try {
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      return ['chart','table'].includes(item?.type) ? item : null;
    } catch {
      return null;
    }
  }

  function numeric(value) {
    const cleaned = String(value ?? '').trim().replace(/\s/g,'').replace(',', '.');
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  }

  function typeSettings(item = null) {
    return {
      xAxisTitle:item?.xAxisTitle || '',
      yAxisTitle:item?.yAxisTitle || '',
      showLegend:item?.showLegend !== false,
      showGridlines:item?.showGridlines !== false,
      showDataLabels:item?.showDataLabels === true,
      paletteName:item?.paletteName || 'scientific',
      tableHeaderFill:item?.headerFill || '#dce8f8',
      tableRowFill:item?.rowFill || '#ffffff',
      tableAlternateFill:item?.alternateFill || '#f7f9fc',
      tableTextColor:item?.tableTextColor || '#334155',
      tableAlignment:item?.tableAlignment || 'left',
      tableFontSize:Number(item?.tableFontSize) || 12,
      tableTitle:item?.tableTitle !== false
    };
  }

  function valuesFromControls() {
    return {
      xAxisTitle:panel.querySelector('#dataXAxis').value.trim(),
      yAxisTitle:panel.querySelector('#dataYAxis').value.trim(),
      showLegend:panel.querySelector('#dataShowLegend').checked,
      showGridlines:panel.querySelector('#dataShowGridlines').checked,
      showDataLabels:panel.querySelector('#dataShowLabels').checked,
      paletteName:panel.querySelector('#dataPalette').value,
      palette:clone(palettes[panel.querySelector('#dataPalette').value] || palettes.scientific),
      headerFill:panel.querySelector('#dataHeaderFill').value,
      rowFill:panel.querySelector('#dataRowFill').value,
      alternateFill:panel.querySelector('#dataAlternateFill').value,
      tableTextColor:panel.querySelector('#dataTableTextColor').value,
      tableAlignment:panel.querySelector('#dataTableAlignment').value,
      tableFontSize:Math.max(8, Math.min(24, Number(panel.querySelector('#dataTableFontSize').value) || 12)),
      tableTitle:panel.querySelector('#dataTableTitle').checked
    };
  }

  function loadSettings(item = null) {
    const settings = typeSettings(item);
    panel.querySelector('#dataXAxis').value = settings.xAxisTitle;
    panel.querySelector('#dataYAxis').value = settings.yAxisTitle;
    panel.querySelector('#dataShowLegend').checked = settings.showLegend;
    panel.querySelector('#dataShowGridlines').checked = settings.showGridlines;
    panel.querySelector('#dataShowLabels').checked = settings.showDataLabels;
    panel.querySelector('#dataPalette').value = settings.paletteName;
    panel.querySelector('#dataHeaderFill').value = settings.tableHeaderFill;
    panel.querySelector('#dataRowFill').value = settings.tableRowFill;
    panel.querySelector('#dataAlternateFill').value = settings.tableAlternateFill;
    panel.querySelector('#dataTableTextColor').value = settings.tableTextColor;
    panel.querySelector('#dataTableAlignment').value = settings.tableAlignment;
    panel.querySelector('#dataTableFontSize').value = settings.tableFontSize;
    panel.querySelector('#dataTableTitle').checked = settings.tableTitle;
    syncSettingVisibility();
  }

  function renderGrid(matrix = matrixFromSource()) {
    if (!gridHost) return;
    const table = document.createElement('table');
    table.className = 'data-sheet-grid';
    const body = document.createElement('tbody');
    matrix.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      const marker = document.createElement(rowIndex === 0 ? 'th' : 'td');
      marker.className = 'data-sheet-marker';
      marker.textContent = rowIndex === 0 ? '#' : String(rowIndex);
      tr.appendChild(marker);
      row.forEach((value, columnIndex) => {
        const cell = document.createElement(rowIndex === 0 ? 'th' : 'td');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.dataset.row = String(rowIndex);
        input.dataset.column = String(columnIndex);
        input.setAttribute('aria-label', rowIndex === 0 ? `Column ${columnIndex + 1} name` : `Row ${rowIndex}, column ${columnIndex + 1}`);
        input.addEventListener('focus', () => {
          activeCell = { row:rowIndex, column:columnIndex };
          gridHost.querySelectorAll('.active-cell').forEach(node => node.classList.remove('active-cell'));
          cell.classList.add('active-cell');
        });
        input.addEventListener('input', () => {
          const next = matrixFromGrid();
          writeMatrix(next, false);
          updateGridStatus(next);
        });
        input.addEventListener('keydown', event => {
          if (event.key !== 'Tab') return;
          const inputs = [...gridHost.querySelectorAll('input')];
          const index = inputs.indexOf(input);
          if (!event.shiftKey && index === inputs.length - 1) {
            event.preventDefault();
            addRow();
            requestAnimationFrame(() => gridHost.querySelector('tr:last-child input')?.focus());
          }
        });
        cell.appendChild(input);
        tr.appendChild(cell);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    gridHost.replaceChildren(table);
    updateGridStatus(matrix);
  }

  function matrixFromGrid() {
    const rows = [...gridHost.querySelectorAll('tr')];
    return rows.map(row => [...row.querySelectorAll('input')].map(input => input.value));
  }

  function updateGridStatus(matrix = matrixFromSource()) {
    const status = panel?.querySelector('[data-sheet-status]');
    if (!status) return;
    const numericCells = matrix.slice(1).flat().filter(value => numeric(value) !== null).length;
    status.textContent = `${Math.max(0, matrix.length - 1)} rows · ${matrix[0]?.length || 0} columns · ${numericCells} numeric cells`;
  }

  function addRow() {
    const matrix = matrixFromSource();
    matrix.push(Array(matrix[0].length).fill(''));
    activeCell = { row:matrix.length - 1, column:0 };
    writeMatrix(matrix);
  }

  function addColumn() {
    const matrix = matrixFromSource();
    matrix.forEach((row, index) => row.push(index === 0 ? `Column ${row.length + 1}` : ''));
    activeCell = { row:0, column:matrix[0].length - 1 };
    writeMatrix(matrix);
  }

  function deleteRow() {
    const matrix = matrixFromSource();
    if (matrix.length <= 2) return alert('Keep at least one data row.');
    const index = activeCell.row > 0 && activeCell.row < matrix.length ? activeCell.row : matrix.length - 1;
    matrix.splice(index, 1);
    activeCell.row = Math.max(1, Math.min(index, matrix.length - 1));
    writeMatrix(matrix);
  }

  function deleteColumn() {
    const matrix = matrixFromSource();
    if ((matrix[0]?.length || 0) <= 2) return alert('Keep at least two columns.');
    const index = Math.max(0, Math.min(activeCell.column, matrix[0].length - 1));
    matrix.forEach(row => row.splice(index, 1));
    activeCell.column = Math.max(0, Math.min(index, matrix[0].length - 1));
    writeMatrix(matrix);
  }

  function transpose() {
    const matrix = matrixFromSource();
    const width = matrix.length;
    const height = matrix[0].length;
    const next = Array.from({ length:height }, (_, column) =>
      Array.from({ length:width }, (_, row) => matrix[row]?.[column] ?? '')
    );
    next[0] = next[0].map((cell, index) => String(cell).trim() || `Column ${index + 1}`);
    activeCell = { row:1, column:0 };
    writeMatrix(next);
  }

  function clearData() {
    if (!confirm('Clear the data grid?')) return;
    activeCell = { row:1, column:0 };
    writeMatrix([['Category','Series 1'],['','']]);
  }

  function downloadText(text, filename, type = 'text/csv') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function pasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return;
      source.value = text;
      source.dispatchEvent(new Event('input', { bubbles:true }));
      renderGrid();
    } catch {
      source.closest('details')?.setAttribute('open','');
      source.focus();
      alert('Clipboard access was blocked. Paste into the raw data box instead.');
    }
  }

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      source.value = String(reader.result || '');
      source.dispatchEvent(new Event('input', { bubbles:true }));
      renderGrid();
    };
    reader.readAsText(file);
  }

  function exportCurrent() {
    const item = selectedDataObject();
    const title = String(item?.chartTitle || item?.name || 'data').replace(/[\\/:*?"<>|]+/g,'-');
    downloadText(source.value || serialize(matrixFromSource()), `${title}.csv`);
  }

  function syncSettingVisibility() {
    const isTable = visual?.value === 'table';
    panel.querySelector('[data-chart-settings]').hidden = isTable;
    panel.querySelector('[data-table-settings]').hidden = !isTable;
  }

  function applySettingsAfterOriginal(mode) {
    const beforeCount = Array.isArray(state?.objects) ? state.objects.length : 0;
    const beforeId = state?.selectedId;
    setTimeout(() => {
      const item = selectedDataObject();
      if (!item) return;
      if (mode === 'insert' && state.objects.length <= beforeCount) return;
      if (mode === 'update' && item.id !== beforeId) return;
      Object.assign(item, valuesFromControls());
      if (item.type === 'chart' && !item.palette?.length) item.palette = clone(palettes.scientific);
      try { render?.(); } catch {}
      try { renderLayers?.(); } catch {}
      try { scheduleSave?.(); } catch {}
    }, 0);
  }

  function svg(tag, attrs = {}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([key,value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function textNode(parent, text, x, y, attrs = {}) {
    const node = svg('text', { x, y, fill:'#334155', 'font-family':'Inter,Segoe UI,sans-serif', 'font-size':12, ...attrs });
    node.textContent = String(text ?? '');
    parent.appendChild(node);
    return node;
  }

  function chartData(item) {
    const headers = item.dataHeaders || [];
    const rows = item.dataRows || [];
    const labels = rows.map((row,index) => row[0] || String(index + 1));
    const series = headers.slice(1).map((header,index) => ({
      name:header || `Series ${index + 1}`,
      values:rows.map(row => numeric(row[index + 1]))
    }));
    return { headers, rows, labels, series };
  }

  function extent(values, includeZero = true) {
    const clean = values.filter(value => value !== null && Number.isFinite(value));
    if (includeZero) clean.push(0);
    if (!clean.length) return [0,1];
    let min = Math.min(...clean), max = Math.max(...clean);
    if (min === max) { min -= 1; max += 1; }
    return [min,max];
  }

  function chartShell(item) {
    const group = svg('g', {
      class:'canvas-object data-object enhanced-data-object',
      'data-id':item.id,
      transform:`translate(${item.x} ${item.y}) rotate(${item.rotation || 0} ${item.width / 2} ${item.height / 2})`,
      opacity:item.opacity ?? 1
    });
    if (item.visible === false) group.style.display = 'none';
    const W = item.width, H = item.height;
    group.appendChild(svg('rect', { width:W, height:H, rx:12, fill:item.background || '#fff', stroke:item.stroke || '#94a3b8', 'stroke-width':2 }));
    textNode(group, item.chartTitle || item.name || 'Chart', W / 2, 29, {
      'text-anchor':'middle', 'font-size':Math.max(15, Math.min(24, W * .035)), 'font-weight':750, fill:item.textColor || '#1e293b'
    });
    group.addEventListener('pointerdown', event => beginDrag(event, item.id));
    group.addEventListener('click', event => { event.stopPropagation(); select(item.id); });
    group.addEventListener('dblclick', event => { event.stopPropagation(); window.openDataLab?.(item); });
    return group;
  }

  function addAxisTitles(group, item, plot) {
    if (item.xAxisTitle) textNode(group, item.xAxisTitle, plot.x + plot.w / 2, plot.y + plot.h + 39, { 'text-anchor':'middle', 'font-size':11, 'font-weight':650 });
    if (item.yAxisTitle) {
      const label = textNode(group, item.yAxisTitle, 16, plot.y + plot.h / 2, { 'text-anchor':'middle', 'font-size':11, 'font-weight':650 });
      label.setAttribute('transform', `rotate(-90 16 ${plot.y + plot.h / 2})`);
    }
  }

  function addLegend(group, item, names, palette, y) {
    if (item.showLegend === false) return;
    let x = 58;
    names.forEach((name,index) => {
      if (x > item.width - 95) return;
      group.appendChild(svg('rect', { x, y:y - 10, width:11, height:11, rx:2, fill:palette[index % palette.length] }));
      textNode(group, name, x + 15, y, { 'font-size':9 });
      x += Math.min(130, 28 + String(name).length * 6);
    });
  }

  function renderEnhancedChart(item) {
    const group = chartShell(item);
    const { labels, series } = chartData(item);
    const W = item.width, H = item.height;
    if (!labels.length || !series.length) {
      textNode(group, 'No data', W / 2, H / 2, { 'text-anchor':'middle', fill:'#94a3b8' });
      return group;
    }
    const palette = item.palette?.length ? item.palette : palettes.scientific;
    const plot = { x:62, y:52, w:Math.max(50, W - 88), h:Math.max(45, H - 108) };
    const type = item.chartType;
    const allValues = series.flatMap(entry => entry.values).filter(value => value !== null);
    const stackedPositive = labels.map((_,rowIndex) => series.reduce((sum,entry) => sum + Math.max(0, entry.values[rowIndex] || 0), 0));
    const stackedNegative = labels.map((_,rowIndex) => series.reduce((sum,entry) => sum + Math.min(0, entry.values[rowIndex] || 0), 0));
    const scaleValues = type === 'stacked' ? [...stackedPositive,...stackedNegative] : allValues;
    const [min,max] = extent(scaleValues);
    const y = value => plot.y + plot.h - (value - min) / (max - min) * plot.h;
    const zero = y(0);

    if (type === 'horizontal-bar') {
      const x = value => plot.x + (value - min) / (max - min) * plot.w;
      group.appendChild(svg('line', { x1:plot.x, y1:plot.y + plot.h, x2:plot.x + plot.w, y2:plot.y + plot.h, stroke:'#64748b', 'stroke-width':1.3 }));
      group.appendChild(svg('line', { x1:x(0), y1:plot.y, x2:x(0), y2:plot.y + plot.h, stroke:'#64748b', 'stroke-width':1.3 }));
      for (let tick = 0; tick <= 4; tick += 1) {
        const value = min + (max - min) * tick / 4;
        const xx = x(value);
        if (item.showGridlines !== false) group.appendChild(svg('line', { x1:xx, y1:plot.y, x2:xx, y2:plot.y + plot.h, stroke:'#e2e8f0', 'stroke-width':1 }));
        textNode(group, value.toFixed(Math.abs(max-min) < 10 ? 1 : 0), xx, plot.y + plot.h + 15, { 'text-anchor':'middle', 'font-size':9, fill:'#64748b' });
      }
      if (item.xAxisTitle) textNode(group, item.xAxisTitle, plot.x + plot.w / 2, plot.y + plot.h + 37, { 'text-anchor':'middle', 'font-size':11, 'font-weight':650 });
      if (item.yAxisTitle) {
        const label = textNode(group, item.yAxisTitle, 16, plot.y + plot.h / 2, { 'text-anchor':'middle', 'font-size':11, 'font-weight':650 });
        label.setAttribute('transform', `rotate(-90 16 ${plot.y + plot.h / 2})`);
      }
    } else if (type !== 'pie' && type !== 'donut') {
      group.appendChild(svg('line', { x1:plot.x, y1:plot.y + plot.h, x2:plot.x + plot.w, y2:plot.y + plot.h, stroke:'#64748b', 'stroke-width':1.3 }));
      group.appendChild(svg('line', { x1:plot.x, y1:plot.y, x2:plot.x, y2:plot.y + plot.h, stroke:'#64748b', 'stroke-width':1.3 }));
      if (item.showGridlines !== false) {
        for (let tick = 0; tick <= 4; tick += 1) {
          const value = min + (max - min) * tick / 4;
          const yy = y(value);
          group.appendChild(svg('line', { x1:plot.x, y1:yy, x2:plot.x + plot.w, y2:yy, stroke:'#e2e8f0', 'stroke-width':1 }));
          textNode(group, value.toFixed(Math.abs(max-min) < 10 ? 1 : 0), plot.x - 7, yy + 4, { 'text-anchor':'end', 'font-size':9, fill:'#64748b' });
        }
      }
      addAxisTitles(group, item, plot);
    }

    if (type === 'area') {
      series.forEach((entry, seriesIndex) => {
        const points = entry.values.map((value,index) => value === null ? null : [plot.x + (labels.length === 1 ? .5 : index / (labels.length - 1)) * plot.w, y(value)]).filter(Boolean);
        if (!points.length) return;
        const areaPath = `M ${points[0][0]} ${zero} L ${points.map(point => point.join(' ')).join(' L ')} L ${points.at(-1)[0]} ${zero} Z`;
        group.appendChild(svg('path', { d:areaPath, fill:palette[seriesIndex % palette.length], opacity:.2 }));
        group.appendChild(svg('path', { d:`M ${points.map(point => point.join(' ')).join(' L ')}`, fill:'none', stroke:palette[seriesIndex % palette.length], 'stroke-width':3, 'stroke-linejoin':'round' }));
        points.forEach((point,index) => {
          group.appendChild(svg('circle', { cx:point[0], cy:point[1], r:3.5, fill:palette[seriesIndex % palette.length], stroke:'#fff', 'stroke-width':1.3 }));
          if (item.showDataLabels && entry.values[index] !== null) textNode(group, entry.values[index], point[0], point[1] - 7, { 'text-anchor':'middle', 'font-size':8 });
        });
      });
      labels.forEach((label,index) => {
        if (labels.length <= 12) textNode(group, label, plot.x + (labels.length === 1 ? .5 : index / (labels.length - 1)) * plot.w, plot.y + plot.h + 17, { 'text-anchor':'middle', 'font-size':9 });
      });
      addLegend(group, item, series.map(entry => entry.name), palette, H - 10);
    }

    if (type === 'stacked') {
      const stackY = y;
      const groupW = plot.w / labels.length;
      labels.forEach((label,rowIndex) => {
        let positive = 0, negative = 0;
        series.forEach((entry,seriesIndex) => {
          const value = entry.values[rowIndex];
          if (value === null) return;
          const start = value >= 0 ? positive : negative;
          const end = start + value;
          if (value >= 0) positive = end; else negative = end;
          const y1 = stackY(start), y2 = stackY(end);
          group.appendChild(svg('rect', {
            x:plot.x + rowIndex * groupW + groupW * .18,
            y:Math.min(y1,y2),
            width:Math.max(2,groupW * .64),
            height:Math.max(1,Math.abs(y2-y1)),
            fill:palette[seriesIndex % palette.length]
          }));
          if (item.showDataLabels && Math.abs(y2-y1) > 14) textNode(group, value, plot.x + (rowIndex + .5) * groupW, (y1+y2)/2 + 3, { 'text-anchor':'middle', 'font-size':8, fill:'#fff', 'font-weight':700 });
        });
        if (labels.length <= 12) textNode(group, label, plot.x + (rowIndex + .5) * groupW, plot.y + plot.h + 17, { 'text-anchor':'middle', 'font-size':9 });
      });
      addLegend(group, item, series.map(entry => entry.name), palette, H - 10);
    }

    if (type === 'horizontal-bar') {
      const entries = [];
      labels.forEach((label,rowIndex) => series.forEach((entry,seriesIndex) => {
        const value = entry.values[rowIndex];
        if (value !== null) entries.push({ label:series.length > 1 ? `${label} · ${entry.name}` : label, value, seriesIndex });
      }));
      const [barMin,barMax] = extent(entries.map(entry => entry.value));
      const x = value => plot.x + (value - barMin) / (barMax - barMin) * plot.w;
      const origin = x(0);
      const rowH = plot.h / Math.max(1,entries.length);
      entries.forEach((entry,index) => {
        const xx = x(entry.value);
        const yy = plot.y + index * rowH + rowH * .17;
        group.appendChild(svg('rect', { x:Math.min(origin,xx), y:yy, width:Math.max(1,Math.abs(xx-origin)), height:Math.max(2,rowH*.66), rx:2, fill:palette[entry.seriesIndex % palette.length] }));
        if (entries.length <= 14) textNode(group, entry.label, plot.x - 7, yy + rowH*.43, { 'text-anchor':'end', 'font-size':8 });
        if (item.showDataLabels) textNode(group, entry.value, xx + (entry.value >= 0 ? 5 : -5), yy + rowH*.43, { 'text-anchor':entry.value >= 0 ? 'start' : 'end', 'font-size':8 });
      });
      addLegend(group, item, series.map(entry => entry.name), palette, H - 10);
    }

    if (type === 'pie' || type === 'donut') {
      const values = series[0].values.map(value => Math.max(0, value || 0));
      const total = values.reduce((sum,value) => sum + value, 0);
      if (!total) {
        textNode(group, 'No positive values', W / 2, H / 2, { 'text-anchor':'middle', fill:'#94a3b8' });
        return group;
      }
      const radius = Math.max(30, Math.min(W * .25, H * .32));
      const cx = item.showLegend === false ? W / 2 : W * .38;
      const cy = H * .54;
      let angle = -Math.PI / 2;
      values.forEach((value,index) => {
        if (!value) return;
        const next = angle + value / total * Math.PI * 2;
        const x1 = cx + Math.cos(angle) * radius, y1 = cy + Math.sin(angle) * radius;
        const x2 = cx + Math.cos(next) * radius, y2 = cy + Math.sin(next) * radius;
        const large = next - angle > Math.PI ? 1 : 0;
        const inner = type === 'donut' ? radius * .55 : 0;
        let d;
        if (inner) {
          const ix2 = cx + Math.cos(next) * inner, iy2 = cy + Math.sin(next) * inner;
          const ix1 = cx + Math.cos(angle) * inner, iy1 = cy + Math.sin(angle) * inner;
          d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1} Z`;
        } else {
          d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
        }
        group.appendChild(svg('path', { d, fill:palette[index % palette.length], stroke:'#fff', 'stroke-width':1.5 }));
        if (item.showDataLabels) {
          const mid = (angle + next) / 2;
          const labelRadius = inner ? (radius + inner) / 2 : radius * .62;
          textNode(group, `${Math.round(value / total * 100)}%`, cx + Math.cos(mid) * labelRadius, cy + Math.sin(mid) * labelRadius + 3, { 'text-anchor':'middle', 'font-size':9, fill:'#fff', 'font-weight':750 });
        }
        angle = next;
      });
      if (item.showLegend !== false) {
        let yy = Math.max(56, cy - Math.min(labels.length,8) * 9);
        labels.slice(0,10).forEach((label,index) => {
          group.appendChild(svg('rect', { x:W * .68, y:yy - 9, width:10, height:10, rx:2, fill:palette[index % palette.length] }));
          textNode(group, label, W * .68 + 15, yy, { 'font-size':9 });
          yy += 18;
        });
      }
    }
    return group;
  }

  function truncate(value, maxChars) {
    const text = String(value ?? '');
    if (text.length <= maxChars) return text;
    return `${text.slice(0, Math.max(1,maxChars - 1))}…`;
  }

  function renderEnhancedTable(item) {
    const group = svg('g', {
      class:'canvas-object data-object enhanced-table-object',
      'data-id':item.id,
      transform:`translate(${item.x} ${item.y}) rotate(${item.rotation || 0} ${item.width / 2} ${item.height / 2})`,
      opacity:item.opacity ?? 1
    });
    if (item.visible === false) group.style.display = 'none';
    const headers = item.dataHeaders || [], rows = item.dataRows || [];
    const titleHeight = item.tableTitle === false ? 0 : 34;
    const all = [headers,...rows];
    const columns = Math.max(1, headers.length);
    const cellW = item.width / columns;
    const cellH = Math.max(1, (item.height - titleHeight) / Math.max(1, all.length));
    const alignment = item.tableAlignment || 'left';
    const anchor = alignment === 'center' ? 'middle' : alignment === 'right' ? 'end' : 'start';
    const xOffset = alignment === 'center' ? cellW / 2 : alignment === 'right' ? cellW - 7 : 7;
    if (titleHeight) {
      group.appendChild(svg('rect', { width:item.width, height:titleHeight, rx:9, fill:item.background || '#fff', stroke:item.stroke || '#94a3b8', 'stroke-width':1.5 }));
      textNode(group, item.chartTitle || item.name || 'Table', item.width / 2, 22, { 'text-anchor':'middle', 'font-size':14, 'font-weight':750, fill:item.tableTextColor || '#334155' });
    }
    all.forEach((row,rowIndex) => {
      for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
        const y = titleHeight + rowIndex * cellH;
        const fill = rowIndex === 0
          ? (item.headerFill || '#dce8f8')
          : (rowIndex % 2 ? (item.rowFill || '#fff') : (item.alternateFill || '#f7f9fc'));
        group.appendChild(svg('rect', { x:columnIndex * cellW, y, width:cellW, height:cellH, fill, stroke:item.stroke || '#94a3b8', 'stroke-width':1 }));
        const fontSize = Math.max(8, Math.min(Number(item.tableFontSize) || 12, cellH * .46));
        const maxChars = Math.max(3, Math.floor((cellW - 12) / (fontSize * .56)));
        textNode(group, truncate(row?.[columnIndex] ?? '', maxChars), columnIndex * cellW + xOffset, y + Math.min(cellH - 5, Math.max(fontSize + 3, cellH * .62)), {
          'text-anchor':anchor,
          'font-size':fontSize,
          'font-weight':rowIndex === 0 ? 750 : 450,
          fill:item.tableTextColor || '#334155'
        });
      }
    });
    group.addEventListener('pointerdown', event => beginDrag(event, item.id));
    group.addEventListener('click', event => { event.stopPropagation(); select(item.id); });
    group.addEventListener('dblclick', event => { event.stopPropagation(); window.openDataLab?.(item); });
    return group;
  }

  function postProcessBaseChart(group, item) {
    if (!group?.querySelectorAll) return group;
    const W = Number(item.width) || 0, H = Number(item.height) || 0;
    const plot = { x:58, y:52, w:Math.max(40,W - 82), h:Math.max(40,H - 100) };
    if (item.showGridlines === false) {
      [...group.querySelectorAll('line')].forEach(line => {
        if (line.getAttribute('stroke') === '#e2e8f0') line.remove();
      });
    }
    const seriesCount = Math.max(0,(item.dataHeaders || []).length - 1);
    if ((item.dataRows || []).length && item.showLegend === false && !['heatmap','box'].includes(item.chartType)) {
      const children = [...group.children];
      children.slice(Math.max(0,children.length - seriesCount * 2)).forEach(node => node.remove());
    }
    addAxisTitles(group,item,plot);

    if (item.showDataLabels && ['bar','line','scatter'].includes(item.chartType)) {
      const { labels, series } = chartData(item);
      const all = series.flatMap(entry => entry.values).filter(value => value !== null);
      const [min,max] = extent(all);
      const y = value => plot.y + plot.h - (value - min) / (max - min) * plot.h;
      if (item.chartType === 'bar') {
        const groupW = plot.w / Math.max(1,labels.length);
        const barW = Math.max(3,groupW * .72 / Math.max(1,series.length));
        labels.forEach((_,rowIndex) => series.forEach((entry,seriesIndex) => {
          const value = entry.values[rowIndex];
          if (value === null) return;
          const x = plot.x + rowIndex * groupW + groupW * .14 + seriesIndex * barW + Math.max(1,barW - 2) / 2;
          textNode(group,value,x,y(value) - 5,{ 'text-anchor':'middle','font-size':8 });
        }));
      } else {
        series.forEach(entry => entry.values.forEach((value,rowIndex) => {
          if (value === null) return;
          const x = plot.x + (labels.length === 1 ? .5 : rowIndex/(labels.length-1)) * plot.w;
          textNode(group,value,x,y(value)-7,{ 'text-anchor':'middle','font-size':8 });
        }));
      }
    }
    return group;
  }

  function installRenderer() {
    if (typeof renderObject !== 'function') return false;
    const base = renderObject;
    if (base.__figureLoomDataWorkspacePlusWrapped) return true;
    const wrapped = function renderDataWorkspaceObject(item) {
      if (item.type === 'table') return renderEnhancedTable(item);
      if (item.type === 'chart' && ['area','stacked','horizontal-bar','pie','donut'].includes(item.chartType)) return renderEnhancedChart(item);
      const group = base(item);
      if (item.type === 'chart') return postProcessBaseChart(group,item);
      return group;
    };
    wrapped.__figureLoomDataWorkspacePlusWrapped = true;
    renderObject = wrapped;
    return true;
  }

  function installPanel() {
    drawer = document.getElementById('dataLabDrawer');
    source = drawer?.querySelector('#dataPaste');
    visual = drawer?.querySelector('#dataVisual');
    if (!drawer || !source || !visual) return false;
    if (document.getElementById(MODULE_ID)) return true;

    ['area','stacked','horizontal-bar','pie','donut'].forEach(value => {
      if (visual.querySelector(`option[value="${value}"]`)) return;
      const labels = { area:'Area chart', stacked:'Stacked bar', 'horizontal-bar':'Horizontal bar', pie:'Pie chart', donut:'Donut chart' };
      visual.appendChild(new Option(labels[value], value));
    });

    panel = document.createElement('section');
    panel.id = MODULE_ID;
    panel.innerHTML = `
      <div class="data-sheet-toolbar">
        <button type="button" data-data-action="import">Import CSV/TSV</button>
        <button type="button" data-data-action="paste">Paste</button>
        <button type="button" data-data-action="export">Export CSV</button>
        <input type="file" data-data-file accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" hidden>
      </div>
      <div class="data-sheet-wrap" data-data-grid></div>
      <div class="data-sheet-status" data-sheet-status></div>
      <div class="data-sheet-edit">
        <button type="button" data-data-action="add-row">+ Row</button>
        <button type="button" data-data-action="add-column">+ Column</button>
        <button type="button" data-data-action="delete-row">− Row</button>
        <button type="button" data-data-action="delete-column">− Column</button>
        <button type="button" data-data-action="transpose">Transpose</button>
        <button type="button" class="danger" data-data-action="clear">Clear</button>
      </div>
      <section class="data-plus-settings" data-chart-settings>
        <h3>Chart settings</h3>
        <div class="data-control-grid">
          <label>X-axis label<input id="dataXAxis" type="text" placeholder="Optional"></label>
          <label>Y-axis label<input id="dataYAxis" type="text" placeholder="Optional"></label>
          <label>Palette<select id="dataPalette">
            <option value="scientific">Scientific</option><option value="colorblind">Colorblind-safe</option>
            <option value="cool">Cool</option><option value="warm">Warm</option><option value="mono">Monochrome</option>
          </select></label>
          <div class="data-check-grid">
            <label><input id="dataShowLegend" type="checkbox" checked> Legend</label>
            <label><input id="dataShowGridlines" type="checkbox" checked> Gridlines</label>
            <label><input id="dataShowLabels" type="checkbox"> Data labels</label>
          </div>
        </div>
      </section>
      <section class="data-plus-settings" data-table-settings hidden>
        <h3>Table settings</h3>
        <div class="data-table-style-grid">
          <label>Header<input id="dataHeaderFill" type="color" value="#dce8f8"></label>
          <label>Rows<input id="dataRowFill" type="color" value="#ffffff"></label>
          <label>Alternate<input id="dataAlternateFill" type="color" value="#f7f9fc"></label>
          <label>Text<input id="dataTableTextColor" type="color" value="#334155"></label>
          <label>Alignment<select id="dataTableAlignment"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
          <label>Font size<input id="dataTableFontSize" type="number" min="8" max="24" value="12"></label>
        </div>
        <label class="data-inline-check"><input id="dataTableTitle" type="checkbox" checked> Show table title</label>
      </section>
      <details class="data-raw-source"><summary>Raw CSV / TSV</summary></details>
    `;

    const body = drawer.querySelector('.utility-body');
    const sourceLabel = source.closest('label');
    body.insertBefore(panel, sourceLabel);
    panel.querySelector('.data-raw-source').appendChild(sourceLabel);
    gridHost = panel.querySelector('[data-data-grid]');

    panel.querySelector('[data-data-action="import"]').addEventListener('click', () => panel.querySelector('[data-data-file]').click());
    panel.querySelector('[data-data-file]').addEventListener('change', event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) importFile(file);
    });
    panel.querySelector('[data-data-action="paste"]').addEventListener('click', pasteClipboard);
    panel.querySelector('[data-data-action="export"]').addEventListener('click', exportCurrent);
    panel.querySelector('[data-data-action="add-row"]').addEventListener('click', addRow);
    panel.querySelector('[data-data-action="add-column"]').addEventListener('click', addColumn);
    panel.querySelector('[data-data-action="delete-row"]').addEventListener('click', deleteRow);
    panel.querySelector('[data-data-action="delete-column"]').addEventListener('click', deleteColumn);
    panel.querySelector('[data-data-action="transpose"]').addEventListener('click', transpose);
    panel.querySelector('[data-data-action="clear"]').addEventListener('click', clearData);
    source.addEventListener('input', () => { if (!syncing) renderGrid(); });
    visual.addEventListener('change', syncSettingVisibility);

    drawer.querySelector('#insertDataVisual')?.addEventListener('click', () => applySettingsAfterOriginal('insert'));
    drawer.querySelector('#updateDataVisual')?.addEventListener('click', () => applySettingsAfterOriginal('update'));

    const observer = new MutationObserver(() => {
      if (!drawer.classList.contains('open')) return;
      requestAnimationFrame(() => {
        renderGrid();
        loadSettings(selectedDataObject());
      });
    });
    observer.observe(drawer, { attributes:true, attributeFilter:['class'] });

    renderGrid();
    loadSettings(selectedDataObject());
    return true;
  }

  function installStyles() {
    if (document.getElementById('figureloomDataWorkspacePlusStyles')) return;
    const style = document.createElement('style');
    style.id = 'figureloomDataWorkspacePlusStyles';
    style.textContent = `
      #figureloomDataWorkspacePlus{display:grid;gap:8px;margin-bottom:10px}.data-sheet-toolbar,.data-sheet-edit{display:flex;flex-wrap:wrap;gap:5px}.data-sheet-toolbar button,.data-sheet-edit button{min-height:32px;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;padding:5px 9px;color:#40516a;font-size:9px}.data-sheet-toolbar button:hover,.data-sheet-edit button:hover{border-color:#7899da;background:#edf4ff}.data-sheet-edit .danger{margin-left:auto;border-color:#efc6c6;color:#a52a2a;background:#fff7f7}
      .data-sheet-wrap{max-height:280px;overflow:auto;border:1px solid #cbd5e1;border-radius:9px;background:#fff}.data-sheet-grid{border-collapse:separate;border-spacing:0;width:max-content;min-width:100%;font-size:10px}.data-sheet-grid th,.data-sheet-grid td{min-width:104px;padding:0;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;background:#fff}.data-sheet-grid th{background:#f4f7fb}.data-sheet-grid .data-sheet-marker{position:sticky;left:0;z-index:2;min-width:34px;width:34px;padding:6px;text-align:center;color:#8290a4;font-weight:700;background:#f1f5f9}.data-sheet-grid tr:first-child th{position:sticky;top:0;z-index:1}.data-sheet-grid tr:first-child .data-sheet-marker{z-index:3}.data-sheet-grid input{width:100%;min-width:100px;border:0!important;border-radius:0!important;background:transparent!important;padding:7px!important;color:#334155;font:10px ui-monospace,SFMono-Regular,Menlo,monospace}.data-sheet-grid input:focus{outline:2px solid #6f97e7;outline-offset:-2px}.data-sheet-grid .active-cell{box-shadow:inset 0 0 0 2px #6f97e7}
      .data-sheet-status{color:#748095;font-size:9px}.data-plus-settings{padding-top:7px;border-top:1px solid #e4e9f0}.data-plus-settings h3{margin:0 0 7px;color:#4d5e76;font-size:10px;text-transform:uppercase;letter-spacing:.05em}.data-check-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:center;gap:5px}.data-check-grid label,.data-inline-check{display:flex!important;align-items:center;gap:5px!important}.data-table-style-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.data-table-style-grid label{display:grid;gap:4px;color:#617087;font-size:9px}.data-table-style-grid input,.data-table-style-grid select{width:100%;min-height:33px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:5px}.data-table-style-grid input[type=color]{padding:2px}.data-raw-source{border-top:1px solid #e4e9f0;padding-top:6px}.data-raw-source summary{cursor:pointer;color:#64748b;font-size:9px;font-weight:700}.data-raw-source .data-full{margin-top:7px}
      html[data-figureloom-theme="dark"] .data-sheet-wrap,html[data-figureloom-theme="dark"] .data-sheet-grid th,html[data-figureloom-theme="dark"] .data-sheet-grid td{border-color:#4a525d;background:#343a43}html[data-figureloom-theme="dark"] .data-sheet-grid th,html[data-figureloom-theme="dark"] .data-sheet-grid .data-sheet-marker{background:#30353d;color:#b8c0cc}html[data-figureloom-theme="dark"] .data-sheet-grid input{color:#eef1f4!important}html[data-figureloom-theme="dark"] .data-plus-settings,html[data-figureloom-theme="dark"] .data-raw-source{border-color:#454d58}
      @media(max-width:520px){.data-table-style-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.data-check-grid{grid-template-columns:1fr}.data-sheet-edit .danger{margin-left:0}}
    `;
    document.head.appendChild(style);
  }

  function install() {
    if (typeof state === 'undefined' || typeof renderObject !== 'function') {
      setTimeout(install,80);
      return;
    }
    if (!installPanel() || !installRenderer()) {
      setTimeout(install,80);
      return;
    }
    installStyles();
    try { render?.(); } catch {}
    window.FigureLoomDataWorkspace = { renderGrid, addRow, addColumn, deleteRow, deleteColumn, transpose, exportCurrent };
  }

  install();
})();