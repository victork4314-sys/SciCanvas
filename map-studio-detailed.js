(() => {
  function loadOnce(src, key) {
    if (document.querySelector(`script[data-figureloom-map-engine="${key}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.dataset.figureloomMapEngine = key;
    script.async = false;
    script.addEventListener('error', () => {
      console.error(`Figureloom map module ${key} could not be loaded.`);
    }, { once:true });
    document.head.appendChild(script);
  }

  loadOnce('./map-studio-reliable.js', 'reliable');
  loadOnce('./map-studio-local-basemap.js', 'local-basemap');
})();
