(() => {
  if (window.__figureLoomImporterCoreLoaderV5) return;
  window.__figureLoomImporterCoreLoaderV5 = true;

  const CORE_URL = 'office-import-core.js?v=text-fidelity-v1';

  function setImportBusy(busy) {
    const input = document.getElementById('officePptxFile');
    const button = document.getElementById('officeImportPptx');
    if (input) input.disabled = busy;
    if (button) button.disabled = busy;
  }

  function loadScriptSource(source) {
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
        reject(new Error('The presentation importer could not start.'));
      };
      document.head.appendChild(script);
    });
  }

  function loadCoreDirectly() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CORE_URL;
      script.onload = resolve;
      script.onerror = () => reject(new Error('The presentation importer core could not load.'));
      document.head.appendChild(script);
    });
  }

  function replaceExactly(source, before, after, label) {
    if (!source.includes(before)) throw new Error(`Importer patch point missing: ${label}`);
    return source.replace(before, after);
  }

  function addImporterRules(source) {
    source = replaceExactly(
      source,
      `  function placeholderMap(doc) {
    const map = new Map();
    if (!doc) return map;
    [...all(doc, 'sp'), ...all(doc, 'pic'), ...all(doc, 'graphicFrame')].forEach(node => {
      const key = placeholderKey(node);
      const transformValue = rawTransform(node);
      if (key && transformValue) map.set(key, transformValue);
    });
    return map;
  }`,
      `  function placeholderMap(doc) {
    const map = new Map();
    if (!doc) return map;
    [...all(doc, 'sp'), ...all(doc, 'pic'), ...all(doc, 'graphicFrame')].forEach(node => {
      const key = placeholderKey(node);
      const transformValue = rawTransform(node);
      if (key && transformValue) map.set(key, transformValue);
    });
    return map;
  }

  function placeholderNodeMap(doc) {
    const map = new Map();
    if (!doc) return map;
    all(doc, 'sp').forEach(node => {
      const key = placeholderKey(node);
      if (key && !map.has(key)) map.set(key, node);
    });
    const textStyles = first(doc, 'txStyles');
    const titleStyle = first(textStyles, 'titleStyle');
    const bodyStyle = first(textStyles, 'bodyStyle');
    const otherStyle = first(textStyles, 'otherStyle');
    if (titleStyle) map.set('__textStyle:title', titleStyle);
    if (bodyStyle) map.set('__textStyle:body', bodyStyle);
    if (otherStyle) map.set('__textStyle:other', otherStyle);
    return map;
  }

  function inheritedPlaceholderShapes(node, maps = []) {
    const key = placeholderKey(node);
    const placeholder = first(node, 'ph');
    const type = placeholder?.getAttribute('type') || 'body';
    const styleKey = ['title','ctrTitle'].includes(type)
      ? '__textStyle:title'
      : ['body','obj','subTitle'].includes(type)
        ? '__textStyle:body'
        : '__textStyle:other';
    const shapes = [];
    maps.forEach(map => {
      const shape = key ? map?.get?.(key) : null;
      const style = map?.get?.(styleKey);
      if (shape && !shapes.includes(shape)) shapes.push(shape);
      if (style && !shapes.includes(style)) shapes.push(style);
    });
    return shapes;
  }`,
      'placeholder text inheritance helpers'
    );

    source = replaceExactly(
      source,
      `  function textStyle(shape, theme, colorMap) {
    const textBody = first(shape, 'txBody');
    const runProperties = first(textBody, 'rPr') || first(textBody, 'defRPr') || first(textBody, 'endParaRPr');
    const paragraphProperties = first(textBody, 'pPr');
    const bodyProperties = first(textBody, 'bodyPr');
    const solidFill = directFirst(runProperties, 'solidFill') || first(runProperties, 'solidFill');
    const schemeFont = first(runProperties, 'latin')?.getAttribute('typeface') || '';
    const fontFamily = schemeFont === '+mj-lt'
      ? theme.majorFont
      : schemeFont === '+mn-lt'
        ? theme.minorFont
        : schemeFont || theme.minorFont;
    const alignment = paragraphProperties?.getAttribute('algn');
    const anchor = bodyProperties?.getAttribute('anchor');
    return {
      fill:`#${resolvedColor(solidFill || runProperties, '172033', theme, colorMap)}`,
      fontSize:Math.max(8, number(runProperties?.getAttribute('sz'), 2400) / 100 * .75),
      fontFamily,
      fontWeight:runProperties?.getAttribute('b') === '1' ? 700 : 400,
      fontStyle:runProperties?.getAttribute('i') === '1' ? 'italic' : 'normal',
      textAlign:alignment === 'ctr' ? 'center' : alignment === 'r' ? 'right' : alignment === 'just' ? 'justify' : 'left',
      verticalAlign:anchor === 'ctr' ? 'middle' : anchor === 'b' ? 'bottom' : 'top'
    };
  }`,
      `  function textPropertyChains(shape, inheritedShapes = []) {
    const sources = [shape, ...inheritedShapes].filter(Boolean);
    const bodies = [];
    const bodyProperties = [];
    const paragraphProperties = [];
    const runProperties = [];

    sources.forEach(source => {
      const body = first(source, 'txBody');
      if (body) bodies.push(body);
      const bodyPr = body ? (directFirst(body, 'bodyPr') || first(body, 'bodyPr')) : null;
      if (bodyPr) bodyProperties.push(bodyPr);

      const paragraph = body ? first(body, 'p') : null;
      const paragraphPr = directFirst(paragraph, 'pPr') || first(paragraph, 'pPr');
      const level = Math.max(1, number(paragraphPr?.getAttribute('lvl'), 0) + 1);
      const styleContainer = ['titleStyle','bodyStyle','otherStyle'].includes(local(source)) ? source : null;
      const listStyle = body ? (directFirst(body, 'lstStyle') || first(body, 'lstStyle')) : styleContainer;
      const levelPr = listStyle
        ? directFirst(listStyle, `lvl${level}pPr`)
          || directFirst(listStyle, 'lvl1pPr')
          || first(listStyle, `lvl${level}pPr`)
          || first(listStyle, 'lvl1pPr')
        : null;
      if (paragraphPr) paragraphProperties.push(paragraphPr);
      if (levelPr) paragraphProperties.push(levelPr);

      const firstRun = directChildren(paragraph).find(child => ['r','fld'].includes(local(child)));
      const directRunPr = first(firstRun, 'rPr');
      const defaultRunPr = directFirst(paragraphPr, 'defRPr')
        || first(paragraphPr, 'defRPr')
        || directFirst(levelPr, 'defRPr')
        || first(levelPr, 'defRPr')
        || first(body, 'defRPr')
        || first(body, 'endParaRPr');
      if (directRunPr) runProperties.push(directRunPr);
      if (defaultRunPr) runProperties.push(defaultRunPr);
    });

    return { bodies, bodyProperties, paragraphProperties, runProperties };
  }

  function firstAttribute(nodes, name, fallback = null) {
    for (const node of nodes || []) {
      const value = node?.getAttribute?.(name);
      if (value != null && value !== '') return value;
    }
    return fallback;
  }

  function powerpointBoolean(value) {
    return ['1','true','on'].includes(String(value || '').toLowerCase());
  }

  function textStyle(shape, theme, colorMap, inheritedShapes = [], scaleX = 1 / 9525, scaleY = 1 / 9525) {
    const chains = textPropertyChains(shape, inheritedShapes);
    const colorSource = chains.runProperties.find(properties =>
      directFirst(properties, 'solidFill')
      || first(properties, 'solidFill')
      || colorNodeWithin(properties)
    );
    const fontNode = chains.runProperties
      .map(properties => first(properties, 'latin'))
      .find(node => node?.getAttribute('typeface'));
    const fontToken = fontNode?.getAttribute('typeface') || '';
    const resolvedFont = fontToken === '+mj-lt'
      ? theme.majorFont
      : fontToken === '+mn-lt'
        ? theme.minorFont
        : fontToken || theme.minorFont;

    const autoFit = chains.bodies.map(body => first(body, 'normAutofit')).find(Boolean);
    const fontScale = clamp(number(autoFit?.getAttribute('fontScale'), 100000) / 100000, .1, 1);
    const sizeHundredths = number(firstAttribute(chains.runProperties, 'sz', 2400), 2400);
    const fontSize = Math.max(6, sizeHundredths / 100 * 12700 * scaleY * fontScale);

    const alignment = firstAttribute(chains.paragraphProperties, 'algn', 'l');
    const anchor = firstAttribute(chains.bodyProperties, 'anchor', 't');
    const wrapMode = firstAttribute(chains.bodyProperties, 'wrap', 'square');
    const lineSpacing = chains.paragraphProperties
      .map(properties => directFirst(properties, 'lnSpc') || first(properties, 'lnSpc'))
      .find(Boolean);
    const percentSpacing = first(lineSpacing, 'spcPct');
    const pointSpacing = first(lineSpacing, 'spcPts');
    let lineHeight = 1;
    if (percentSpacing) lineHeight = number(percentSpacing.getAttribute('val'), 100000) / 100000;
    else if (pointSpacing) {
      const spacingPixels = number(pointSpacing.getAttribute('val')) / 100 * 12700 * scaleY;
      lineHeight = spacingPixels / Math.max(1, fontSize);
    }

    return {
      fill:`#${resolvedColor(colorSource, theme.colors.dk1 || '172033', theme, colorMap)}`,
      fontSize,
      fontFamily:`${resolvedFont}, Arial, sans-serif`,
      fontWeight:powerpointBoolean(firstAttribute(chains.runProperties, 'b', '0')) ? 700 : 400,
      fontStyle:powerpointBoolean(firstAttribute(chains.runProperties, 'i', '0')) ? 'italic' : 'normal',
      textAlign:alignment === 'ctr' ? 'center' : alignment === 'r' ? 'right' : alignment === 'just' || alignment === 'dist' ? 'justify' : 'left',
      textVerticalAlign:anchor === 'ctr' ? 'middle' : anchor === 'b' ? 'bottom' : 'top',
      textFlow:wrapMode === 'none' ? 'single' : 'wrap',
      textPadding:0,
      lineHeight:Math.max(1, lineHeight)
    };
  }

  function textContentBounds(bounds, shape, inheritedShapes = [], scaleX = 1 / 9525, scaleY = 1 / 9525) {
    const { bodyProperties } = textPropertyChains(shape, inheritedShapes);
    const left = number(firstAttribute(bodyProperties, 'lIns', 91440), 91440) * scaleX;
    const right = number(firstAttribute(bodyProperties, 'rIns', 91440), 91440) * scaleX;
    const top = number(firstAttribute(bodyProperties, 'tIns', 45720), 45720) * scaleY;
    const bottom = number(firstAttribute(bodyProperties, 'bIns', 45720), 45720) * scaleY;
    return {
      ...bounds,
      x:bounds.x + left,
      y:bounds.y + top,
      width:Math.max(6, bounds.width - left - right),
      height:Math.max(6, bounds.height - top - bottom)
    };
  }`,
      'PowerPoint text styling and metrics'
    );

    source = replaceExactly(
      source,
      `      const bounds = transform(node, nodeContext, inheritedMaps);
      const sharedGroup = groupId();`,
      `      const bounds = transform(node, nodeContext, inheritedMaps);
      const sharedGroup = groupId();
      const inheritedTextShapes = inheritedPlaceholderShapes(node, options.inheritedTextMaps || []);`,
      'placeholder text lookup'
    );

    source = replaceExactly(
      source,
      `      if (text) {
        const style = textStyle(node, theme, colorMap);
        objects.push({
          id:uidSafe(),
          type:'text',
          name:`${objectName(node, 'Imported text')} text`,
          ...bounds,
          text,
          ...style,
          stroke:style.fill,
          opacity:1,
          visible:true,
          groupId:hasVisualShape ? sharedGroup : null,
          autoHeight:false,
          wrap:true,
          metadata:{ source:'PowerPoint text', sourcePart:part.path }
        });
      }`,
      `      if (text) {
        const style = textStyle(
          node,
          theme,
          colorMap,
          inheritedTextShapes,
          nodeContext.scaleX,
          nodeContext.scaleY
        );
        const contentBounds = textContentBounds(
          bounds,
          node,
          inheritedTextShapes,
          nodeContext.scaleX,
          nodeContext.scaleY
        );
        objects.push({
          id:uidSafe(),
          type:'text',
          name:`${objectName(node, 'Imported text')} text`,
          ...contentBounds,
          text,
          ...style,
          stroke:style.fill,
          opacity:1,
          visible:true,
          groupId:hasVisualShape ? sharedGroup : null,
          autoHeight:false,
          metadata:{
            source:'PowerPoint text',
            sourcePart:part.path,
            originalTextBox:bounds
          }
        });
      }`,
      'PowerPoint text layer placement'
    );

    source = replaceExactly(
      source,
      `    const widthEmu = number(slideSize?.getAttribute('cx'), 12192000);
    const heightEmu = number(slideSize?.getAttribute('cy'), 6858000);
    const size = canvasSize();
    const scaleX = size.width / widthEmu;
    const scaleY = size.height / heightEmu;`,
      `    const widthEmu = number(slideSize?.getAttribute('cx'), 12192000);
    const heightEmu = number(slideSize?.getAttribute('cy'), 6858000);
    state.projectSize = {
      format:'custom',
      orientation:widthEmu >= heightEmu ? 'landscape' : 'portrait',
      widthMm:widthEmu / 36000,
      heightMm:heightEmu / 36000
    };
    const size = canvasSize();
    const scaleX = size.width / widthEmu;
    const scaleY = size.height / heightEmu;`,
      'PowerPoint slide aspect ratio'
    );

    source = replaceExactly(
      source,
      `        const masterMap = placeholderMap(masterPart?.doc);
        const layoutMap = placeholderMap(layoutPart?.doc);`,
      `        const masterMap = placeholderMap(masterPart?.doc);
        const layoutMap = placeholderMap(layoutPart?.doc);
        const masterTextMap = placeholderNodeMap(masterPart?.doc);
        const layoutTextMap = placeholderNodeMap(layoutPart?.doc);`,
      'PowerPoint placeholder style maps'
    );

    source = replaceExactly(
      source,
      `        const layoutObjects = (await parsePowerPointPart(zip, layoutPart, theme, colorMap, context, [masterMap], { skipPlaceholders:true })).objects;
        const slideObjects = (await parsePowerPointPart(zip, slidePart, theme, colorMap, context, [layoutMap, masterMap])).objects;`,
      `        const layoutObjects = (await parsePowerPointPart(
          zip,
          layoutPart,
          theme,
          colorMap,
          context,
          [masterMap],
          { skipPlaceholders:true, inheritedTextMaps:[masterTextMap] }
        )).objects;
        const slideObjects = (await parsePowerPointPart(
          zip,
          slidePart,
          theme,
          colorMap,
          context,
          [layoutMap, masterMap],
          { inheritedTextMaps:[layoutTextMap, masterTextMap] }
        )).objects;`,
      'PowerPoint slide text inheritance'
    );

    source = replaceExactly(
      source,
      `        const masterMap = placeholderMap(masterPart?.doc);
        const masterObjects = (await parsePowerPointPart(zip, masterPart, theme, colorMap, context, [], { skipPlaceholders:true })).objects;
        const layoutObjects = (await parsePowerPointPart(zip, layoutPart, theme, colorMap, context, [masterMap])).objects;`,
      `        const masterMap = placeholderMap(masterPart?.doc);
        const masterTextMap = placeholderNodeMap(masterPart?.doc);
        const masterObjects = (await parsePowerPointPart(zip, masterPart, theme, colorMap, context, [], { skipPlaceholders:true })).objects;
        const layoutObjects = (await parsePowerPointPart(
          zip,
          layoutPart,
          theme,
          colorMap,
          context,
          [masterMap],
          { inheritedTextMaps:[masterTextMap] }
        )).objects;`,
      'PowerPoint template text inheritance'
    );

    source = replaceExactly(
      source,
      `    const pageWidth = lengthPixels(attr(pageProperties, 'page-width')) || 960;
    const pageHeight = lengthPixels(attr(pageProperties, 'page-height')) || 720;
    const size = canvasSize();`,
      `    const pageWidth = lengthPixels(attr(pageProperties, 'page-width')) || 960;
    const pageHeight = lengthPixels(attr(pageProperties, 'page-height')) || 720;
    state.projectSize = {
      format:'custom',
      orientation:pageWidth >= pageHeight ? 'landscape' : 'portrait',
      widthMm:pageWidth / 96 * 25.4,
      heightMm:pageHeight / 96 * 25.4
    };
    const size = canvasSize();`,
      'OpenDocument slide aspect ratio'
    );

    source = replaceExactly(
      source,
      `    documentName.value = String(file.name || 'Imported presentation').replace(/\.(pptx|pptm|potx|potm|ppsx|ppsm|odp|otp)$/i, '');
    render();
    renderPages?.();
    window.applyPageBackground?.();
    scheduleSave();`,
      `    documentName.value = String(file.name || 'Imported presentation').replace(/\.(pptx|pptm|potx|potm|ppsx|ppsm|odp|otp)$/i, '');
    if (typeof window.applyCanvasSize === 'function') {
      window.applyCanvasSize({ fit:true });
    } else {
      render();
      renderPages?.();
      window.applyPageBackground?.();
    }
    scheduleSave();`,
      'apply imported page size'
    );

    source = replaceExactly(
      source,
      `  function installPages(pages, file) {
    pushHistory();`,
      `  function installPages(pages, file) {
    pages.forEach(page => {
      (page.objects || []).forEach(item => {
        const isText = item.type === 'text';
        item.locked = !isText;
        if (isText) item.groupId = null;
        item.metadata = {
          ...(item.metadata || {}),
          importedPresentationLayer:true,
          unlockOnlyFromLayers:!isText
        };
      });
    });
    pushHistory();`,
      'lock imported non-text layers'
    );

    return source;
  }

  function installImportedLayerLockUi() {
    if (window.__figureLoomImportedLayerLockUiV4) return;
    window.__figureLoomImportedLayerLockUiV4 = true;

    const allImportedObjects = () => {
      const pages = Array.isArray(state.pages) ? state.pages : [];
      const pageObjects = pages.flatMap(page => page?.objects || []);
      return [...new Set([...(state.objects || []), ...pageObjects])];
    };

    allImportedObjects().forEach(item => {
      if (!item?.metadata?.importedPresentationLayer || item.type !== 'text') return;
      item.locked = false;
      item.groupId = null;
      item.metadata.unlockOnlyFromLayers = false;
    });

    const isRestrictedImport = item => Boolean(item?.metadata?.unlockOnlyFromLayers);
    const isCanvasBlocked = item => Boolean(item?.locked && isRestrictedImport(item));

    function itemById(id) {
      return (state.objects || []).find(item => item.id === id) || null;
    }

    function itemFromTarget(target) {
      const node = target?.closest?.('.canvas-object[data-id]');
      return node ? itemById(node.dataset.id) : null;
    }

    function closeQuickMenu() {
      document.getElementById('objectQuickMenu')?.classList.remove('open');
    }

    function clearBlockedSelection(item = null) {
      const selected = item || (typeof selectedObject === 'function' ? selectedObject() : null);
      if (!isCanvasBlocked(selected)) return;
      if (state.selectedId === selected.id) state.selectedId = null;
      if (Array.isArray(state.selectedIds)) state.selectedIds = state.selectedIds.filter(id => id !== selected.id);
      if (typeof selectionLayer !== 'undefined') selectionLayer?.replaceChildren?.();
      closeQuickMenu();
    }

    function applyCanvasBlockers() {
      document.querySelectorAll('.canvas-object[data-id]').forEach(node => {
        const item = itemById(node.dataset.id);
        const blocked = isCanvasBlocked(item);
        node.classList.toggle('imported-canvas-locked', blocked);
        node.style.pointerEvents = blocked ? 'none' : '';
        if (blocked) {
          node.setAttribute('data-imported-canvas-locked', 'true');
          node.setAttribute('aria-disabled', 'true');
        } else {
          node.removeAttribute('data-imported-canvas-locked');
          node.removeAttribute('aria-disabled');
        }
      });
      const selected = typeof selectedObject === 'function' ? selectedObject() : null;
      if (isCanvasBlocked(selected)) clearBlockedSelection(selected);
    }

    if (typeof renderObject === 'function') {
      const baseRenderObject = renderObject;
      renderObject = function renderImportedLockAwareObject(item) {
        const node = baseRenderObject(item);
        if (node && isCanvasBlocked(item)) {
          node.style.pointerEvents = 'none';
          node.classList?.add('imported-canvas-locked');
          node.setAttribute?.('data-imported-canvas-locked', 'true');
          node.setAttribute?.('aria-disabled', 'true');
        }
        return node;
      };
    }

    if (typeof render === 'function') {
      const baseRender = render;
      render = function renderWithImportedCanvasGate(...args) {
        const result = baseRender(...args);
        queueMicrotask(applyCanvasBlockers);
        return result;
      };
    }

    const objectHost = typeof objectLayer !== 'undefined' ? objectLayer : document.getElementById('objectLayer');
    if (objectHost) {
      new MutationObserver(applyCanvasBlockers).observe(objectHost, { childList:true, subtree:true });
    }

    const menu = document.getElementById('objectQuickMenu');
    if (menu) {
      new MutationObserver(() => {
        const selected = typeof selectedObject === 'function' ? selectedObject() : null;
        if (menu.classList.contains('open') && isCanvasBlocked(selected)) closeQuickMenu();
      }).observe(menu, { attributes:true, attributeFilter:['class'] });
    }

    if (typeof renderLayers === 'function' && typeof layersList !== 'undefined') {
      const baseRenderLayers = renderLayers;
      renderLayers = function renderImportedLayerUnlockControls() {
        baseRenderLayers();
        const reversed = [...(state.objects || [])].reverse();
        [...layersList.querySelectorAll('.layer-item')].forEach((row, index) => {
          const item = reversed[index];
          if (!isRestrictedImport(item)) return;
          let mark = row.querySelector('.layer-lock-mark');
          if (!mark) {
            mark = document.createElement('span');
            mark.className = 'layer-lock-mark';
            row.appendChild(mark);
          }
          mark.textContent = item.locked ? '🔒' : '🔓';
          mark.setAttribute('role', 'button');
          mark.setAttribute('tabindex', '0');
          mark.setAttribute('aria-label', item.locked ? `Unlock ${item.name} from Layers` : `Lock ${item.name} from Layers`);
          mark.title = item.locked ? 'Unlock this imported layer' : 'Lock this imported layer';
          mark.classList.add('import-layer-lock-control');
          row.classList.toggle('locked-layer', Boolean(item.locked));
          row.title = item.locked ? `${item.name} · locked · unlock from Layers` : `${item.name} · imported layer`;

          const toggleFromLayers = event => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
            if (typeof pushHistory === 'function') pushHistory();
            item.locked = !item.locked;
            state.drag = null;
            state.resize = null;
            state.multiDrag = null;
            state.multiResize = null;
            clearBlockedSelection(item);
            if (typeof render === 'function') render();
            if (typeof scheduleSave === 'function') scheduleSave();
          };

          mark.addEventListener('pointerdown', event => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
          });
          mark.addEventListener('click', toggleFromLayers);
          mark.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') toggleFromLayers(event);
          });
        });
      };
    }

    function blockImportedCanvasInteraction(event) {
      const directItem = itemFromTarget(event.target);
      const selected = typeof selectedObject === 'function' ? selectedObject() : null;
      const item = directItem || (event.target?.closest?.('#objectQuickMenu') && isCanvasBlocked(selected) ? selected : null);
      if (!isCanvasBlocked(item)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      clearBlockedSelection(item);
    }

    [
      'pointerdown','pointerup','pointercancel',
      'mousedown','mouseup','click','dblclick',
      'touchstart','touchend','contextmenu'
    ].forEach(type => {
      document.addEventListener(type, blockImportedCanvasInteraction, { capture:true, passive:false });
    });

    document.addEventListener('keydown', event => {
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      if (!isCanvasBlocked(item)) return;
      const commandLock = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l';
      const destructive = event.key === 'Delete' || event.key === 'Backspace';
      if (!commandLock && !destructive) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      clearBlockedSelection(item);
    }, true);

    const style = document.createElement('style');
    style.textContent = `
      .layer-lock-mark.import-layer-lock-control{cursor:pointer;pointer-events:auto;user-select:none;border-radius:5px;padding:2px}
      .layer-lock-mark.import-layer-lock-control:hover,.layer-lock-mark.import-layer-lock-control:focus-visible{background:#dce8fb;outline:2px solid #7ca1e8;outline-offset:1px}
      .imported-canvas-locked{pointer-events:none!important}
    `;
    document.head.appendChild(style);

    applyCanvasBlockers();
    if (typeof render === 'function') render();
  }

  async function start() {
    setImportBusy(true);
    try {
      const response = await fetch(CORE_URL, { cache:'no-store' });
      if (!response.ok) throw new Error(`Importer core request failed (${response.status}).`);
      const source = addImporterRules(await response.text());
      await loadScriptSource(source);
      installImportedLayerLockUi();
    } catch (error) {
      console.warn('FigureLoom used the unchanged importer because the fidelity patch could not be applied.', error);
      await loadCoreDirectly();
    } finally {
      setImportBusy(false);
    }
  }

  void start();
})();