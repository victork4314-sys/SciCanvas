(() => {
  if (window.__figureLoomMcpOfficeCommandAdapterV1) return;
  window.__figureLoomMcpOfficeCommandAdapterV1 = true;

  const MAX_BYTES = 50 * 1024 * 1024;

  function decodeBase64(value) {
    const source = String(value || '').replace(/^data:[^,]+,/, '').replace(/\s+/g, '');
    if (!source) throw new Error('Base64 presentation data is required.');
    let binary;
    try { binary = atob(source); }
    catch { throw new Error('The presentation data is not valid base64.'); }
    if (binary.length > MAX_BYTES) throw new Error('Presentation imports are limited to 50 MB.');
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function acceptedName(value) {
    const name = String(value || 'Imported presentation.pptx').trim() || 'Imported presentation.pptx';
    if (!/\.(pptx|pptm|potx|potm|ppsx|ppsm|odp|otp)$/i.test(name)) {
      throw new Error('Use a supported .pptx, .pptm, .potx, .potm, .ppsx, .ppsm, .odp, or .otp file name.');
    }
    return name;
  }

  function historyEntriesEqual(left, right) {
    if (typeof left === 'string' && typeof right === 'string') return left === right;
    try { return JSON.stringify(left) === JSON.stringify(right); }
    catch { return false; }
  }

  async function importPresentation(args) {
    const importer = window.SciCanvasOffice?.importPresentation || window.SciCanvasOffice?.importPowerPoint;
    if (typeof importer !== 'function') throw new Error('The FigureLoom presentation importer has not loaded.');
    const bytes = decodeBase64(args.data || args.base64);
    const name = acceptedName(args.name || args.fileName);
    const mimeType = String(args.mimeType || 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    const file = new File([bytes], name, { type:mimeType, lastModified:Date.now() });
    const countAfterRegistryCheckpoint = Array.isArray(state?.history) ? state.history.length : 0;

    await importer(file);

    if (Array.isArray(state?.history) && state.history.length > countAfterRegistryCheckpoint) {
      const last = state.history.at(-1);
      const previous = state.history.at(-2);
      if (historyEntriesEqual(last, previous)) state.history.pop();
    }

    const documentState = window.FigureLoomCommands?.documentState?.() || {};
    const pageState = window.FigureLoomCommands?.pageState?.() || {};
    return {
      imported:true,
      fileName:name,
      byteLength:bytes.byteLength,
      pageCount:Number(documentState.pageCount) || state?.pages?.length || 1,
      document:documentState,
      activePage:pageState
    };
  }

  function install() {
    const commands = window.FigureLoomCommands;
    if (!commands?.register) return false;
    if (!commands.get('import.presentation')) {
      commands.register('import.presentation', {
        write:true,
        destructive:true,
        category:'import',
        description:'Import a PowerPoint or OpenDocument presentation through FigureLoom’s editable-layer importer.',
        inputSchema:{
          data:{type:'string',description:'Base64-encoded presentation bytes'},
          name:{type:'string'},
          mimeType:{type:'string'}
        },
        run:importPresentation
      });
    }
    return true;
  }

  function attempt() {
    if (!install()) setTimeout(attempt, 100);
  }
  attempt();
})();