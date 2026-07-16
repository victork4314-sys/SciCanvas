(() => {
  if (typeof createDrawer !== 'function' || typeof render !== 'function') return;

  const JSZIP_CDN = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  const XLSX_CDN = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  const PPTXGEN_CDN = 'https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs/dist/pptxgen.bundle.js';
  const NS = { a:'http://schemas.openxmlformats.org/drawingml/2006/main', p:'http://schemas.openxmlformats.org/presentationml/2006/main', r:'http://schemas.openxmlformats.org/officeDocument/2006/relationships' };

  function loadScript(src, test) {
    if (test()) return Promise.resolve();
    const key = `office-${btoa(src).replace(/=/g,'')}`;
    if (loadScript[key]) return loadScript[key];
    loadScript[key] = new Promise((resolve,reject)=>{
      const script=document.createElement('script'); script.src=src; script.async=true;
      script.onload=()=>test()?resolve():reject(new Error(`Library loaded without expected browser export: ${src}`));
      script.onerror=()=>reject(new Error(`Could not load required Office library. Check the connection and try again.`));
      document.head.appendChild(script);
    });
    return loadScript[key];
  }
  const ensureZip=()=>loadScript(JSZIP_CDN,()=>Boolean(window.JSZip));
  const ensureXlsx=()=>loadScript(XLSX_CDN,()=>Boolean(window.XLSX));
  const ensurePptx=()=>loadScript(PPTXGEN_CDN,()=>Boolean(window.PptxGenJS));
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#39;"}[char]));
  const hex=value=>String(value||'').replace('#','').toUpperCase() || '000000';
  const dataUrl=(bytes,mime)=>new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(new Blob([bytes],{type:mime}));});
  const parser=new DOMParser();
  const parseXml=text=>parser.parseFromString(text,'application/xml');
  const textOf=(node,selector)=>[...node.querySelectorAll(selector)].map(item=>item.textContent||'').join('');
  const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  function canvasSize(){return window.currentCanvasSize?.()||{width:1200,height:750,widthMm:304.8,heightMm:190.5};}
  function syncCurrent(){window.syncPage?.(); if(state.pages?.[state.activePage]) state.pages[state.activePage].objects=state.objects;}
  function closeMenus(){document.querySelectorAll('.utility-drawer,.export-menu').forEach(node=>node.classList.remove('open'));}
  function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

  function pages(){
    syncCurrent();
    return Array.isArray(state.pages)&&state.pages.length?state.pages:[{name:documentName.value||'Slide 1',objects:state.objects}];
  }
  function itemRect(item,slideW,slideH){const size=canvasSize();return{x:item.x/size.width*slideW,y:item.y/size.height*slideH,w:item.width/size.width*slideW,h:item.height/size.height*slideH};}
  function fontPoints(item){return Math.max(7,number(item.fontSize,30)*.75);}
  function itemText(item){return item.text||item.label||item.name||'';}

  function svgForObject(item){
    try {
      const node=renderObject(item).cloneNode(true);
      node.querySelectorAll?.('.resize-handle').forEach(el=>el.remove());
      const size=canvasSize();
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
      svg.setAttribute('viewBox',`${item.x} ${item.y} ${Math.max(1,item.width)} ${Math.max(1,item.height)}`);
      svg.appendChild(node);
      return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))))}`;
    } catch { return null; }
  }

  function chartData(item){
    const headers=item.dataHeaders||[]; const rows=item.dataRows||[];
    return headers.slice(1).map((header,index)=>({name:header||`Series ${index+1}`,labels:rows.map(row=>String(row[0]??'')),values:rows.map(row=>number(String(row[index+1]??'').replace(',','.')))}));
  }
  function chartType(Pptx,item){
    const types=Pptx.ChartType||window.PptxGenJS.ChartType||{};
    return ({bar:types.bar||'bar',line:types.line||'line',scatter:types.scatter||'scatter'})[item.chartType]||types.bar||'bar';
  }
  function addEditableItem(slide,item,Pptx,slideW,slideH,report){
    if(item.visible===false) return;
    const r=itemRect(item,slideW,slideH); const rotation=number(item.rotation,0);
    try {
      if(item.type==='text') {
        slide.addText(itemText(item),{...r,fontFace:item.fontFamily||'Aptos',fontSize:fontPoints(item),bold:Boolean(item.bold),italic:Boolean(item.italic),color:hex(item.fill),breakLine:false,margin:0,rotate:rotation,transparency:Math.round((1-(item.opacity??1))*100),valign:'mid'});
        report.editable++;
      } else if(['shape','ellipse'].includes(item.type)) {
        const shape=item.type==='ellipse'?(Pptx.ShapeType?.ellipse||'ellipse'):(Pptx.ShapeType?.roundRect||'roundRect');
        slide.addShape(shape,{...r,fill:{color:hex(item.fill),transparency:Math.round((1-(item.opacity??1))*100)},line:{color:hex(item.stroke),width:Math.max(.5,number(item.strokeWidth,2)*.5)},rotate:rotation});
        report.editable++;
      } else if(['arrow','inhibition'].includes(item.type)) {
        slide.addShape(Pptx.ShapeType?.line||'line',{x:r.x,y:r.y+r.h/2,w:r.w,h:0,line:{color:hex(item.fill),width:Math.max(1,number(item.strokeWidth,5)*.5),beginArrowType:'none',endArrowType:item.type==='inhibition'?'none':'triangle'},rotate:rotation});
        if(item.type==='inhibition') slide.addShape(Pptx.ShapeType?.line||'line',{x:r.x+r.w,y:r.y,w:0,h:r.h,line:{color:hex(item.fill),width:2}});
        report.editable++;
      } else if(item.type==='chart' && ['bar','line','scatter'].includes(item.chartType)) {
        slide.addChart(chartType(Pptx,item),chartData(item),{...r,showTitle:true,title:item.chartTitle||item.name||'Chart',showLegend:true,showCatName:false,showValue:false,catAxisLabelFontSize:9,valAxisLabelFontSize:9,chartColors:item.palette?.map(hex),border:{color:hex(item.stroke||'#94a3b8')}});
        report.editable++;
      } else if(item.type==='table') {
        const table=[item.dataHeaders||[],...(item.dataRows||[])].map(row=>row.map(value=>({text:String(value??''),options:{}})));
        slide.addTable(table,{...r,border:{type:'solid',color:hex(item.stroke||'#94a3b8'),pt:.7},fill:hex(item.rowFill||'#FFFFFF'),color:'26324A',fontSize:9,margin:.04,autoFit:false});
        report.editable++;
      } else if(item.type==='image' && item.src) {
        slide.addImage({data:item.src,...r,rotate:rotation,transparency:Math.round((1-(item.opacity??1))*100)}); report.vectorOrImage++;
      } else {
        const svg=svgForObject(item);
        if(svg){slide.addImage({data:svg,...r,rotate:rotation,transparency:Math.round((1-(item.opacity??1))*100)});report.vectorOrImage++;}
        else report.flattened++;
      }
    } catch(error) {
      console.warn('Native PowerPoint item export fell back',item,error);
      const svg=svgForObject(item);
      if(svg){try{slide.addImage({data:svg,...r});report.vectorOrImage++;}catch{report.flattened++;}}else report.flattened++;
    }
  }

  async function exportEditablePptx({flatten=false}={}){
    await ensurePptx(); const Pptx=window.PptxGenJS; const pptx=new Pptx(); const size=canvasSize();
    const slideW=size.widthMm/25.4,slideH=size.heightMm/25.4;
    pptx.defineLayout({name:'SCICANVAS_OFFICE',width:slideW,height:slideH});pptx.layout='SCICANVAS_OFFICE';pptx.author='SciCanvas';pptx.title=documentName.value||'SciCanvas';
    const report={editable:0,vectorOrImage:0,flattened:0,slides:pages().length};
    const originalPage=state.activePage,originalObjects=state.objects,originalSelected=state.selectedId;
    try {
      for(let pageIndex=0;pageIndex<pages().length;pageIndex++){
        const page=pages()[pageIndex],slide=pptx.addSlide(); slide.background={color:'FFFFFF'};
        if(flatten){
          state.activePage=pageIndex;state.objects=page.objects;state.selectedId=null;render();window.applyPageBackground?.();
          const png=await window.renderCurrentPagePngData?.({scale:2}) || await new Promise((resolve,reject)=>{
            const clone=cleanCanvasClone(false),source=new XMLSerializer().serializeToString(clone),url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'})),img=new Image();
            img.onload=()=>{const c=document.createElement('canvas');c.width=size.width*2;c.height=size.height*2;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/png'));};img.onerror=reject;img.src=url;
          });
          slide.addImage({data:png,x:0,y:0,w:slideW,h:slideH});report.flattened+=page.objects.length;
        } else page.objects.forEach(item=>addEditableItem(slide,item,Pptx,slideW,slideH,report));
        if(page.notes) slide.addNotes?.(String(page.notes));
      }
      await pptx.writeFile({fileName:`${(documentName.value||'SciCanvas').replace(/[^a-z0-9_-]+/gi,'-')}.pptx`,compression:true});
      showCompatibility(report);
    } finally {state.activePage=originalPage;state.objects=originalObjects;state.selectedId=originalSelected;render();renderPages?.();window.applyPageBackground?.();}
  }

  function showCompatibility(report){
    const total=report.editable+report.vectorOrImage+report.flattened;
    const score=total?Math.round((report.editable+report.vectorOrImage*.7)/total*100):100;
    compatibility.innerHTML=`<strong>${score>=90?'🟢':score>=65?'🟡':'🔴'} PowerPoint compatibility ${score}%</strong><span>${report.editable} native editable objects · ${report.vectorOrImage} vector/image objects · ${report.flattened} flattened fallbacks · ${report.slides} slides</span>`;
  }

  function relMap(xml){const doc=parseXml(xml),map={};doc.querySelectorAll('Relationship').forEach(rel=>map[rel.getAttribute('Id')]={target:rel.getAttribute('Target'),type:rel.getAttribute('Type')});return map;}
  function slideNumber(name){return number(name.match(/slide(\d+)\.xml$/)?.[1],0);}
  function mimeFor(name){const ext=name.split('.').pop().toLowerCase();return({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',svg:'image/svg+xml',emf:'image/emf',wmf:'image/wmf'})[ext]||'application/octet-stream';}
  function shapeColor(node,selector,fallback){return node.querySelector(`${selector} srgbClr`)?.getAttribute('val')||node.querySelector(`${selector} schemeClr`)?.getAttribute('val')||fallback;}
  function transform(node,scaleX,scaleY){const off=node.querySelector('xfrm off'),ext=node.querySelector('xfrm ext');return{x:number(off?.getAttribute('x'))*scaleX,y:number(off?.getAttribute('y'))*scaleY,width:Math.max(20,number(ext?.getAttribute('cx'))*scaleX),height:Math.max(20,number(ext?.getAttribute('cy'))*scaleY)};}
  function pptShapeType(node){const preset=node.querySelector('prstGeom')?.getAttribute('prst');return preset==='ellipse'?'ellipse':'shape';}
  function parseTable(frame,base){
    const rows=[...frame.querySelectorAll('tbl > tr')].map(row=>[...row.querySelectorAll(':scope > tc')].map(cell=>textOf(cell,'t')));
    if(!rows.length)return null;return{...base,type:'table',name:'Imported PowerPoint table',dataHeaders:rows[0],dataRows:rows.slice(1),stroke:'#94a3b8',fill:'#FFFFFF',opacity:1,visible:true};
  }
  function parseChart(frame,chartXml,base){
    if(!chartXml)return null;const doc=parseXml(chartXml);const series=[...doc.querySelectorAll('ser')];if(!series.length)return null;
    let labels=[];const headers=['Category'];const columns=[];
    series.forEach((ser,index)=>{headers.push(textOf(ser,'tx v')||`Series ${index+1}`);const cats=[...ser.querySelectorAll('cat pt v')].map(n=>n.textContent);const vals=[...ser.querySelectorAll('val pt v')].map(n=>n.textContent);if(cats.length>labels.length)labels=cats;columns.push(vals);});
    const rows=labels.map((label,row)=>[label,...columns.map(column=>column[row]??'')]);
    const chartType=doc.querySelector('lineChart')?'line':doc.querySelector('scatterChart')?'scatter':'bar';
    return{...base,type:'chart',name:'Imported PowerPoint chart',dataHeaders:headers,dataRows:rows,chartType,chartTitle:textOf(doc,'title t')||'Imported chart',fill:'#4f7fe5',stroke:'#94a3b8',opacity:1,visible:true};
  }

  async function importPptx(file){
    await ensureZip();const zip=await JSZip.loadAsync(file);const presentation=parseXml(await zip.file('ppt/presentation.xml').async('text'));
    const sldSz=presentation.querySelector('sldSz');const widthEmu=number(sldSz?.getAttribute('cx'),12192000),heightEmu=number(sldSz?.getAttribute('cy'),6858000);const size=canvasSize();const sx=size.width/widthEmu,sy=size.height/heightEmu;
    const slideFiles=Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a,b)=>slideNumber(a)-slideNumber(b));
    const imported=[];const warnings=[];
    for(const slidePath of slideFiles){
      const xml=await zip.file(slidePath).async('text'),doc=parseXml(xml);const relPath=slidePath.replace('slides/','slides/_rels/')+'.rels';const relationships=zip.file(relPath)?relMap(await zip.file(relPath).async('text')):{};const objects=[];
      for(const shape of doc.querySelectorAll('sp')){
        const base={id:uid(),...transform(shape,sx,sy),rotation:number(shape.querySelector('xfrm')?.getAttribute('rot'))/60000,visible:true,opacity:1};const text=textOf(shape,'txBody t');
        if(text){objects.push({...base,type:'text',name:'Imported text',text,fill:`#${shapeColor(shape,'solidFill','172033')}`,stroke:'#26324a',fontSize:Math.max(10,number(shape.querySelector('rPr')?.getAttribute('sz'),2400)/100*.75),fontFamily:shape.querySelector('latin')?.getAttribute('typeface')||'Aptos',bold:shape.querySelector('rPr')?.getAttribute('b')==='1',italic:shape.querySelector('rPr')?.getAttribute('i')==='1'});}
        else objects.push({...base,type:pptShapeType(shape),name:'Imported shape',fill:`#${shapeColor(shape,'solidFill','DCE8F8')}`,stroke:`#${shapeColor(shape,'ln','64748B')}`});
      }
      for(const pic of doc.querySelectorAll('pic')){
        const rid=pic.querySelector('blip')?.getAttributeNS(NS.r,'embed')||pic.querySelector('blip')?.getAttribute('r:embed');const rel=relationships[rid];if(!rel)continue;const target=`ppt/${rel.target.replace(/^\.\.\//,'')}`.replace('/media/','/media/');const entry=zip.file(target);if(!entry){warnings.push(`Missing picture relationship ${rid}`);continue;}const bytes=await entry.async('uint8array');objects.push({id:uid(),...transform(pic,sx,sy),type:'image',name:'Imported PowerPoint picture',src:await dataUrl(bytes,mimeFor(target)),fill:'#ffffff',stroke:'#94a3b8',opacity:1,rotation:number(pic.querySelector('xfrm')?.getAttribute('rot'))/60000,visible:true});
      }
      for(const frame of doc.querySelectorAll('graphicFrame')){
        const base={id:uid(),...transform(frame,sx,sy),rotation:0,visible:true,opacity:1};const table=parseTable(frame,base);if(table){objects.push(table);continue;}
        const chartRid=frame.querySelector('chart')?.getAttributeNS(NS.r,'id')||frame.querySelector('chart')?.getAttribute('r:id');const chartRel=relationships[chartRid];if(chartRel){const chartPath=`ppt/${chartRel.target.replace(/^\.\.\//,'')}`;const chartXml=zip.file(chartPath)?await zip.file(chartPath).async('text'):null;const chart=parseChart(frame,chartXml,base);if(chart)objects.push(chart);}
      }
      imported.push({id:uid(),name:`Imported slide ${imported.length+1}`,objects,background:{type:'solid',color:'#ffffff'}});
    }
    if(!imported.length)throw new Error('No slides were found in this PowerPoint file.');
    pushHistory();state.pages=imported;state.activePage=0;state.objects=imported[0].objects;state.selectedId=null;documentName.value=file.name.replace(/\.pptx$/i,'');render();renderPages?.();scheduleSave();
    officeStatus.textContent=`Imported ${imported.length} slides and ${imported.reduce((sum,page)=>sum+page.objects.length,0)} editable objects.${warnings.length?` ${warnings.length} media warnings.`:''}`;
  }

  let workbookState=null;
  function sheetRows(workbook,sheetName){const sheet=workbook.Sheets[sheetName];return XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false});}
  function drawWorkbookPreview(){
    if(!workbookState)return;const sheetName=sheetSelect.value||workbookState.workbook.SheetNames[0];const rows=sheetRows(workbookState.workbook,sheetName);const preview=rows.slice(0,12);sheetPreview.innerHTML=`<strong>${esc(sheetName)}</strong><span>${Math.max(0,rows.length-1)} rows · ${Math.max(0,Math.max(0,...rows.map(row=>row.length))-1)} data columns</span><div class="office-table-wrap"><table>${preview.map((row,i)=>`<tr>${row.slice(0,8).map(value=>`<${i?'td':'th'}>${esc(value)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</table></div>`;
  }
  async function openWorkbook(file){await ensureXlsx();const buffer=await file.arrayBuffer();const workbook=XLSX.read(buffer,{type:'array',cellDates:true,cellFormula:true});workbookState={file,buffer,workbook};sheetSelect.replaceChildren(...workbook.SheetNames.map(name=>new Option(name,name)));drawWorkbookPreview();officeStatus.textContent=`Workbook loaded: ${file.name}`;}
  function workbookObject(kind){
    if(!workbookState)throw new Error('Choose an Excel, ODS, CSV, or TSV file first.');const sheetName=sheetSelect.value;const rows=sheetRows(workbookState.workbook,sheetName).filter(row=>row.some(value=>String(value).trim()));if(rows.length<2)throw new Error('The selected sheet needs a header row and at least one data row.');
    const size=canvasSize(),headers=rows[0].map(String),dataRows=rows.slice(1).map(row=>headers.map((_,i)=>String(row[i]??'')));const type=kind==='table'?'table':'chart';
    return{id:uid(),type,name:`${sheetName} ${kind}`,x:size.width*.15,y:size.height*.18,width:size.width*.7,height:size.height*.62,fill:'#4f7fe5',stroke:'#94a3b8',opacity:1,visible:true,dataHeaders:headers,dataRows,chartType:type==='chart'?kind:null,chartTitle:sheetName,officeSource:{kind:'workbook',fileName:workbookState.file.name,sheetName,importedAt:new Date().toISOString()},embeddedWorkbook:Array.from(new Uint8Array(workbookState.buffer))};
  }
  function insertWorkbook(kind){try{const item=workbookObject(kind);pushHistory();state.objects.push(item);state.selectedId=item.id;render();scheduleSave();officeStatus.textContent=`Inserted editable ${kind} from ${item.officeSource.sheetName}. Double-click it or use Edit data later.`;}catch(error){alert(error.message);}}
  async function exportSelectedWorkbook(){await ensureXlsx();const item=selectedObject();if(!item||!['chart','table'].includes(item.type))throw new Error('Select a chart or table first.');const data=[item.dataHeaders||[],...(item.dataRows||[])];const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet(data);XLSX.utils.book_append_sheet(wb,ws,(item.chartTitle||item.name||'Data').slice(0,31));XLSX.writeFile(wb,`${(item.name||'SciCanvas-data').replace(/[^a-z0-9_-]+/gi,'-')}.xlsx`);}
  async function refreshSelectedFromFile(file){await openWorkbook(file);const item=selectedObject();if(!item||!['chart','table'].includes(item.type))throw new Error('Select the chart or table you want to refresh first.');const rows=sheetRows(workbookState.workbook,sheetSelect.value).filter(row=>row.some(value=>String(value).trim()));if(rows.length<2)throw new Error('The selected sheet does not contain usable data.');pushHistory();item.dataHeaders=rows[0].map(String);item.dataRows=rows.slice(1).map(row=>item.dataHeaders.map((_,i)=>String(row[i]??'')));item.officeSource={kind:'workbook',fileName:file.name,sheetName:sheetSelect.value,refreshedAt:new Date().toISOString()};item.embeddedWorkbook=Array.from(new Uint8Array(workbookState.buffer));render();scheduleSave();officeStatus.textContent='Selected data object refreshed from the workbook.';}

  const drawer=createDrawer('officeBridgeDrawer','Office bridge','Import and export PowerPoint and spreadsheet files');drawer.classList.add('office-bridge-drawer');
  drawer.querySelector('.utility-body').innerHTML=`
    <section class="office-section"><h3>PowerPoint</h3><div class="office-actions"><button id="officeExportPptx" class="primary">Export editable PowerPoint</button><button id="officeExportFlatPptx">Export flattened compatibility copy</button><button id="officeImportPptx">Import PowerPoint</button></div><input id="officePptxFile" type="file" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" hidden><p>Text, common shapes, arrows, supported charts, and tables export as native PowerPoint objects. Scientific artwork remains vector/image content. Import reconstructs slides, text, common shapes, pictures, tables, and basic charts.</p></section>
    <section class="office-section"><h3>Excel and spreadsheets</h3><div class="office-actions"><button id="officeOpenSheet">Open Excel / ODS / CSV</button><button data-sheet-insert="table">Insert editable table</button><button data-sheet-insert="bar">Insert bar chart</button><button data-sheet-insert="line">Insert line chart</button><button data-sheet-insert="scatter">Insert scatter chart</button><button id="officeExportSheet">Export selected chart/table to Excel</button><button id="officeRefreshSheet">Refresh selected from file</button></div><input id="officeSheetFile" type="file" accept=".xlsx,.xls,.xlsm,.ods,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden><input id="officeRefreshFile" type="file" accept=".xlsx,.xls,.xlsm,.ods,.csv,.tsv" hidden><label>Sheet<select id="officeSheetSelect"></select></label><div id="officeSheetPreview" class="office-sheet-preview">Choose a workbook to preview its sheets.</div><p>The imported values remain editable SciCanvas data. The source workbook bytes are embedded in the chart/table object for project portability. Browser security does not allow silent background file watching; use Refresh from file when the workbook changes.</p></section>
    <div id="officeCompatibility" class="office-compatibility"><strong>Office compatibility report</strong><span>Run an export to see what remains native and what must flatten.</span></div><div id="officeStatus" class="office-status">Ready.</div>`;
  const officeStatus=drawer.querySelector('#officeStatus'),compatibility=drawer.querySelector('#officeCompatibility'),sheetSelect=drawer.querySelector('#officeSheetSelect'),sheetPreview=drawer.querySelector('#officeSheetPreview');
  const pptFile=drawer.querySelector('#officePptxFile'),sheetFile=drawer.querySelector('#officeSheetFile'),refreshFile=drawer.querySelector('#officeRefreshFile');
  drawer.querySelector('#officeExportPptx').onclick=()=>exportEditablePptx().catch(error=>alert(`PowerPoint export failed: ${error.message}`));
  drawer.querySelector('#officeExportFlatPptx').onclick=()=>exportEditablePptx({flatten:true}).catch(error=>alert(`PowerPoint export failed: ${error.message}`));
  drawer.querySelector('#officeImportPptx').onclick=()=>pptFile.click();pptFile.onchange=()=>pptFile.files[0]&&importPptx(pptFile.files[0]).catch(error=>alert(`PowerPoint import failed: ${error.message}`));
  drawer.querySelector('#officeOpenSheet').onclick=()=>sheetFile.click();sheetFile.onchange=()=>sheetFile.files[0]&&openWorkbook(sheetFile.files[0]).catch(error=>alert(`Spreadsheet import failed: ${error.message}`));sheetSelect.onchange=drawWorkbookPreview;
  drawer.querySelectorAll('[data-sheet-insert]').forEach(button=>button.onclick=()=>insertWorkbook(button.dataset.sheetInsert));
  drawer.querySelector('#officeExportSheet').onclick=()=>exportSelectedWorkbook().catch(error=>alert(error.message));
  drawer.querySelector('#officeRefreshSheet').onclick=()=>refreshFile.click();refreshFile.onchange=()=>refreshFile.files[0]&&refreshSelectedFromFile(refreshFile.files[0]).catch(error=>alert(error.message));

  const exportEntry=document.createElement('button');exportEntry.type='button';exportEntry.innerHTML='<strong>Office bridge</strong><small>Editable PowerPoint import/export and spreadsheets</small>';exportEntry.onclick=()=>{exportMenu?.classList.remove('open');drawer.classList.add('open');};
  exportMenu?.insertBefore(exportEntry,exportMenu.querySelector('small'));
  const insertButton=document.createElement('button');insertButton.type='button';insertButton.id='officeBridgeButton';insertButton.textContent='Office';insertButton.title='PowerPoint and Excel import/export';insertButton.onclick=()=>drawer.classList.add('open');document.querySelector('.title-actions')?.insertBefore(insertButton,document.getElementById('exportButton'));

  window.SciCanvasOffice={open:()=>drawer.classList.add('open'),exportPowerPoint:exportEditablePptx,importPowerPoint:importPptx,openWorkbook};
  const style=document.createElement('style');style.textContent=`
    .office-bridge-drawer{width:min(620px,calc(100vw - 18px))!important}.office-section{padding:0 0 14px;margin-bottom:14px;border-bottom:1px solid #e2e8f0}.office-section h3{margin:0 0 8px;color:#334155}.office-section p{font-size:10px;line-height:1.45;color:#64748b}.office-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.office-actions button{min-height:40px;padding:8px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;white-space:normal}.office-actions .primary{background:#2563eb;color:white;border-color:#2563eb}.office-section label{display:grid;gap:4px;margin-top:9px;font-size:10px;color:#64748b}.office-section select{min-height:38px;border:1px solid #cbd5e1;border-radius:8px;padding:6px}.office-sheet-preview{margin-top:8px;border:1px solid #dbe3ed;border-radius:9px;padding:8px;overflow:auto;max-height:230px}.office-sheet-preview>strong,.office-sheet-preview>span{display:block}.office-sheet-preview>span{font-size:10px;color:#64748b;margin:2px 0 7px}.office-table-wrap{overflow:auto}.office-table-wrap table{border-collapse:collapse;font-size:9px;min-width:100%}.office-table-wrap th,.office-table-wrap td{border:1px solid #dbe3ed;padding:4px 6px;white-space:nowrap}.office-table-wrap th{background:#eef4ff}.office-compatibility,.office-status{display:grid;gap:3px;padding:10px;border-radius:9px}.office-compatibility{background:#f0f6ff;border:1px solid #bfd1f3}.office-compatibility span,.office-status{font-size:10px;color:#5f6f86}.office-status{margin-top:8px;background:#f8fafc;border:1px solid #e2e8f0}#officeBridgeButton{background:#eef4ff!important;color:#2454ad!important;border-color:#9db6e5!important;font-weight:700}@media(max-width:480px){.office-actions{grid-template-columns:1fr}.office-bridge-drawer{top:72px!important;right:5px!important;bottom:8px!important}}
  `;document.head.appendChild(style);
})();