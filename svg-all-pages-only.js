(() => {
  if (window.__figureLoomSeparateSvgPagesV1) return;
  window.__figureLoomSeparateSvgPagesV1 = true;

  const EXPORT_BUTTON_ID = 'figureloomExportAllPagesPptxV6';
  const DUPLICATE_BUTTON_ID = 'figureloomExportAllPagesSvgZipV2';
  const READY_LABEL = '<strong>Export all pages as SVG</strong>';
  const WORKING_LABEL = '<strong>Exporting SVG pages…</strong>';

  function decodeSvgDataUri(dataUri) {
    const value = String(dataUri || '');
    const comma = value.indexOf(',');
    if (comma < 0 || !/^data:image\/svg\+xml/i.test(value)) {
      throw new Error('One exported page did not contain valid SVG data.');
    }

    const header = value.slice(0, comma);
    const payload = value.slice(comma + 1);
    if (/;base64/i.test(header)) {
      const binary = atob(payload);
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return decodeURIComponent(payload);
  }

  function safeBaseName(fileName) {
    return String(fileName || document.getElementById('documentName')?.value || 'FigureLoom')
      .replace(/\.pptx$/i, '')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim() || 'FigureLoom';
  }

  function downloadSvg(source, fileName) {
    const blob = new Blob([source], { type:'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  class SeparateSvgSlide {
    constructor(index) {
      this.index = index;
      this.images = [];
      this.notes = [];
      this.background = null;
    }

    addImage(options = {}) {
      this.images.push({ ...options });
      return this;
    }

    addNotes(notes) {
      this.notes.push(notes);
      return this;
    }
  }

  class SeparateSvgPresentation {
    constructor() {
      this._slides = [];
      this.layout = '';
      this.author = 'FigureLoom';
      this.company = 'FigureLoom';
      this.title = 'FigureLoom';
      this.subject = 'FigureLoom SVG pages';
      this.lang = 'en-US';
    }

    defineLayout() {
      return this;
    }

    addSlide() {
      const slide = new SeparateSvgSlide(this._slides.length + 1);
      this._slides.push(slide);
      return slide;
    }

    createSvgFiles(fileName) {
      if (!this._slides.length) throw new Error('This project does not contain any pages.');
      const base = safeBaseName(fileName);
      return this._slides.map((slide, index) => {
        const image = slide.images[0];
        if (!image?.data) throw new Error(`Page ${index + 1} did not contain SVG data.`);
        const source = decodeSvgDataUri(image.data);
        if (!source.includes('<svg')) throw new Error(`Page ${index + 1} did not contain valid SVG.`);
        return {
          source,
          fileName:`${base}-page-${String(index + 1).padStart(3, '0')}.svg`
        };
      });
    }

    async write(options = {}) {
      return this.createSvgFiles(options.fileName);
    }

    async writeFile(options = {}) {
      const files = this.createSvgFiles(options.fileName);
      files.forEach(file => downloadSvg(file.source, file.fileName));
      return files.map(file => file.fileName);
    }
  }

  function installSeparateSvgExporter() {
    if (window.PptxGenJS !== SeparateSvgPresentation) window.PptxGenJS = SeparateSvgPresentation;
    window.__figureLoomLibraryPromise_PptxGenJS = Promise.resolve(SeparateSvgPresentation);
  }

  function setHtmlIfDifferent(element, html) {
    if (element && element.innerHTML !== html) element.innerHTML = html;
  }

  function updateExportLabels() {
    const button = document.getElementById(EXPORT_BUTTON_ID);
    if (button) {
      const text = button.textContent || '';
      setHtmlIfDifferent(button, button.disabled && text.includes('Building') ? WORKING_LABEL : READY_LABEL);
    }

    const duplicate = document.getElementById(DUPLICATE_BUTTON_ID);
    if (duplicate) {
      duplicate.hidden = true;
      duplicate.setAttribute('aria-hidden', 'true');
      duplicate.style.setProperty('display', 'none', 'important');
    }

    ['officeExportFlatPptx', 'officeExportPptx'].forEach(id => {
      setHtmlIfDifferent(document.getElementById(id), READY_LABEL);
    });
  }

  installSeparateSvgExporter();
  updateExportLabels();

  const observer = new MutationObserver(() => {
    installSeparateSvgExporter();
    updateExportLabels();
  });
  observer.observe(document.body, { childList:true, subtree:true, characterData:true });

  window.FigureLoomSeparateSvgPagesExport = Object.freeze({
    SeparateSvgPresentation,
    updateExportLabels
  });
})();