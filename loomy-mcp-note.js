(() => {
  if (window.__figureLoomLoomyMcpNoteV1) return;
  window.__figureLoomLoomyMcpNoteV1 = true;

  const style = document.createElement('style');
  style.id = 'figureloomLoomyMcpNoteStyle';
  style.textContent = `
    #figureAssistantDrawer .figureloom-chat-shell{
      grid-template-rows:auto minmax(160px,1fr) auto auto!important
    }
    #figureAssistantDrawer .figureloom-chat-mcp-note{
      margin:0!important;
      padding:7px 11px 8px!important;
      border-top:1px solid var(--figureloom-ui-line,#dce3ee)!important;
      background:var(--figureloom-ui-soft,#f4f7f6)!important;
      color:var(--figureloom-ui-muted,#60706c)!important;
      font:600 7.5px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
      text-align:center!important
    }
    html[data-figureloom-theme="dark"] #figureAssistantDrawer .figureloom-chat-mcp-note{
      background:var(--figureloom-ui-soft,#242d2b)!important
    }
  `;

  function install() {
    const shell = document.querySelector('#figureAssistantDrawer .figureloom-chat-shell');
    if (!shell) return false;

    let note = shell.querySelector(':scope > .figureloom-chat-mcp-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'figureloom-chat-mcp-note';
      shell.appendChild(note);
    }
    note.textContent = 'You can also connect Claude or another MCP-compatible assistant in Settings → MCP & AI access.';
    if (!style.isConnected) document.head.appendChild(style);
    return true;
  }

  document.getElementById(style.id)?.remove();
  if (install()) return;

  const drawer = document.getElementById('figureAssistantDrawer');
  if (!drawer) return;
  const observer = new MutationObserver(() => {
    if (install()) observer.disconnect();
  });
  observer.observe(drawer, { childList:true, subtree:true });
  setTimeout(() => observer.disconnect(), 15000);
})();