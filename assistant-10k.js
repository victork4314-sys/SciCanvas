(() => {
  const drawer = document.getElementById('figureAssistantDrawer');
  const oldButton = document.getElementById('generateEditableFigure');
  const promptInput = document.getElementById('figurePrompt');
  const assetSearch = window.SciCanvasAssetSearch;
  if (!drawer || !oldButton || !promptInput || !assetSearch) return;

  const EXTRA_PREFIXES = ['medical-icon','lucide','carbon','material-symbols','mdi','ph'];
  const EXTRA_SOURCE_LABELS = {
    'medical-icon':'Medical Icons',
    lucide:'Lucide',
    carbon:'Carbon',
    'material-symbols':'Material Symbols',
    mdi:'Material Design Icons',
    ph:'Phosphor'
  };

  const button = oldButton.cloneNode(true);
  oldButton.replaceWith(button);

  const controls = drawer.querySelector('.assistant-universal-controls');
  const layoutControl = controls?.querySelector('#assistantLayout');
  const onlineControl = controls?.querySelector('#assistantUseBioicons');
  const onlineLabel = onlineControl?.closest('label');
  const status = controls?.querySelector('#assistantBuildStatus');
  if (onlineLabel) onlineLabel.innerHTML = '<input id="assistantUseBioicons" type="checkbox" checked> Search every connected illustration library when online';
  const onlineCheckbox = controls?.querySelector('#assistantUseBioicons');
  if (status) status.textContent = 'Uses built-in science and Water 32 locally, plus Bioicons, Healthicons, Tabler, Medical Icons, Lucide, Carbon, Material Symbols, MDI, and Phosphor when online.';

  function canvasSize() {
    return window.currentCanvasSize?.() || { width:1200, height:750 };
  }

  function baseItem(type,name,x,y,width,height,extra={}) {
    return { id:uid(),type,name,x,y,width,height,fill:'#8ea0ff',stroke:'#26324a',opacity:1,rotation:0,visible:true,...extra };
  }

  function textItem(text,x,y,width,size=26,heading=false) {
    return baseItem('text',text,x,y,width,Math.max(44,size*1.65),{
      text,fill:'#172033',fontSize:size,fontWeight:heading?700:600,fontStyle:'normal',
      fontFamily:`"${state.defaultFont || 'Inter'}", sans-serif`
    });
  }

  function shapeItem(name,x,y,width,height) {
    return baseItem('shape',name,x,y,width,height,{fill:'#eef4ff'});
  }

  function arrowItem(x,y,width,rotation=0) {
    return baseItem('arrow','Process arrow',x,y,Math.max(52,width),50,{fill:'#536fc2',rotation});
  }

  function extractStages(prompt) {
    const normalized = prompt.replace(/\b(?:followed by|then|next|after that)\b/gi,'→');
    let parts = normalized.split(/\s*(?:→|->|=>|;|\n)\s*/).map(part=>part.trim()).filter(Boolean);
    if (parts.length<2 && prompt.includes(',')) parts=prompt.split(',').map(part=>part.trim()).filter(part=>part.split(/\s+/).length<=8);
    return parts.length>=2 && parts.length<=8 ? parts : [];
  }

  function inferredStages(prompt) {
    const explicit = extractStages(prompt);
    if (explicit.length) return explicit;
    const lower = String(prompt || '').toLowerCase();
    if (/\b(?:q?pcr|polymerase chain reaction|dna amplification)\b/.test(lower)) {
      return [
        'biological sample tube',
        'PCR reagents and pipette',
        'thermal cycler',
        'DNA amplification',
        'gel electrophoresis',
        'PCR result'
      ];
    }
    return [];
  }

  function readable(value='') {
    return String(value).replace(/[_/.-]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase()).trim();
  }

  function relevance(label, phrase) {
    const haystack = String(label || '').toLowerCase();
    const tokens = String(phrase || '').toLowerCase().match(/[a-z0-9-]{3,}/g) || [];
    return tokens.reduce((score,token)=>score+(haystack===token?20:haystack.includes(token)?7:0),0);
  }

  async function extraMatches(phrase, limit=80) {
    const url = `https://api.iconify.design/search?query=${encodeURIComponent(phrase)}&prefixes=${EXTRA_PREFIXES.join(',')}&limit=${Math.min(300,Math.max(32,limit))}`;
    const response = await fetch(url,{cache:'force-cache'});
    if (!response.ok) throw new Error(`Extra illustration search returned ${response.status}.`);
    const data = await response.json();
    return (data.icons || []).map((fullName,index)=>{
      const separator = fullName.indexOf(':');
      const prefix = fullName.slice(0,separator);
      const name = fullName.slice(separator+1);
      const label = readable(name);
      return {
        kind:'iconify',source:prefix,prefix,name,fullName,label,
        key:assetSearch.canonicalKey(label),
        score:relevance(label,phrase)+Math.max(1,300-index),
        collection:data.collections?.[prefix] || null,
        sourceLabel:EXTRA_SOURCE_LABELS[prefix] || prefix
      };
    });
  }

  async function combinedMatches(phrase,online,limit=40) {
    const basePromise = assetSearch.search(phrase,{online,limit}).catch(error=>{
      console.warn('Main illustration search unavailable',error);
      return {entries:[]};
    });
    const extraPromise = online ? extraMatches(phrase,limit).catch(error=>{
      console.warn('Extra illustration search unavailable',error);
      return [];
    }) : Promise.resolve([]);
    const [base,extra] = await Promise.all([basePromise,extraPromise]);
    const seen = new Set();
    return [...(base.entries || []),...extra]
      .map((entry,index)=>({
        ...entry,
        _rank:relevance(entry.label,phrase)+(entry.score || 0)-(index*.001)
      }))
      .sort((a,b)=>b._rank-a._rank)
      .filter(entry=>{
        const key=assetSearch.canonicalKey(entry.label);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  async function selectForPhrase(phrase,online,used) {
    const entries = await combinedMatches(phrase,online,50);
    const match = entries.find(entry => !used.has(assetSearch.canonicalKey(entry.label))) || entries[0];
    if (match) used.add(assetSearch.canonicalKey(match.label));
    return match || null;
  }

  async function selectAssets(prompt,online,count) {
    const used = new Set();
    const stages = inferredStages(prompt);
    if (stages.length) {
      const entries = [];
      for (const stage of stages) {
        const match = await selectForPhrase(stage,online,used);
        if (match) entries.push({...match,stageLabel:stage});
      }
      if (entries.length>=2) return entries;
    }

    const entries = await combinedMatches(prompt,online,120);
    const selected = [];
    entries.forEach(entry => {
      const key = assetSearch.canonicalKey(entry.label);
      if (!key || used.has(key) || selected.length>=count) return;
      used.add(key);
      selected.push(entry);
    });
    if (selected.length>=2) return selected;

    for (const fallback of ['cell','DNA','microscope','bacterium','water','protein']) {
      const match = await selectForPhrase(fallback,false,used);
      if (match) selected.push(match);
      if (selected.length>=count) break;
    }
    return selected;
  }

  async function illustratedItem(entry,x,y,width,height) {
    const item = await assetSearch.materialize(entry,{x,y,width,height});
    item.name = entry.stageLabel || entry.label;
    item.metadata ??= {};
    if (entry.sourceLabel && !item.metadata.sourcePack) item.metadata.sourcePack = entry.sourceLabel;
    item.metadata.notes = `${item.metadata.notes || ''}\nSelected by Loomy from the complete illustration libraries for: ${entry.stageLabel || entry.label}`.trim();
    return item;
  }

  async function buildWorkflow(prompt,selections,width,height,portrait) {
    const objects=[];
    const margin=Math.max(48,width*.055);
    const vertical=portrait;
    const gap=vertical?height*.024:width*.018;
    const top=height*.22;
    const cardW=vertical?width*.74:(width-margin*2-gap*(selections.length-1))/selections.length;
    const cardH=vertical?(height-top-margin-gap*(selections.length-1))/selections.length:height*.49;
    for (let index=0;index<selections.length;index++) {
      const entry=selections[index];
      const label=entry.stageLabel || entry.label;
      const x=vertical?(width-cardW)/2:margin+index*(cardW+gap);
      const y=vertical?top+index*(cardH+gap):top;
      objects.push(shapeItem(`${label} panel`,x,y,cardW,cardH));
      objects.push(await illustratedItem(entry,x+cardW*.18,y+cardH*.09,cardW*.64,cardH*.46));
      objects.push(textItem(label,x+cardW*.08,y+cardH*.64,cardW*.84,Math.max(14,width*.011)));
      if (index<selections.length-1) {
        if (vertical) objects.push(arrowItem(width/2-26,y+cardH+gap*.08,52,90));
        else objects.push(arrowItem(x+cardW+gap*.08,y+cardH*.42,gap*.84));
      }
    }
    return objects;
  }

  async function buildComparison(selections,width,height,portrait) {
    const objects=[];
    const margin=Math.max(48,width*.055);
    const columns=portrait?1:2;
    const rows=Math.ceil(selections.length/columns);
    const gap=width*.035;
    const top=height*.21;
    const cardW=(width-margin*2-gap*(columns-1))/columns;
    const cardH=(height-top-margin-gap*(rows-1))/rows;
    for (let index=0;index<selections.length;index++) {
      const entry=selections[index];
      const label=entry.stageLabel || entry.label;
      const column=index%columns,row=Math.floor(index/columns);
      const x=margin+column*(cardW+gap),y=top+row*(cardH+gap);
      objects.push(shapeItem(`${label} panel`,x,y,cardW,cardH));
      objects.push(await illustratedItem(entry,x+cardW*.08,y+cardH*.14,cardW*.34,cardH*.55));
      objects.push(textItem(label,x+cardW*.48,y+cardH*.33,cardW*.44,Math.max(16,width*.014)));
    }
    return objects;
  }

  async function buildCycle(selections,width,height) {
    const objects=[];
    const cx=width/2,cy=height*.56;
    const radiusX=width*.31,radiusY=height*.29;
    const cardW=Math.min(width*.20,270),cardH=Math.min(height*.22,190);
    for (let index=0;index<selections.length;index++) {
      const entry=selections[index];
      const label=entry.stageLabel || entry.label;
      const angle=-Math.PI/2+index*Math.PI*2/selections.length;
      const x=cx+Math.cos(angle)*radiusX-cardW/2;
      const y=cy+Math.sin(angle)*radiusY-cardH/2;
      objects.push(shapeItem(`${label} panel`,x,y,cardW,cardH));
      objects.push(await illustratedItem(entry,x+cardW*.21,y+cardH*.08,cardW*.58,cardH*.49));
      objects.push(textItem(label,x+cardW*.08,y+cardH*.66,cardW*.84,Math.max(14,width*.011)));
    }
    return objects;
  }

  function fitObjectsToCanvas(objects,width,height) {
    objects.forEach(item=>{
      if (!item || item.type==='connector') return;
      item.width=Math.max(20,Math.min(Number(item.width)||20,width*.94));
      item.height=Math.max(20,Math.min(Number(item.height)||20,height*.90));
      item.x=Math.max(0,Math.min(width-item.width,Number(item.x)||0));
      item.y=Math.max(0,Math.min(height-item.height,Number(item.y)||0));
    });
    return objects;
  }

  async function buildFigure(prompt,layout,online) {
    const {width,height}=canvasSize();
    const portrait=height>width;
    const requested=layout==='auto' ? (/cycle|circular|loop/i.test(prompt)?'cycle':/compare|versus|vs\.?|comparison/i.test(prompt)?'comparison':'workflow') : layout;
    const stageCount=inferredStages(prompt).length;
    const count=requested==='comparison'?4:requested==='cycle'?5:Math.min(7,Math.max(3,stageCount||5));
    const selections=await selectAssets(prompt,online,count);
    if (!selections.length) throw new Error('No suitable illustrations were found.');
    const objects=[
      textItem(prompt,width*.07,height*.045,width*.86,Math.max(30,width*.03),true),
      textItem(`Built from ${online?'all connected illustration libraries':'all local FigureLoom artwork'} · every visual stays editable`,width*.07,height*.115,width*.86,Math.max(14,width*.012))
    ];
    if (requested==='cycle') objects.push(...await buildCycle(selections,width,height));
    else if (requested==='comparison') objects.push(...await buildComparison(selections,width,height,portrait));
    else objects.push(...await buildWorkflow(prompt,selections,width,height,portrait));
    return fitObjectsToCanvas(objects,width,height);
  }

  button.addEventListener('click',async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const prompt=promptInput.value.trim();
    if (!prompt) return alert('Describe the scientific figure first.');
    const replace=drawer.querySelector('#replaceCurrentFigure')?.checked ?? true;
    if (replace && state.objects.length && !confirm('Replace the current page objects with the generated editable figure?')) return;
    const online=onlineCheckbox?.checked ?? true;
    const layout=layoutControl?.value || 'auto';
    button.disabled=true;
    button.textContent='Searching every illustration library…';
    if (status) status.textContent=online?'Searching all connected scientific, medical, molecular, and diagram libraries…':'Searching every local scientific and water asset…';
    try {
      const objects=await buildFigure(prompt,layout,online);
      pushHistory();
      objects.forEach(item => {
        window.styleNewObjectFromTheme?.(item);
        if (item.type==='svg' && item.metadata?.sourcePack!=='Bioicons') item.svgColorMode='recolor';
      });
      if (replace) state.objects=objects;
      else state.objects.push(...objects);
      currentPage().objects=state.objects;
      state.selectedId=null;
      documentName.value=prompt.slice(0,60);
      window.applyProjectThemeFonts?.(state.projectTheme,{renderNow:false});
      render();renderPages();scheduleSave();
      if (status) status.textContent=`Built ${objects.length} editable objects from the complete picture libraries.`;
      drawer.classList.remove('open');
    } catch (error) {
      console.error(error);
      if (status) status.textContent=`Could not build this figure: ${error.message}`;
      alert(`Could not build this figure: ${error.message}`);
    } finally {
      button.disabled=false;
      button.textContent='✨ Build editable figure';
    }
  },true);
})();
