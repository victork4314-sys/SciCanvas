# FigureLoom Bio

FigureLoom Bio is a plain-language programming system for tables, FASTA, FASTQ, and larger bioinformatics workflows. A program is a `.flbio` file made from ordinary instructions.

```flbio
Open the file reads.fastq.
Check the quality.
Remove reads with low quality.
Remove reads shorter than 50 bases.
Save the result as clean-reads.fastq.
```

The same program can be edited as text or with visual sentence blocks in the [FigureLoom Bio IDE](https://figureloom.org/ide/).

## Start in the browser IDE

1. Open the FigureLoom Bio IDE.
2. Press **Open examples** or **Open** to add your own files.
3. Open a `.flbio` program from Files.
4. Press **Blocks** to build visually, or edit the sentences directly.
5. Press **Run** or **Run blocks**.
6. Press **Translate** to generate Python, R, Bash, Snakemake, or Nextflow.
7. Read the separate result cards on the right.
8. Generated files appear in Files immediately.

## Text and blocks are the same program

Every block is one real FigureLoom Bio sentence. The block editor does not create a second hidden language.

```text
Open the file [ reads.fastq ] .
```

writes:

```flbio
Open the file reads.fastq.
```

Changing a filename, number, column, motif, sequence name, tool, or tool argument inside a block updates the real `.flbio` program immediately.

Blocks can be searched, added, edited, dragged, moved with arrow controls, duplicated, and deleted. On iPad, drag from the enlarged `⋮⋮` handle with a finger or Apple Pencil.

## Language rules

- Put one instruction on each line.
- End every instruction with a normal period.
- Blank lines are allowed.
- A line beginning with `#` is a comment and is not run.
- Filenames include their extension.
- The repeat instruction must be the first instruction.
- Table instructions need an open CSV or TSV table.
- Sequence instructions need an open FASTA or FASTQ file.
- Paired FASTQ instructions need a pair opened with the paired-file sentence.

## Repeat a complete program

```flbio
Run this program 10 times.
```

Everything after it runs ten times. Saved files are numbered automatically, such as `clean-reads-1.fastq` through `clean-reads-10.fastq`.

The browser IDE allows up to 100 repeats in one run. The command-line engine allows up to 1,000.

## File and message commands

```flbio
Open the file samples.csv.
Open the file sequences.fasta.
Open the file reads.fastq.
Open the large file genome.fasta.gz.
Open the files part-1.fasta, part-2.fasta together.
Open the files forward.fastq and reverse.fastq as a pair.
Merge the files lane-1.fastq, lane-2.fastq.
Merge the result with more-sequences.fasta.
Add the rows from more-samples.csv.
Say Starting the analysis.
```

`Open the large file ...` forces streaming mode in the command-line engine. Ordinary `Open the file ...` also switches to streaming automatically for files at least 64 MiB and for compressed FASTA or FASTQ files.

`Open the files ... together.` and `Merge the files ...` append compatible files in the order listed. Merge FASTA with FASTA, FASTQ with FASTQ, or tables with tables.

`Add the rows from ...` appends table rows and keeps the union of all columns. Missing values are left empty.

## Huge FASTA and FASTQ files

### Browser IDE

Large sequence files are stored in IndexedDB instead of localStorage. They appear in Files as streamed files with their type and size. Clicking one opens a small preview instead of placing the complete genome in the text editor.

The browser processes records one at a time for stream-safe operations, including:

- Length filtering.
- Motif filtering.
- FASTQ quality filtering.
- Adapter removal.
- Trimming and base ranges.
- Sequence selection and renaming.
- Prefixes and suffixes.
- Duplicate removal.
- DNA and RNA conversion.
- Reverse complements.
- Protein translation.
- Counts, GC content, quality summaries, and previews.
- Merging and chunked output files.

Browser memory no longer grows with the complete file size. It can still grow with the largest single sequence record because one record is represented as one JavaScript string. A multi-gigabyte chromosome stored as one unbroken FASTA record is better handled in FigureLoom Linux or the queue.

The browser can stream gzip-compressed input where the browser supports `DecompressionStream`. Generated gzip output currently needs the command-line engine, FigureLoom Linux, or the queue.

Sorting or comparing an enormous complete dataset requires an indexed whole-dataset job. Filter or split it first in the browser, or run that step locally or through the queue.

Huge paired FASTQ execution currently belongs in FigureLoom Linux or the queue. The browser can still build the blocks and translate the workflow.

### Command-line engine

The Python engine reads large and compressed FASTA or FASTQ files record by record. The default automatic streaming threshold is 64 MiB.

Set another threshold with:

```bash
export FLBIO_STREAM_THRESHOLD_MB=256
```

Use an explicit streaming sentence when desired:

```flbio
Open the large file genome.fasta.gz.
Remove sequences containing N.
Keep only sequences longer than 1000 bases.
Calculate the GC content.
Save the result as cleaned-genome.fasta.gz.
```

Streaming output is written to a temporary file and moved into place only after the complete write succeeds.

## Table commands

```flbio
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Keep only the columns sample, condition, and status.
Rename the column condition to group.
Put the rows in order by age.
Put the largest age first.
Put the smallest age first.
Remove duplicate rows using sample.
Replace empty values under status with unknown.
Combine it with metadata.csv using sample.
Change control to untreated under condition.
Add the rows from another-batch.csv.
Count the rows.
Show the result.
Save the result as clean-samples.csv.
```

### Table behavior

- **Keep only rows marked** keeps exact matches.
- **Remove rows marked** removes exact matches.
- **Keep only the columns** keeps the listed columns in that order.
- **Rename the column** changes one column name.
- **Put the rows in order by** sorts numbers numerically and text alphabetically.
- **Put the largest or smallest first** controls direction.
- **Remove duplicate rows using** keeps the first row for each value.
- **Replace empty values** fills blank cells under one column.
- **Combine it with** performs a left-style metadata join using one column.
- **Change** replaces an exact value under one column.
- **Add the rows from** appends rows and combines the column sets.

CSV output uses `.csv`. Tab-separated output uses `.tsv`.

## FASTA and general sequence commands

```flbio
Count the sequences.
Count the bases.
Show the sequence names.
Show the first 10 sequences.
Show the sequences.
Show the result.
Keep only sequences longer than 500 bases.
Keep sequences at least 100 bases long.
Remove sequences shorter than 100 bases.
Keep only sequences containing ATG.
Remove sequences containing N.
Use the sequence named sample-17.
Remove the sequence named sample-17.
Rename the sequence sample-17 to chosen-sequence.
Add run- to the start of every sequence name.
Add -clean to the end of every sequence name.
Remove duplicate sequences.
Put the shortest sequences first.
Put the longest sequences first.
Show the sequence lengths.
Find the shortest sequence.
Find the longest sequence.
Keep bases 1 to 100.
Convert the DNA to RNA.
Convert the RNA to DNA.
Find the reverse complement.
Translate the DNA into protein.
Calculate the GC content.
Compare the sequences with reference.fasta.
Save the sequences as prepared-sequences.fasta.
Save the result as prepared-sequences.fasta.
```

### Length wording

```flbio
Keep only sequences longer than 500 bases.
Keep sequences at least 500 bases long.
```

The first keeps lengths above 500. The second includes sequences that are exactly 500 bases long.

`Keep bases 1 to 100.` uses one-based positions and includes both endpoints. FASTQ quality characters are cut to the same range.

`Remove duplicate sequences.` compares sequence letters and keeps the first copy.

`Compare the sequences with ...` matches records by sequence name and reports identity and exact matches. On huge files, use an indexed local or queued workflow.

Accepted equivalent forms include:

```flbio
Convert the sequences to RNA.
Convert the sequences to DNA.
Translate the sequences.
Keep sequences containing ATG.
Save the sequences as result.fasta.
```

## FASTQ commands

```flbio
Count the reads.
Show the reads.
Check the quality.
Check the quality again.
Show the quality report.
Remove reads with low quality.
Keep reads with average quality at least 20.
Remove reads with average quality below 20.
Keep reads at least 50 bases long.
Remove reads shorter than 50 bases.
Remove adapter sequences.
Cut 10 bases from the beginning of each read.
Cut 5 bases from the end of each read.
Trim 5 bases from the start.
Trim 5 bases from the end.
Save the reads as clean-reads.fastq.
Save the result as clean-reads.fastq.
```

FASTQ quality uses standard Phred+33 characters.

`Remove reads with low quality.` uses an average quality threshold of 20 in the native engine. Translated fastp workflows use fastp quality settings and show a warning when the semantics are not perfectly identical.

`Remove adapter sequences.` recognizes common Illumina adapter sequences in the native engine.

Cutting or trimming always keeps the sequence and quality string aligned.

## Paired FASTQ commands

```flbio
Open the files forward.fastq and reverse.fastq as a pair.
Check the quality.
Show the quality report.
Remove reads with low quality.
Remove reads shorter than 50 bases.
Remove adapter sequences.
Cut 10 bases from the beginning of each read.
Cut 5 bases from the end of each read.
Show the result.
Save the pair as clean-forward.fastq and clean-reverse.fastq.
```

Paired reads are filtered and cut together. A pair is kept only when both reads pass the active filter.

## Run installed bioinformatics tools

FigureLoom Bio does not need to rebuild every mature bioinformatics algorithm. It can call tools already installed in FigureLoom Linux, a workstation, a cluster, or a queue worker.

```flbio
Run the tool fastqc with reads.fastq --outdir quality-report.
Run the tool minimap2 with -ax map-ont reference.fasta reads.fastq -o alignment.sam.
Run the tool samtools with sort alignment.bam -o sorted.bam.
Run the tool bcftools with view variants.vcf.gz.
```

The native command-line runner refuses tool commands unless permission is explicit:

```bash
flbio run workflow.flbio --allow-tools
```

The tool name is validated and arguments are split safely. The native runner does not pass the instruction through a shell. A missing tool or failed command produces a plain error.

The browser IDE does not launch installed system tools. It can build the block, preserve the sentence, and translate the workflow for FigureLoom Linux, a queue, or another environment.

This gateway lets FigureLoom Bio participate in alignment, assembly, annotation, variant calling, phylogenetics, metagenomics, single-cell, proteomics, and other fields by using their established tools.

## Translate a program

Press **Translate** in the IDE and choose:

- Python.
- R.
- Bash.
- Snakemake.
- Nextflow.

The translation window shows:

- Generated code.
- Required command-line tools.
- Warnings where a target tool does not have perfectly identical behavior.
- Copy and download controls.

The translators emit common tools such as SeqKit, fastp, csvkit, pandas, and any explicitly named tool command. They do not merely wrap `flbio run` around the original program.

Translate from the command line with:

```bash
flbio translate workflow.flbio --to python
flbio translate workflow.flbio --to r
flbio translate workflow.flbio --to bash
flbio translate workflow.flbio --to snakemake
flbio translate workflow.flbio --to nextflow
flbio translate workflow.flbio --to nextflow --output main.nf
```

Generated code should be reviewed before production use, especially when a target tool reports a semantic warning.

## Result commands

```flbio
Count the rows.
Count the sequences.
Count the reads.
Count the bases.
Show the result.
Show the file.
Show the sequences.
Show the reads.
Show the sequence names.
Show the sequence lengths.
Show the first 10 sequences.
Show the quality report.
Save the result as result.csv.
Save the sequences as result.fasta.
Save the reads as result.fastq.
Save the pair as forward-result.fastq and reverse-result.fastq.
```

The filename determines the output format.

## Supported extensions

### Programs

- `.flbio`

### Tables

- `.csv`
- `.tsv`

### FASTA

- `.fasta`
- `.fa`
- `.fna`
- `.ffn`
- `.faa`
- `.frn`
- The same extensions followed by `.gz`

### FASTQ

- `.fastq`
- `.fq`
- The same extensions followed by `.gz`

## Complete examples

### Merge and clean a huge FASTA

```flbio
Open the large file chromosome-1.fasta.gz.
Merge the result with chromosome-2.fasta.gz.
Remove sequences containing NNNNN.
Keep only sequences longer than 1000 bases.
Calculate the GC content.
Save the result as merged-clean.fasta.gz.
```

### Append table batches

```flbio
Open the files batch-1.csv, batch-2.csv together.
Add the rows from batch-3.csv.
Remove duplicate rows using sample.
Put the rows in order by sample.
Show the result.
Save the result as all-samples.csv.
```

### Repeated FASTQ cleanup

```flbio
Run this program 10 times.

Say Starting the FASTQ cleanup.
Open the file reads.fastq.
Check the quality.
Remove reads with low quality.
Remove reads shorter than 50 bases.
Remove adapter sequences.
Cut 10 bases from the beginning of each read.
Cut 5 bases from the end of each read.
Check the quality again.
Show the quality report.
Save the result as clean-reads.fastq.
Say The FASTQ cleanup is finished.
```

### Use an installed workflow tool

```flbio
Say Starting the alignment.
Run the tool minimap2 with -ax map-ont reference.fasta reads.fastq -o alignment.sam.
Run the tool samtools with view -b alignment.sam -o alignment.bam.
Run the tool samtools with sort alignment.bam -o sorted-alignment.bam.
Say The alignment is ready.
```

## Run from the command line

FigureLoom Bio needs Python 3.10 or newer.

```bash
cd figureloom-bio
python -m pip install -e .
flbio run examples/clean-samples.flbio
flbio run examples/merge-large-fasta.flbio
```

Input files are read beside the `.flbio` program unless a complete path is written.

## Errors

Errors point to the sentence that needs attention. Common causes include:

- A missing period.
- A missing file.
- A column or sequence name that does not exist.
- Incompatible file types in one merge.
- A table instruction used on sequence data.
- A FASTQ quality instruction used on FASTA.
- A paired result saved with a single-file sentence.
- A whole-dataset command used on an unindexed huge browser file.
- A tool command run without `--allow-tools`.
- A required translated tool that is not installed.

The engine does not silently change input files.

## Current limits

- Large browser sequence processing is record-streamed, but one enormous single record can still require substantial memory.
- Browser-generated gzip output currently needs FigureLoom Linux, the command-line engine, or the queue.
- Huge paired FASTQ execution currently needs FigureLoom Linux or the queue.
- Whole-dataset sorting and comparison of huge browser files need an indexed local or queued job.
- Result previews show up to 100 records, while saved output keeps the full result.
- Translation uses the standard genetic code from the first base and ignores an incomplete final codon.
- Translating FASTQ into protein removes quality scores, so protein output must be FASTA.
- Translation can require external tools that must be installed in the destination environment.
- The built-in language will continue expanding. The guarded tool gateway provides access to the wider bioinformatics ecosystem now.

---

*Dedicated to Adriana M. K.*
