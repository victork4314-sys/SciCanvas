(() => {
  'use strict';
  const api = window.FigureLoomApprovedBio;
  if (!api) return;

  const FASTA = ['.fa', '.fasta', '.fna', '.ffn', '.faa', '.frn'];
  const FASTQ = ['.fq', '.fastq'];
  const ADAPTERS = [
    'AGATCGGAAGAGCACACGTCTGAACTCCAGTCA',
    'AGATCGGAAGAGCGTCGTGTAGGGAAAGAGTGT',
    'CTGTCTCTTATACACATCT'
  ];
  const CODONS = {
    TTT:'F',TTC:'F',TTA:'L',TTG:'L',TCT:'S',TCC:'S',TCA:'S',TCG:'S',TAT:'Y',TAC:'Y',TAA:'*',TAG:'*',TGT:'C',TGC:'C',TGA:'*',TGG:'W',
    CTT:'L',CTC:'L',CTA:'L',CTG:'L',CCT:'P',CCC:'P',CCA:'P',CCG:'P',CAT:'H',CAC:'H',CAA:'Q',CAG:'Q',CGT:'R',CGC:'R',CGA:'R',CGG:'R',
    ATT:'I',ATC:'I',ATA:'I',ATG:'M',ACT:'T',ACC:'T',ACA:'T',ACG:'T',AAT:'N',AAC:'N',AAA:'K',AAG:'K',AGT:'S',AGC:'S',AGA:'R',AGG:'R',
    GTT:'V',GTC:'V',GTA:'V',GTG:'V',GCT:'A',GCC:'A',GCA:'A',GCG:'A',GAT:'D',GAC:'D',GAA:'E',GAG:'E',GGT:'G',GGC:'G',GGA:'G',GGG:'G'
  };

  const EXTRA_SENTENCES = [
    /^Remove the sequence named /i,
    /^Rename the sequence /i,
    /^Add .+ to the (?:start|end) of every sequence name$/i,
    /^Remove duplicate sequences$/i,
    /^Put the (?:shortest|longest) sequences first$/i,
    /^Show the sequence lengths$/i,
    /^Find the (?:shortest|longest) sequence$/i,
    /^Keep bases [1-9][0-9]* to [1-9][0-9]*$/i
  ];

  const RULES = [
    ['say', /^Say (.+)$/i],
    ['open', /^Open the file (.+)$/i],
    ['count', /^Count the (?:sequences|reads)$/i],
    ['countBases', /^Count the bases$/i],
    ['showNames', /^Show the sequence names$/i],
    ['showLengths', /^Show the sequence lengths$/i],
    ['showFirst', /^Show the first ([1-9][0-9]*) sequences?$/i],
    ['show', /^Show the (?:result|file|sequences|reads)$/i],
    ['keepLong', /^Keep only sequences longer than ([1-9][0-9]*) bases?$/i],
    ['keepMinimum', /^Keep (?:sequences|reads) at least ([1-9][0-9]*) bases long$/i],
    ['removeShort', /^Remove (?:sequences|reads) shorter than ([1-9][0-9]*) bases?$/i],
    ['keepQuality', /^Keep reads with average quality at least ([0-9]+(?:\.[0-9]+)?)$/i],
    ['removeQualityDefault', /^Remove reads with low quality$/i],
    ['removeQuality', /^Remove reads with average quality below ([0-9]+(?:\.[0-9]+)?)$/i],
    ['checkQuality', /^Check the quality(?: again)?$/i],
    ['showQuality', /^Show the quality report$/i],
    ['removeAdapters', /^Remove adapter sequences$/i],
    ['cutStart', /^Cut ([1-9][0-9]*) bases? from the beginning of each read$/i],
    ['cutEnd', /^Cut ([1-9][0-9]*) bases? from the end of each read$/i],
    ['trimStart', /^Trim ([1-9][0-9]*) bases from the start$/i],
    ['trimEnd', /^Trim ([1-9][0-9]*) bases from the end$/i],
    ['keepMotif', /^Keep (?:only )?sequences containing (.+)$/i],
    ['removeMotif', /^Remove sequences containing (.+)$/i],
    ['use', /^Use the sequence named (.+)$/i],
    ['removeNamed', /^Remove the sequence named (.+)$/i],
    ['rename', /^Rename the sequence (.+?) to (.+)$/i],
    ['prefix', /^Add (.+) to the start of every sequence name$/i],
    ['suffix', /^Add (.+) to the end of every sequence name$/i],
    ['deduplicate', /^Remove duplicate sequences$/i],
    ['shortestFirst', /^Put the shortest sequences first$/i],
    ['longestFirst', /^Put the longest sequences first$/i],
    ['shortest', /^Find the shortest sequence$/i],
    ['longest', /^Find the longest sequence$/i],
    ['range', /^Keep bases ([1-9][0-9]*) to ([1-9][0-9]*)$/i],
    ['toRna', /^(?:Convert the DNA to RNA|Convert the sequences to RNA)$/i],
    ['toDna', /^(?:Convert the RNA to DNA|Convert the sequences to DNA)$/i],
    ['reverse', /^Find the reverse complement$/i],
    ['translate', /^(?:Translate the DNA into protein|Translate the sequences)$/i],
    ['gc', /^Calculate the GC content$/i],
    ['compare', /^Compare (?:the sequences|it) with (.+)$/i],
    ['save', /^Save the (?:result|sequences|reads) as (.+)$/i]
  ];

  const isFasta = (name) => FASTA.some((extension) => name.toLowerCase().endsWith(extension));
  const isFastq = (name) => FASTQ.some((extension) => name.toLowerCase().endsWith(extension));

  function detect(items) {
    return items.some((item) => EXTRA_SENTENCES.some((pattern) => pattern.test(item.sentence)));
  }

  function parse(item) {
    for (const [action, pattern] of RULES) {
      const match = item.sentence.match(pattern);
      if (match) {
        return {
          action,
          values: match.slice(1).map((value) => value.trim()),
          lineNumber: item.lineNumber
        };
      }
    }
    throw new api.PlainError(
      `I do not understand this sequence instruction yet.\n\nI read: ${item.sentence}.`,
      item.lineNumber
    );
  }

  function parseFasta(text, filename) {
    const records = [];
    let current = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('>')) {
        if (current) records.push(current);
        const header = line.slice(1).trim();
        if (!header) throw new api.PlainError(`${filename} contains a FASTA header without a name.`);
        const split = header.search(/\s/);
        current = {
          name: split < 0 ? header : header.slice(0, split),
          description: split < 0 ? '' : header.slice(split + 1).trim(),
          sequence: '',
          quality: null
        };
      } else {
        if (!current) throw new api.PlainError(`${filename} contains sequence text before its first FASTA name.`);
        current.sequence += line.replace(/\s+/g, '').toUpperCase();
      }
    }
    if (current) records.push(current);
    if (!records.length) throw new api.PlainError(`${filename} does not contain any FASTA sequences.`);
    return { format: 'fasta', records };
  }

  function parseFastq(text, filename) {
    const lines = text.split(/\r?\n/);
    const records = [];
    let index = 0;
    while (index < lines.length) {
      if (!lines[index].trim()) { index += 1; continue; }
      if (index + 3 >= lines.length) throw new api.PlainError(`${filename} ends in the middle of a FASTQ record.`);
      const header = lines[index].trim();
      const sequence = lines[index + 1].trim().toUpperCase();
      const plus = lines[index + 2].trim();
      const quality = lines[index + 3].replace(/\r$/, '');
      if (!header.startsWith('@') || !plus.startsWith('+')) {
        throw new api.PlainError(`${filename} contains a FASTQ record with a missing @ header or + line.`);
      }
      if (sequence.length !== quality.length) {
        throw new api.PlainError(`${filename} contains a read whose sequence and quality have different lengths.`);
      }
      const headerText = header.slice(1).trim();
      const split = headerText.search(/\s/);
      records.push({
        name: split < 0 ? headerText : headerText.slice(0, split),
        description: split < 0 ? '' : headerText.slice(split + 1).trim(),
        sequence,
        quality
      });
      index += 4;
    }
    if (!records.length) throw new api.PlainError(`${filename} does not contain any FASTQ reads.`);
    return { format: 'fastq', records };
  }

  function encode(data, outputName) {
    const lines = [];
    if (isFasta(outputName)) {
      for (const record of data.records) {
        lines.push(`>${record.name}${record.description ? ` ${record.description}` : ''}`);
        for (let index = 0; index < record.sequence.length; index += 80) {
          lines.push(record.sequence.slice(index, index + 80));
        }
      }
    } else if (isFastq(outputName)) {
      if (data.records.some((record) => record.quality === null)) {
        throw new api.PlainError('This result no longer has FASTQ quality scores.\n\nSave it as a FASTA file instead.');
      }
      for (const record of data.records) {
        lines.push(`@${record.name}${record.description ? ` ${record.description}` : ''}`);
        lines.push(record.sequence, '+', record.quality || '');
      }
    } else {
      throw new api.PlainError('Save sequences with a FASTA or FASTQ filename.');
    }
    return `${lines.join('\n')}\n`;
  }

  function averageQuality(record) {
    if (!record.quality) return 0;
    return Array.from(record.quality).reduce(
      (sum, character) => sum + character.charCodeAt(0) - 33,
      0
    ) / record.quality.length;
  }

  function requireQuality(data, lineNumber) {
    if (data.records.some((record) => record.quality === null)) {
      throw new api.PlainError('This instruction needs FASTQ quality scores.\n\nOpen a FASTQ file first.', lineNumber);
    }
  }

  function qualitySummary(data) {
    requireQuality(data);
    const lengths = data.records.map((record) => record.sequence.length);
    const qualities = data.records.map(averageQuality);
    return {
      count: data.records.length,
      averageQuality: qualities.length ? qualities.reduce((a, b) => a + b, 0) / qualities.length : 0,
      averageLength: lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0,
      shortest: lengths.length ? Math.min(...lengths) : 0,
      longest: lengths.length ? Math.max(...lengths) : 0
    };
  }

  function showQuality(data) {
    const report = qualitySummary(data);
    api.addSection('Quality report', {
      paragraphs: [
        `Reads\n${report.count.toLocaleString()}`,
        `Average quality\n${report.averageQuality.toFixed(1)}`,
        `Average length\n${report.averageLength.toFixed(1)}`,
        `Shortest read\n${report.shortest.toLocaleString()}`,
        `Longest read\n${report.longest.toLocaleString()}`
      ]
    });
  }

  function showRecords(data, count = data.records.length) {
    const includeQuality = data.records.some((record) => record.quality !== null);
    const columns = ['Name', 'Length', 'Sequence'];
    if (includeQuality) columns.push('Average quality');
    const rows = data.records.slice(0, count).map((record) => {
      const row = {
        Name: record.name,
        Length: String(record.sequence.length),
        Sequence: api.preview(record.sequence)
      };
      if (includeQuality) row['Average quality'] = record.quality === null ? '' : averageQuality(record).toFixed(2);
      return row;
    });
    api.addSection(count < data.records.length ? `First ${count.toLocaleString()} sequences` : 'The result', {
      table: { columns, rows }
    });
  }

  function findRecord(data, requested, lineNumber) {
    const record = data.records.find((item) => item.name.toLowerCase() === requested.toLowerCase());
    if (!record) {
      throw new api.PlainError(
        `I could not find a sequence named ${requested}.\n\nI found these names:\n${data.records.slice(0, 20).map((item) => item.name).join('\n')}`,
        lineNumber
      );
    }
    return record;
  }

  function reverseComplement(sequence) {
    const rna = /U/i.test(sequence) && !/T/i.test(sequence);
    const map = rna
      ? {A:'U',C:'G',G:'C',U:'A',T:'A',R:'Y',Y:'R',K:'M',M:'K',S:'S',W:'W',B:'V',D:'H',H:'D',V:'B',N:'N'}
      : {A:'T',C:'G',G:'C',T:'A',U:'A',R:'Y',Y:'R',K:'M',M:'K',S:'S',W:'W',B:'V',D:'H',H:'D',V:'B',N:'N'};
    return Array.from(sequence).reverse().map((character) => map[character.toUpperCase()] || character).join('');
  }

  function translate(sequence) {
    const dna = sequence.toUpperCase().replaceAll('U', 'T');
    let protein = '';
    for (let index = 0; index + 2 < dna.length; index += 3) {
      protein += CODONS[dna.slice(index, index + 3)] || 'X';
    }
    return protein;
  }

  function run(items, context) {
    const instructions = items.map(parse);
    let data = null;

    for (const instruction of instructions) {
      const [first, second] = instruction.values;
      const action = instruction.action;

      if (action === 'say') {
        api.addSection('Message', { paragraphs: [first] });
        continue;
      }

      if (action === 'open') {
        const found = api.findFile(context.files, first);
        if (!found) throw new api.PlainError(`I could not find ${first}.\n\nOpen the file in the Files panel first.`, instruction.lineNumber);
        if (isFasta(found)) data = parseFasta(context.files[found], found);
        else if (isFastq(found)) data = parseFastq(context.files[found], found);
        else throw new api.PlainError(`${found} is not a FASTA or FASTQ file.`, instruction.lineNumber);
        api.addSection('Opened the file', {
          paragraphs: [found],
          bigValue: data.records.length.toLocaleString()
        });
        continue;
      }

      if (!data) throw new api.PlainError('There is no open sequence file yet.', instruction.lineNumber);

      if (action === 'count') {
        api.addSection(data.format === 'fastq' ? 'Reads' : 'Sequences', { bigValue: data.records.length.toLocaleString() });
      } else if (action === 'countBases') {
        api.addSection('Bases', { bigValue: data.records.reduce((sum, record) => sum + record.sequence.length, 0).toLocaleString() });
      } else if (action === 'showNames') {
        api.addSection('Sequence names', { paragraphs: [data.records.map((record) => record.name).join('\n')] });
      } else if (action === 'showLengths') {
        api.addSection('Sequence lengths', {
          table: {
            columns: ['Name', 'Length'],
            rows: data.records.map((record) => ({ Name: record.name, Length: String(record.sequence.length) }))
          }
        });
      } else if (action === 'showFirst') {
        showRecords(data, Math.min(Number(first), data.records.length));
      } else if (action === 'show') {
        showRecords(data);
      } else if (action === 'keepLong') {
        data.records = data.records.filter((record) => record.sequence.length > Number(first));
      } else if (action === 'keepMinimum' || action === 'removeShort') {
        data.records = data.records.filter((record) => record.sequence.length >= Number(first));
      } else if (action === 'keepQuality') {
        requireQuality(data, instruction.lineNumber);
        data.records = data.records.filter((record) => averageQuality(record) >= Number(first));
      } else if (action === 'removeQualityDefault') {
        requireQuality(data, instruction.lineNumber);
        data.records = data.records.filter((record) => averageQuality(record) >= 20);
      } else if (action === 'removeQuality') {
        requireQuality(data, instruction.lineNumber);
        data.records = data.records.filter((record) => averageQuality(record) >= Number(first));
      } else if (action === 'checkQuality') {
        requireQuality(data, instruction.lineNumber);
        api.addSection('Quality checked', { bigValue: data.records.length.toLocaleString() });
      } else if (action === 'showQuality') {
        showQuality(data);
      } else if (action === 'removeAdapters') {
        requireQuality(data, instruction.lineNumber);
        for (const record of data.records) {
          const sequence = record.sequence.toUpperCase();
          const positions = ADAPTERS.map((adapter) => sequence.indexOf(adapter)).filter((position) => position >= 0);
          if (!positions.length) continue;
          const end = Math.min(...positions);
          record.sequence = record.sequence.slice(0, end);
          record.quality = record.quality.slice(0, end);
        }
      } else if (['cutStart', 'trimStart', 'cutEnd', 'trimEnd'].includes(action)) {
        const amount = Number(first);
        const fromStart = action === 'cutStart' || action === 'trimStart';
        for (const record of data.records) {
          record.sequence = fromStart ? record.sequence.slice(amount) : (amount < record.sequence.length ? record.sequence.slice(0, -amount) : '');
          if (record.quality !== null) {
            record.quality = fromStart ? record.quality.slice(amount) : (amount < record.quality.length ? record.quality.slice(0, -amount) : '');
          }
        }
      } else if (action === 'keepMotif' || action === 'removeMotif') {
        const motif = first.toUpperCase().replaceAll('U', 'T');
        data.records = data.records.filter((record) => {
          const contains = record.sequence.toUpperCase().replaceAll('U', 'T').includes(motif);
          return action === 'keepMotif' ? contains : !contains;
        });
      } else if (action === 'use') {
        data.records = [findRecord(data, first, instruction.lineNumber)];
      } else if (action === 'removeNamed') {
        data.records = data.records.filter((record) => record.name.toLowerCase() !== first.toLowerCase());
      } else if (action === 'rename') {
        const record = findRecord(data, first, instruction.lineNumber);
        if (data.records.some((item) => item !== record && item.name.toLowerCase() === second.toLowerCase())) {
          throw new api.PlainError(`A sequence named ${second} already exists.`, instruction.lineNumber);
        }
        record.name = second;
      } else if (action === 'prefix') {
        data.records.forEach((record) => { record.name = `${first}${record.name}`; });
      } else if (action === 'suffix') {
        data.records.forEach((record) => { record.name = `${record.name}${first}`; });
      } else if (action === 'deduplicate') {
        const seen = new Set();
        data.records = data.records.filter((record) => {
          const key = record.sequence.toUpperCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      } else if (action === 'shortestFirst' || action === 'longestFirst') {
        const direction = action === 'longestFirst' ? -1 : 1;
        data.records.sort((left, right) => direction * (left.sequence.length - right.sequence.length || left.name.localeCompare(right.name)));
      } else if (action === 'shortest' || action === 'longest') {
        if (!data.records.length) throw new api.PlainError('There are no sequences left.', instruction.lineNumber);
        const sorted = [...data.records].sort((left, right) => left.sequence.length - right.sequence.length || left.name.localeCompare(right.name));
        const record = action === 'shortest' ? sorted[0] : sorted[sorted.length - 1];
        api.addSection(action === 'shortest' ? 'Shortest sequence' : 'Longest sequence', {
          paragraphs: [record.name],
          bigValue: record.sequence.length.toLocaleString()
        });
      } else if (action === 'range') {
        const start = Number(first);
        const end = Number(second);
        if (end < start) throw new api.PlainError('The ending base must come after the starting base.', instruction.lineNumber);
        for (const record of data.records) {
          record.sequence = record.sequence.slice(start - 1, end);
          if (record.quality !== null) record.quality = record.quality.slice(start - 1, end);
        }
      } else if (action === 'toRna') {
        data.records.forEach((record) => { record.sequence = record.sequence.replace(/T/g, 'U').replace(/t/g, 'u'); });
      } else if (action === 'toDna') {
        data.records.forEach((record) => { record.sequence = record.sequence.replace(/U/g, 'T').replace(/u/g, 't'); });
      } else if (action === 'reverse') {
        data.records.forEach((record) => {
          record.sequence = reverseComplement(record.sequence);
          if (record.quality !== null) record.quality = Array.from(record.quality).reverse().join('');
        });
      } else if (action === 'translate') {
        data.records.forEach((record) => {
          record.sequence = translate(record.sequence);
          record.quality = null;
        });
        data.format = 'fasta';
      } else if (action === 'gc') {
        api.addSection('GC content', {
          table: {
            columns: ['Name', 'Length', 'GC percent'],
            rows: data.records.map((record) => {
              const sequence = record.sequence.toUpperCase().replaceAll('U', 'T');
              const gc = Array.from(sequence).filter((base) => base === 'G' || base === 'C').length;
              return {
                Name: record.name,
                Length: String(sequence.length),
                'GC percent': (sequence.length ? gc / sequence.length * 100 : 0).toFixed(2)
              };
            })
          }
        });
      } else if (action === 'compare') {
        const found = api.findFile(context.files, first);
        if (!found) throw new api.PlainError(`I could not find ${first}.`, instruction.lineNumber);
        const other = isFasta(found) ? parseFasta(context.files[found], found) : (isFastq(found) ? parseFastq(context.files[found], found) : null);
        if (!other) throw new api.PlainError(`${found} is not a FASTA or FASTQ file.`, instruction.lineNumber);
        const byName = new Map(other.records.map((record) => [record.name, record]));
        const rows = data.records.map((record) => {
          const partner = byName.get(record.name);
          if (!partner) return { Name: record.name, 'Other length': '', 'Identity percent': '', 'Exact match': 'no match' };
          const denominator = Math.max(record.sequence.length, partner.sequence.length);
          let matching = 0;
          for (let index = 0; index < Math.min(record.sequence.length, partner.sequence.length); index += 1) {
            if (record.sequence[index].toUpperCase() === partner.sequence[index].toUpperCase()) matching += 1;
          }
          const identity = denominator ? matching / denominator * 100 : 100;
          return {
            Name: record.name,
            'Other length': String(partner.sequence.length),
            'Identity percent': identity.toFixed(2),
            'Exact match': record.sequence.toUpperCase() === partner.sequence.toUpperCase() ? 'yes' : 'no'
          };
        });
        api.addSection('Sequence comparison', {
          table: { columns: ['Name', 'Other length', 'Identity percent', 'Exact match'], rows }
        });
      } else if (action === 'save') {
        const name = context.numberedName(first, context.runNumber, context.repeatCount);
        context.files[name] = encode(data, name);
        api.addSection('Saved the result', { file: { name, description: 'Saved in Files' } });
      }
    }
  }

  api.registerRunner({ detect, run });

  const highlights = [
    [/^(Remove the sequence named )(.+)(\.)$/i, ['c', 'v', 'p']],
    [/^(Rename the sequence )(.+?)( to )(.+)(\.)$/i, ['c', 'v', 'w', 'v', 'p']],
    [/^(Add )(.+)( to the (?:start|end) of every sequence name)(\.)$/i, ['c', 'v', 'c', 'p']],
    [/^((?:Remove duplicate sequences|Put the shortest sequences first|Put the longest sequences first|Show the sequence lengths|Find the shortest sequence|Find the longest sequence))(\.)$/i, ['c', 'p']],
    [/^(Keep bases )([0-9]+)( to )([0-9]+)(\.)$/i, ['c', 'v', 'w', 'v', 'p']]
  ];
  for (const rule of highlights) api.registerHighlight(...rule);
})();
