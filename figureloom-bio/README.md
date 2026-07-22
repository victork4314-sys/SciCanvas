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

## Current working commands

```text
Open the file samples.csv.
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Count the rows.
Show the result.
Show the file.
Save the result as clean-samples.csv.
Say Starting the analysis.
```

When one file is open, later instructions refer to it as **the file** or **the result**. When a workflow uses more than one file, the language uses the real filenames so the instructions remain obvious.

## Run the example

FigureLoom Bio currently needs Python 3.10 or newer.

```bash
cd figureloom-bio
python -m pip install -e .
flbio run examples/clean-samples.flbio
```

The result is shown in separate, spacious sections. Raw technical output is not mixed into the useful result.

## What works in this first version

- Reading `.flbio` instructions as full sentences.
- Requiring a normal period after every instruction.
- Opening CSV and TSV files.
- Keeping matching rows.
- Removing matching rows.
- Counting rows.
- Showing a readable table.
- Saving CSV and TSV results.
- Printing simple messages.
- Plain errors that point to the sentence that needs fixing.

Sequence, FASTQ, comparison, queue, and IDE support come next without making the visible language more complicated.
