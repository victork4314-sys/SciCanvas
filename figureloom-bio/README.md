# FigureLoom Bio

FigureLoom Bio is a programming language that reads like ordinary instructions.

```flbio
Open the file samples.csv.
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Count the rows.
Show the result.
Save the result as clean-samples.csv.
```

The language uses normal sentences and normal periods. The difficult machinery stays underneath.

## Reusable programs

Put this sentence at the beginning to run the whole program more than once.

```flbio
Run this program 10 times.
```

Everything after it runs ten times. Saved files are numbered automatically, such as `cleaned-reads-1.fastq` through `cleaned-reads-10.fastq`, so one run does not overwrite another.

The browser IDE includes a program builder. It can start with a table, FASTA, or FASTQ workflow, add plain instructions, set the repeat count, use the program immediately, or download the real `.flbio` file.

## Table commands

```text
Open the file samples.csv.
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

Combining a second table keeps the current rows and adds matching information from the other file. Rows without a match stay in the result with empty added values.

## FASTA and FASTQ commands

```text
Open the file sequences.fasta.
Open the file reads.fastq.
Count the sequences.
Count the reads.
Count the bases.
Show the sequences.
Show the reads.
Show the sequence names.
Keep sequences at least 100 bases long.
Remove reads shorter than 50 bases.
Keep reads with average quality at least 20.
Remove reads with average quality below 20.
Trim 5 bases from the start.
Trim 5 bases from the end.
Keep sequences containing ATG.
Remove sequences containing N.
Convert the sequences to RNA.
Convert the sequences to DNA.
Find the reverse complement.
Translate the sequences.
Calculate the GC content.
Compare the sequences with reference.fasta.
Save the sequences as prepared.fasta.
Save the reads as cleaned.fastq.
```

FASTA files use `.fasta`, `.fa`, `.fna`, `.ffn`, `.faa`, or `.frn`. FASTQ files use `.fastq` or `.fq`.

FASTQ quality instructions use standard Phred+33 quality characters. Translating sequences removes FASTQ quality scores, so translated sequences should be saved as FASTA.

Sequence comparison matches records by their sequence name and reports exact matches and per-record identity.

## Example repeated FASTQ program

```flbio
Run this program 10 times.

Say Cleaning the reads.
Open the file reads.fastq.
Keep reads with average quality at least 20.
Remove reads shorter than 50 bases.
Trim 5 bases from the start.
Count the reads.
Calculate the GC content.
Save the reads as cleaned-reads.fastq.
Say The reads are ready.
```

## Run the command-line engine

FigureLoom Bio currently needs Python 3.10 or newer.

```bash
cd figureloom-bio
python -m pip install -e .
flbio run examples/clean-samples.flbio
flbio run examples/clean-fastq.flbio
```

The same table, FASTA, FASTQ, comparison, and repeat commands run directly in the browser IDE at `figureloom.org/ide`.

The result is shown in separate, spacious sections. Raw technical output is not mixed into the useful result.

## What works now

- Reading `.flbio` instructions as full sentences.
- Requiring a normal period after every instruction.
- Repeating a complete program and numbering its saved outputs.
- Building, using, and downloading programs in the browser IDE.
- Opening CSV, TSV, FASTA, and FASTQ files.
- Cleaning, sorting, combining, and saving tables.
- Filtering sequences and reads by length, motif, and FASTQ quality.
- Trimming reads and sequences.
- Converting DNA and RNA.
- Finding reverse complements.
- Translating nucleotide sequences.
- Calculating GC content.
- Comparing named sequences.
- Saving FASTA and FASTQ results.
- Plain errors that point to the sentence that needs fixing.

Server queues and larger remote jobs come later without making the visible language more complicated.
