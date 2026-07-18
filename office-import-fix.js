(() => {
  if (window.__figureLoomImporterRuntimeLoaderV1) return;
  window.__figureLoomImporterRuntimeLoaderV1 = true;
  window.__figureLoomImportTextFidelityV1 = true;

  const CHUNK_URLS = Array.from(
    { length:8 },
    (_, index) => `office-import-runtime-${String(index).padStart(2, '0')}.b64?v=text-fidelity-runtime-v1`
  );
  const EXPECTED_BASE64_LENGTH = 37620;
  const EXPECTED_SOURCE_LENGTH = 28214;

  function setImportBusy(busy) {
    const input = document.getElementById('officePptxFile');
    const button = document.getElementById('officeImportPptx');
    if (input) input.disabled = busy;
    if (button) button.disabled = busy;
  }

  async function fetchChunk(url) {
    const response = await fetch(url, { cache:'no-store' });
    if (!response.ok) throw new Error(`Importer runtime request failed (${response.status}).`);
    return response.text();
  }

  function decodeRuntime(encoded) {
    const clean = encoded.replace(/\s+/g, '');
    if (clean.length !== EXPECTED_BASE64_LENGTH) {
      throw new Error('The presentation importer runtime was incomplete.');
    }
    const binary = atob(clean);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    const source = new TextDecoder().decode(bytes);
    if (source.length !== EXPECTED_SOURCE_LENGTH) {
      throw new Error('The presentation importer runtime did not decode correctly.');
    }
    return source;
  }

  function executeRuntime(source) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([source], { type:'text/javascript' }));
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      script.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('The presentation importer runtime could not start.'));
      };
      document.head.appendChild(script);
    });
  }

  async function start() {
    setImportBusy(true);
    try {
      const chunks = await Promise.all(CHUNK_URLS.map(fetchChunk));
      await executeRuntime(decodeRuntime(chunks.join('')));
    } catch (error) {
      console.error('FigureLoom presentation importer failed to start.', error);
      const status = document.getElementById('officeStatus');
      if (status) status.textContent = 'Presentation importer could not start.';
    } finally {
      setImportBusy(false);
    }
  }

  void start();
})();
