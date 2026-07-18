(() => {
  if (window.__figureLoomImportTextFidelityV1) return;
  window.__figureLoomImportTextFidelityV1 = true;

  const CORE_URL = 'office-import-core.js?v=text-fidelity-20260718-v1';

  function replace(source, before, after, label) {
    if (!source.includes(before)) throw new Error(`Missing importer patch point: ${label}`);
    return source.replace(before, after);
  }

  function patch(source) {
    source = replace(source,
`  function placeholderKey(node) {
    const placeholder = first(node, 'ph');
    if (!placeholder) return '';
    return \`\${placeholder.getAttribute('type') || 'body'}:\${placeholder.getAttribute('idx') || '0'}\`;
  }`,
`  function placeholderKeys(node) {
    const placeholder = first(node, 'ph');
    if (!placeholder) return [];
    const index = placeholder.getAttribute('idx');
    const type = placeholder.getAttribute('type');
    return [...new Set([
      index != null && index !== '' ? \`idx:\${index}\` : '',
      type ? \`type:\${type}\` : '',
      \`\${type || 'body'}:\${index || '0'}\`
    ].filter(Boolean))];
  }

  function placeholderKey(node) {
    return placeholderKeys(node)[0] || '';
  }`, 'placeholder identity');

    source = replace(source,
`      const key = placeholderKey(node);
      const transformValue = rawTransform(node);
      if (key && transformValue) map.set(key, transformValue);`,
`      const keys = placeholderKeys(node);
      const transformValue = rawTransform(node);
      if (transformValue) keys.forEach(key => map.set(key, transformValue));`,
      'placeholder map');

    source = replace(source,
`    const key = placeholderKey(node);
    if (!value && key) {
      for (const map of inheritedMaps) {
        if (map?.has(key)) {
          value = map.get(key);
          break;
        }
      }
    }`,
`    const keys = placeholderKeys(node);
    if (!value && keys.length) {
      for (const map of inheritedMaps) {
        for (const key of keys) {
          if (!map?.has(key)) continue;
          value = map.get(key);
          break;
        }
        if (value) break;
      }
    }`, 'placeholder position');

    source = replace(source,
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
      fill:\`#\${resolvedColor(solidFill || runProperties, '172033', theme, colorMap)}\`,
      fontSize:Math.max(8, number(runProperties?.getAttribute('sz'), 2400) / 100 * .75),
      fontFamily,
      fontWeight:runProperties?.getAttribute('b') === '1' ? 700 : 400,
      fontStyle:runProperties?.getAttribute('i') === '1' ? 'italic' : 'normal',
      textAlign:alignment === 'ctr' ? 'center' : alignment === 'r' ? 'right' : alignment === 'just' ? 'justify' : 'left',
      verticalAlign:anchor === 'ctr' ? 'middle' : anchor === 'b' ? 'bottom' : 'top'
    };
  }`,
`  function textStyle(shape, theme, colorMap, context = null) {
    const textBody = first(shape, 'txBody');
    const paragraphProperties = first(textBody, 'pPr');
    const bodyProperties = first(textBody, 'bodyPr');
    const properties = [
      ...all(textBody, 'rPr'),
      ...all(textBody, 'defRPr'),
      ...all(textBody, 'endParaRPr'),
      ...all(shape, 'rPr'),
      ...all(shape, 'defRPr')
    ].filter(Boolean);
    const firstProperties = properties[0] || null;
    const withAttribute = name => properties.find(node => node?.getAttribute?.(name) != null) || firstProperties;
    const placeholderType = first(shape, 'ph')?.getAttribute('type') || '';
    const titleLike = ['title','ctrTitle','subTitle'].includes(placeholderType);
    const fontProperties = properties.find(node => first(node, 'latin') || first(node, 'ea') || first(node, 'cs')) || firstProperties;
    const fontNode = first(fontProperties, 'latin') || first(fontProperties, 'ea') || first(fontProperties, 'cs') || first(textBody, 'latin');
    const schemeFont = fontNode?.getAttribute('typeface') || '';
    const fontFamily = schemeFont === '+mj-lt'
      ? theme.majorFont
      : schemeFont === '+mn-lt'
        ? theme.minorFont
        : schemeFont || (titleLike ? theme.majorFont : theme.minorFont);
    const fontPoints = number(withAttribute('sz')?.getAttribute('sz'), titleLike ? 3200 : 1800) / 100;
    const pointScale = context
      ? ((Math.abs(number(context.scaleX)) + Math.abs(number(context.scaleY))) / 2) * 12700
      : 96 / 72;
    const fontSize = Math.max(6, fontPoints * Math.max(.1, pointScale));
    const colorProperties = properties.find(node => directFirst(node, 'solidFill') || first(node, 'solidFill')) || firstProperties;
    const solidFill = directFirst(colorProperties, 'solidFill') || first(colorProperties, 'solidFill');
    const colorSource = solidFill || colorProperties || first(shape, 'fontRef') || first(shape, 'style');
    const alignment = paragraphProperties?.getAttribute('algn');
    const anchor = bodyProperties?.getAttribute('anchor');
    const averageScale = context
      ? (Math.abs(number(context.scaleX)) + Math.abs(number(context.scaleY))) / 2
      : 1 / 9525;
    const textPadding = Math.max(0, (
      number(bodyProperties?.getAttribute('lIns'), 91440)
      + number(bodyProperties?.getAttribute('rIns'), 91440)
      + number(bodyProperties?.getAttribute('tIns'), 45720)
      + number(bodyProperties?.getAttribute('bIns'), 45720)
    ) / 4 * averageScale);
    const lineSpacing = first(paragraphProperties, 'lnSpc');
    const spacingPercent = number(first(lineSpacing, 'spcPct')?.getAttribute('val'));
    const spacingPoints = number(first(lineSpacing, 'spcPts')?.getAttribute('val')) / 100;
    const lineHeight = spacingPercent
      ? Math.max(1, spacingPercent / 100000)
      : spacingPoints
        ? Math.max(1, spacingPoints * pointScale / fontSize)
        : 1;
    const bold = withAttribute('b')?.getAttribute('b');
    const italic = withAttribute('i')?.getAttribute('i');
    return {
      fill:\`#\${resolvedColor(colorSource, '172033', theme, colorMap)}\`,
      fontSize,
      fontFamily,
      fontWeight:bold === '1' || bold === 'true' ? 700 : 400,
      fontStyle:italic === '1' || italic === 'true' ? 'italic' : 'normal',
      textAlign:alignment === 'ctr' ? 'center' : alignment === 'r' ? 'right' : alignment === 'just' || alignment === 'dist' ? 'justify' : 'left',
      textVerticalAlign:anchor === 'ctr' ? 'middle' : anchor === 'b' ? 'bottom' : 'top',
      textFlow:bodyProperties?.getAttribute('wrap') === 'none' ? 'single' : 'wrap',
      textPadding,
      lineHeight
    };
  }`, 'text style');

    source = replace(source,
      `  function tableObjects(frame, bounds, theme, colorMap, sharedGroup) {`,
      `  function tableObjects(frame, bounds, theme, colorMap, sharedGroup, context = null) {`,
      'table context');
    source = source.replaceAll(
      `const style = textStyle(cell, theme, colorMap);`,
      `const style = textStyle(cell, theme, colorMap, context);`);
    source = replace(source,
      `          objects.push(...tableObjects(node, bounds, theme, colorMap, sharedGroup));`,
      `          objects.push(...tableObjects(node, bounds, theme, colorMap, sharedGroup, nodeContext));`,
      'table text scale');
    source = replace(source,
      `        const style = textStyle(node, theme, colorMap);`,
      `        const style = textStyle(node, theme, colorMap, nodeContext);`,
      'text scale');

    source = replace(source,
`          autoHeight:false,
          wrap:true,
          metadata:{ source:'PowerPoint text', sourcePart:part.path }`,
`          textFlow:style.textFlow || 'wrap',
          textVerticalAlign:style.textVerticalAlign || 'top',
          textPadding:Number.isFinite(style.textPadding) ? style.textPadding : 0,
          lineHeight:style.lineHeight || 1,
          metadata:{ source:'PowerPoint text', sourcePart:part.path, textFidelityV1:true }`,
      'text renderer fields');

    source = replace(source,
`    const widthEmu = number(slideSize?.getAttribute('cx'), 12192000);
    const heightEmu = number(slideSize?.getAttribute('cy'), 6858000);
    const size = canvasSize();`,
`    const widthEmu = number(slideSize?.getAttribute('cx'), 12192000);
    const heightEmu = number(slideSize?.getAttribute('cy'), 6858000);
    state.projectSize = {
      format:'custom',
      orientation:widthEmu >= heightEmu ? 'landscape' : 'portrait',
      widthMm:widthEmu / 36000,
      heightMm:heightEmu / 36000
    };
    const size = canvasSize();`, 'slide aspect ratio');

    source = replace(source,
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
    pushHistory();`, 'import lock rules');

    source = replace(source,
`    state.selectedId = null;
    state.selectedIds = [];
    documentName.value = String(file.name || 'Imported presentation').replace(/\\.(pptx|pptm|potx|potm|ppsx|ppsm|odp|otp)$/i, '');
    render();`,
`    state.selectedId = null;
    state.selectedIds = [];
    documentName.value = String(file.name || 'Imported presentation').replace(/\\.(pptx|pptm|potx|potm|ppsx|ppsm|odp|otp)$/i, '');
    window.applyCanvasSize?.({ fit:true });
    render();`, 'apply imported page size');

    return source;
  }

  function evaluate(source) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([source], { type:'text/javascript' }));
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => { URL.revokeObjectURL(url); resolve(); };
      script.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Text-fidelity importer failed to start.')); };
      document.head.appendChild(script);
    });
  }

  async function waitForBaseImporter() {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (window.__figureLoomImportedLayerLockUiV3 || window.__figureLoomImportedLayerLockUiV4) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  async function start() {
    try {
      await waitForBaseImporter();
      const response = await fetch(CORE_URL, { cache:'no-store' });
      if (!response.ok) throw new Error(`Importer core request failed (${response.status}).`);
      await evaluate(patch(await response.text()));
    } catch (error) {
      console.warn('FigureLoom kept the existing importer because the text-fidelity upgrade could not load.', error);
    }
  }

  void start();
})();