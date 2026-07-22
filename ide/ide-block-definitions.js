(() => {
  'use strict';

  const definitions = [
    {id:'say',category:'program',label:'Show a message',parts:['Say ',{key:'message',placeholder:'Starting the analysis'},'.'],regex:/^Say (.+)\.$/i},
    {id:'open',category:'files',label:'Open a file',parts:['Open the file ',{key:'file',placeholder:'reads.fastq'},'.'],regex:/^Open the file (.+)\.$/i},
    {id:'openPair',category:'files',label:'Open paired FASTQ files',parts:['Open the files ',{key:'forward',placeholder:'forward.fastq'},' and ',{key:'reverse',placeholder:'reverse.fastq'},' as a pair.'],regex:/^Open the files (.+?) and (.+?) as a pair\.$/i},

    {id:'keepRows',category:'tables',label:'Keep matching rows',parts:['Keep only rows marked ',{key:'value',placeholder:'treated'},' under ',{key:'column',placeholder:'condition'},'.'],regex:/^Keep only rows marked (.+?) under ([^.,]+)\.$/i},
    {id:'removeRows',category:'tables',label:'Remove matching rows',parts:['Remove rows marked ',{key:'value',placeholder:'failed'},' under ',{key:'column',placeholder:'status'},'.'],regex:/^Remove rows marked (.+?) under ([^.,]+)\.$/i},
    {id:'keepColumns',category:'tables',label:'Keep columns',parts:['Keep only the columns ',{key:'columns',placeholder:'sample, condition, and status'},'.'],regex:/^Keep only the columns (.+)\.$/i},
    {id:'renameColumn',category:'tables',label:'Rename a column',parts:['Rename the column ',{key:'column',placeholder:'condition'},' to ',{key:'newName',placeholder:'group'},'.'],regex:/^Rename the column (.+?) to (.+)\.$/i},
    {id:'orderRows',category:'tables',label:'Order rows',parts:['Put the rows in order by ',{key:'column',placeholder:'age'},'.'],regex:/^Put the rows in order by (.+)\.$/i},
    {id:'largestFirst',category:'tables',label:'Largest first',parts:['Put the largest ',{key:'column',placeholder:'age'},' first.'],regex:/^Put the largest (.+) first\.$/i},
    {id:'smallestFirst',category:'tables',label:'Smallest first',parts:['Put the smallest ',{key:'column',placeholder:'age'},' first.'],regex:/^Put the smallest (.+) first\.$/i},
    {id:'removeDuplicateRows',category:'tables',label:'Remove duplicate rows',parts:['Remove duplicate rows using ',{key:'column',placeholder:'sample'},'.'],regex:/^Remove duplicate rows using (.+)\.$/i},
    {id:'replaceEmpty',category:'tables',label:'Fill empty values',parts:['Replace empty values under ',{key:'column',placeholder:'status'},' with ',{key:'value',placeholder:'unknown'},'.'],regex:/^Replace empty values under (.+?) with (.+)\.$/i},
    {id:'combine',category:'tables',label:'Combine tables',parts:['Combine it with ',{key:'file',placeholder:'metadata.csv'},' using ',{key:'column',placeholder:'sample'},'.'],regex:/^Combine it with (.+) using ([^.,]+)\.$/i},
    {id:'changeValue',category:'tables',label:'Change values',parts:['Change ',{key:'old',placeholder:'control'},' to ',{key:'newValue',placeholder:'untreated'},' under ',{key:'column',placeholder:'condition'},'.'],regex:/^Change (.+?) to (.+?) under ([^.,]+)\.$/i},

    {id:'countSequences',category:'sequences',label:'Count sequences',parts:['Count the sequences.'],regex:/^Count the sequences\.$/i},
    {id:'countReads',category:'sequences',label:'Count reads',parts:['Count the reads.'],regex:/^Count the reads\.$/i},
    {id:'countBases',category:'sequences',label:'Count bases',parts:['Count the bases.'],regex:/^Count the bases\.$/i},
    {id:'showSequences',category:'sequences',label:'Show sequences',parts:['Show the sequences.'],regex:/^Show the sequences\.$/i},
    {id:'showReads',category:'sequences',label:'Show reads',parts:['Show the reads.'],regex:/^Show the reads\.$/i},
    {id:'showNames',category:'sequences',label:'Show sequence names',parts:['Show the sequence names.'],regex:/^Show the sequence names\.$/i},
    {id:'showFirst',category:'sequences',label:'Show first sequences',parts:['Show the first ',{key:'number',placeholder:'10',type:'number'},' sequences.'],regex:/^Show the first ([1-9][0-9]*) sequences?\.$/i},
    {id:'showLengths',category:'sequences',label:'Show sequence lengths',parts:['Show the sequence lengths.'],regex:/^Show the sequence lengths\.$/i},
    {id:'findShortest',category:'sequences',label:'Find shortest sequence',parts:['Find the shortest sequence.'],regex:/^Find the shortest sequence\.$/i},
    {id:'findLongest',category:'sequences',label:'Find longest sequence',parts:['Find the longest sequence.'],regex:/^Find the longest sequence\.$/i},
    {id:'useNamed',category:'sequences',label:'Use one named sequence',parts:['Use the sequence named ',{key:'name',placeholder:'sample-17'},'.'],regex:/^Use the sequence named (.+)\.$/i},
    {id:'removeNamed',category:'sequences',label:'Remove one named sequence',parts:['Remove the sequence named ',{key:'name',placeholder:'sample-17'},'.'],regex:/^Remove the sequence named (.+)\.$/i},
    {id:'renameSequence',category:'sequences',label:'Rename a sequence',parts:['Rename the sequence ',{key:'oldName',placeholder:'sample-17'},' to ',{key:'newName',placeholder:'chosen'},'.'],regex:/^Rename the sequence (.+?) to (.+)\.$/i},
    {id:'prefixNames',category:'sequences',label:'Add to name starts',parts:['Add ',{key:'text',placeholder:'run-'},' to the start of every sequence name.'],regex:/^Add (.+) to the start of every sequence name\.$/i},
    {id:'suffixNames',category:'sequences',label:'Add to name ends',parts:['Add ',{key:'text',placeholder:'-clean'},' to the end of every sequence name.'],regex:/^Add (.+) to the end of every sequence name\.$/i},
    {id:'removeDuplicateSequences',category:'sequences',label:'Remove duplicate sequences',parts:['Remove duplicate sequences.'],regex:/^Remove duplicate sequences\.$/i},
    {id:'shortestFirst',category:'sequences',label:'Shortest sequences first',parts:['Put the shortest sequences first.'],regex:/^Put the shortest sequences first\.$/i},
    {id:'longestFirst',category:'sequences',label:'Longest sequences first',parts:['Put the longest sequences first.'],regex:/^Put the longest sequences first\.$/i},
    {id:'keepAtLeast',category:'sequences',label:'Keep a minimum length',parts:['Keep sequences at least ',{key:'number',placeholder:'100',type:'number'},' bases long.'],regex:/^Keep sequences at least ([1-9][0-9]*) bases long\.$/i},
    {id:'keepLonger',category:'sequences',label:'Keep sequences longer than',parts:['Keep only sequences longer than ',{key:'number',placeholder:'500',type:'number'},' bases.'],regex:/^Keep only sequences longer than ([1-9][0-9]*) bases?\.$/i},
    {id:'removeShort',category:'sequences',label:'Remove short sequences',parts:['Remove sequences shorter than ',{key:'number',placeholder:'100',type:'number'},' bases.'],regex:/^Remove sequences shorter than ([1-9][0-9]*) bases?\.$/i},
    {id:'keepMotif',category:'sequences',label:'Keep a sequence pattern',parts:['Keep only sequences containing ',{key:'motif',placeholder:'ATG'},'.'],regex:/^Keep (?:only )?sequences containing (.+)\.$/i},
    {id:'removeMotif',category:'sequences',label:'Remove a sequence pattern',parts:['Remove sequences containing ',{key:'motif',placeholder:'N'},'.'],regex:/^Remove sequences containing (.+)\.$/i},
    {id:'keepRange',category:'sequences',label:'Keep a base range',parts:['Keep bases ',{key:'start',placeholder:'10',type:'number'},' to ',{key:'end',placeholder:'100',type:'number'},'.'],regex:/^Keep bases ([1-9][0-9]*) to ([1-9][0-9]*)\.$/i},
    {id:'toRna',category:'sequences',label:'Convert DNA to RNA',parts:['Convert the DNA to RNA.'],regex:/^Convert (?:the DNA|the sequences) to RNA\.$/i},
    {id:'toDna',category:'sequences',label:'Convert RNA to DNA',parts:['Convert the RNA to DNA.'],regex:/^Convert (?:the RNA|the sequences) to DNA\.$/i},
    {id:'reverse',category:'sequences',label:'Reverse complement',parts:['Find the reverse complement.'],regex:/^Find the reverse complement\.$/i},
    {id:'translate',category:'sequences',label:'Translate DNA to protein',parts:['Translate the DNA into protein.'],regex:/^Translate (?:the DNA into protein|the sequences)\.$/i},
    {id:'gc',category:'sequences',label:'Calculate GC content',parts:['Calculate the GC content.'],regex:/^Calculate the GC content\.$/i},
    {id:'compare',category:'sequences',label:'Compare sequences',parts:['Compare the sequences with ',{key:'file',placeholder:'reference.fasta'},'.'],regex:/^Compare (?:the sequences|it) with (.+)\.$/i},

    {id:'checkQuality',category:'quality',label:'Check read quality',parts:['Check the quality.'],regex:/^Check the quality(?: again)?\.$/i},
    {id:'showQuality',category:'quality',label:'Show quality report',parts:['Show the quality report.'],regex:/^Show the quality report\.$/i},
    {id:'keepQuality',category:'quality',label:'Keep minimum quality',parts:['Keep reads with average quality at least ',{key:'number',placeholder:'20',type:'number'},'.'],regex:/^Keep reads with average quality at least ([0-9]+(?:\.[0-9]+)?)\.$/i},
    {id:'removeLowQuality',category:'quality',label:'Remove low-quality reads',parts:['Remove reads with low quality.'],regex:/^Remove reads with low quality\.$/i},
    {id:'removeQualityBelow',category:'quality',label:'Remove reads below quality',parts:['Remove reads with average quality below ',{key:'number',placeholder:'20',type:'number'},'.'],regex:/^Remove reads with average quality below ([0-9]+(?:\.[0-9]+)?)\.$/i},
    {id:'removeShortReads',category:'quality',label:'Remove short reads',parts:['Remove reads shorter than ',{key:'number',placeholder:'50',type:'number'},' bases.'],regex:/^Remove reads shorter than ([1-9][0-9]*) bases?\.$/i},
    {id:'removeAdapters',category:'quality',label:'Remove adapter sequences',parts:['Remove adapter sequences.'],regex:/^Remove adapter sequences\.$/i},
    {id:'cutStart',category:'quality',label:'Cut from read beginnings',parts:['Cut ',{key:'number',placeholder:'10',type:'number'},' bases from the beginning of each read.'],regex:/^Cut ([1-9][0-9]*) bases? from the beginning of each read\.$/i},
    {id:'cutEnd',category:'quality',label:'Cut from read ends',parts:['Cut ',{key:'number',placeholder:'5',type:'number'},' bases from the end of each read.'],regex:/^Cut ([1-9][0-9]*) bases? from the end of each read\.$/i},

    {id:'countRows',category:'results',label:'Count table rows',parts:['Count the rows.'],regex:/^Count the rows\.$/i},
    {id:'showResult',category:'results',label:'Show result',parts:['Show the result.'],regex:/^Show the result\.$/i},
    {id:'showFile',category:'results',label:'Show file',parts:['Show the file.'],regex:/^Show the file\.$/i},
    {id:'saveResult',category:'results',label:'Save result',parts:['Save the result as ',{key:'file',placeholder:'result.csv'},'.'],regex:/^Save the result as (.+)\.$/i},
    {id:'saveSequences',category:'results',label:'Save sequences',parts:['Save the sequences as ',{key:'file',placeholder:'prepared.fasta'},'.'],regex:/^Save the sequences as (.+)\.$/i},
    {id:'saveReads',category:'results',label:'Save reads',parts:['Save the reads as ',{key:'file',placeholder:'cleaned.fastq'},'.'],regex:/^Save the reads as (.+)\.$/i},
    {id:'savePair',category:'results',label:'Save a read pair',parts:['Save the pair as ',{key:'forward',placeholder:'clean-forward.fastq'},' and ',{key:'reverse',placeholder:'clean-reverse.fastq'},'.'],regex:/^Save the pair as (.+?) and (.+)\.$/i},
    {id:'custom',category:'custom',label:'Custom sentence',parts:[{key:'sentence',placeholder:'Write a complete instruction.'}],custom:true}
  ];

  const categoryNames = {
    program:'Program',
    files:'Files',
    tables:'Tables',
    sequences:'Sequences',
    quality:'FASTQ quality',
    results:'Results',
    custom:'Other'
  };

  window.FigureLoomBioBlockDefinitions = { definitions, categoryNames };
})();
