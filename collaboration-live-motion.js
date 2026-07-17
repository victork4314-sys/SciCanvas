(() => {
  if (window.__figureLoomLiveMotion) return;
  window.__figureLoomLiveMotion = true;

  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  const clientId = `motion-${crypto.randomUUID()}`;
  const SEND_INTERVAL = 125;
  const POLL_INTERVAL = 350;
  let client = null;
  let channel = null;
  let project = '';
  let ready = false;
  let connecting = false;
  let sending = false;
  let lastSentAt = 0;
  let pendingPayload = null;
  let flushTimer = 0;
  let pollTimer = 0;
  let renderFrame = 0;
  const appliedVersions = new Map();

  const cloud = () => window.SciCanvasCloud;
  const user = () => cloud()?.getUser?.() || null;
  const projectId = () => cloud()?.currentProjectId || localStorage.getItem('scicanvas-current-cloud-project-v1') || '';

  function pageIdentity() {
    let page = null;
    try { page = typeof currentPage === 'function' ? currentPage() : null; } catch {}
    return {
      pageId:String(page?.id ?? ''),
      pageIndex:Number.isInteger(state?.activePage) ? state.activePage : 0
    };
  }

  function selectedMovingObject() {
    if (!state?.drag) return null;
    const id = state.drag.id || state.selectedId;
    return state.objects?.find?.(item => item.id === id) || null;
  }

  function motionPayload(item, final = false) {
    const page = pageIdentity();
    return {
      project_id:projectId(),
      page_id:page.pageId,
      page_index:page.pageIndex,
      object_id:String(item.id),
      user_id:user()?.id,
      client_id:clientId,
      x:Number(item.x) || 0,
      y:Number(item.y) || 0,
      width:Number(item.width) || 20,
      height:Number(item.height) || 20,
      rotation:Number(item.rotation) || 0,
      final:Boolean(final),
      client_sent_at:Date.now()
    };
  }

  function scheduleRender() {
    if (renderFrame) return;
    renderFrame = requestAnimationFrame(() => {
      renderFrame = 0;
      try { render?.(); } catch {}
    });
  }

  function pageForRow(row) {
    const pages = Array.isArray(state?.pages) ? state.pages : [];
    if (row.page_id) {
      const byId = pages.find(page => String(page?.id ?? '') === String(row.page_id));
      if (byId) return byId;
    }
    if (pages[row.page_index]) return pages[row.page_index];
    try { return typeof currentPage === 'function' ? currentPage() : null; } catch { return null; }
  }

  function receiveMotion(row) {
    if (!row || row.client_id === clientId || row.project_id !== projectId()) return;
    if (state?.drag && (state.drag.id || state.selectedId) === row.object_id) return;

    const key = `${row.project_id}:${row.page_id}:${row.object_id}`;
    const version = Number(row.client_sent_at) || new Date(row.updated_at || 0).getTime();
    if (version <= (appliedVersions.get(key) || 0)) return;
    appliedVersions.set(key, version);

    const page = pageForRow(row);
    const objects = Array.isArray(page?.objects) ? page.objects : state?.objects;
    const item = objects?.find?.(candidate => String(candidate.id) === String(row.object_id));
    if (!item) return;

    item.x = Number(row.x) || 0;
    item.y = Number(row.y) || 0;
    item.width = Math.max(20, Number(row.width) || item.width || 20);
    item.height = Math.max(20, Number(row.height) || item.height || 20);
    item.rotation = Number(row.rotation) || 0;

    let activePage = null;
    try { activePage = typeof currentPage === 'function' ? currentPage() : null; } catch {}
    if (!page || page === activePage || !Array.isArray(state?.pages)) {
      if (page?.objects && state.objects !== page.objects) state.objects = page.objects;
      scheduleRender();
    } else {
      try { renderPages?.(); } catch {}
    }

    if (row.final) {
      window.__scApplyingRemote = true;
      try {
        window.syncPage?.();
        window.renderPages?.();
        window.saveSciCanvasImmediately?.('autosave');
      } finally {
        window.__scApplyingRemote = false;
      }
    }
  }

  async function pollMotion() {
    if (!client || !project) return;
    const since = new Date(Date.now() - 2500).toISOString();
    const { data, error } = await client
      .from('collaboration_object_motion')
      .select('project_id,page_id,page_index,object_id,user_id,client_id,x,y,width,height,rotation,final,client_sent_at,updated_at')
      .eq('project_id', project)
      .gte('updated_at', since)
      .order('updated_at', { ascending:true })
      .limit(250);
    if (error) throw error;
    for (const row of data || []) receiveMotion(row);
  }

  async function flushMotion() {
    flushTimer = 0;
    if (!ready || !client || !pendingPayload || sending) return;
    const elapsed = Date.now() - lastSentAt;
    if (elapsed < SEND_INTERVAL) {
      flushTimer = window.setTimeout(flushMotion, SEND_INTERVAL - elapsed);
      return;
    }

    const payload = pendingPayload;
    pendingPayload = null;
    sending = true;
    lastSentAt = Date.now();
    try {
      const { error } = await client
        .from('collaboration_object_motion')
        .upsert(payload, { onConflict:'project_id,page_id,object_id' });
      if (error) throw error;
    } catch (error) {
      console.warn('Live object motion could not save.', error);
    } finally {
      sending = false;
      if (pendingPayload && !flushTimer) flushTimer = window.setTimeout(flushMotion, SEND_INTERVAL);
    }
  }

  function queueMotion(item, final = false) {
    if (!item || !ready || !user()?.id) return;
    pendingPayload = motionPayload(item, final);
    if (final) {
      clearTimeout(flushTimer);
      flushTimer = 0;
      void flushMotion();
      return;
    }
    if (!flushTimer) void flushMotion();
  }

  async function disconnect() {
    ready = false;
    pendingPayload = null;
    clearTimeout(flushTimer);
    clearInterval(pollTimer);
    flushTimer = 0;
    pollTimer = 0;
    if (client && channel) {
      try { await client.removeChannel(channel); } catch {}
    }
    channel = null;
    client = null;
    project = '';
    appliedVersions.clear();
  }

  async function connect() {
    const nextProject = projectId();
    const activeUser = user();
    if (!nextProject || !activeUser || !cloud()?.configured?.()) {
      await disconnect();
      return;
    }
    if (connecting || (ready && project === nextProject && client)) return;
    connecting = true;
    try {
      await disconnect();
      client = await cloud().getClient();
      project = nextProject;
      ready = true;

      channel = client
        .channel(`figureloom-motion-db:${nextProject}`)
        .on('postgres_changes', {
          event:'*',
          schema:'public',
          table:'collaboration_object_motion',
          filter:`project_id=eq.${nextProject}`
        }, event => receiveMotion(event.new));

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

      pollTimer = window.setInterval(() => pollMotion().catch(error => console.warn('Live motion fallback retrying.', error)), POLL_INTERVAL);
      await pollMotion().catch(() => {});
    } catch (error) {
      console.warn('Live motion database transport could not connect.', error);
      await disconnect();
    } finally {
      connecting = false;
    }
  }

  canvas.addEventListener('pointermove', () => {
    const item = selectedMovingObject();
    if (item) queueMotion(item, false);
  });

  canvas.addEventListener('pointerup', () => {
    const item = selectedMovingObject();
    if (item) queueMotion(item, true);
  }, true);

  canvas.addEventListener('pointercancel', () => {
    const item = selectedMovingObject();
    if (item) queueMotion(item, true);
  }, true);

  ['scicanvas-cloud-opened','scicanvas-cloud-saved','scicanvas-share-link-accepted'].forEach(type => {
    window.addEventListener(type, () => setTimeout(connect, 80));
  });
  const reconnectTimer = window.setInterval(connect, 3000);
  setTimeout(connect, 250);

  window.addEventListener('beforeunload', () => {
    clearInterval(reconnectTimer);
    clearTimeout(flushTimer);
    clearInterval(pollTimer);
    void disconnect();
  }, { once:true });
})();
