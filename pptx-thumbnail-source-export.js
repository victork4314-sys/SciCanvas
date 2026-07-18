(() => {
  if (window.__figureLoomThumbnailSourcePptx) return;
  window.__figureLoomThumbnailSourcePptx = true;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XLINK_NS = 'http://www.w3.org/1999/xlink';
  const PPTXGEN_CDN = 'https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs/dist/pptxgen.bundle.js';
  const MAX_IMAGE_WIDTH = 1280;
  const JPEG_QUALITY = 0.94;
  let exporting = false;

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const cloneValue = value => {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };

  function waitForPaint() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function loadPptxGenJs() {
    if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
    if (loadPptxGenJs.promise) return loadPptxGenJs.promise;
    loadPptxGenJs.promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PPTXGEN_CDN;
      script.async = true;
      script.onload = () => window.PptxGenJS
        ? resolve(window.PptxGenJS)
        : reject(new Error('PowerPoint library loaded without its browser export.'));
      script.onerror = () => reject(new Error('Could not load the PowerPoint export library. Check the connection and try again.'));
      document.head.appendChild(script);
    });
    return loadPptxGenJs.promise;
  }

  function capturePages() {
    if (typeof syncPage === 'function') syncPage();
    const pages = Array.isArray(state.pages) && state.pages.length
      ? state.pages
      : [{ id:'page-1', name:documentName.value || 'Figure 1', objects:state.objects || [] }];
    return cloneValue(pages);
  }

  function objectSignature(page) {
    try { return JSON.stringify(page?.objects || []); }
    catch { return String(page?.id || ''); }
  }

  async function collectRenderedPreviews(pages, retry = true) {
    if (typeof renderPages !== 'function') {
      throw new Error('The page preview renderer has not loaded yet. Reload FigureLoom and try again.');
    }

    renderPages();
    await waitForPaint();
    await wait(140);
    await waitForPaint();

    const deadline = Date.now() + 5000;
    let nodes = [];
    while (Date.now() < deadline) {
      nodes = [...document.querySelectorAll('#pagesList .page-preview-svg')];
      if (nodes.length === pages.length && nodes.every(node => node.childNodes.length > 0)) break;
      await wait(80);
    }

    if (nodes.length !== pages.length) {
      throw new Error(`FigureLoom rendered ${nodes.length} page preview${nodes.length === 1 ? '' : 's'}, but this project contains ${pages.length}. Export stopped instead of repeating a slide.`);
    }

    const clones = nodes.map((node, index) => {
      const clone = node.cloneNode(true);
      clone.setAttribute('xmlns', SVG_NS);
      clone.setAttribute('data-figureloom-export-page', String(index + 1));
      const metadata = document.createElementNS(SVG_NS, 'metadata');
      metadata.textContent = JSON.stringify({
        figureloomPage:index + 1,
        id:String(pages[index]?.id || `page-${index + 1}`),
        name:String(pages[index]?.name || `Page ${index + 1}`)
      });
      clone.prepend(metadata);
      return clone;
    });

    const serialized = clones.map(node => new XMLSerializer().serializeToString(node));
    for (let first = 0; first < serialized.length; first += 1) {
      for (let second = first + 1; second < serialized.length; second += 1) {
        if (serialized[first] !== serialized[second]) continue;
        if (objectSignature(pages[first]) === objectSignature(pages[second])) continue;
        if (retry) {
          await wait(250);
          return collectRenderedPreviews(pages, false);
        }
        throw new Error(`Pages ${first + 1} and ${second + 1} have different project data but the same rendered preview. Export stopped instead of substituting one page for another.`);
      }
    }

    return clones;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Could not read an embedded image.'));
      reader.readAsDataURL(blob);
    });
  }

  async function inlineUrl(url) {
    if (!url || /^data:/i.test(url) || /^#/.test(url)) return url;
    const response = await fetch(url, { cache:'force-cache' });
    if (!response.ok) throw new Error(`Could not load an embedded image (${response.status}).`);
    return blobToDataUrl(await response.blob());
  }

  async function inlinePreviewImages(svg, pageNumber) {
    const svgImages = [...svg.querySelectorAll('image')];
    const htmlImages = [...svg.querySelectorAll('img')];

    for (const image of svgImages) {
      const href = image.getAttribute('href') || image.getAttributeNS(XLINK_NS, 'href');
      if (!href || /^data:/i.test(href) || /^#/.test(href)) continue;
      try {
        const data = await inlineUrl(href);
        image.setAttribute('href', data);
        image.setAttributeNS(XLINK_NS, 'href', data);
      } catch (error) {
        throw new Error(`Page ${pageNumber} contains an image that could not be prepared for PowerPoint: ${error.message}`);
      }
    }

    for (const image of htmlImages) {
      const src = image.getAttribute('src');
      if (!src || /^data:/i.test(src)) continue;
      try {
        image.setAttribute('src', await inlineUrl(src));
      } catch (error) {
        throw new Error(`Page ${pageNumber} contains an image that could not be prepared for PowerPoint: ${error.message}`);
      }
    }
  }

  function dimensionsForPreview(svg) {
    const viewBox = String(svg.getAttribute('viewBox') || '0 0 1200 750').trim().split(/\s+/).map(Number);
    const width = Math.max(1, Number(viewBox[2]) || Number(svg.getAttribute('width')) || 1200);
    const height = Math.max(1, Number(viewBox[3]) || Number(svg.getAttribute('height')) || 750);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    return { width, height };
  }

  async function loadSerializedSvg(source, pageNumber) {
    const url = URL.createObjectURL(new Blob([source], { type:'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    image.decoding = 'sync';
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error(`Page ${pageNumber} could not be rendered into a PowerPoint image.`));
        image.src = url;
      });
      if (typeof image.decode === 'function') await image.decode().catch(() => {});
      await waitForPaint();
      return { image, url };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  async function jpegFromPreview(preview, pageNumber) {
    const clone = preview.cloneNode(true);
    await inlinePreviewImages(clone, pageNumber);
    const dimensions = dimensionsForPreview(clone);
    const source = new XMLSerializer().serializeToString(clone);
    const loaded = await loadSerializedSvg(source, pageNumber);
    const targetWidth = Math.max(1, Math.min(MAX_IMAGE_WIDTH, Math.round(dimensions.width)));
    const targetHeight = Math.max(1, Math.round(targetWidth * dimensions.height / dimensions.width));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    try {
      const context = canvas.getContext('2d', { alpha:false });
      if (!context) throw new Error('This browser could not create a PowerPoint image.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, targetWidth, targetHeight);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(loaded.image, 0, 0, targetWidth, targetHeight);

      // One effectively invisible pixel guarantees PowerPoint never deduplicates two pages.
      context.fillStyle = `rgb(${(pageNumber * 37) % 255},${(pageNumber * 73) % 255},${(pageNumber * 109) % 255})`;
      context.fillRect(targetWidth - 1, targetHeight - 1, 1, 1);
      return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    } finally {
      loaded.image.src = 'data:,';
      URL.revokeObjectURL(loaded.url);
      canvas.width = 1;
      canvas.height = 1;
      await wait(120);
      await waitForPaint();
    }
  }

  function fileName() {
    if (typeof safeFileName === 'function') return safeFileName('pptx');
    const base = String(documentName?.value || 'FigureLoom').trim().replace(/[^a-z0-9_-]+/gi, '-') || 'FigureLoom';
    return `${base}.pptx`;
  }

  async function exportThumbnailPowerPoint(options = {}) {
    if (exporting) return;
    exporting = true;
    const pages = capturePages();
    const progress = document.getElementById('figureloomExportAllPagesPptx') || document.querySelector('[data-export="pptx"]');
    const originalHtml = progress?.innerHTML;

    try {
      if (!pages.length) throw new Error('This project does not contain any pages.');
      if (progress) {
        progress.disabled = true;
        progress.innerHTML = '<strong>Preparing all rendered pages…</strong><small>Please keep this window open</small>';
      }

      const previews = await collectRenderedPreviews(pages);
      const Pptx = await loadPptxGenJs();
      const pptx = new Pptx();
      const dimensions = window.currentCanvasSize?.() || { widthMm:304.8, heightMm:190.5 };
      const slideWidth = (Number(dimensions.widthMm) || 304.8) / 25.4;
      const slideHeight = (Number(dimensions.heightMm) || 190.5) / 25.4;
      pptx.defineLayout({ name:'FIGURELOOM_PAGE_PREVIEWS', width:slideWidth, height:slideHeight });
      pptx.layout = 'FIGURELOOM_PAGE_PREVIEWS';
      pptx.author = 'FigureLoom';
      pptx.company = 'FigureLoom';
      pptx.title = documentName.value.trim() || 'FigureLoom figure';
      pptx.subject = 'Scientific illustration presentation';
      pptx.lang = 'en-US';

      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        if (progress) progress.innerHTML = `<strong>Exporting slide ${index + 1} of ${pages.length}…</strong><small>${page.name || `Page ${index + 1}`}</small>`;
        const data = await jpegFromPreview(previews[index], index + 1, options);
        const slide = pptx.addSlide();
        slide.background = { color:'FFFFFF' };
        slide.addImage({
          data,
          x:0,
          y:0,
          w:slideWidth,
          h:slideHeight,
          altText:page.name || `FigureLoom page ${index + 1}`
        });
        if (page.notes) slide.addNotes?.(String(page.notes));
      }

      if (progress) progress.innerHTML = '<strong>Building .pptx…</strong><small>Finishing every rendered page</small>';
      await pptx.writeFile({ fileName:fileName(), compression:true });
    } catch (error) {
      console.error('Page-preview PowerPoint export failed', error);
      throw error;
    } finally {
      if (progress) {
        progress.disabled = false;
        progress.innerHTML = originalHtml;
      }
      exporting = false;
    }
  }

  window.FigureLoomExportPowerPointAllPages = options => exportThumbnailPowerPoint(options);
  window.FigureLoomThumbnailPowerPoint = exportThumbnailPowerPoint;

  document.addEventListener('click', event => {
    const legacyAllPages = event.target.closest?.('button[data-export="pptx"]');
    if (!legacyAllPages) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.getElementById('exportMenu')?.classList.remove('open');
    exportThumbnailPowerPoint({ includeGrid:Boolean(document.getElementById('exportGrid')?.checked) })
      .catch(error => alert(`PowerPoint export failed: ${error.message}`));
  }, true);
})();