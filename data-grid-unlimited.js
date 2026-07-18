(() => {
  if (window.__figureLoomUnlimitedDataGridV1) return;
  window.__figureLoomUnlimitedDataGridV1 = true;

  function install() {
    const panel = document.getElementById('figureloomDataWorkspacePlus');
    const grid = panel?.querySelector('[data-data-grid]');
    const source = document.getElementById('dataPaste');
    const visual = document.getElementById('dataVisual');
    const api = window.FigureLoomDataWorkspace;
    if (!panel || !grid || !source || !visual || typeof api?.renderGrid !== 'function') {
      setTimeout(install, 80);
      return;
    }
    if (panel.dataset.unlimitedGrid === '1') return;
    panel.dataset.unlimitedGrid = '1';

    function csvCell(value) {
      const text = String(value ?? '');
      return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    }

    function serialize(matrix) {
      return matrix.map(row => row.map(csvCell).join(',')).join('\n');
    }

    function currentMatrix() {
      const rows = [...grid.querySelectorAll('tr')]
        .map(row => [...row.querySelectorAll('input')].map(input => input.value));
      if (rows.length) return rows;
      return [['Column 1', 'Column 2'], ['', '']];
    }

    function normalize(matrix) {
      const width = Math.max(2, ...matrix.map(row => row.length));
      matrix.forEach(row => { while (row.length < width) row.push(''); });
      if (!matrix.length) matrix.push(['Column 1', 'Column 2']);
      if (matrix.length < 2) matrix.push(Array(width).fill(''));
      matrix[0] = matrix[0].map((value, index) => String(value).trim() || `Column ${index + 1}`);
      return matrix;
    }

    function selectedPosition(matrix) {
      const selected = grid.querySelector('.active-cell input') || (document.activeElement?.matches?.('.data-sheet-grid input') ? document.activeElement : null);
      return {
        row: Math.max(0, Math.min(Number(selected?.dataset.row) || 0, matrix.length - 1)),
        column: Math.max(0, Math.min(Number(selected?.dataset.column) || 0, matrix[0].length - 1))
      };
    }

    function updateSummary(matrix) {
      const summary = document.getElementById('dataPreviewSummary');
      if (!summary) return;
      const label = visual.options[visual.selectedIndex]?.textContent || 'Visual';
      summary.textContent = `${Math.max(0, matrix.length - 1)} data rows · ${matrix[0]?.length || 0} columns · ${label}`;
    }

    function reveal(row, column, focus = false) {
      requestAnimationFrame(() => {
        const input = grid.querySelector(`input[data-row="${row}"][data-column="${column}"]`);
        input?.scrollIntoView({ block:'nearest', inline:'nearest' });
        if (focus) input?.focus({ preventScroll:true });
      });
    }

    function commit(matrix, target = null, focus = false) {
      normalize(matrix);
      source.value = serialize(matrix);
      api.renderGrid(matrix);
      updateSummary(matrix);
      if (target) reveal(target.row, target.column, focus);
    }

    function addRow(focus = false) {
      const matrix = normalize(currentMatrix());
      matrix.push(Array(matrix[0].length).fill(''));
      const target = { row:matrix.length - 1, column:0 };
      commit(matrix, target, focus);
    }

    function addColumn() {
      const matrix = normalize(currentMatrix());
      matrix.forEach((row, index) => row.push(index === 0 ? `Column ${row.length + 1}` : ''));
      commit(matrix, { row:0, column:matrix[0].length - 1 });
    }

    function deleteRow() {
      const matrix = normalize(currentMatrix());
      if (matrix.length <= 2) return alert('Keep at least one data row.');
      const selected = selectedPosition(matrix);
      const index = selected.row > 0 ? selected.row : matrix.length - 1;
      matrix.splice(index, 1);
      commit(matrix, { row:Math.max(1, Math.min(index, matrix.length - 1)), column:selected.column });
    }

    function deleteColumn() {
      const matrix = normalize(currentMatrix());
      if (matrix[0].length <= 2) return alert('Keep at least two columns.');
      const selected = selectedPosition(matrix);
      matrix.forEach(row => row.splice(selected.column, 1));
      commit(matrix, { row:selected.row, column:Math.max(0, Math.min(selected.column, matrix[0].length - 1)) });
    }

    function transpose() {
      const matrix = normalize(currentMatrix());
      const next = Array.from({ length:matrix[0].length }, (_, column) =>
        Array.from({ length:matrix.length }, (_, row) => matrix[row]?.[column] ?? '')
      );
      commit(next, { row:1, column:0 });
    }

    function clearGrid() {
      if (!confirm('Clear the data grid?')) return;
      commit([['Category', 'Series 1'], ['', '']], { row:1, column:0 });
    }

    const handlers = {
      'add-row': () => addRow(false),
      'add-column': addColumn,
      'delete-row': deleteRow,
      'delete-column': deleteColumn,
      transpose,
      clear: clearGrid
    };

    Object.entries(handlers).forEach(([action, handler]) => {
      const original = panel.querySelector(`[data-data-action="${action}"]`);
      if (!original) return;
      const replacement = original.cloneNode(true);
      original.replaceWith(replacement);
      replacement.addEventListener('click', handler);
    });

    grid.addEventListener('keydown', event => {
      if (event.key !== 'Tab' || event.shiftKey || !event.target.matches('input')) return;
      const inputs = [...grid.querySelectorAll('input')];
      if (event.target !== inputs.at(-1)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      addRow(true);
    }, true);
  }

  install();
})();
