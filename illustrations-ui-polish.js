(() => {
  if (window.__figureLoomIllustrationsUiPolishV1) return;
  window.__figureLoomIllustrationsUiPolishV1 = true;

  function cleanLibrary() {
    document.querySelectorAll('.real-library-shortcut').forEach(element => element.remove());
  }

  cleanLibrary();

  // The library is assembled by several scripts. Keep removing the old promo
  // shortcut if an older cached bootstrap script inserts it later.
  const observer = new MutationObserver(cleanLibrary);
  observer.observe(document.body, { childList:true, subtree:true });

  const style = document.createElement('style');
  style.id = 'figureloomIllustrationsUiPolish';
  style.textContent = `
    .real-library-shortcut{display:none!important}

    #scienceDrawer .science-categories{
      display:flex!important;
      align-items:center!important;
      gap:9px!important;
      min-height:48px!important;
      margin:0!important;
      padding:10px 14px 12px!important;
      overflow-x:auto!important;
      overflow-y:hidden!important;
      scroll-padding-inline:14px;
      border-bottom:1px solid #e1e6ee;
      scrollbar-width:thin;
    }
    #scienceDrawer .science-categories button{
      flex:0 0 auto!important;
      min-height:31px!important;
      padding:6px 12px!important;
      border-radius:999px!important;
      line-height:1.15!important;
      white-space:nowrap!important;
    }
    #scienceDrawer .science-grid{padding-top:12px!important}

    html[data-figureloom-theme="dark"] #scienceDrawer .science-categories{
      border-bottom-color:#454c57!important;
      background:#292e35!important;
    }

    @media(max-width:700px){
      #scienceDrawer .science-categories{gap:8px!important;padding:9px 11px 11px!important;scroll-padding-inline:11px}
      #scienceDrawer .science-categories button{padding:6px 10px!important}
    }
  `;
  document.head.appendChild(style);

  window.addEventListener('beforeunload', () => observer.disconnect());
})();