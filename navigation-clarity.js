(() => {
  if (window.__figureLoomNavigationClarityV1) return;
  window.__figureLoomNavigationClarityV1 = true;

  const tabs = {
    home:{ label:'Basics', description:'Common tools and view controls' },
    projects:{ label:'Projects', description:'Open, save, and switch projects' },
    insert:{ label:'Add', description:'Add text, shapes, drawings, files, and more' },
    science:{ label:'Library', description:'Scientific illustrations, symbols, and assets' },
    layout:{ label:'Arrange', description:'Align, layer, group, and position objects' },
    design:{ label:'Design', description:'Colors, themes, backgrounds, and typography' },
    data:{ label:'Data', description:'Import data and create charts or tables' },
    review:{ label:'Review', description:'Check accessibility, labels, and figure quality' }
  };

  function apply() {
    document.querySelectorAll('.ribbon-tabs [data-tab]').forEach(button => {
      const details = tabs[button.dataset.tab];
      if (!details) return;
      if (button.textContent.trim() !== details.label) button.textContent = details.label;
      button.title = details.description;
      button.setAttribute('aria-label', `${details.label}: ${details.description}`);
      button.dataset.figureloomClearLabel = '1';
    });

    const settings = document.getElementById('settingsRibbonButton');
    if (settings) {
      settings.title = 'App appearance, accessibility, and interface settings';
      settings.setAttribute('aria-label', 'Settings: app appearance, accessibility, and interface settings');
    }
  }

  const observer = new MutationObserver(() => requestAnimationFrame(apply));
  observer.observe(document.body, { childList:true, subtree:true });
  addEventListener('figureloom-stable-ready', apply);
  apply();

  window.FigureLoomNavigationClarity = Object.freeze({ apply, tabs });
})();
