(() => {
  const drawer = document.getElementById('figureAssistantDrawer');
  const promptInput = document.getElementById('figurePrompt');
  const generateButton = document.getElementById('generateEditableFigure');
  if (!drawer || !promptInput || !generateButton) return;

  const universalControls = drawer.querySelector('.assistant-universal-controls');
  const panel = document.createElement('section');
  panel.className = 'local-model-panel';
  panel.innerHTML = `
    <div class="local-model-heading"><span>◌</span><div><strong>Optional local prompt interpreter</strong><small id="localModelAvailability">Checking this browser…</small></div></div>
    <label class="local-model-toggle"><input id="useLocalPromptModel" type="checkbox"> Use an on-device browser model before building</label>
    <button id="interpretPromptLocally" type="button">Interpret and structure this prompt</button>
    <p id="localModelStatus">No prompt or project data is sent to SciCanvas. When available, the browser’s own local language-model API performs this step.</p>
  `;
  (universalControls || generateButton.parentElement).insertAdjacentElement(universalControls ? 'afterend' : 'beforebegin', panel);

  const availability = panel.querySelector('#localModelAvailability');
  const enabled = panel.querySelector('#useLocalPromptModel');
  const interpretButton = panel.querySelector('#interpretPromptLocally');
  const status = panel.querySelector('#localModelStatus');
  let model = null;
  let apiKind = '';

  async function detect() {
    try {
      if (window.LanguageModel) {
        apiKind = 'LanguageModel';
        const result = typeof window.LanguageModel.availability === 'function' ? await window.LanguageModel.availability() : 'available';
        const available = !['unavailable','no'].includes(String(result));
        availability.textContent = available ? `Browser local model: ${result}` : 'No local browser model is available.';
        enabled.disabled = !available;
        interpretButton.disabled = !available;
        return available;
      }
      if (window.ai?.languageModel) {
        apiKind = 'legacy';
        const result = await window.ai.languageModel.capabilities?.();
        const available = result?.available !== 'no';
        availability.textContent = available ? `Browser local model: ${result?.available || 'available'}` : 'No local browser model is available.';
        enabled.disabled = !available;
        interpretButton.disabled = !available;
        return available;
      }
    } catch (error) {
      console.warn('Local model detection failed', error);
    }
    availability.textContent = 'No supported local browser model detected.';
    enabled.disabled = true;
    interpretButton.disabled = true;
    return false;
  }

  async function getModel() {
    if (model) return model;
    if (apiKind === 'LanguageModel') {
      model = await window.LanguageModel.create({
        systemPrompt:'You convert scientific figure requests into concise, accurate layout instructions. Never invent findings, measurements, citations, or biological relationships.'
      });
      return model;
    }
    if (apiKind === 'legacy') {
      model = await window.ai.languageModel.create({
        systemPrompt:'You convert scientific figure requests into concise, accurate layout instructions. Never invent findings, measurements, citations, or biological relationships.'
      });
      return model;
    }
    throw new Error('No supported local model API is available.');
  }

  function parseResponse(text) {
    const cleaned = String(text || '').replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start,end+1)); } catch {}
    }
    return { prompt:cleaned, layout:'auto' };
  }

  async function runPrompt(session, request) {
    if (typeof session.prompt === 'function') return session.prompt(request);
    if (typeof session.promptStreaming !== 'function') throw new Error('This browser model does not expose a supported prompt method.');
    const stream = await session.promptStreaming(request);
    let response = '';
    for await (const chunk of stream) response += typeof chunk === 'string' ? chunk : (chunk?.text || String(chunk || ''));
    return response;
  }

  async function interpret() {
    const source = promptInput.value.trim();
    if (!source) {
      status.textContent = 'Describe the figure first.';
      status.dataset.kind = 'error';
      return;
    }
    try {
      interpretButton.disabled = true;
      interpretButton.textContent = 'Interpreting on this device…';
      status.textContent = 'The browser-local model is identifying entities, stages, direction, and likely layout.';
      status.dataset.kind = '';
      const session = await getModel();
      const request = `Rewrite the following request for an editable scientific figure. Return only JSON with keys "prompt" and "layout". "layout" must be one of "auto", "workflow", "comparison", or "cycle". Keep all user-supplied scientific meaning, make stages explicit with arrows when appropriate, remove filler, and do not add unsupported facts.\n\nREQUEST:\n${source}`;
      const parsed = parseResponse(await runPrompt(session, request));
      const nextPrompt = String(parsed.prompt || '').trim();
      if (!nextPrompt) throw new Error('The local model returned an empty interpretation.');
      promptInput.value = nextPrompt;
      const layout = drawer.querySelector('#assistantLayout');
      if (layout && ['auto','workflow','comparison','cycle'].includes(parsed.layout)) layout.value = parsed.layout;
      status.textContent = `Prompt structured locally${parsed.layout ? ` · suggested ${parsed.layout} layout` : ''}. Review it, then build the editable figure.`;
      status.dataset.kind = 'success';
    } catch (error) {
      console.error(error);
      status.textContent = `Local interpretation was unavailable: ${error.message}. The ordinary deterministic Figure Assistant still works.`;
      status.dataset.kind = 'error';
    } finally {
      interpretButton.disabled = enabled.disabled;
      interpretButton.textContent = 'Interpret and structure this prompt';
    }
  }

  interpretButton.addEventListener('click', interpret);
  enabled.addEventListener('change', () => {
    localStorage.setItem('scicanvas-local-prompt-model-v1', enabled.checked ? '1' : '0');
    if (enabled.checked) interpret();
  });
  enabled.checked = localStorage.getItem('scicanvas-local-prompt-model-v1') === '1';

  const style = document.createElement('style');
  style.textContent = `
    .local-model-panel{display:grid;gap:8px;margin:10px 0;padding:10px;border:1px solid #cbdbe0;border-radius:10px;background:linear-gradient(135deg,#eef8f5,#f5f2fa)}.local-model-heading{display:flex;align-items:center;gap:9px}.local-model-heading>span{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:linear-gradient(145deg,#4f8992,#786da0);color:white;font-size:18px}.local-model-heading strong,.local-model-heading small{display:block}.local-model-heading strong{font-size:10px}.local-model-heading small{margin-top:2px;color:#718094;font-size:8px}.local-model-toggle{display:flex!important;align-items:flex-start;gap:7px!important;margin:0!important;font-size:9px!important}.local-model-toggle input{flex:0 0 auto}.local-model-panel button{min-height:36px;border:1px solid #8ca6cf;border-radius:8px;background:white;color:#315c99;font-weight:700}.local-model-panel p{margin:0;color:#6d7c90;font-size:8px;line-height:1.45}.local-model-panel p[data-kind="error"]{color:#b42318}.local-model-panel p[data-kind="success"]{color:#28745f}`;
  document.head.appendChild(style);

  detect().then(available => {
    if (enabled.checked && !available) enabled.checked = false;
  });
})();