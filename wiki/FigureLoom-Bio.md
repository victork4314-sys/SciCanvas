# FigureLoom Bio

FigureLoom Bio is a plain-language programming system for tables, FASTA files, FASTQ files, and paired FASTQ reads. Programs are saved as `.flbio` files.

Every instruction is one ordinary sentence ending with a period.

```flbio
Open the file reads.fastq.
Check the quality.
Remove reads shorter than 50 bases.
Save the reads as clean-reads.fastq.
```

Open the browser IDE at `figureloom.org/ide` to create, run, save, and download programs.

## Text, forms, and blocks

The IDE offers three ways to make the same program:

- Write the sentences directly in the editor.
- Use **Build program** for a quick guided form.
- Use **Blocks** for colored sentence pieces with editable spaces.

Blocks do not create a separate language. A block that visually reads:

```text
Open the file [reads.fastq].
```

becomes exactly this line in the `.flbio` file:

```flbio
Open the file reads.fastq.
```

Open an existing text program and press **Blocks** to turn recognized sentences into blocks. Unrecognized or future sentences are preserved as custom blocks instead of being deleted.

Inside Blocks:

- Choose blocks from the category list.
- Edit filenames, values, sequence names, columns, motifs, and numbers inside the block.
- Drag blocks or use the arrow buttons to change their order.
- Delete individual blocks with the × button.
- Set how many times the whole program should run.
- Press **Use in editor** to return to normal text.
- Press **Download .flbio** to download the real program.

## Basic program rules

- Put one instruction on each line.
- End every instruction with a period.
- Blank lines are allowed.
- A line beginning with `#` is a comment.
- Use the real filename when opening, comparing, combining, or saving a file.
- Programs are saved with the `.flbio` extension.
- Files created by a program appear in the Files panel.
- The line-number gutter continues for the full program and follows the editor while scrolling.

## Repeat the whole program

Put this instruction first:

```flbio
Run this program 10 times.
```

Everything after it runs ten times. Saved files are numbered automatically:

```text
clean-reads-1.fastq
clean-reads-2.fastq
clean-reads-3.fastq
...
clean-reads-10.fastq
```

Paired outputs number both files while keeping each pair matched.

The browser IDE can run a program up to 100 times at once. The command-line engine can run it up to 1,000 times at once.

# Complete command list

The example words below are replaced with the real filename, value, column, name, motif, or number needed by the program.

## Program and message commands

```flbio
Run this program 10 times.
Say Starting the analysis.
```

`Run this program` must be the first non-comment instruction.

## Open files

```flbio
Open the file samples.csv.
Open the file sequences.fasta.
Open the file reads.fastq.
Open the files forward.fastq and reverse.fastq as a pair.
```

A single `Open the file` instruction currently accepts CSV, TSV, FASTA, and FASTQ files.

Both files in a pair must be FASTQ files with the same number of reads. Paired reads remain matched through supported filtering and cutting operations.

# Table commands

## Filter table rows

```flbio
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Change control to untreated under condition.
Remove duplicate rows using sample.
Replace empty values under status with unknown.
```

Duplicate row removal keeps the first row with each value under the named column.

## Choose and rename columns

```flbio
Keep only the columns sample, condition, and status.
Rename the column condition to group.
```

Column names are matched without caring about uppercase or lowercase letters.

## Combine tables

```flbio
Combine it with metadata.csv using sample.
```

The current rows stay in place. Matching information from the other table is added using the named column. Rows without a match remain in the result with empty added values.

## Sort table rows

```flbio
Put the rows in order by age.
Put the largest age first.
Put the smallest age first.
```

Numbers are sorted as numbers. Text is sorted naturally. Empty values stay at the end.

## Count, show, and save tables

```flbio
Count the rows.
Show the result.
Show the file.
Save the result as prepared-samples.csv.
```

Table results can be saved as CSV or TSV.

# Single FASTA and FASTQ commands

The commands in this section work with one opened FASTA or FASTQ file. Commands that rename, reorder, deduplicate, or slice individual sequences deliberately refuse paired-read sets so the pair cannot be broken accidentally.

## Count and show sequences

```flbio
Count the sequences.
Count the reads.
Count the bases.
Show the sequences.
Show the reads.
Show the sequence names.
Show the first 10 sequences.
Show the sequence lengths.
Find the shortest sequence.
Find the longest sequence.
```

`Count the reads.` and `Count the sequences.` use the same record count. Choose the wording that sounds natural for the file.

`Show the first 10 sequences.` can use any positive number.

## Select or remove a named sequence

```flbio
Use the sequence named sample-17.
Remove the sequence named sample-17.
```

`Use the sequence named` keeps only that named sequence as the current result.

## Rename sequence names

```flbio
Rename the sequence sample-17 to chosen.
Add run- to the start of every sequence name.
Add -clean to the end of every sequence name.
```

A rename cannot create two identical sequence names.

## Remove exact duplicate sequences

```flbio
Remove duplicate sequences.
```

This compares the complete sequence value and keeps the first record with each exact value. Sequence names and descriptions do not affect the duplicate check.

## Order by sequence length

```flbio
Put the shortest sequences first.
Put the longest sequences first.
```

Sequences with the same length are ordered by name.

## Filter by length

```flbio
Keep sequences at least 500 bases long.
Keep reads at least 50 bases long.
Keep only sequences longer than 500 bases.
Remove sequences shorter than 100 bases.
Remove reads shorter than 50 bases.
```

`At least 500` includes a sequence exactly 500 bases long. `Longer than 500` begins at 501 bases.

## Keep a numbered base range

```flbio
Keep bases 10 to 100.
```

Base positions begin at 1, and both named positions are included. If the file is FASTQ, the matching quality characters are kept at the same positions.

## Trim sequence or read ends

```flbio
Trim 5 bases from the start.
Trim 5 bases from the end.
Cut 10 bases from the beginning of each read.
Cut 5 bases from the end of each read.
```

The `Trim` and `Cut` forms both remove bases from the named end. FASTQ quality characters are cut with the bases.

## Filter by sequence content

```flbio
Keep sequences containing ATG.
Keep only sequences containing ATG.
Remove sequences containing N.
```

The two `Keep` forms have the same result and are both accepted. DNA and RNA motif comparisons treat `T` and `U` as matching forms.

## Convert DNA and RNA

```flbio
Convert the DNA to RNA.
Convert the sequences to RNA.
Convert the RNA to DNA.
Convert the sequences to DNA.
Find the reverse complement.
```

The two RNA forms and the two DNA forms are aliases. Reverse-complementing FASTQ reads also reverses the quality characters so they stay aligned.

## Translate DNA into protein

```flbio
Translate the DNA into protein.
Translate the sequences.
```

Translation uses the standard genetic code, begins at the first base, and ignores an incomplete final codon. Unknown codons become `X`.

Translated records no longer have FASTQ quality scores, so save them as FASTA.

## Calculate GC content

```flbio
Calculate the GC content.
```

The result lists each sequence name, its length, and its GC percentage.

## Compare named sequences

```flbio
Compare the sequences with reference.fasta.
Compare it with reference.fasta.
```

Records are matched by sequence name. The result reports identity percentages and exact matches. The comparison file can be FASTA or FASTQ.

## Save single sequence results

```flbio
Save the sequences as prepared.fasta.
Save the reads as cleaned.fastq.
Save the result as prepared.fasta.
Save the result as cleaned.fastq.
```

Use a FASTA filename when quality scores are unavailable. Use FASTQ only while every record still has a quality string.

# FASTQ quality commands

## Check and show quality

```flbio
Check the quality.
Check the quality again.
Show the quality report.
```

`Check the quality.` stores a new report for the current reads. `Check the quality again.` is the same instruction with wording suited to a second check after cleaning.

The quality report includes the number of reads or pairs, average quality, average length, shortest length, and longest length.

FASTQ quality uses standard Phred+33 characters.

## Filter by quality

```flbio
Keep reads with average quality at least 20.
Remove reads with average quality below 20.
Remove reads with low quality.
```

`Remove reads with low quality.` uses an average Phred quality threshold of 20.

For paired reads, a pair is removed together when it fails the supported quality filter so the files remain matched.

## Remove common adapter sequences

```flbio
Remove adapter sequences.
```

FigureLoom Bio recognizes common Illumina adapter sequences and cuts a read where a recognized adapter begins. Quality characters are cut at the same point.

## Paired-read cleanup

```flbio
Open the files forward.fastq and reverse.fastq as a pair.
Check the quality.
Remove reads with low quality.
Remove reads shorter than 50 bases.
Remove adapter sequences.
Cut 10 bases from the beginning of each read.
Cut 5 bases from the end of each read.
Check the quality again.
Show the quality report.
Show the result.
Save the pair as clean-forward.fastq and clean-reverse.fastq.
```

Use `Save the pair` for paired reads. A plain `Save the result` instruction refuses a paired result and explains the correct sentence.

# Supported filenames

## Programs

- `.flbio`

## Tables

- `.csv`
- `.tsv`

## FASTA

- `.fasta`
- `.fa`
- `.fna`
- `.ffn`
- `.faa`
- `.frn`

## FASTQ

- `.fastq`
- `.fq`

# Complete examples

## Table-cleaning program

```flbio
Say Preparing the sample information.
Open the file samples.csv.
Remove duplicate rows using sample.
Replace empty values under status with unknown.
Keep only the columns sample, condition, and status.
Rename the column condition to group.
Put the rows in order by sample.
Show the result.
Save the result as prepared-samples.csv.
Say The sample information is ready.
```

## FASTA organization program

```flbio
Say Preparing the sequences.
Open the file sequences.fasta.
Remove duplicate sequences.
Remove sequences containing N.
Keep only sequences containing ATG.
Put the longest sequences first.
Show the sequence lengths.
Calculate the GC content.
Save the sequences as prepared-sequences.fasta.
```

## Repeated FASTQ-cleaning program

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

## Paired FASTQ-cleaning program

```flbio
Say Starting the paired cleanup.
Open the files forward.fastq and reverse.fastq as a pair.
Check the quality.
Remove reads with low quality.
Remove reads shorter than 50 bases.
Remove adapter sequences.
Cut 10 bases from the beginning of each read.
Cut 5 bases from the end of each read.
Check the quality again.
Show the quality report.
Save the pair as clean-forward.fastq and clean-reverse.fastq.
Say The paired cleanup is finished.
```

# Plain errors

FigureLoom Bio points to the line that needs attention and uses normal wording. Common errors include:

- A missing period.
- A file that is not in the Files panel or beside the command-line program.
- A table column that does not exist.
- A sequence name that does not exist.
- A FASTQ quality command used on FASTA.
- Saving quality-free translated sequences as FASTQ.
- Paired FASTQ files containing different numbers of reads.
- A single-file organization command used on a pair.
- Putting the repeat instruction anywhere except the beginning.

# Run a downloaded program

FigureLoom Bio currently needs Python 3.10 or newer for command-line use.

```bash
cd figureloom-bio
python -m pip install -e .
flbio run my-program.flbio
```

The browser IDE runs the supported table, FASTA, FASTQ, paired FASTQ, repeat, and block-built programs directly without installing Python.

---

*Dedicated to Adriana M. K.*
