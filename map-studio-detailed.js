(() => {
  if (document.querySelector('script[data-figureloom-map-engine="simple"]')) return;
  const script = document.createElement('script');
  script.src = './map-studio-simple.js';
  script.dataset.figureloomMapEngine = 'simple';
  script.async = false;
  script.addEventListener('error', () => {
    console.error('Figureloom interactive Map Studio could not be loaded.');
  }, { once:true });
  document.head.appendChild(script);
})();
