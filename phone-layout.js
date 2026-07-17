(() => {
  const userAgent = navigator.userAgent || '';
  const phoneUserAgent = /iPhone|iPod|Android.*Mobile|Windows Phone|IEMobile|Opera Mini|BlackBerry|webOS/i.test(userAgent);
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const screenWidth = Number(window.screen?.width) || 9999;
  const screenHeight = Number(window.screen?.height) || 9999;
  const compactTouchDevice = coarsePointer && Math.min(screenWidth, screenHeight) <= 500;
  const isPhone = phoneUserAgent || compactTouchDevice;

  if (!isPhone) return;

  document.documentElement.classList.add('phone-ui');
  document.documentElement.dataset.figureloomDevice = 'phone';

  function setupPhoneWorkspace() {
    const workspace = document.querySelector('.workspace');
    const leftPanel = document.querySelector('.left-panel');
    const rightPanel = document.querySelector('.right-panel');
    if (!workspace || !leftPanel || !rightPanel || workspace.querySelector('.phone-dock')) return;

    const backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'phone-sheet-backdrop';
    backdrop.setAttribute('aria-label', 'Close panel');
    backdrop.hidden = true;

    const dock = document.createElement('nav');
    dock.className = 'phone-dock';
    dock.setAttribute('aria-label', 'Phone workspace controls');
    dock.innerHTML = `
      <button type="button" data-phone-action="pages" aria-expanded="false"><span aria-hidden="true">▤</span><small>Pages</small></button>
      <button type="button" data-phone-action="undo"><span aria-hidden="true">↶</span><small>Undo</small></button>
      <button type="button" data-phone-action="fit"><span aria-hidden="true">⌗</span><small>Fit</small></button>
      <button type="button" data-phone-action="format" aria-expanded="false"><span aria-hidden="true">◫</span><small>Format</small></button>
    `;

    const addCloseButton = (panel, label) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'phone-sheet-close';
      button.setAttribute('aria-label', `Close ${label}`);
      button.textContent = '×';
      panel.prepend(button);
      button.addEventListener('click', () => closePanels());
    };

    addCloseButton(leftPanel, 'pages and layers');
    addCloseButton(rightPanel, 'format panel');
    workspace.append(backdrop, dock);

    const pagesButton = dock.querySelector('[data-phone-action="pages"]');
    const formatButton = dock.querySelector('[data-phone-action="format"]');

    function setExpanded(button, expanded) {
      button?.setAttribute('aria-expanded', String(expanded));
    }

    function closePanels() {
      leftPanel.classList.remove('phone-sheet-open');
      rightPanel.classList.remove('phone-sheet-open');
      document.documentElement.classList.remove('phone-panel-open');
      backdrop.hidden = true;
      setExpanded(pagesButton, false);
      setExpanded(formatButton, false);
    }

    function openPanel(panel) {
      const openingLeft = panel === leftPanel;
      const alreadyOpen = panel.classList.contains('phone-sheet-open');
      closePanels();
      if (alreadyOpen) return;

      panel.classList.add('phone-sheet-open');
      document.documentElement.classList.add('phone-panel-open');
      backdrop.hidden = false;
      setExpanded(pagesButton, openingLeft);
      setExpanded(formatButton, !openingLeft);
    }

    dock.addEventListener('click', event => {
      const button = event.target.closest('[data-phone-action]');
      if (!button) return;

      switch (button.dataset.phoneAction) {
        case 'pages':
          openPanel(leftPanel);
          break;
        case 'format':
          openPanel(rightPanel);
          break;
        case 'undo':
          document.getElementById('undoButton')?.click();
          break;
        case 'fit':
          document.getElementById('fitButton')?.click();
          break;
      }
    });

    backdrop.addEventListener('click', closePanels);
    leftPanel.addEventListener('click', event => {
      if (event.target.closest('.page-thumbnail, .layer-item')) closePanels();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closePanels();
    });
    window.addEventListener('orientationchange', closePanels);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPhoneWorkspace, { once: true });
  } else {
    setupPhoneWorkspace();
  }
})();
