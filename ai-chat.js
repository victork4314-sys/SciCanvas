(() => {
  if (window.__figureLoomUnifiedAiChatV2) return;
  window.__figureLoomUnifiedAiChatV2 = true;

  const drawer = document.getElementById('figureAssistantDrawer');
  const body = drawer?.querySelector('.utility-body');
  const legacyPrompt = document.getElementById('figurePrompt');
  const legacyBuild = document.getElementById('generateEditableFigure');
  const builderControls = drawer?.querySelector('.assistant-universal-controls');
  const replaceOption = drawer?.querySelector('#replaceCurrentFigure');
  const builderStatus = drawer?.querySelector('#assistantBuildStatus');
  if (!drawer || !body || !legacyPrompt || !legacyBuild || !builderControls || !builderStatus) return;

  const KEY_STORAGE = 'figureloom-personal-gemini-key-session';
  const GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];
  const ALLOWED_KINDS = new Set(['text', 'shape', 'ellipse', 'arrow', 'inhibition', 'illustration']);
  const FIGURELOOM_PALETTE = new Map([
    '#ffffff', '#f8fafc', '#eef4ff', '#f4efff', '#ecfbf4',
    '#172033', '#26324a', '#4f6fd8', '#7c5fd3', '#e56b7f',
    '#eaa94b', '#3aa47a', '#42a5c6', '#8b95a7', '#f1b7c4',
    '#a8d8c7', '#8ea0ff', '#536fc2', '#2563eb', '#6d7df2'
  ].map(color => [color, color]));

  const BLUEPRINT_SCHEMA = {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['build', 'rewrite', 'feedback'] },
      title: { type: 'string' },
      summary: { type: 'string' },
      layout: { type: 'string', enum: ['auto', 'workflow', 'comparison', 'cycle'] },
      stages: { type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 8 },
      improvedPrompt: { type: 'string' },
      replacementText: { type: 'string' },
      suggestions: { type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 6 },
      blueprint: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          elements: {
            type: 'array',
            minItems: 0,
            maxItems: 28,
            items: {
              type: 'object',
              properties: {
                kind: { type: 'string', enum: ['text', 'shape', 'ellipse', 'arrow', 'inhibition', 'illustration'] },
                name: { type: 'string' },
                text: { type: 'string' },
                assetId: { type: 'string' },
                assetQuery: { type: 'string' },
                x: { type: 'number' },
                y: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' },
                rotation: { type: 'number' },
                fill: { type: 'string' },
                stroke: { type: 'string' },
                opacity: { type: 'number' },
                fontSize: { type: 'number' },
                fontWeight: { type: 'number' }
              },
              required: [
                'kind', 'name', 'text', 'assetId', 'assetQuery',
                'x', 'y', 'width', 'height', 'rotation',
                'fill', 'stroke', 'opacity', 'fontSize', 'fontWeight'
              ]
            }
          }
        },
        required: ['description', 'elements']
      }
    },
    required: [
      'kind', 'title', 'summary', 'layout', 'stages',
      'improvedPrompt', 'replacementText', 'suggestions', 'blueprint'
    ]
  };

  let activeSource = 'gemini';
  let authSubscription = null;
  let buildInProgress = false;
  const conversation = [];

  const existingChildren = [...body.children];
  const legacyHost = document.createElement('div');
  legacyHost.className = 'figureloom-chat-legacy';
  legacyHost.hidden = true;
  existingChildren.forEach(element => legacyHost.appendChild(element));

  const shell = document.createElement('section');
  shell.className = 'figureloom-chat-shell';
  shell.innerHTML = `
    <div class="figureloom-chat-topbar">
      <div class="figureloom-chat-sources" role="tablist" aria-label="Assistant source">
        <button class="figureloom-chat-source active" data-source="gemini" type="button" role="tab" aria-selected="true">✦ Gemini</button>
        <button class="figureloom-chat-source" data-source="builder" type="button" role="tab" aria-selected="false">◇ Builder</button>
      </div>
      <span id="figureloomChatAccess" class="figureloom-chat-access">Checking access…</span>
    </div>

    <div id="figureloomChatMessages" class="figureloom-chat-messages" aria-live="polite"></div>

    <div class="figureloom-chat-composer">
      <label id="figureloomChatActionLabel" class="figureloom-chat-action">Gemini action
        <select id="figureloomChatAction">
          <option value="build">Design and create a figure</option>
          <option value="feedback">Review this project</option>
          <option value="rewrite">Rewrite selected text</option>
        </select>
      </label>

      <textarea id="figureloomChatInput" rows="3" maxlength="4000" placeholder="Describe the figure you want Gemini to design"></textarea>

      <details id="figureloomBuilderSettings" class="figureloom-chat-details">
        <summary>Builder fallback settings</summary>
        <div id="figureloomBuilderControlsSlot"></div>
      </details>

      <details class="figureloom-chat-details">
        <summary>Personal Gemini API key</summary>
        <label class="figureloom-chat-key-label">API key
          <span class="figureloom-chat-key-field"><input id="figureloomChatKey" type="password" autocomplete="off" spellcheck="false" placeholder="Paste a Gemini API key"><button id="figureloomChatKeyToggle" type="button">Show</button></span>
        </label>
        <label class="figureloom-chat-remember"><input id="figureloomChatRemember" type="checkbox"> Remember until this browser session ends</label>
        <button id="figureloomChatKeyHelp" class="figureloom-chat-help-button" type="button">How to get a free Gemini API key</button>
        <div id="figureloomChatKeyHelpBox" class="figureloom-chat-help" hidden>
          <strong>Get a key from Google AI Studio</strong>
          <ol><li>Open Google AI Studio and sign in.</li><li>Choose <b>Create API key</b>.</li><li>Copy the new key and paste it above.</li></ol>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Open Google AI Studio</a>
          <p>Google offers free-tier access with usage limits. Keep the key private.</p>
        </div>
      </details>

      <div class="figureloom-chat-sendrow">
        <button id="figureloomChatSignIn" type="button">Sign in for shared Gemini</button>
        <button id="figureloomChatSend" class="primary" type="button">Send to Gemini</button>
      </div>
      <p class="figureloom-chat-safety">Gemini designs the actual editable layout. Generated figures always open on a new page, and neither assistant can delete or replace existing work.</p>
    </div>
  `;

  body.replaceChildren(shell, legacyHost);
  shell.querySelector('#figureloomBuilderControlsSlot').appendChild(builderControls);
  builderControls.hidden = false;
  if (replaceOption) replaceOption.checked = true;

  const title = drawer.querySelector('.utility-head strong');
  const subtitle = drawer.querySelector('.utility-head span');
  if (title) title.textContent = 'FigureLoom AI';
  if (subtitle) subtitle.textContent = 'Gemini-designed figures with Builder fallback';

  const messages = shell.querySelector('#figureloomChatMessages');
  const input = shell.querySelector('#figureloomChatInput');
  const actionLabel = shell.querySelector('#figureloomChatActionLabel');
  const action = shell.querySelector('#figureloomChatAction');
  const settings = shell.querySelector('#figureloomBuilderSettings');
  const send = shell.querySelector('#figureloomChatSend');
  const signIn = shell.querySelector('#figureloomChatSignIn');
  const access = shell.querySelector('#figureloomChatAccess');
  const keyInput = shell.querySelector('#figureloomChatKey');
  const rememberKey = shell.querySelector('#figureloomChatRemember');

  try {
    keyInput.value = sessionStorage.getItem(KEY_STORAGE) || '';
    rememberKey.checked = Boolean(keyInput.value);
  } catch {}

  function scrollMessages() {
    requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
  }

  function messageBubble(role, source, text, options = {}) {
    const article = document.createElement('article');
    article.className = `figureloom-chat-message ${role}`;
    const meta = document.createElement('small');
    meta.textContent = source;
    const bubble = document.createElement('div');
    bubble.className = 'figureloom-chat-bubble';
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    bubble.appendChild(paragraph);
    article.append(meta, bubble);
    if (options.pending) article.classList.add('pending');
    messages.appendChild(article);
    scrollMessages();
    return { article, bubble, paragraph };
  }

  function record(role, source, text) {
    conversation.push({ role, source, text: String(text || '').slice(0, 1200) });
    if (conversation.length > 16) conversation.splice(0, conversation.length - 16);
  }

  function addUserMessage(text, source) {
    const label = source === 'gemini' ? 'You · to Gemini' : 'You · to Builder';
    const result = messageBubble('user', label, text);
    record('user', label, text);
    return result;
  }

  function addAssistantMessage(source, text, options = {}) {
    const result = messageBubble('assistant', source, text, options);
    if (!options.pending) record('assistant', source, text);
    return result;
  }

  function setBubble(result, text, kind = '') {
    result.paragraph.textContent = text;
    result.article.classList.remove('pending', 'error', 'success');
    if (kind) result.article.classList.add(kind);
    scrollMessages();
  }

  function selectedItems() {
    const many = window.SciCanvasSelection?.objects?.() || [];
    if (many.length) return many;
    const single = typeof selectedObject === 'function' ? selectedObject() : null;
    return single ? [single] : [];
  }

  function conversationPrompt(latest) {
    const prior = conversation.slice(-8).map(entry => `${entry.source}: ${entry.text}`).join('\n');
    return prior ? `Conversation so far:\n${prior}\n\nNewest request:\n${latest}`.slice(-4000) : latest;
  }

  function figureContext() {
    try {
      return window.FigureLoomAIContext?.build?.() || {};
    } catch {
      return {};
    }
  }

  async function clientAndUser() {
    if (!window.SciCanvasCloud?.configured?.()) return { client:null, user:null };
    const client = await window.SciCanvasCloud.getClient();
    const { data } = await client.auth.getUser();
    return { client, user:data?.user || null };
  }

  async function refreshAccess() {
    const personal = Boolean(keyInput.value.trim());
    try {
      const { client, user } = await clientAndUser();
      access.textContent = personal ? 'Personal key ready' : user ? 'Shared Gemini ready' : 'Sign in or add a key';
      access.classList.toggle('ready', personal || Boolean(user));
      signIn.hidden = Boolean(user) || personal || activeSource === 'builder';
      send.disabled = activeSource === 'gemini' && !(personal || (client && user));
      if (client && !authSubscription) {
        const subscription = client.auth.onAuthStateChange(() => void refreshAccess());
        authSubscription = subscription.data.subscription;
      }
      return { client, user, personal };
    } catch {
      access.textContent = personal ? 'Personal key ready' : 'Gemini access unavailable';
      access.classList.toggle('ready', personal);
      send.disabled = activeSource === 'gemini' && !personal;
      signIn.hidden = personal || activeSource === 'builder';
      return { client:null, user:null, personal };
    }
  }

  function safeText(value, max = 1000) {
    return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
  }

  function clamp(value, min, max, fallback = min) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function safeColor(value, fallback) {
    const normalized = String(value || '').trim().toLowerCase();
    return FIGURELOOM_PALETTE.get(normalized) || fallback;
  }

  function validateElement(value, index) {
    const kind = ALLOWED_KINDS.has(value?.kind) ? value.kind : 'shape';
    const text = safeText(value?.text, kind === 'text' ? 90 : 60);
    return {
      kind,
      name: safeText(value?.name, 80) || text || `Gemini element ${index + 1}`,
      text,
      assetId: safeText(value?.assetId, 100),
      assetQuery: safeText(value?.assetQuery, 120),
      x: clamp(value?.x, 0, 980, 100),
      y: clamp(value?.y, 0, 980, 100),
      width: clamp(value?.width, 20, 1000, kind === 'text' ? 240 : 180),
      height: clamp(value?.height, 12, 1000, kind === 'text' ? 60 : 140),
      rotation: clamp(value?.rotation, -360, 360, 0),
      fill: safeColor(value?.fill, kind === 'text' ? '#172033' : kind === 'arrow' || kind === 'inhibition' ? '#536fc2' : '#eef4ff'),
      stroke: safeColor(value?.stroke, '#26324a'),
      opacity: clamp(value?.opacity, 0.15, 1, 1),
      fontSize: clamp(value?.fontSize, 10, 84, kind === 'text' ? 26 : 20),
      fontWeight: clamp(value?.fontWeight, 300, 900, kind === 'text' ? 650 : 600)
    };
  }

  function validatePlan(value, requestedAction) {
    if (!value || typeof value !== 'object') throw new Error('Gemini returned an unreadable proposal.');
    const rawElements = Array.isArray(value.blueprint?.elements) ? value.blueprint.elements : [];
    const elements = rawElements.slice(0, 28).map(validateElement);
    if (requestedAction === 'build' && elements.length < 3) {
      throw new Error('Gemini did not return a detailed editable layout. Ask it to try again with a complete figure.');
    }
    return {
      kind:requestedAction,
      title:safeText(value.title, 120) || 'Gemini figure',
      summary:safeText(value.summary, 700),
      layout:['auto','workflow','comparison','cycle'].includes(value.layout) ? value.layout : 'auto',
      stages:Array.isArray(value.stages) ? value.stages.map(item => safeText(item, 100)).filter(Boolean).slice(0,8) : [],
      improvedPrompt:safeText(value.improvedPrompt, 1800),
      replacementText:safeText(value.replacementText, 500).replace(/[\r\n]+/g,' '),
      suggestions:Array.isArray(value.suggestions) ? value.suggestions.map(item => safeText(item, 240)).filter(Boolean).slice(0,6) : [],
      blueprint:{
        description:safeText(value.blueprint?.description, 500),
        elements
      }
    };
  }

  async function readableError(error) {
    let text = error?.message || 'The AI request failed.';
    try {
      const context = error?.context;
      const details = context?.clone ? await context.clone().json() : context?.json ? await context.json() : null;
      if (details?.error) text = details.error;
    } catch {}
    return text;
  }

  async function callGeminiDirect(apiKey, mode, prompt) {
    const systemInstruction = `You are FigureLoom AI. In build mode, you are the actual scientific-figure designer, not merely a planning assistant.
Return only JSON matching the supplied schema. Never return HTML, JavaScript, SVG, markdown fences, or executable instructions.
For build mode, create a complete editable blueprint with 10-24 well-composed elements. Use normalized coordinates from 0 to 1000 for x, y, width and height.
You may use text, shape, ellipse, arrow, inhibition and illustration elements. Use illustration.assetId for an exact built-in asset when available, otherwise use a precise assetQuery for FigureLoom's complete searchable library.
Make the result visually polished: strong title hierarchy, concise labels, balanced whitespace, meaningful scale differences, varied composition, restrained use of panels and clear scientific flow.
Do not create a repetitive row of identical cards unless the user specifically asks for that. Use only these FigureLoom colors: ${[...FIGURELOOM_PALETTE.keys()].join(', ')}.
Never request deletion, replacement or modification of existing pages. The blueprint is always rendered on a new page.
For rewrite mode, preserve meaning and put the final wording in replacementText. For feedback mode, review all supplied pages and objects.`;

    let lastMessage = 'Gemini could not create a figure.';
    for (const model of GEMINI_MODELS) {
      let response;
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method:'POST',
          headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
          body:JSON.stringify({
            systemInstruction:{parts:[{text:systemInstruction}]},
            contents:[{role:'user',parts:[{text:JSON.stringify({mode,request:prompt,figure:figureContext()})}]}],
            generationConfig:{
              temperature:0.35,
              maxOutputTokens:8000,
              responseMimeType:'application/json',
              responseSchema:BLUEPRINT_SCHEMA
            }
          })
        });
      } catch {
        lastMessage = 'Gemini could not be reached.';
        continue;
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        lastMessage = safeText(payload?.error?.message || `Google rejected the Gemini request (${response.status}).`, 360)
          .replace(/AIza[0-9A-Za-z_-]+/g,'[redacted key]');
        if ([400,404].includes(response.status)) continue;
        throw new Error(lastMessage);
      }
      const text = (payload?.candidates?.[0]?.content?.parts || []).map(part => part?.text || '').join('').trim();
      if (!text) {
        lastMessage = 'Gemini returned an empty response.';
        continue;
      }
      try {
        const plan = JSON.parse(text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
        plan.kind = mode;
        return { plan, quota:{personalKey:true}, model, usedPersonalKey:true };
      } catch {
        lastMessage = 'Gemini returned JSON that FigureLoom could not read.';
      }
    }
    throw new Error(lastMessage);
  }

  function canvasSize() {
    return window.currentCanvasSize?.() || { width:1200, height:750 };
  }

  function scaledRect(element) {
    const size = canvasSize();
    const x = element.x / 1000 * size.width;
    const y = element.y / 1000 * size.height;
    let width = element.width / 1000 * size.width;
    let height = element.height / 1000 * size.height;
    width = Math.max(18, Math.min(width, size.width - x));
    height = Math.max(12, Math.min(height, size.height - y));
    return { x, y, width, height };
  }

  function basicItem(element) {
    const rect = scaledRect(element);
    const type = element.kind === 'illustration' ? 'shape' : element.kind;
    const item = {
      id:uid(),
      type,
      name:element.name,
      x:rect.x,
      y:rect.y,
      width:rect.width,
      height:rect.height,
      fill:element.fill,
      stroke:element.stroke,
      opacity:element.opacity,
      rotation:element.rotation,
      visible:true
    };
    if (type === 'text') {
      item.text = element.text || element.name;
      item.fontSize = element.fontSize;
      item.fontWeight = element.fontWeight;
      item.fontStyle = 'normal';
      item.fontFamily = `"${state.defaultFont || 'Inter'}", sans-serif`;
      item.height = Math.max(item.height, item.fontSize * 1.7);
    }
    return item;
  }

  function exactBuiltIn(element) {
    if (typeof scienceAssets === 'undefined' || !Array.isArray(scienceAssets)) return null;
    const id = element.assetId.toLowerCase();
    const query = (element.assetQuery || element.name).toLowerCase();
    return scienceAssets.find(asset =>
      (id && String(asset.id || '').toLowerCase() === id) ||
      (query && String(asset.name || '').toLowerCase() === query)
    ) || null;
  }

  function localIllustration(element, asset) {
    const rect = scaledRect(element);
    return {
      id:uid(),
      type:'science',
      asset:asset.id,
      name:element.name || asset.name,
      x:rect.x,
      y:rect.y,
      width:rect.width,
      height:rect.height,
      fill:element.fill,
      stroke:element.stroke,
      opacity:element.opacity,
      rotation:element.rotation,
      visible:true,
      metadata:{
        source:'FigureLoom built-in library',
        notes:`Chosen by Gemini for: ${element.assetQuery || element.name}`
      }
    };
  }

  async function illustrationItem(element) {
    const exact = exactBuiltIn(element);
    if (exact) return localIllustration(element, exact);

    const query = element.assetQuery || element.assetId || element.name;
    const search = window.SciCanvasAssetSearch;
    if (search?.search && search?.materialize && query) {
      try {
        const result = await search.search(query, { online:true, limit:20 });
        const entry = result?.entries?.[0];
        if (entry) {
          const rect = scaledRect(element);
          const item = await search.materialize(entry, rect);
          item.name = element.name || entry.label || 'Gemini illustration';
          item.x = rect.x;
          item.y = rect.y;
          item.rotation = element.rotation;
          item.opacity = element.opacity;
          item.visible = true;
          if (item.type === 'science') {
            item.fill = element.fill;
            item.stroke = element.stroke;
          }
          item.metadata ??= {};
          item.metadata.notes = `${item.metadata.notes || ''}\nGemini selected this illustration for: ${query}`.trim();
          return item;
        }
      } catch (error) {
        console.warn('Gemini illustration lookup failed', error);
      }
    }

    const fallback = typeof scienceAssets !== 'undefined' && Array.isArray(scienceAssets)
      ? scienceAssets.find(asset => asset.id === 'cell') || scienceAssets[0]
      : null;
    return fallback ? localIllustration(element, fallback) : basicItem({ ...element, kind:'ellipse', name:element.name || query });
  }

  async function materializeBlueprint(blueprint) {
    const objects = [];
    for (const element of blueprint.elements) {
      if (element.kind === 'illustration') objects.push(await illustrationItem(element));
      else objects.push(basicItem(element));
    }
    return objects;
  }

  async function buildGeminiBlueprintOnNewPage(plan) {
    if (buildInProgress) return addAssistantMessage('FigureLoom', 'One figure is already being created.');
    if (!plan.blueprint?.elements?.length) return addAssistantMessage('FigureLoom', 'Gemini did not provide an editable figure blueprint.');

    buildInProgress = true;
    const statusMessage = addAssistantMessage('Gemini', `Creating the designed figure “${plan.title}”…`, { pending:true });
    try {
      const objects = await materializeBlueprint(plan.blueprint);
      if (objects.length < 3) throw new Error('The blueprint did not contain enough usable objects.');
      if (typeof addPage !== 'function' || typeof currentPage !== 'function') throw new Error('The page system is unavailable.');

      pushHistory();
      addPage();
      const pageIndex = state.activePage;
      const page = currentPage();
      if (page) page.name = plan.title.slice(0,60) || `Gemini figure ${pageIndex + 1}`;
      state.objects = objects;
      if (page) page.objects = state.objects;
      state.selectedId = null;
      window.SciCanvasSelection?.clear?.();
      render();
      renderPages?.();
      scheduleSave();
      drawer.classList.add('open');
      setBubble(statusMessage, `Gemini created ${objects.length} editable objects on Page ${pageIndex + 1}. Every earlier page was left untouched.`, 'success');
      record('assistant', 'Gemini', `Created ${objects.length} editable objects on a new page.`);
    } catch (error) {
      setBubble(statusMessage, `Gemini's figure could not be created: ${error.message}. Existing pages were not changed.`, 'error');
    } finally {
      buildInProgress = false;
    }
  }

  function planMessage(plan, originalPrompt, quota, usedPersonalKey) {
    const parts = [plan.summary].filter(Boolean);
    if (plan.blueprint?.description) parts.push(plan.blueprint.description);
    if (plan.kind === 'build') parts.push(`Gemini designed ${plan.blueprint.elements.length} editable objects.`);
    if (plan.suggestions.length) parts.push(plan.suggestions.map(item => `• ${item}`).join('\n'));
    if (plan.replacementText) parts.push(`Proposed wording: “${plan.replacementText}”`);
    const result = addAssistantMessage('Gemini', parts.join('\n\n') || 'The Gemini figure is ready.');

    const actions = document.createElement('div');
    actions.className = 'figureloom-chat-actions';

    if (plan.kind === 'build') {
      const buildGemini = document.createElement('button');
      buildGemini.type = 'button';
      buildGemini.className = 'primary';
      buildGemini.textContent = 'Create Gemini figure on new page';
      buildGemini.addEventListener('click', () => {
        void buildGeminiBlueprintOnNewPage(plan);
        actions.querySelectorAll('button').forEach(button => { button.disabled = true; });
      });

      const direct = document.createElement('button');
      direct.type = 'button';
      direct.textContent = 'Use Builder instead';
      direct.addEventListener('click', () => {
        void buildWithFallbackOnNewPage(originalPrompt, shell.querySelector('#assistantLayout')?.value || 'auto', originalPrompt);
        actions.querySelectorAll('button').forEach(button => { button.disabled = true; });
      });
      actions.append(buildGemini, direct);
    } else if (plan.kind === 'rewrite') {
      const applyRewrite = document.createElement('button');
      applyRewrite.type = 'button';
      applyRewrite.className = 'primary';
      applyRewrite.textContent = 'Apply rewrite';
      applyRewrite.addEventListener('click', () => {
        const targetId = result.article.dataset.targetId;
        const item = state.objects.find(candidate => candidate.id === targetId && candidate.type === 'text');
        if (!item || !plan.replacementText) return addAssistantMessage('FigureLoom', 'The selected text is no longer available.');
        pushHistory();
        item.text = plan.replacementText;
        item.name = plan.replacementText.trim().slice(0,40) || 'Text label';
        render();
        window.syncPage?.();
        scheduleSave();
        applyRewrite.disabled = true;
        addAssistantMessage('FigureLoom', 'Text updated. Undo is available.');
      });
      const target = selectedItems()[0];
      result.article.dataset.targetId = target?.id || '';
      actions.appendChild(applyRewrite);
    }

    if (actions.childElementCount) result.bubble.appendChild(actions);
    const quotaLine = document.createElement('small');
    quotaLine.className = 'figureloom-chat-quota';
    const remaining = Number(quota?.remaining);
    quotaLine.textContent = usedPersonalKey ? 'Using your personal key' : Number.isFinite(remaining) ? `${remaining} shared request${remaining === 1 ? '' : 's'} left today` : '';
    if (quotaLine.textContent) result.bubble.appendChild(quotaLine);
    scrollMessages();
  }

  function waitForBuilder(statusMessage, pageIndex) {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (buildInProgress) drawer.classList.add('open');
      const text = String(builderStatus.textContent || '');
      if (!legacyBuild.disabled && /^Built\b/i.test(text)) {
        window.clearInterval(timer);
        buildInProgress = false;
        setBubble(statusMessage, `${text} It is on Page ${pageIndex + 1}; the previous pages were left untouched.`, 'success');
        record('assistant', 'FigureLoom Builder', text);
      } else if (!legacyBuild.disabled && /^Could not build/i.test(text)) {
        window.clearInterval(timer);
        buildInProgress = false;
        setBubble(statusMessage, `${text} The new page was left blank; nothing existing was removed.`, 'error');
      } else if (Date.now() - startedAt > 90000) {
        window.clearInterval(timer);
        buildInProgress = false;
        setBubble(statusMessage, 'The Builder is taking longer than expected. The new page is still separate from existing work.', 'error');
      }
    }, 200);
  }

  async function buildWithFallbackOnNewPage(prompt, layout, titleText) {
    if (buildInProgress) return addAssistantMessage('FigureLoom', 'One figure is already being created.');
    if (!prompt?.trim()) return addAssistantMessage('FigureLoom', 'There is no buildable description yet.');
    if (typeof addPage !== 'function' || typeof currentPage !== 'function') return addAssistantMessage('FigureLoom', 'The page builder is unavailable.');

    buildInProgress = true;
    pushHistory();
    addPage();
    const pageIndex = state.activePage;
    const page = currentPage();
    if (page) {
      page.name = String(titleText || `Builder figure ${pageIndex + 1}`).trim().slice(0,60) || `Figure ${pageIndex + 1}`;
      renderPages?.();
    }
    legacyPrompt.value = prompt.trim();
    if (replaceOption) replaceOption.checked = true;
    const layoutSelect = shell.querySelector('#assistantLayout');
    if (layoutSelect && ['auto','workflow','comparison','cycle'].includes(layout)) layoutSelect.value = layout;
    const online = shell.querySelector('#assistantUseBioicons');
    if (online) online.checked = true;
    builderStatus.textContent = 'Preparing the new page…';

    const statusMessage = addAssistantMessage('FigureLoom Builder', `Building “${page?.name || 'new figure'}” on a new page…`, { pending:true });
    legacyBuild.click();
    waitForBuilder(statusMessage, pageIndex);
  }

  async function sendToGemini(prompt) {
    const requestedAction = action.value;
    const selected = selectedItems();
    if (requestedAction === 'rewrite' && !(selected.length === 1 && selected[0].type === 'text')) {
      return addAssistantMessage('FigureLoom', 'Select exactly one text label before asking Gemini to rewrite it.');
    }

    const contextualPrompt = conversationPrompt(prompt);
    addUserMessage(prompt, 'gemini');
    const thinking = addAssistantMessage('Gemini', requestedAction === 'build' ? 'Designing the actual editable figure…' : 'Thinking about the whole FigureLoom project…', { pending:true });
    send.disabled = true;

    try {
      const personalKey = keyInput.value.trim();
      let data;
      if (personalKey) {
        try {
          if (rememberKey.checked) sessionStorage.setItem(KEY_STORAGE, personalKey);
          else sessionStorage.removeItem(KEY_STORAGE);
        } catch {}
        data = await callGeminiDirect(personalKey, requestedAction, contextualPrompt);
      } else {
        const { client, user } = await refreshAccess();
        if (!client || !user) {
          window.SciCanvasCloud?.open?.();
          throw new Error('Sign in for shared Gemini access or add your own API key.');
        }
        const response = await client.functions.invoke('figureloom-ai', {
          body:{ mode:requestedAction, prompt:contextualPrompt, figure:figureContext() }
        });
        if (response.error) throw response.error;
        data = response.data;
      }

      const plan = validatePlan(data?.plan, requestedAction);
      thinking.article.remove();
      planMessage(plan, prompt, data?.quota, Boolean(data?.usedPersonalKey));
    } catch (error) {
      setBubble(thinking, await readableError(error), 'error');
    } finally {
      await refreshAccess();
    }
  }

  async function sendCurrent() {
    const prompt = input.value.trim();
    if (!prompt || buildInProgress) return;
    input.value = '';
    if (activeSource === 'builder') {
      addUserMessage(prompt, 'builder');
      await buildWithFallbackOnNewPage(prompt, shell.querySelector('#assistantLayout')?.value || 'auto', prompt);
    } else {
      await sendToGemini(prompt);
    }
  }

  function setSource(source) {
    activeSource = source;
    shell.querySelectorAll('.figureloom-chat-source').forEach(button => {
      const active = button.dataset.source === source;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    actionLabel.hidden = source !== 'gemini';
    settings.open = source === 'builder';
    input.placeholder = source === 'gemini' ? 'Describe the figure you want Gemini to design' : 'Describe a figure for the simpler direct Builder';
    send.textContent = source === 'gemini' ? 'Send to Gemini' : 'Build on new page';
    void refreshAccess();
  }

  shell.querySelectorAll('.figureloom-chat-source').forEach(button => button.addEventListener('click', () => setSource(button.dataset.source)));
  send.addEventListener('click', () => void sendCurrent());
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendCurrent();
    }
  });
  signIn.addEventListener('click', () => window.SciCanvasCloud?.open?.());
  keyInput.addEventListener('input', () => void refreshAccess());
  rememberKey.addEventListener('change', () => {
    try {
      if (rememberKey.checked && keyInput.value.trim()) sessionStorage.setItem(KEY_STORAGE, keyInput.value.trim());
      else sessionStorage.removeItem(KEY_STORAGE);
    } catch {}
  });
  shell.querySelector('#figureloomChatKeyToggle').addEventListener('click', event => {
    const reveal = keyInput.type === 'password';
    keyInput.type = reveal ? 'text' : 'password';
    event.currentTarget.textContent = reveal ? 'Hide' : 'Show';
  });
  shell.querySelector('#figureloomChatKeyHelp').addEventListener('click', () => {
    const help = shell.querySelector('#figureloomChatKeyHelpBox');
    help.hidden = !help.hidden;
  });
  action.addEventListener('change', () => {
    input.placeholder = action.value === 'feedback' ? 'Ask Gemini to review the current project' : action.value === 'rewrite' ? 'Tell Gemini how to rewrite the selected text' : 'Describe the figure you want Gemini to design';
  });
  drawer.addEventListener('transitionend', () => { if (buildInProgress) drawer.classList.add('open'); });
  window.addEventListener('beforeunload', () => authSubscription?.unsubscribe?.());

  const style = document.createElement('style');
  style.textContent = `
    #figureAssistantDrawer{width:min(440px,calc(100vw - 20px))}
    #figureAssistantDrawer .utility-body{padding:0;overflow:hidden;flex:1 1 auto;min-height:0}.figureloom-chat-shell{height:100%;display:grid;grid-template-rows:auto minmax(160px,1fr) auto;background:linear-gradient(180deg,#f7f9ff,#f5f3fb)}
    .figureloom-chat-topbar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid #dce3ee;background:rgba(255,255,255,.82)}.figureloom-chat-sources{display:flex;gap:5px}.figureloom-chat-source{padding:7px 10px;border:1px solid #d1daea;border-radius:999px;background:#fff;color:#59677c;font-size:9px;font-weight:750}.figureloom-chat-source.active{border-color:#6d7df2;background:#eef1ff;color:#4254ae}.figureloom-chat-access{font-size:8px;color:#7b8798}.figureloom-chat-access.ready{color:#28745f;font-weight:700}
    .figureloom-chat-messages{min-height:0;padding:13px 11px;overflow:auto;display:flex;flex-direction:column;gap:10px}.figureloom-chat-message{display:flex;flex-direction:column;align-items:flex-start;max-width:90%}.figureloom-chat-message.user{align-self:flex-end;align-items:flex-end}.figureloom-chat-message>small{margin:0 5px 3px;color:#8490a2;font-size:7px}.figureloom-chat-bubble{padding:9px 11px;border:1px solid #d5deeb;border-radius:15px 15px 15px 5px;background:#fff;box-shadow:0 4px 14px rgba(55,70,105,.06)}.figureloom-chat-message.user .figureloom-chat-bubble{border-color:#9eaae9;border-radius:15px 15px 5px 15px;background:linear-gradient(145deg,#6879dc,#7368cc);color:#fff}.figureloom-chat-bubble p{margin:0;white-space:pre-wrap;font-size:10px;line-height:1.45}.figureloom-chat-message.pending .figureloom-chat-bubble{opacity:.72}.figureloom-chat-message.error .figureloom-chat-bubble{border-color:#e6b7b0;background:#fff4f2;color:#943c34}.figureloom-chat-message.success .figureloom-chat-bubble{border-color:#add3c4;background:#effaf6;color:#286c59}.figureloom-chat-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.figureloom-chat-actions button{padding:7px 9px;border:1px solid #cbd5e5;border-radius:9px;background:#f7f9fd;color:#43526b;font-size:8px}.figureloom-chat-actions button.primary{border-color:#566bc9;background:#566bc9;color:#fff}.figureloom-chat-quota{display:block;margin-top:7px;color:#7b8798;font-size:7px}
    .figureloom-chat-composer{padding:10px 11px 11px;border-top:1px solid #dce3ee;background:rgba(255,255,255,.92);overflow:auto;max-height:48vh}.figureloom-chat-action{display:grid;gap:4px;margin-bottom:7px;color:#68758a;font-size:8px}.figureloom-chat-action select,.figureloom-chat-composer>textarea{width:100%;box-sizing:border-box;border:1px solid #c8d3e3;border-radius:10px;background:#fff;color:#26344b;padding:8px;font:inherit}.figureloom-chat-composer>textarea{min-height:74px;resize:vertical;line-height:1.4}.figureloom-chat-details{margin-top:7px;padding:7px 8px;border:1px solid #d9e1ec;border-radius:9px;background:#fafbfe}.figureloom-chat-details summary{cursor:pointer;color:#536178;font-size:8px;font-weight:750}.figureloom-chat-details .assistant-universal-controls{margin:8px 0 0}.figureloom-chat-key-label{display:grid;gap:4px;margin-top:8px;color:#69768a;font-size:8px}.figureloom-chat-key-field{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px}.figureloom-chat-key-field input{min-width:0;border:1px solid #c8d3e3;border-radius:8px;padding:7px}.figureloom-chat-key-field button,.figureloom-chat-help-button{border:1px solid #ccd6e4;border-radius:8px;background:#fff;color:#536278;font-size:8px}.figureloom-chat-remember{display:flex;align-items:center;gap:6px;margin-top:7px;color:#6e7a8e;font-size:8px}.figureloom-chat-help-button{margin-top:7px;padding:7px}.figureloom-chat-help{margin-top:7px;padding:8px;border-radius:8px;background:#f0f3ff;color:#58677d;font-size:8px;line-height:1.45}.figureloom-chat-help strong{display:block}.figureloom-chat-help ol{margin:5px 0;padding-left:17px}.figureloom-chat-help p{margin:5px 0 0}.figureloom-chat-help a{color:#465cb7;font-weight:750}
    .figureloom-chat-sendrow{display:grid;grid-template-columns:auto 1fr;gap:7px;margin-top:8px}.figureloom-chat-sendrow button{min-height:38px;border:1px solid #cbd5e3;border-radius:9px;background:#fff;color:#536178;font-size:9px}.figureloom-chat-sendrow button.primary{border-color:#5368c7;background:#5368c7;color:#fff;font-weight:750}.figureloom-chat-sendrow button:disabled{opacity:.5}.figureloom-chat-safety{margin:7px 1px 0;color:#768397;font-size:7px;line-height:1.35}
    @media(max-width:520px){#figureAssistantDrawer{top:72px;right:6px;bottom:30px;width:calc(100vw - 12px)}.figureloom-chat-message{max-width:94%}.figureloom-chat-composer{max-height:52vh}.figureloom-chat-sendrow{grid-template-columns:1fr}.figureloom-chat-topbar{align-items:flex-start;flex-direction:column}}
  `;
  document.head.appendChild(style);

  addAssistantMessage('FigureLoom', 'Tell Gemini what you want to make. Gemini now designs the actual editable objects and layout; Builder remains available as a simpler fallback. Every generated figure opens on a new page.');
  setSource('gemini');
})();
