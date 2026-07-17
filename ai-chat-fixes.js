(() => {
  if (window.__figureLoomUnifiedAiChatFixes) return;
  window.__figureLoomUnifiedAiChatFixes = true;

  const drawer = document.getElementById('figureAssistantDrawer');
  const body = drawer?.querySelector('.utility-body');
  const buildButton = document.getElementById('generateEditableFigure');
  const buildStatus = drawer?.querySelector('#assistantBuildStatus');

  if (body) {
    body.style.flex = '1 1 auto';
    body.style.minHeight = '0';
  }

  if (buildButton && buildStatus && !buildButton.__figureLoomChatClickWrapped) {
    const nativeClick = buildButton.click.bind(buildButton);
    buildButton.click = () => {
      buildStatus.textContent = 'Preparing the new page…';
      return nativeClick();
    };
    Object.defineProperty(buildButton, '__figureLoomChatClickWrapped', { value:true });
  }

  if (!document.querySelector('script[data-figureloom-gemini-blueprint]')) {
    const script = document.createElement('script');
    script.src = 'gemini-blueprint.js?v=1';
    script.dataset.figureloomGeminiBlueprint = '1';
    document.head.appendChild(script);
  }
})();