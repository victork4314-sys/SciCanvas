(() => {
  if (window.__figureLoomUnifiedAiChatFixes) return;
  window.__figureLoomUnifiedAiChatFixes = true;

  const body = document.getElementById('figureAssistantDrawer')?.querySelector('.utility-body');
  if (!body) return;
  body.style.flex = '1 1 auto';
  body.style.minHeight = '0';
})();