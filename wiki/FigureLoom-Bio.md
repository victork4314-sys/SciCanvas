# FigureLoom Bio

FigureLoom Bio is a small programming language for table, FASTA, and FASTQ work. A program is a `.flbio` file made from ordinary instructions.

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
2. Press **Open examples** to load working table and sequence examples, or press **Open** to add your own files.
3. Open a `.flbio` program from the Files panel.
4. Press **Blocks** to build visually, or edit the sentences directly in the text editor.
5. Press **Run** or **Run blocks**.
6. Read the separate result cards on the right.
7. Press **Export results** to download a standalone HTML report.
8. Generated CSV, TSV, FASTA, and FASTQ files appear in the Files panel and can be saved from there.

## Text and blocks are the same program

The block editor does not create a second language. Every block is one real FigureLoom Bio sentence.

For example, this block:

```text
Open the file [ reads.fastq ] .
```

writes this sentence into the open `.flbio` file:

```flbio
Open the file reads.fastq.
```

Changing a filename, number, column name, motif, or sequence name inside a block updates the text program immediately. Existing text programs can be opened as blocks. Sentences that a newer version has not classified yet are preserved as custom blocks.

Blocks can be searched, added, edited, dragged into a new order, moved with the arrow controls, duplicated, and deleted. The **Run blocks** button runs the same text program shown in the normal editor.

## Language rules

- Put one instruction on each line.
- End every instruction with a normal period.
- Blank lines are allowed.
- A line beginning with `#` is a comment and is not run.
- Filenames include their extension, such as `samples.csv`, `reads.fastq`, or `sequences.fasta`.
- The repeat instruction must be the first instruction in the program.
- Table instructions need an open CSV or TSV table.
- Sequence instructions need an open FASTA or FASTQ file.
- Paired FASTQ instructions need a pair opened with the paired-file sentence.

## Repeat a complete program

```flbio
Run this program 10 times.
```

Put this sentence first. Everything after it runs ten times. Saved files are numbered automatically, such as `clean-reads-1.fastq` through `clean-reads-10.fastq`, so one run cannot overwrite another.

The browser IDE allows up to 100 repeats in one run. The command-line engine allows up to 1,000.

## File and message commands

```flbio
Open the file samples.csv.
Open the file sequences.fasta.
Open the file reads.fastq.
Open the files forward.fastq and reverse.fastq as a pair.
Say Starting the analysis.
```

`Open the file ...` accepts CSV, TSV, FASTA, and FASTQ files. The paired form requires two FASTQ files with the same number of reads.

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
Count the rows.
Show the result.
Save the result as clean-samples.csv.
```

### What the table commands do

- **Keep only rows marked** keeps rows whose value exactly matches the named value under the named column.
- **Remove rows marked** removes exact matches.
- **Keep only the columns** keeps the listed columns in that order.
- **Rename the column** changes one column name.
- **Put the rows in order by** sorts text naturally and numbers numerically.
- **Put the largest or smallest first** controls the sort direction.
- **Remove duplicate rows using** keeps the first row for each value under the named column.
- **Replace empty values** fills blank cells under one column.
- **Combine it with** keeps the current rows and adds matching information from another table.
- **Change** replaces one exact value under one column.

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

These two instructions are deliberately different:

```flbio
Keep only sequences longer than 500 bases.
Keep sequences at least 500 bases long.
```

The first keeps lengths above 500. The second includes sequences that are exactly 500 bases long.

`Keep bases 1 to 100.` uses one-based positions and includes both the first and last position. FASTQ quality characters are cut to the same range so they remain aligned with the sequence.

`Remove duplicate sequences.` compares the sequence letters and keeps the first copy. Sequence names do not need to match.

`Compare the sequences with ...` matches records by sequence name and reports identity and exact matches.

Accepted equivalent sentence forms include:

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

`Remove reads with low quality.` uses an average quality threshold of 20. The explicit quality instructions let the program choose another threshold.

`Remove adapter sequences.` recognizes common Illumina adapter sequences and cuts the sequence and quality string at the first adapter position.

The **cut** and **trim** forms are both accepted. Cutting or trimming always keeps the sequence and quality string the same length.

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

Paired reads are filtered and cut together. A pair is kept only when both reads pass the active filter. Saving a pair numbers both output files during repeated runs.

Sequence-name editing, sequence sorting, and base-range commands currently work on one open FASTA or FASTQ file, not on a paired FASTQ result.

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

The filename determines the output format. Use `.csv` or `.tsv` for tables, a FASTA extension for FASTA output, and `.fastq` or `.fq` for FASTQ output.

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

### FASTQ

- `.fastq`
- `.fq`

## Complete examples

### Table preparation

```flbio
Open the file samples.csv.
Remove duplicate rows using sample.
Replace empty values under status with unknown.
Change control to untreated under condition.
Combine it with metadata.csv using sample.
Keep only the columns sample, condition, status, and lab.
Put the rows in order by sample.
Show the result.
Save the result as prepared-samples.csv.
```

### FASTA preparation

```flbio
Open the file sequences.fasta.
Remove duplicate sequences.
Remove sequences containing N.
Keep only sequences longer than 500 bases.
Put the longest sequences first.
Show the sequence lengths.
Calculate the GC content.
Save the result as prepared-sequences.fasta.
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

## Run a program from the command line

FigureLoom Bio needs Python 3.10 or newer.

```bash
cd figureloom-bio
python -m pip install -e .
flbio run examples/clean-samples.flbio
```

The command-line engine reads input files beside the `.flbio` program unless a complete path is written in the instruction.

## Errors

Errors point to the sentence that needs attention. Common causes are:

- A missing period.
- A filename that is not present.
- A column or sequence name that does not exist.
- A table instruction used on a sequence file.
- A FASTQ quality instruction used on FASTA.
- A paired result saved with the single-file sentence.
- An ending base smaller than the starting base.

The error stays in the Results panel and does not silently change the input files.

## Current limits

- The browser IDE runs files stored in its Files panel.
- Very large remote jobs and the server queue are separate future work.
- The result table preview shows up to 100 records, but saved output keeps the complete result.
- Translation uses the standard genetic code from the first base and ignores an incomplete final codon.
- Translating FASTQ removes quality scores, so translated output must be saved as FASTA.

---

*Dedicated to Adriana M. K.*
