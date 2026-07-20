(() => {
  if (window.__figureLoomVerifiedPptxWriterV1) return;
  window.__figureLoomVerifiedPptxWriterV1 = true;

  const GLOBAL_NAME = 'PptxGenJS';
  const PROMISE_KEY = `__figureLoomLibraryPromise_${GLOBAL_NAME}`;
  const ORIGINAL_PROMISE = window[PROMISE_KEY] || null;
  const SVG_PREFIX = 'data:image/svg+xml';
  const JSZIP_SOURCES = [
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'
  ];

  let reliableClass = null;
  let reliableLoad = null;
  let zipLoad = null;

  function bytesToBase64(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunk) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
    }
    return btoa(binary);
  }

  function dataUriToBytes(dataUri) {
    const comma = String(dataUri || '').indexOf(',');
    if (comma < 0) throw new Error('The exported page image was not a valid data URI.');
    const header = dataUri.slice(0, comma);
    const payload = dataUri.slice(comma + 1);
    if (/;base64/i.test(header)) {
      const binary = atob(payload);
      return Uint8Array.from(binary, character => character.charCodeAt(0));
    }
    return new TextEncoder().encode(decodeURIComponent(payload));
  }

  async function hashBytes(bytes) {
    if (globalThis.crypto?.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
    }
    let hash = 2166136261;
    for (const value of bytes) {
      hash ^= value;
      hash = Math.imul(hash, 16777619);
    }
    return `fnv-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  function svgDimensions(source) {
    const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
    if (parsed.querySelector('parsererror')) throw new Error('A page produced invalid SVG before PowerPoint conversion.');
    const svg = parsed.documentElement;
    const viewBox = String(svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    const viewWidth = viewBox.length === 4 && Number.isFinite(viewBox[2]) ? viewBox[2] : 0;
    const viewHeight = viewBox.length === 4 && Number.isFinite(viewBox[3]) ? viewBox[3] : 0;
    const width = viewWidth || Number.parseFloat(svg.getAttribute('width')) || 1200;
    const height = viewHeight || Number.parseFloat(svg.getAttribute('height')) || 750;
    if (!(width > 0 && height > 0)) throw new Error('A page had invalid canvas dimensions.');
    return { width, height };
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('PowerPoint page rasterization timed out.')), 30000);
      canvas.toBlob(blob => {
        clearTimeout(timer);
        if (!blob?.size) reject(new Error('PowerPoint page rasterization produced an empty image.'));
        else resolve(blob);
      }, 'image/png');
    });
  }

  async function rasterizeSvgData(svgData, pageNumber) {
    const svgBytes = dataUriToBytes(svgData);
    const source = new TextDecoder().decode(svgBytes);
    const { width, height } = svgDimensions(source);
    const maxPixels = 12000000;
    const scale = Math.max(1, Math.min(2, 4096 / width, 4096 / height, Math.sqrt(maxPixels / (width * height))));
    const pixelWidth = Math.max(1, Math.round(width * scale));
    const pixelHeight = Math.max(1, Math.round(height * scale));
    const svgBlob = new Blob([svgBytes], { type:'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Page ${pageNumber} did not finish loading for PowerPoint conversion.`)), 30000);
        image.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        image.onerror = () => {
          clearTimeout(timer);
          reject(new Error(`Page ${pageNumber} could not be converted to a stable PowerPoint image.`));
        };
        image.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      const context = canvas.getContext('2d', { alpha:true });
      if (!context) throw new Error(`Page ${pageNumber} could not create a conversion canvas.`);
      context.clearRect(0, 0, pixelWidth, pixelHeight);
      context.drawImage(image, 0, 0, pixelWidth, pixelHeight);
      const pngBlob = await canvasToBlob(canvas);
      const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
      canvas.width = 1;
      canvas.height = 1;
      return {
        data:`data:image/png;base64,${bytesToBase64(pngBytes)}`,
        bytes:pngBytes,
        hash:await hashBytes(pngBytes),
        width:pixelWidth,
        height:pixelHeight
      };
    } finally {
      image.src = '';
      URL.revokeObjectURL(objectUrl);
    }
  }

  function loadScript(url, globalName, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let settled = false;
      const finish = error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
        if (window[globalName]) resolve(window[globalName]);
        else {
          script.remove();
          reject(error || new Error(`Could not load ${globalName}.`));
        }
      };
      script.src = url;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'no-referrer';
      script.onload = () => finish();
      script.onerror = () => finish(new Error(`Could not load ${url}.`));
      const timer = setTimeout(() => finish(new Error(`Timed out loading ${url}.`)), timeoutMs);
      document.head.appendChild(script);
    });
  }

  async function ensureJsZip() {
    if (typeof window.JSZip === 'function') return window.JSZip;
    if (zipLoad) return zipLoad;
    zipLoad = (async () => {
      const existing = window.__figureLoomLibraryPromise_JSZip;
      if (existing) {
        try {
          const loaded = await existing;
          if (typeof loaded === 'function') return loaded;
        } catch {}
      }
      const failures = [];
      for (const source of JSZIP_SOURCES) {
        try {
          const loaded = await loadScript(source, 'JSZip');
          if (typeof loaded === 'function') return loaded;
        } catch (error) {
          failures.push(error?.message || String(error));
        }
      }
      throw new Error(`The PowerPoint verifier could not load its ZIP reader. ${failures.join(' ')}`);
    })();
    try {
      return await zipLoad;
    } finally {
      if (typeof window.JSZip !== 'function') zipLoad = null;
    }
  }

  function resolveZipPath(baseDirectory, target) {
    const parts = `${baseDirectory}/${target}`.split('/');
    const resolved = [];
    for (const part of parts) {
      if (!part || part === '.') continue;
      if (part === '..') resolved.pop();
      else resolved.push(part);
    }
    return resolved.join('/');
  }

  async function validatePptxBlob(blob, expectedHashes) {
    const JSZip = await ensureJsZip();
    const archive = await JSZip.loadAsync(blob);
    const slideNames = Object.keys(archive.files)
      .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((left, right) => Number(left.match(/\d+/)?.[0]) - Number(right.match(/\d+/)?.[0]));
    if (slideNames.length !== expectedHashes.length) {
      throw new Error(`PowerPoint verification found ${slideNames.length} slides instead of ${expectedHashes.length}.`);
    }

    const actualHashes = [];
    const mediaTargets = [];
    for (let index = 0; index < slideNames.length; index += 1) {
      const slideNumber = index + 1;
      const relationshipPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
      const relationshipFile = archive.file(relationshipPath);
      if (!relationshipFile) throw new Error(`PowerPoint slide ${slideNumber} had no relationship file.`);
      const relationshipXml = await relationshipFile.async('text');
      const parsed = new DOMParser().parseFromString(relationshipXml, 'application/xml');
      if (parsed.querySelector('parsererror')) throw new Error(`PowerPoint slide ${slideNumber} had invalid relationships.`);
      const imageTargets = [...parsed.getElementsByTagNameNS('*', 'Relationship')]
        .filter(node => /\/image$/i.test(node.getAttribute('Type') || ''))
        .map(node => node.getAttribute('Target'))
        .filter(Boolean);
      if (!imageTargets.length) throw new Error(`PowerPoint slide ${slideNumber} did not contain its page image.`);

      let matched = null;
      for (const target of imageTargets) {
        const mediaPath = resolveZipPath('ppt/slides', target);
        const mediaFile = archive.file(mediaPath);
        if (!mediaFile) continue;
        const mediaBytes = await mediaFile.async('uint8array');
        const mediaHash = await hashBytes(mediaBytes);
        if (mediaHash === expectedHashes[index]) {
          matched = { mediaPath, mediaHash };
          break;
        }
      }
      if (!matched) {
        throw new Error(`PowerPoint slide ${slideNumber} did not contain the independently rendered page ${slideNumber}.`);
      }
      mediaTargets.push(matched.mediaPath);
      actualHashes.push(matched.mediaHash);
    }

    return { slideCount:slideNames.length, actualHashes, mediaTargets };
  }

  function normalizeBlob(output) {
    if (output instanceof Blob) return output;
    if (output instanceof ArrayBuffer) return new Blob([output], { type:'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    if (ArrayBuffer.isView(output)) return new Blob([output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength)], { type:'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    throw new Error('The PowerPoint converter returned an unsupported file format.');
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'FigureLoom.pptx';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function installReliableClass(ActualPptxGenJS) {
    if (reliableClass) return reliableClass;
    if (typeof ActualPptxGenJS !== 'function') throw new Error('The PowerPoint converter did not expose a constructor.');
    if (ActualPptxGenJS.__figureLoomVerifiedRasterWriter) {
      reliableClass = ActualPptxGenJS;
      window[GLOBAL_NAME] = reliableClass;
      return reliableClass;
    }

    class FigureLoomVerifiedPptxGenJS extends ActualPptxGenJS {
      constructor(...args) {
        super(...args);
        this.__figureLoomQueuedPageImages = [];
        this.__figureLoomPageImagesMaterialized = false;
        this.__figureLoomLastVerification = null;
      }

      addSlide(...args) {
        const slide = super.addSlide(...args);
        const originalAddImage = slide.addImage.bind(slide);
        slide.addImage = options => {
          if (String(options?.data || '').startsWith(SVG_PREFIX)) {
            this.__figureLoomQueuedPageImages.push({
              slide,
              originalAddImage,
              options:{ ...options },
              pageNumber:this.__figureLoomQueuedPageImages.length + 1
            });
            return slide;
          }
          return originalAddImage(options);
        };
        return slide;
      }

      async __figureLoomMaterializePageImages() {
        if (this.__figureLoomPageImagesMaterialized) return this.__figureLoomQueuedPageImages;
        if (!this.__figureLoomQueuedPageImages.length) throw new Error('PowerPoint did not receive any independently rendered pages.');
        for (const record of this.__figureLoomQueuedPageImages) {
          const raster = await rasterizeSvgData(record.options.data, record.pageNumber);
          record.raster = raster;
          record.originalAddImage({
            ...record.options,
            data:raster.data,
            path:undefined
          });
        }
        this.__figureLoomPageImagesMaterialized = true;
        return this.__figureLoomQueuedPageImages;
      }

      async writeVerifiedBlob(options = {}) {
        const records = await this.__figureLoomMaterializePageImages();
        const raw = await super.write({
          outputType:'blob',
          compression:options?.compression !== false
        });
        const blob = normalizeBlob(raw);
        if (!blob.size) throw new Error('The PowerPoint converter produced an empty file.');
        const expectedHashes = records.map(record => record.raster.hash);
        this.__figureLoomLastVerification = await validatePptxBlob(blob, expectedHashes);
        return blob;
      }

      async writeFile(options = {}) {
        const normalized = typeof options === 'string' ? { fileName:options } : (options || {});
        const blob = await this.writeVerifiedBlob(normalized);
        downloadBlob(blob, normalized.fileName || 'FigureLoom.pptx');
        return this;
      }
    }

    Object.defineProperty(FigureLoomVerifiedPptxGenJS, '__figureLoomVerifiedRasterWriter', { value:true });
    Object.defineProperty(FigureLoomVerifiedPptxGenJS, '__figureLoomActualConstructor', { value:ActualPptxGenJS });
    reliableClass = FigureLoomVerifiedPptxGenJS;
    window.__figureLoomActualPptxGenJS = ActualPptxGenJS;
    window[GLOBAL_NAME] = reliableClass;
    return reliableClass;
  }

  async function loadReliableClass() {
    if (reliableClass) return reliableClass;
    if (window[GLOBAL_NAME]?.__figureLoomVerifiedRasterWriter) return installReliableClass(window[GLOBAL_NAME]);
    if (reliableLoad) return reliableLoad;

    reliableLoad = (async () => {
      let Actual = null;
      if (typeof window[GLOBAL_NAME] === 'function' && !window[GLOBAL_NAME].__figureLoomVerifiedRasterWriter) {
        Actual = window[GLOBAL_NAME];
      } else if (ORIGINAL_PROMISE) {
        Actual = await ORIGINAL_PROMISE;
      } else if (window.FigureLoomPowerPointConverter?.load) {
        Actual = await window.FigureLoomPowerPointConverter.load();
      }
      return installReliableClass(Actual || window[GLOBAL_NAME]);
    })();

    try {
      return await reliableLoad;
    } finally {
      if (!reliableClass) reliableLoad = null;
    }
  }

  const reliableThenable = {
    then(onFulfilled, onRejected) {
      return loadReliableClass().then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return loadReliableClass().catch(onRejected);
    },
    finally(onFinally) {
      return loadReliableClass().finally(onFinally);
    }
  };

  window[PROMISE_KEY] = reliableThenable;
  window.FigureLoomReliablePptx = Object.freeze({
    load:loadReliableClass,
    install:installReliableClass,
    rasterizeSvgData,
    validatePptxBlob,
    hashBytes,
    get constructor() {
      return reliableClass;
    }
  });
})();