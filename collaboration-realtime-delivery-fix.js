(() => {
  if (window.__figureLoomRealtimeDeliveryFix) return;
  window.__figureLoomRealtimeDeliveryFix = true;

  const MUTED_KEY = 'figureloom-chat-muted-v1';
  const POLL_INTERVAL = 700;
  let client = null;
  let channel = null;
  let project = '';
  let connecting = null;
  let pollTimer = 0;
  let lastFetchedAt = 0;
  let lastText = '';
  let lastSentAt = 0;
  const sentAt = [];
  const seen = new Set();
  const muted = new Set(readMuted());

  const cloud = () => window.SciCanvasCloud;
  const user = () => cloud()?.getUser?.() || null;
  const projectId = () => cloud()?.currentProjectId || localStorage.getItem('scicanvas-current-cloud-project-v1') || '';

  function readMuted() {
    try {
      const value = JSON.parse(localStorage.getItem(MUTED_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function saveMuted() {
    localStorage.setItem(MUTED_KEY, JSON.stringify([...muted]));
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[@4]/g, 'a')
      .replace(/3/g, 'e')
      .replace(/[1!|]/g, 'i')
      .replace(/0/g, 'o')
      .replace(/[5$]/g, 's')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function moderationReason(value) {
    const text = normalize(value);
    if (!text) return 'Enter a message first.';
    if (text.length > 1200) return 'Messages must be 1,200 characters or shorter.';
    if (/\b(?:kys|kill yourself|go die|end yourself)\b/.test(text)) return 'Encouraging self-harm is not allowed.';
    if (/\b(?:kill|shoot|stab|rape|bomb|murder|attack|hurt|beat)\b.{0,40}\b(?:you|him|her|them|people|school|office|hospital)\b/.test(text)) return 'Threats or targeted violence are not allowed.';
    if (/\b(?:child|children|minor|underage|kid|kids)\b.{0,30}\b(?:sex|sexual|nude|nudes|porn|explicit)\b/.test(text) || /\b(?:sex|sexual|nude|nudes|porn|explicit)\b.{0,30}\b(?:child|children|minor|underage|kid|kids)\b/.test(text)) return 'Sexual content involving minors is not allowed.';
    const severeSlurs = ['n'+'igger','n'+'igga','f'+'aggot','k'+'ike','s'+'pic','c'+'hink','t'+'ranny'];
    if (severeSlurs.some(term => new RegExp(`\\b${term}\\b`).test(text))) return 'Hateful slurs are not allowed.';
    return '';
  }

  function rateReason(text) {
    const now = Date.now();
    while (sentAt.length && now - sentAt[0] > 10000) sentAt.shift();
    if (sentAt.length >= 6) return 'Slow down for a moment before sending more messages.';
    if (normalize(text) === normalize(lastText) && now - lastSentAt < 8000) return 'That duplicate message was not sent.';
    return '';
  }

  function initials(value) {
    return String(value || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  }

  function color(value) {
    let hash = 0;
    for (const character of String(value || 'figureloom')) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
    return `hsl(${Math.abs(hash) % 360} 52% 48%)`;
  }

  function setStatus(text, online = false) {
    const node = document.getElementById('ccOnline');
    if (node) node.textContent = text;
    const dot = document.querySelector('#collabChatBubble > i');
    if (dot) dot.dataset.online = online ? '1' : '0';
  }

  function toPayload(row) {
    return {
      id:row.id,
      projectId:row.project_id,
      userId:row.user_id,
      name:row.display_name,
      avatar:row.avatar_url || '',
      color:row.color || color(row.user_id),
      text:row.body,
      sentAt:row.created_at
    };
  }

  async function reportMessage(payload, article) {
    if (!client || !projectId() || !user()?.id) throw new Error('Moderation reporting is not connected yet.');
    if (!confirm(`Report this message from ${payload.name || 'this collaborator'}?`)) return;
    const { error } = await client.from('collaboration_chat_reports').insert({
      project_id:projectId(),
      reporter_id:user().id,
      reported_user_id:payload.userId,
      message_id:String(payload.id || '').slice(0, 100),
      reason:'abuse_or_harassment',
      excerpt:String(payload.text || '').slice(0, 300)
    });
    if (error) throw error;
    article.classList.add('reported');
    setStatus('Message reported to the project owner.', true);
  }

  function appendMessage(row) {
    const payload = toPayload(row);
    if (!payload.id || seen.has(payload.id) || muted.has(payload.userId) || moderationReason(payload.text)) return;
    const host = document.getElementById('ccMessages');
    if (!host) return;
    seen.add(payload.id);
    host.querySelector('.cc-empty')?.remove();

    const mine = payload.userId === user()?.id;
    const article = document.createElement('article');
    article.className = mine ? 'mine' : '';
    article.dataset.userId = payload.userId || '';
    article.dataset.messageId = payload.id;

    const face = document.createElement('span');
    face.className = 'cc-face';
    if (payload.avatar) {
      const image = document.createElement('img');
      image.src = payload.avatar;
      image.alt = '';
      face.appendChild(image);
    } else {
      face.classList.add('cc-init');
      face.style.setProperty('--c', payload.color);
      face.textContent = initials(payload.name);
    }

    const body = document.createElement('div');
    const meta = document.createElement('small');
    const author = document.createElement('strong');
    author.textContent = mine ? 'You' : payload.name || 'Collaborator';
    const time = document.createElement('time');
    time.textContent = new Date(payload.sentAt || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    meta.append(author, time);
    const text = document.createElement('p');
    text.textContent = String(payload.text || '');
    body.append(meta, text);

    if (!mine) {
      const menuButton = document.createElement('button');
      menuButton.type = 'button';
      menuButton.className = 'cc-menu-button';
      menuButton.textContent = '⋯';
      menuButton.setAttribute('aria-label', 'Message options');
      const menu = document.createElement('div');
      menu.className = 'cc-message-menu';
      const muteButton = document.createElement('button');
      muteButton.type = 'button';
      muteButton.textContent = 'Mute person';
      muteButton.addEventListener('click', () => {
        muted.add(payload.userId);
        saveMuted();
        document.querySelectorAll(`#ccMessages article[data-user-id="${CSS.escape(payload.userId)}"]`).forEach(node => node.remove());
        setStatus(`${payload.name || 'Collaborator'} muted on this device.`, true);
      });
      const reportButton = document.createElement('button');
      reportButton.type = 'button';
      reportButton.textContent = 'Report message';
      reportButton.addEventListener('click', () => reportMessage(payload, article).catch(error => setStatus(error.message, true)));
      menu.append(muteButton, reportButton);
      menuButton.addEventListener('click', event => {
        event.stopPropagation();
        document.querySelectorAll('.cc-message-menu.open').forEach(node => { if (node !== menu) node.classList.remove('open'); });
        menu.classList.toggle('open');
      });
      body.append(menuButton, menu);
    }

    article.append(face, body);
    host.appendChild(article);
    host.scrollTop = host.scrollHeight;

    const panel = document.getElementById('collabChatPanel');
    const badge = document.querySelector('#collabChatBubble > b');
    if (!mine && panel?.hidden && badge) {
      const next = Number(badge.textContent || 0) + 1;
      badge.textContent = String(next);
      badge.hidden = false;
    }
  }

  async function fetchMessages(initial = false) {
    if (!client || !project) return;
    const since = initial ? new Date(Date.now() - 12 * 60 * 60 * 1000) : new Date(Math.max(0, lastFetchedAt - 1500));
    const { data, error } = await client
      .from('collaboration_chat_messages')
      .select('id,project_id,user_id,display_name,avatar_url,color,body,created_at,expires_at')
      .eq('project_id', project)
      .gt('expires_at', new Date().toISOString())
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending:true })
      .limit(150);
    if (error) throw error;
    for (const row of data || []) {
      appendMessage(row);
      lastFetchedAt = Math.max(lastFetchedAt, new Date(row.created_at).getTime());
    }
    setStatus(channel ? 'Chat connected.' : 'Chat connected through reliable fallback.', true);
  }

  async function disconnect() {
    clearInterval(pollTimer);
    pollTimer = 0;
    if (client && channel) {
      try { await client.removeChannel(channel); } catch {}
    }
    channel = null;
    client = null;
    project = '';
    connecting = null;
    lastFetchedAt = 0;
  }

  async function connect() {
    const nextProject = projectId();
    const activeUser = user();
    if (!nextProject || !activeUser || !cloud()?.configured?.()) {
      await disconnect();
      setStatus('Open a shared cloud project to chat.', false);
      return null;
    }
    if (client && project === nextProject) return client;
    if (connecting) return connecting;

    connecting = (async () => {
      await disconnect();
      client = await cloud().getClient();
      project = nextProject;
      await fetchMessages(true);

      channel = client
        .channel(`figureloom-chat-db:${nextProject}`)
        .on('postgres_changes', {
          event:'INSERT',
          schema:'public',
          table:'collaboration_chat_messages',
          filter:`project_id=eq.${nextProject}`
        }, event => appendMessage(event.new));

      await new Promise(resolve => {
        let settled = false;
        const finish = () => { if (!settled) { settled = true; resolve(); } };
        channel.subscribe(status => {
          if (status === 'SUBSCRIBED') finish();
          if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)) {
            channel = null;
            finish();
          }
        });
        setTimeout(finish, 1800);
      });

      pollTimer = window.setInterval(() => fetchMessages(false).catch(error => setStatus(`Chat retrying: ${error.message}`, false)), POLL_INTERVAL);
      setStatus(channel ? 'Chat connected.' : 'Chat connected through reliable fallback.', true);
      return client;
    })();

    try { return await connecting; }
    finally { connecting = null; }
  }

  function setup() {
    const form = document.getElementById('ccForm');
    const input = document.getElementById('ccInput');
    const button = form?.querySelector('button[type="submit"]');
    if (!form || !input || !button) return false;
    if (form.dataset.figureloomDatabaseChat === '1') return true;
    form.dataset.figureloomDatabaseChat = '1';

    form.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const text = input.value.trim();
      const blocked = moderationReason(text) || rateReason(text);
      if (blocked) {
        setStatus(blocked, true);
        return;
      }

      button.disabled = true;
      button.textContent = 'Sending…';
      try {
        const activeUser = user();
        const activeClient = await connect();
        if (!activeClient || !activeUser) throw new Error('Open a shared project first.');
        const row = {
          id:crypto.randomUUID(),
          project_id:projectId(),
          user_id:activeUser.id,
          display_name:activeUser.user_metadata?.full_name || activeUser.user_metadata?.name || activeUser.email?.split('@')[0] || localStorage.getItem('scicanvas-user-name-v1') || 'Collaborator',
          avatar_url:activeUser.user_metadata?.avatar_url || activeUser.user_metadata?.picture || '',
          color:color(activeUser.id),
          body:text.slice(0, 1200)
        };
        const { data, error } = await activeClient
          .from('collaboration_chat_messages')
          .insert(row)
          .select('id,project_id,user_id,display_name,avatar_url,color,body,created_at,expires_at')
          .single();
        if (error) throw error;
        appendMessage(data);
        input.value = '';
        sentAt.push(Date.now());
        lastText = text;
        lastSentAt = Date.now();
        lastFetchedAt = Math.max(lastFetchedAt, new Date(data.created_at).getTime());
        setStatus('Message delivered.', true);
      } catch (error) {
        setStatus(`Message not sent: ${error.message}`, false);
      } finally {
        button.disabled = false;
        button.textContent = 'Send';
      }
    }, true);

    ['scicanvas-cloud-opened','scicanvas-cloud-saved','scicanvas-share-link-accepted'].forEach(type => {
      window.addEventListener(type, () => {
        void disconnect();
        setTimeout(() => connect().catch(error => setStatus(error.message, false)), 100);
      });
    });
    setTimeout(() => connect().catch(error => setStatus(error.message, false)), 300);
    return true;
  }

  let attempts = 0;
  const setupTimer = window.setInterval(() => {
    attempts += 1;
    if (setup() || attempts > 100) clearInterval(setupTimer);
  }, 100);
  setup();

  document.addEventListener('click', () => document.querySelectorAll('.cc-message-menu.open').forEach(node => node.classList.remove('open')));
  window.addEventListener('beforeunload', () => {
    clearInterval(setupTimer);
    void disconnect();
  }, { once:true });
})();
