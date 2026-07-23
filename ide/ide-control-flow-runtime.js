(() => {
  'use strict';

  if (window.FigureLoomBioFlowLoading) return;

  const parts = [0, 1, 2, 3, 4].map(
    (number) => `./ide-control-flow-runtime.part${String(number).padStart(2, '0')}?v=2`,
  );

  async function fetchPart(url) {
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url, { cache:'no-store' });
        if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
        return await response.text();
      } catch (error) {
        lastError = error;
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
      }
    }
    throw lastError || new Error(`Could not load ${url}`);
  }

  window.FigureLoomBioFlowLoading = Promise.all(parts.map(fetchPart))
    .then((sources) => {
      const existing = document.getElementById('figureloomBioControlFlowCombined');
      if (existing) existing.remove();
      const script = document.createElement('script');
      script.id = 'figureloomBioControlFlowCombined';
      script.textContent = sources.join('');
      document.head.append(script);
      if (!window.FigureLoomBioFlow) {
        throw new Error('The FigureLoom Bio decision runtime loaded without starting.');
      }
      window.dispatchEvent(new CustomEvent('figureloom-bio-flow-ready'));
      return window.FigureLoomBioFlow;
    })
    .catch((error) => {
      console.error('Could not load FigureLoom Bio decisions', error);
      const status = document.getElementById('runStatus');
      if (status) {
        status.textContent = 'Decision tools did not load';
        status.className = 'status-pill error';
      }
      throw error;
    });
})();
