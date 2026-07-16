(() => {
  if (typeof scienceAssets === 'undefined' || typeof drawScienceAsset !== 'function') return;

  const WATER_ASSETS = [
    { id:'water-drop', name:'Water droplet', category:'Water & environment', subcategory:'Water', tags:'waterpack water droplet clean freshwater liquid moisture' },
    { id:'water-molecule', name:'Water molecule H₂O', category:'Water & environment', subcategory:'Water', tags:'waterpack h2o molecule oxygen hydrogen chemistry' },
    { id:'surface-wave', name:'Surface water wave', category:'Water & environment', subcategory:'Hydrology', tags:'waterpack wave surface water flow ocean river' },
    { id:'river-channel', name:'River channel', category:'Water & environment', subcategory:'Hydrology', tags:'waterpack river stream channel watershed flow' },
    { id:'lake-reservoir', name:'Lake or reservoir', category:'Water & environment', subcategory:'Hydrology', tags:'waterpack lake reservoir freshwater impoundment' },
    { id:'ocean-water', name:'Ocean water', category:'Water & environment', subcategory:'Marine', tags:'waterpack ocean sea marine saltwater waves' },
    { id:'groundwater', name:'Groundwater layer', category:'Water & environment', subcategory:'Hydrology', tags:'waterpack groundwater water table subsurface soil' },
    { id:'aquifer-well', name:'Aquifer monitoring well', category:'Water & environment', subcategory:'Hydrology', tags:'waterpack aquifer well borehole groundwater monitoring' },
    { id:'rain-cloud', name:'Rainfall cloud', category:'Water & environment', subcategory:'Hydrology', tags:'waterpack rain precipitation storm cloud weather' },
    { id:'storm-drain', name:'Stormwater drain', category:'Water & environment', subcategory:'Infrastructure', tags:'waterpack stormwater drain runoff grate sewer' },
    { id:'sewer-pipe', name:'Sewer pipe', category:'Water & environment', subcategory:'Infrastructure', tags:'waterpack sewer wastewater pipe collection network' },
    { id:'water-pump', name:'Water pump', category:'Water & environment', subcategory:'Infrastructure', tags:'waterpack pump water wastewater lift station equipment' },
    { id:'pipe-valve', name:'Pipe valve', category:'Water & environment', subcategory:'Infrastructure', tags:'waterpack pipe valve flow control plumbing' },
    { id:'wastewater-inlet', name:'Wastewater influent', category:'Water & environment', subcategory:'Treatment', tags:'waterpack wastewater influent inlet sewage raw water' },
    { id:'bar-screen', name:'Bar screen', category:'Water & environment', subcategory:'Treatment', tags:'waterpack bar screen screening solids wastewater pretreatment' },
    { id:'grit-chamber', name:'Grit chamber', category:'Water & environment', subcategory:'Treatment', tags:'waterpack grit chamber sand sediment wastewater pretreatment' },
    { id:'primary-clarifier', name:'Primary clarifier', category:'Water & environment', subcategory:'Treatment', tags:'waterpack clarifier settling sedimentation wastewater tank' },
    { id:'aeration-basin', name:'Aeration basin', category:'Water & environment', subcategory:'Treatment', tags:'waterpack aeration basin activated sludge oxygen bubbles bioreactor' },
    { id:'sludge-floc', name:'Activated-sludge floc', category:'Water & environment', subcategory:'Treatment', tags:'waterpack sludge floc bacteria activated biomass wastewater' },
    { id:'membrane-filter-water', name:'Membrane water filter', category:'Water & environment', subcategory:'Treatment', tags:'waterpack membrane filtration ultrafiltration reverse osmosis pores' },
    { id:'sand-filter', name:'Sand filter', category:'Water & environment', subcategory:'Treatment', tags:'waterpack sand filter media filtration water treatment' },
    { id:'carbon-filter', name:'Activated carbon filter', category:'Water & environment', subcategory:'Treatment', tags:'waterpack carbon charcoal adsorption filter contaminants' },
    { id:'uv-disinfection', name:'UV disinfection', category:'Water & environment', subcategory:'Treatment', tags:'waterpack ultraviolet uv disinfection lamp microbes treatment' },
    { id:'chlorine-contact', name:'Chlorine contact tank', category:'Water & environment', subcategory:'Treatment', tags:'waterpack chlorine chlorination disinfection contact tank' },
    { id:'clean-effluent', name:'Clean effluent outlet', category:'Water & environment', subcategory:'Treatment', tags:'waterpack clean effluent treated water discharge outlet' },
    { id:'sample-bottle-water', name:'Water sample bottle', category:'Water & environment', subcategory:'Monitoring', tags:'waterpack sample bottle water testing laboratory field' },
    { id:'turbidity-meter', name:'Turbidity meter', category:'Water & environment', subcategory:'Monitoring', tags:'waterpack turbidity ntu meter suspended solids monitoring' },
    { id:'ph-probe-water', name:'Water pH probe', category:'Water & environment', subcategory:'Monitoring', tags:'waterpack ph probe sensor acidity alkalinity monitoring' },
    { id:'nutrient-test', name:'Nitrate and phosphate test', category:'Water & environment', subcategory:'Monitoring', tags:'waterpack nitrate phosphate nutrient test eutrophication chemistry' },
    { id:'microplastics-water', name:'Microplastics in water', category:'Water & environment', subcategory:'Pollution', tags:'waterpack microplastic pollution particles fibers water contaminant' },
    { id:'algae-bloom', name:'Algal bloom', category:'Water & environment', subcategory:'Pollution', tags:'waterpack algae cyanobacteria bloom eutrophication toxin water' },
    { id:'treatment-plant', name:'Water treatment plant', category:'Water & environment', subcategory:'Infrastructure', tags:'waterpack treatment plant facility wastewater water works' }
  ];

  WATER_ASSETS.forEach(asset => {
    if (!scienceAssets.some(existing => existing.id === asset.id)) scienceAssets.push(asset);
  });
  window.SCICANVAS_WATER_ASSETS = WATER_ASSETS;

  function drawWater(g, kind, fill, stroke) {
    const sw = 3;
    const blue = fill || '#57a9e6';
    const dark = stroke || '#23445f';
    const white = '#ffffff';
    const n = (tag, attrs) => node(tag, attrs, g);
    const wave = (y, opacity = 1) => n('path', { d:`M18 ${y} C42 ${y-17} 62 ${y+17} 87 ${y} C112 ${y-17} 134 ${y+17} 182 ${y}`, fill:'none', stroke:blue, 'stroke-width':7, 'stroke-linecap':'round', opacity });
    const tank = (x=30,y=20,w=140,h=86) => {
      n('rect',{x,y,width:w,height:h,rx:10,fill:white,stroke:dark,'stroke-width':sw});
      n('path',{d:`M${x+4} ${y+h*.55} Q${x+w*.25} ${y+h*.42} ${x+w*.5} ${y+h*.55} T${x+w-4} ${y+h*.55} L${x+w-4} ${y+h-4} L${x+4} ${y+h-4}Z`,fill:blue,opacity:.72});
    };

    switch (kind) {
      case 'water-drop':
        n('path',{d:'M100 10 C84 35 54 64 54 84 A46 34 0 0 0 146 84 C146 64 116 35 100 10Z',fill:blue,stroke:dark,'stroke-width':sw});
        n('path',{d:'M76 82 C82 101 105 108 122 94',fill:'none',stroke:white,'stroke-width':5,'stroke-linecap':'round',opacity:.8});
        break;
      case 'water-molecule':
        n('line',{x1:100,y1:60,x2:58,y2:33,stroke:dark,'stroke-width':7});
        n('line',{x1:100,y1:60,x2:145,y2:31,stroke:dark,'stroke-width':7});
        n('circle',{cx:100,cy:62,r:29,fill:blue,stroke:dark,'stroke-width':sw});
        n('circle',{cx:50,cy:28,r:18,fill:white,stroke:dark,'stroke-width':sw});
        n('circle',{cx:153,cy:26,r:18,fill:white,stroke:dark,'stroke-width':sw});
        n('text',{x:89,y:70,fill:dark,'font-size':23,'font-weight':700},g).textContent='O';
        n('text',{x:43,y:35,fill:dark,'font-size':18,'font-weight':700},g).textContent='H';
        n('text',{x:146,y:33,fill:dark,'font-size':18,'font-weight':700},g).textContent='H';
        break;
      case 'surface-wave':
        wave(45); wave(76,.72); wave(103,.46); break;
      case 'river-channel':
        n('path',{d:'M14 17 C61 42 43 82 88 106 M186 14 C139 43 156 77 111 108',fill:'none',stroke:dark,'stroke-width':4});
        n('path',{d:'M61 18 C90 42 68 75 100 107 C131 79 112 44 141 17',fill:blue,opacity:.78,stroke:dark,'stroke-width':2});
        n('path',{d:'M88 37 L106 45 L90 53 M91 69 L110 76 L94 85',fill:'none',stroke:white,'stroke-width':4,'stroke-linecap':'round'}); break;
      case 'lake-reservoir':
        n('path',{d:'M20 80 Q42 54 67 70 Q92 35 122 68 Q151 49 180 81 L180 105 L20 105Z',fill:blue,stroke:dark,'stroke-width':sw});
        n('path',{d:'M21 80 Q46 95 72 80 T124 80 T179 80',fill:'none',stroke:white,'stroke-width':4,opacity:.8});
        n('path',{d:'M28 72 L52 34 L77 72 M132 70 L153 28 L176 72',fill:'none',stroke:dark,'stroke-width':4}); break;
      case 'ocean-water':
        n('circle',{cx:156,cy:28,r:15,fill:'#f4c64e',stroke:dark,'stroke-width':2});
        wave(61); wave(88,.7);
        n('path',{d:'M16 106 L184 106',stroke:dark,'stroke-width':4}); break;
      case 'groundwater':
        n('rect',{x:18,y:18,width:164,height:88,rx:6,fill:'#efe1bd',stroke:dark,'stroke-width':sw});
        n('path',{d:'M20 55 C47 43 67 66 94 54 C121 43 145 65 180 51 L180 104 L20 104Z',fill:blue,opacity:.72});
        [34,64,98,132,160].forEach((x,i)=>n('circle',{cx:x,cy:35+(i%2)*9,r:5,fill:dark,opacity:.4}));
        wave(72,.65); break;
      case 'aquifer-well':
        n('rect',{x:15,y:74,width:170,height:34,fill:blue,opacity:.55,stroke:dark,'stroke-width':2});
        n('rect',{x:92,y:17,width:16,height:79,fill:white,stroke:dark,'stroke-width':sw});
        n('path',{d:'M80 20 L120 20 L110 10 L90 10Z',fill:blue,stroke:dark,'stroke-width':2});
        n('circle',{cx:100,cy:60,r:8,fill:blue,stroke:dark,'stroke-width':2});
        n('line',{x1:108,y1:60,x2:148,y2:60,stroke:dark,'stroke-width':5});
        n('path',{d:'M145 60 L161 48 M145 60 L161 72',fill:'none',stroke:dark,'stroke-width':4}); break;
      case 'rain-cloud':
        n('path',{d:'M49 64 C25 60 25 33 48 29 C57 5 91 11 99 29 C119 13 151 25 149 48 C177 52 173 75 151 76 L49 76Z',fill:white,stroke:dark,'stroke-width':sw});
        [[57,91],[87,101],[116,89],[145,103]].forEach(([x,y])=>n('path',{d:`M${x} ${y-11} C${x-8} ${y} ${x-7} ${y+10} ${x} ${y+10} C${x+7} ${y+10} ${x+8} ${y} ${x} ${y-11}Z`,fill:blue})); break;
      case 'storm-drain':
        n('rect',{x:28,y:19,width:144,height:82,rx:8,fill:'#66778d',stroke:dark,'stroke-width':sw});
        for(let x=45;x<166;x+=20)n('line',{x1:x,y1:26,x2:x,y2:94,stroke:white,'stroke-width':7,opacity:.8});
        n('path',{d:'M13 16 C32 34 33 44 48 49',fill:'none',stroke:blue,'stroke-width':7,'stroke-linecap':'round'}); break;
      case 'sewer-pipe':
        n('rect',{x:21,y:32,width:158,height:56,rx:28,fill:'#9aa8b8',stroke:dark,'stroke-width':sw});
        n('ellipse',{cx:31,cy:60,rx:17,ry:28,fill:white,stroke:dark,'stroke-width':sw});
        n('ellipse',{cx:168,cy:60,rx:17,ry:28,fill:blue,stroke:dark,'stroke-width':sw});
        n('path',{d:'M45 71 C78 56 111 82 151 64',fill:'none',stroke:blue,'stroke-width':12,opacity:.75}); break;
      case 'water-pump':
        n('circle',{cx:92,cy:63,r:35,fill:blue,stroke:dark,'stroke-width':sw});
        n('circle',{cx:92,cy:63,r:12,fill:white,stroke:dark,'stroke-width':3});
        n('path',{d:'M92 51 C120 43 123 68 105 77 C98 81 91 75 92 63Z',fill:dark,opacity:.65});
        n('rect',{x:126,y:48,width:49,height:28,rx:5,fill:white,stroke:dark,'stroke-width':sw});
        n('rect',{x:18,y:51,width:39,height:24,rx:5,fill:white,stroke:dark,'stroke-width':sw});
        n('rect',{x:55,y:97,width:77,height:12,rx:5,fill:dark}); break;
      case 'pipe-valve':
        n('line',{x1:18,y1:72,x2:182,y2:72,stroke:dark,'stroke-width':18,'stroke-linecap':'round'});
        n('polygon',{points:'70,44 100,72 70,100',fill:blue,stroke:white,'stroke-width':3});
        n('polygon',{points:'130,44 100,72 130,100',fill:blue,stroke:white,'stroke-width':3});
        n('line',{x1:100,y1:44,x2:100,y2:20,stroke:dark,'stroke-width':6});
        n('circle',{cx:100,cy:17,r:13,fill:white,stroke:dark,'stroke-width':4}); break;
      case 'wastewater-inlet':
        n('path',{d:'M16 44 H92 V76 H184',fill:'none',stroke:dark,'stroke-width':22,'stroke-linejoin':'round'});
        n('path',{d:'M17 44 H91 V75 H182',fill:'none',stroke:blue,'stroke-width':12,'stroke-linejoin':'round'});
        [[48,41],[79,66],[118,76],[154,73]].forEach(([x,y],i)=>n(i%2?'circle':'rect',{...(i%2?{cx:x,cy:y,r:4}:{x:x-4,y:y-3,width:8,height:6,rx:2}),fill:dark,opacity:.55})); break;
      case 'bar-screen':
        tank();
        for(let x=56;x<150;x+=15)n('line',{x1:x,y1:28,x2:x-16,y2:99,stroke:dark,'stroke-width':5});
        n('path',{d:'M34 71 C56 57 73 80 92 68',fill:'none',stroke:blue,'stroke-width':7}); break;
      case 'grit-chamber':
        tank();
        n('path',{d:'M38 82 Q100 103 162 82 L162 103 L38 103Z',fill:'#c59a59',opacity:.85});
        for(let x=47;x<160;x+=18)n('circle',{cx:x,cy:88+(x%3),r:4,fill:dark,opacity:.55}); break;
      case 'primary-clarifier':
        n('ellipse',{cx:100,cy:37,rx:74,ry:20,fill:white,stroke:dark,'stroke-width':sw});
        n('path',{d:'M26 37 V87 Q100 118 174 87 V37',fill:blue,opacity:.66,stroke:dark,'stroke-width':sw});
        n('line',{x1:100,y1:18,x2:100,y2:92,stroke:dark,'stroke-width':4});
        n('line',{x1:49,y1:53,x2:151,y2:53,stroke:white,'stroke-width':4});
        n('path',{d:'M48 87 Q100 105 152 87',fill:'none',stroke:dark,'stroke-width':5,opacity:.65}); break;
      case 'aeration-basin':
        tank();
        for(let x=46;x<166;x+=24){n('circle',{cx:x,cy:92,r:5,fill:white,stroke:dark,'stroke-width':2});n('circle',{cx:x+6,cy:72,r:4,fill:white,stroke:dark,'stroke-width':2});n('circle',{cx:x-3,cy:53,r:3,fill:white,stroke:dark,'stroke-width':2});}
        n('line',{x1:30,y1:107,x2:170,y2:107,stroke:dark,'stroke-width':5}); break;
      case 'sludge-floc':
        [[58,58,25],[86,40,22],[113,57,28],[143,43,18],[77,82,20],[119,87,22],[153,76,15]].forEach(([cx,cy,r],i)=>n('circle',{cx,cy,r,fill:i%2?blue:white,stroke:dark,'stroke-width':2,opacity:.92}));
        [[55,57],[82,43],[111,60],[142,44],[78,82],[119,87]].forEach(([cx,cy])=>n('circle',{cx,cy,r:4,fill:dark,opacity:.6})); break;
      case 'membrane-filter-water':
        n('rect',{x:25,y:19,width:150,height:84,rx:8,fill:white,stroke:dark,'stroke-width':sw});
        for(let x=67;x<139;x+=12)n('line',{x1:x,y1:26,x2:x,y2:96,stroke:dark,'stroke-width':3,opacity:.55});
        n('path',{d:'M31 61 H63 M140 61 H169',stroke:blue,'stroke-width':11,'stroke-linecap':'round'});
        [[46,42],[52,79],[153,45],[158,78]].forEach(([cx,cy])=>n('circle',{cx,cy,r:5,fill:blue})); break;
      case 'sand-filter':
        n('rect',{x:48,y:12,width:104,height:98,rx:8,fill:white,stroke:dark,'stroke-width':sw});
        n('rect',{x:53,y:37,width:94,height:31,fill:'#d8bd82'});
        n('rect',{x:53,y:68,width:94,height:25,fill:'#9f815e'});
        n('rect',{x:53,y:93,width:94,height:12,fill:dark,opacity:.55});
        n('path',{d:'M100 10 V31 M100 105 V116',stroke:blue,'stroke-width':8,'stroke-linecap':'round'}); break;
      case 'carbon-filter':
        n('rect',{x:48,y:12,width:104,height:98,rx:8,fill:white,stroke:dark,'stroke-width':sw});
        for(let y=40;y<94;y+=18)for(let x=65;x<142;x+=19)n('circle',{cx:x+(y%36?7:0),cy:y,r:7,fill:dark,opacity:.78});
        n('path',{d:'M100 10 V29 M100 104 V116',stroke:blue,'stroke-width':8,'stroke-linecap':'round'}); break;
      case 'uv-disinfection':
        n('rect',{x:22,y:34,width:156,height:58,rx:14,fill:white,stroke:dark,'stroke-width':sw});
        n('rect',{x:60,y:46,width:80,height:34,rx:17,fill:blue,opacity:.45,stroke:dark,'stroke-width':2});
        for(let x=72;x<135;x+=18)n('path',{d:`M${x} 18 L${x-8} 35 M${x+5} 18 L${x+2} 35`,stroke:'#8b5cf6','stroke-width':4});
        n('text',{x:80,y:70,fill:dark,'font-size':23,'font-weight':800},g).textContent='UV'; break;
      case 'chlorine-contact':
        tank();
        n('circle',{cx:100,cy:63,r:27,fill:white,stroke:dark,'stroke-width':3});
        n('text',{x:79,y:71,fill:dark,'font-size':23,'font-weight':800},g).textContent='Cl₂';
        n('path',{d:'M48 36 C72 48 64 80 84 92 M116 36 C142 51 127 82 151 94',fill:'none',stroke:blue,'stroke-width':5}); break;
      case 'clean-effluent':
        n('rect',{x:18,y:37,width:84,height:46,rx:10,fill:white,stroke:dark,'stroke-width':sw});
        n('path',{d:'M99 60 H184',stroke:dark,'stroke-width':20,'stroke-linecap':'round'});
        n('path',{d:'M99 60 H181',stroke:blue,'stroke-width':11,'stroke-linecap':'round'});
        n('path',{d:'M151 83 C142 96 143 108 153 108 C163 108 164 96 151 83Z',fill:blue,stroke:dark,'stroke-width':2});
        n('path',{d:'M34 61 L50 76 L82 45',fill:'none',stroke:'#2f9b72','stroke-width':8,'stroke-linecap':'round','stroke-linejoin':'round'}); break;
      case 'sample-bottle-water':
        n('rect',{x:67,y:22,width:66,height:89,rx:10,fill:white,stroke:dark,'stroke-width':sw});
        n('rect',{x:76,y:8,width:48,height:18,rx:5,fill:dark});
        n('path',{d:'M71 67 Q100 56 129 67 V106 H71Z',fill:blue,opacity:.7});
        n('rect',{x:79,y:39,width:42,height:20,rx:4,fill:white,stroke:dark,'stroke-width':2});
        n('text',{x:87,y:54,fill:dark,'font-size':13,'font-weight':700},g).textContent='H₂O'; break;
      case 'turbidity-meter':
        n('rect',{x:49,y:12,width:102,height:98,rx:12,fill:white,stroke:dark,'stroke-width':sw});
        n('rect',{x:64,y:27,width:72,height:31,rx:5,fill:'#d7eef7',stroke:dark,'stroke-width':2});
        n('text',{x:78,y:49,fill:dark,'font-size':18,'font-weight':700},g).textContent='NTU';
        n('circle',{cx:100,cy:83,r:17,fill:blue,stroke:dark,'stroke-width':3});
        n('line',{x1:100,y1:83,x2:112,y2:73,stroke:white,'stroke-width':3}); break;
      case 'ph-probe-water':
        n('rect',{x:30,y:26,width:95,height:69,rx:9,fill:white,stroke:dark,'stroke-width':sw});
        n('text',{x:52,y:69,fill:dark,'font-size':31,'font-weight':800},g).textContent='pH';
        n('line',{x1:125,y1:61,x2:164,y2:61,stroke:dark,'stroke-width':5});
        n('rect',{x:157,y:45,width:18,height:49,rx:8,fill:blue,stroke:dark,'stroke-width':3});
        wave(108,.45); break;
      case 'nutrient-test':
        n('rect',{x:34,y:17,width:55,height:92,rx:8,fill:white,stroke:dark,'stroke-width':sw});
        n('rect',{x:111,y:17,width:55,height:92,rx:8,fill:white,stroke:dark,'stroke-width':sw});
        n('path',{d:'M39 70 H84 V104 H39Z',fill:blue,opacity:.68});
        n('path',{d:'M116 59 H161 V104 H116Z',fill:'#62b36f',opacity:.68});
        n('text',{x:44,y:51,fill:dark,'font-size':18,'font-weight':700},g).textContent='NO₃';
        n('text',{x:119,y:51,fill:dark,'font-size':18,'font-weight':700},g).textContent='PO₄'; break;
      case 'microplastics-water':
        wave(93,.45);
        [[46,36,18,7,18],[81,58,8,22,-23],[116,31,20,8,-8],[151,61,9,25,28],[61,82,13,6,0],[132,86,16,6,15]].forEach(([x,y,w,h,r],i)=>n(i%2?'ellipse':'rect',{...(i%2?{cx:x,cy:y,rx:w/2,ry:h/2}:{x:x-w/2,y:y-h/2,width:w,height:h,rx:2}),transform:`rotate(${r} ${x} ${y})`,fill:i%3===0?'#f05b78':i%3===1?'#f4b942':blue,stroke:dark,'stroke-width':1.5})); break;
      case 'algae-bloom':
        wave(101,.4);
        [[45,55],[70,38],[92,65],[116,43],[142,64],[160,38],[65,79],[128,82]].forEach(([cx,cy],i)=>{
          n('circle',{cx,cy,r:12+(i%3)*3,fill:'#66b96d',stroke:dark,'stroke-width':2,opacity:.88});
          n('circle',{cx:cx+4,cy:cy-3,r:3,fill:dark,opacity:.5});
        }); break;
      case 'treatment-plant':
        n('rect',{x:19,y:51,width:162,height:57,fill:'#dce6ef',stroke:dark,'stroke-width':sw});
        n('rect',{x:37,y:29,width:35,height:79,fill:white,stroke:dark,'stroke-width':sw});
        n('rect',{x:123,y:18,width:27,height:90,fill:white,stroke:dark,'stroke-width':sw});
        n('ellipse',{cx:97,cy:80,rx:30,ry:15,fill:blue,stroke:dark,'stroke-width':2});
        n('ellipse',{cx:97,cy:68,rx:30,ry:15,fill:white,stroke:dark,'stroke-width':2});
        n('path',{d:'M28 64 H171 M28 91 H171',stroke:blue,'stroke-width':7,opacity:.55}); break;
      default:
        return false;
    }
    return true;
  }

  const baseDrawScienceAsset = drawScienceAsset;
  drawScienceAsset = function drawScienceAssetWithWater(g, kind, fill, stroke) {
    if (drawWater(g, kind, fill, stroke)) return;
    return baseDrawScienceAsset(g, kind, fill, stroke);
  };

  function setupWaterLibrary() {
    if (typeof createDrawer !== 'function') return;
    const drawer = createDrawer('waterAssetDrawer', 'Water & wastewater library', `${WATER_ASSETS.length} distinct editable vectors`);
    drawer.querySelector('.utility-body').innerHTML = `
      <input id="waterAssetSearch" type="search" placeholder="Search treatment, river, monitoring…">
      <div id="waterAssetFilters" class="water-asset-filters"></div>
      <div id="waterAssetGrid" class="water-asset-grid"></div>
      <p class="tool-note">All water assets are original editable SciCanvas vectors. They resize, recolor, layer, and export with the project.</p>
    `;
    const search = drawer.querySelector('#waterAssetSearch');
    const grid = drawer.querySelector('#waterAssetGrid');
    const filters = drawer.querySelector('#waterAssetFilters');
    let subcategory = 'All';

    const categories = ['All', ...new Set(WATER_ASSETS.map(asset => asset.subcategory))];
    categories.forEach(name => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = name;
      button.classList.toggle('active', name === 'All');
      button.addEventListener('click', () => {
        subcategory = name;
        [...filters.children].forEach(item => item.classList.toggle('active', item === button));
        drawCards();
      });
      filters.appendChild(button);
    });

    function preview(asset) {
      const svg = createSvg('svg', { viewBox:'0 0 200 120', role:'img', 'aria-label':asset.name });
      drawScienceAsset(svg, asset.id, '#65afe5', '#29465d');
      return svg;
    }

    function drawCards() {
      const query = search.value.trim().toLowerCase();
      grid.replaceChildren();
      WATER_ASSETS.filter(asset => (subcategory === 'All' || asset.subcategory === subcategory) && `${asset.name} ${asset.tags} ${asset.subcategory}`.toLowerCase().includes(query)).forEach(asset => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'water-asset-card';
        const visual = document.createElement('span');
        visual.className = 'water-asset-preview';
        visual.appendChild(preview(asset));
        const label = document.createElement('span');
        label.innerHTML = `<strong>${asset.name}</strong><small>${asset.subcategory}</small>`;
        button.append(visual, label);
        button.addEventListener('click', () => addScienceAsset(asset));
        grid.appendChild(button);
      });
    }

    search.addEventListener('input', drawCards);
    drawCards();

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.id = 'waterLibraryButton';
    openButton.textContent = `🌊 Water ${WATER_ASSETS.length}`;
    openButton.title = 'Water, wastewater, hydrology, pollution, and monitoring icons';
    openButton.addEventListener('click', () => drawer.classList.toggle('open'));
    const scienceSearch = scienceDrawer?.querySelector('.science-search');
    scienceSearch?.appendChild(openButton);
    if (scienceSearch) scienceSearch.style.gridTemplateColumns = 'minmax(0,1fr) repeat(4,auto)';

    document.getElementById('scienceSearch')?.dispatchEvent(new Event('input'));

    const examples = document.querySelector('#figureAssistantDrawer .assistant-examples');
    if (examples && !examples.querySelector('[data-water-example]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.waterExample = '1';
      button.textContent = 'River pollution, microplastics, nutrients, and algal bloom';
      button.addEventListener('click', () => {
        const prompt = document.getElementById('figurePrompt');
        if (prompt) prompt.value = button.textContent;
      });
      examples.appendChild(button);
    }

    const generate = document.getElementById('generateEditableFigure');
    generate?.addEventListener('click', () => {
      const prompt = document.getElementById('figurePrompt')?.value.toLowerCase() || '';
      if (!/waste\s*water|sewage|treatment plant|activated sludge/.test(prompt)) return;
      setTimeout(() => {
        const assetByName = {
          'Influent wastewater':'wastewater-inlet',
          'Screening':'bar-screen',
          'Primary settling':'primary-clarifier',
          'Biological treatment':'aeration-basin',
          'Filtration':'membrane-filter-water',
          'Disinfection & effluent':'uv-disinfection',
          'Activated-sludge bacteria':'sludge-floc'
        };
        state.objects.forEach(item => {
          if (item.type === 'science' && assetByName[item.name]) item.asset = assetByName[item.name];
        });
        render();
        scheduleSave();
      }, 0);
    });

    const style = document.createElement('style');
    style.textContent = `
      #waterAssetSearch{width:100%;padding:9px 10px;border:1px solid #cad4e1;border-radius:8px}.water-asset-filters{display:flex;gap:5px;overflow:auto;margin:9px 0}.water-asset-filters button{white-space:nowrap;border:1px solid #d4dce7;border-radius:999px;background:white;padding:5px 8px;font-size:9px}.water-asset-filters button.active{background:#147fa3;border-color:#147fa3;color:white}
      .water-asset-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.water-asset-card{min-width:0;display:grid;gap:5px;padding:7px;border:1px solid #d6dee9;border-radius:9px;background:white;text-align:left}.water-asset-card:hover{border-color:#4b9ac2;background:#f2faff}.water-asset-preview{height:83px;display:grid;place-items:center;border-radius:6px;background:linear-gradient(180deg,#f8fcff,#edf7fb)}.water-asset-preview svg{width:100%;height:100%}.water-asset-card strong,.water-asset-card small{display:block}.water-asset-card strong{font-size:10px}.water-asset-card small{margin-top:2px;color:#6d7b8f;font-size:8px}
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupWaterLibrary, { once:true });
  else setTimeout(setupWaterLibrary, 0);
})();