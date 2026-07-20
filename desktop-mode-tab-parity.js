(() => {
  if (window.__figureLoomDesktopModeTabParityV3) return;
  window.__figureLoomDesktopModeTabParityV3 = true;
  window.__figureLoomDesktopModeTabParityV2 = true;
  window.__figureLoomDesktopModeTabParityV1 = true;

  let scheduled = false;

  function apply() {
    scheduled = false;
    const tabs = document.querySelector('.ribbon-tabs');
    const button = document.getElementById('settingsRibbonButton');
    if (!tabs || !button) return;

    const projects = tabs.querySelector('.ribbon-tab[data-tab="projects"]');
    const desktop = document.documentElement.dataset.figureloomDeviceClass === 'desktop';

    button.classList.toggle('settings-ribbon-button', !desktop);
    button.classList.toggle('ribbon-tab', desktop);
    button.classList.toggle('ribbon-command-tab', !desktop);
    button.dataset.figureloomDesktopTab = desktop ? '1' : '0';

    // Settings belongs immediately before Projects. Moving this DOM node does
    // not move Share or any other tab.
    if (projects && button.nextElementSibling !== projects) tabs.insertBefore(button, projects);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  addEventListener('figureloom-stable-ready', schedule);
  addEventListener('figureloom-settings-change', schedule);
  new MutationObserver(schedule).observe(document.documentElement, {
    attributes:true,
    attributeFilter:['data-figureloom-device-class']
  });
  const tabs = document.querySelector('.ribbon-tabs');
  if (tabs) new MutationObserver(schedule).observe(tabs, { childList:true });
  schedule();
})();
