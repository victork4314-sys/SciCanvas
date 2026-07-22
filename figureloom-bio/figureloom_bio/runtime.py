from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from .errors import FigureLoomBioError
from .output import PlainOutput
from .parser import Instruction


@dataclass
class Table:
    columns: list[str]
    rows: list[dict[str, str]]


@dataclass
class SequenceRecord:
    name: str
    description: str
    sequence: str
    quality: str | None = None


class Runner:
    MAX_REPEATS = 1000
    FASTA_SUFFIXES = {".fa", ".fasta", ".fna", ".ffn", ".faa", ".frn"}
    FASTQ_SUFFIXES = {".fq", ".fastq"}

    CODON_TABLE = {
        "TTT": "F", "TTC": "F", "TTA": "L", "TTG": "L",
        "TCT": "S", "TCC": "S", "TCA": "S", "TCG": "S",
        "TAT": "Y", "TAC": "Y", "TAA": "*", "TAG": "*",
        "TGT": "C", "TGC": "C", "TGA": "*", "TGG": "W",
        "CTT": "L", "CTC": "L", "CTA": "L", "CTG": "L",
        "CCT": "P", "CCC": "P", "CCA": "P", "CCG": "P",
        "CAT": "H", "CAC": "H", "CAA": "Q", "CAG": "Q",
        "CGT": "R", "CGC": "R", "CGA": "R", "CGG": "R",
        "ATT": "I", "ATC": "I", "ATA": "I", "ATG": "M",
        "ACT": "T", "ACC": "T", "ACA": "T", "ACG": "T",
        "AAT": "N", "AAC": "N", "AAA": "K", "AAG": "K",
        "AGT": "S", "AGC": "S", "AGA": "R", "AGG": "R",
        "GTT": "V", "GTC": "V", "GTA": "V", "GTG": "V",
        "GCT": "A", "GCC": "A", "GCA": "A", "GCG": "A",
        "GAT": "D", "GAC": "D", "GAA": "E", "GAG": "E",
        "GGT": "G", "GGC": "G", "GGA": "G", "GGG": "G",
    }

    def __init__(self, program_path: Path) -> None:
        self.program_path = program_path
        self.folder = program_path.parent
        self.file_name: str | None = None
        self.table: Table | None = None
        self.sequences: list[SequenceRecord] | None = None
        self.sequence_format: str | None = None
        self.output = PlainOutput()
        self.run_number = 1
        self.total_runs = 1

    def run(self, instructions: list[Instruction]) -> PlainOutput:
        repeat_count, program = self._prepare_repetition(instructions)
        self.total_runs = repeat_count

        for run_number in range(1, repeat_count + 1):
            self.run_number = run_number
            self.file_name = None
            self.table = None
            self.sequences = None
            self.sequence_format = None
            if repeat_count > 1:
                self.output.add(f"Run {run_number} of {repeat_count}", "Starting")

            for instruction in program:
                try:
                    self._run_instruction(instruction)
                except FigureLoomBioError as error:
                    if error.line_number is None:
                        error.line_number = instruction.line_number
                    raise

        return self.output

    def _prepare_repetition(
        self, instructions: list[Instruction]
    ) -> tuple[int, list[Instruction]]:
        repeat_instructions = [
            instruction
            for instruction in instructions
            if instruction.action == "repeat_program"
        ]
        if not repeat_instructions:
            return 1, instructions
        if len(repeat_instructions) > 1:
            raise FigureLoomBioError(
                "Use only one instruction that says how many times to run the program.",
                line_number=repeat_instructions[1].line_number,
            )
        repeat_instruction = repeat_instructions[0]
        if instructions[0] is not repeat_instruction:
            raise FigureLoomBioError(
                "Put the repeat instruction at the beginning of the program.",
                line_number=repeat_instruction.line_number,
            )

        repeat_count = int(repeat_instruction.values[0])
        if repeat_count > self.MAX_REPEATS:
            raise FigureLoomBioError(
                f"This program can run at most {self.MAX_REPEATS:,} times at once.",
                line_number=repeat_instruction.line_number,
            )
        program = instructions[1:]
        if not program:
            raise FigureLoomBioError(
                "Add at least one instruction after the repeat sentence.",
                line_number=repeat_instruction.line_number,
            )
        return repeat_count, program

    def _run_instruction(self, instruction: Instruction) -> None:
        action = instruction.action
        if action == "open_file":
            self._open_file(instruction.values[0])
        elif action == "keep_rows":
            self._keep_rows(*instruction.values)
        elif action == "remove_rows":
            self._remove_rows(*instruction.values)
        elif action == "keep_columns":
            self._keep_columns(instruction.values[0])
        elif action == "rename_column":
            self._rename_column(*instruction.values)
        elif action == "order_rows":
            self._sort_rows(instruction.values[0], largest_first=False)
        elif action == "largest_first":
            self._sort_rows(instruction.values[0], largest_first=True)
        elif action == "smallest_first":
            self._sort_rows(instruction.values[0], largest_first=False)
        elif action == "remove_duplicates":
            self._remove_duplicates(instruction.values[0])
        elif action == "replace_empty":
            self._replace_empty(*instruction.values)
        elif action == "combine_file":
            self._combine_file(*instruction.values)
        elif action == "change_value":
            self._change_value(*instruction.values)
        elif action == "count_rows":
            table = self._need_table()
            self.output.add("Rows", f"{len(table.rows):,}")
        elif action == "count_sequences":
            records = self._need_sequences()
            self.output.add("Sequences", f"{len(records):,}")
        elif action == "count_bases":
            records = self._need_sequences()
            self.output.add("Bases", f"{sum(len(record.sequence) for record in records):,}")
        elif action == "show_sequence_names":
            records = self._need_sequences()
            self.output.add("Sequence names", *(record.name for record in records))
        elif action == "show_sequences":
            self._show_sequences()
        elif action == "keep_min_length":
            self._keep_min_length(int(instruction.values[0]))
        elif action == "remove_shorter":
            self._keep_min_length(int(instruction.values[0]))
        elif action == "keep_min_quality":
            self._keep_min_quality(float(instruction.values[0]))
        elif action == "remove_low_quality":
            self._keep_min_quality(float(instruction.values[0]))
        elif action == "trim_start":
            self._trim(int(instruction.values[0]), from_start=True)
        elif action == "trim_end":
            self._trim(int(instruction.values[0]), from_start=False)
        elif action == "keep_motif":
            self._filter_motif(instruction.values[0], keep=True)
        elif action == "remove_motif":
            self._filter_motif(instruction.values[0], keep=False)
        elif action == "to_rna":
            self._convert_to_rna()
        elif action == "to_dna":
            self._convert_to_dna()
        elif action == "reverse_complement":
            self._reverse_complement()
        elif action == "translate":
            self._translate()
        elif action == "gc_content":
            self._show_gc_content()
        elif action == "compare_sequences":
            self._compare_sequences(instruction.values[0])
        elif action in {"show_result", "show_file"}:
            self._show_current()
        elif action in {"save_result", "save_sequences"}:
            self._save_current(instruction.values[0])
        elif action == "say":
            self.output.add("Message", instruction.values[0])
        else:
            raise FigureLoomBioError(f"I cannot run {action} yet.")

    def _open_file(self, name: str) -> None:
        path = self._path(name)
        if not path.exists():
            raise FigureLoomBioError(
                f"I could not find {name}.\n\n"
                "Put the file beside this program, or write its complete path."
            )

        suffix = path.suffix.lower()
        self.file_name = name
        if suffix in {".csv", ".tsv"}:
            self.table = self._read_table(name)
            self.sequences = None
            self.sequence_format = None
            self.output.add(
                "Opened the file",
                name,
                "",
                "Rows",
                f"{len(self.table.rows):,}",
                "",
                "Columns",
                f"{len(self.table.columns):,}",
            )
            return

        if suffix in self.FASTA_SUFFIXES | self.FASTQ_SUFFIXES:
            records, sequence_format = self._read_sequences(name)
            self.table = None
            self.sequences = records
            self.sequence_format = sequence_format
            self.output.add(
                "Opened the file",
                name,
                "",
                "Sequences",
                f"{len(records):,}",
                "",
                "Bases",
                f"{sum(len(record.sequence) for record in records):,}",
            )
            return

        raise FigureLoomBioError(
            f"I cannot open {name} yet.\n\n"
            "Use CSV, TSV, FASTA, or FASTQ files."
        )

    def _read_table(self, name: str) -> Table:
        path = self._path(name)
        if not path.exists():
            raise FigureLoomBioError(f"I could not find {name}.")
        if path.suffix.lower() not in {".csv", ".tsv"}:
            raise FigureLoomBioError(f"{name} is not a CSV or TSV file.")

        delimiter = "\t" if path.suffix.lower() == ".tsv" else ","
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle, delimiter=delimiter)
            if reader.fieldnames is None:
                raise FigureLoomBioError(f"{name} does not contain column names.")
            rows = [dict(row) for row in reader]
        return Table(columns=list(reader.fieldnames), rows=rows)

    def _read_sequences(self, name: str) -> tuple[list[SequenceRecord], str]:
        path = self._path(name)
        if not path.exists():
            raise FigureLoomBioError(f"I could not find {name}.")
        suffix = path.suffix.lower()
        if suffix in self.FASTA_SUFFIXES:
            return self._read_fasta(path), "fasta"
        if suffix in self.FASTQ_SUFFIXES:
            return self._read_fastq(path), "fastq"
        raise FigureLoomBioError(f"{name} is not a FASTA or FASTQ file.")

    def _read_fasta(self, path: Path) -> list[SequenceRecord]:
        records: list[SequenceRecord] = []
        name: str | None = None
        description = ""
        sequence_parts: list[str] = []

        def finish() -> None:
            nonlocal name, description, sequence_parts
            if name is None:
                return
            records.append(
                SequenceRecord(
                    name=name,
                    description=description,
                    sequence="".join(sequence_parts).replace(" ", "").upper(),
                )
            )

        for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if line.startswith(">"):
                finish()
                header = line[1:].strip()
                if not header:
                    raise FigureLoomBioError(f"{path.name} contains a FASTA header without a name.")
                parts = header.split(maxsplit=1)
                name = parts[0]
                description = parts[1] if len(parts) > 1 else ""
                sequence_parts = []
            else:
                if name is None:
                    raise FigureLoomBioError(
                        f"{path.name} contains sequence text before its first FASTA header."
                    )
                sequence_parts.append(line)
        finish()
        if not records:
            raise FigureLoomBioError(f"{path.name} does not contain any FASTA sequences.")
        return records

    def _read_fastq(self, path: Path) -> list[SequenceRecord]:
        lines = path.read_text(encoding="utf-8-sig").splitlines()
        records: list[SequenceRecord] = []
        index = 0
        while index < len(lines):
            if not lines[index].strip():
                index += 1
                continue
            if index + 3 >= len(lines):
                raise FigureLoomBioError(f"{path.name} ends in the middle of a FASTQ record.")
            header = lines[index].strip()
            sequence = lines[index + 1].strip().upper()
            plus = lines[index + 2].strip()
            quality = lines[index + 3].rstrip("\r\n")
            if not header.startswith("@") or not plus.startswith("+"):
                raise FigureLoomBioError(
                    f"{path.name} contains a FASTQ record with a missing @ header or + line."
                )
            if len(sequence) != len(quality):
                raise FigureLoomBioError(
                    f"{path.name} contains a read whose sequence and quality have different lengths."
                )
            header_text = header[1:].strip()
            if not header_text:
                raise FigureLoomBioError(f"{path.name} contains a FASTQ read without a name.")
            parts = header_text.split(maxsplit=1)
            records.append(
                SequenceRecord(
                    name=parts[0],
                    description=parts[1] if len(parts) > 1 else "",
                    sequence=sequence,
                    quality=quality,
                )
            )
            index += 4
        if not records:
            raise FigureLoomBioError(f"{path.name} does not contain any FASTQ reads.")
        return records

    def _keep_rows(self, wanted: str, column: str) -> None:
        table = self._need_table()
        actual = self._column(table, column)
        table.rows = [row for row in table.rows if row.get(actual, "") == wanted]

    def _remove_rows(self, unwanted: str, column: str) -> None:
        table = self._need_table()
        actual = self._column(table, column)
        table.rows = [row for row in table.rows if row.get(actual, "") != unwanted]

    def _keep_columns(self, requested: str) -> None:
        table = self._need_table()
        wanted = self._natural_list(requested)
        if not wanted:
            raise FigureLoomBioError("Name at least one column to keep.")
        actual_columns = [self._column(table, column) for column in wanted]
        table.columns = actual_columns
        table.rows = [
            {column: row.get(column, "") for column in actual_columns}
            for row in table.rows
        ]

    def _rename_column(self, requested: str, new_name: str) -> None:
        table = self._need_table()
        actual = self._column(table, requested)
        clean_name = new_name.strip()
        if not clean_name:
            raise FigureLoomBioError("The new column name cannot be empty.")
        existing = {column.casefold(): column for column in table.columns}
        collision = existing.get(clean_name.casefold())
        if collision is not None and collision != actual:
            raise FigureLoomBioError(f"A column called {clean_name} already exists.")

        table.columns = [clean_name if column == actual else column for column in table.columns]
        for row in table.rows:
            value = row.pop(actual, "")
            row[clean_name] = value

    def _sort_rows(self, requested: str, *, largest_first: bool) -> None:
        table = self._need_table()
        actual = self._column(table, requested)
        nonempty = [row for row in table.rows if str(row.get(actual, "")).strip()]
        empty = [row for row in table.rows if not str(row.get(actual, "")).strip()]
        values = [str(row.get(actual, "")).strip() for row in nonempty]
        numeric = bool(values) and all(self._is_number(value) for value in values)

        if numeric:
            nonempty.sort(
                key=lambda row: float(str(row.get(actual, "")).strip()),
                reverse=largest_first,
            )
        else:
            nonempty.sort(
                key=lambda row: str(row.get(actual, "")).casefold(),
                reverse=largest_first,
            )
        table.rows = nonempty + empty

    def _remove_duplicates(self, requested: str) -> None:
        table = self._need_table()
        actual = self._column(table, requested)
        seen: set[str] = set()
        kept: list[dict[str, str]] = []
        for row in table.rows:
            value = row.get(actual, "")
            if value in seen:
                continue
            seen.add(value)
            kept.append(row)
        table.rows = kept

    def _replace_empty(self, requested: str, replacement: str) -> None:
        table = self._need_table()
        actual = self._column(table, requested)
        for row in table.rows:
            if not str(row.get(actual, "")).strip():
                row[actual] = replacement

    def _combine_file(self, name: str, requested: str) -> None:
        table = self._need_table()
        other = self._read_table(name)
        left_key = self._column(table, requested)
        right_key = self._column(other, requested)

        matches: dict[str, dict[str, str]] = {}
        for row in other.rows:
            key = row.get(right_key, "")
            if key and key not in matches:
                matches[key] = row

        new_columns = [
            column
            for column in other.columns
            if column != right_key and column not in table.columns
        ]
        table.columns.extend(new_columns)

        for row in table.rows:
            match = matches.get(row.get(left_key, ""))
            for column in other.columns:
                if column == right_key:
                    continue
                incoming = match.get(column, "") if match else ""
                if column not in row:
                    row[column] = incoming
                elif not str(row.get(column, "")).strip() and incoming:
                    row[column] = incoming

    def _change_value(self, old: str, new: str, requested: str) -> None:
        table = self._need_table()
        actual = self._column(table, requested)
        for row in table.rows:
            if row.get(actual, "") == old:
                row[actual] = new

    def _show_sequences(self) -> None:
        records = self._need_sequences()
        include_quality = any(record.quality is not None for record in records)
        columns = ["name", "length", "sequence"]
        if include_quality:
            columns.append("average_quality")
        rows: list[dict[str, str]] = []
        for record in records:
            row = {
                "name": record.name,
                "length": str(len(record.sequence)),
                "sequence": record.sequence,
            }
            if include_quality:
                row["average_quality"] = (
                    f"{self._average_quality(record):.2f}"
                    if record.quality is not None
                    else ""
                )
            rows.append(row)
        self.output.add_table("The sequences", columns, rows)

    def _keep_min_length(self, minimum: int) -> None:
        records = self._need_sequences()
        self.sequences = [record for record in records if len(record.sequence) >= minimum]

    def _keep_min_quality(self, minimum: float) -> None:
        records = self._need_sequences()
        self._need_quality(records)
        self.sequences = [
            record for record in records if self._average_quality(record) >= minimum
        ]

    def _trim(self, amount: int, *, from_start: bool) -> None:
        records = self._need_sequences()
        for record in records:
            if from_start:
                record.sequence = record.sequence[amount:]
                if record.quality is not None:
                    record.quality = record.quality[amount:]
            else:
                record.sequence = record.sequence[:-amount] if amount < len(record.sequence) else ""
                if record.quality is not None:
                    record.quality = record.quality[:-amount] if amount < len(record.quality) else ""

    def _filter_motif(self, motif: str, *, keep: bool) -> None:
        records = self._need_sequences()
        wanted = motif.strip().upper().replace("U", "T")
        if not wanted:
            raise FigureLoomBioError("Name a sequence pattern to look for.")
        selected: list[SequenceRecord] = []
        for record in records:
            sequence = record.sequence.upper().replace("U", "T")
            contains = wanted in sequence
            if contains == keep:
                selected.append(record)
        self.sequences = selected

    def _convert_to_rna(self) -> None:
        records = self._need_sequences()
        for record in records:
            record.sequence = record.sequence.replace("T", "U").replace("t", "u")

    def _convert_to_dna(self) -> None:
        records = self._need_sequences()
        for record in records:
            record.sequence = record.sequence.replace("U", "T").replace("u", "t")

    def _reverse_complement(self) -> None:
        records = self._need_sequences()
        for record in records:
            is_rna = "U" in record.sequence.upper() and "T" not in record.sequence.upper()
            mapping = str.maketrans(
                "ACGTRYKMSWBDHVNacgtrykmswbdhvn" if not is_rna else "ACGURYKMSWBDHVNacgurykmswbdhvn",
                "TGCAYRMKSWVHDBNtgcayrmkswvhdbn" if not is_rna else "UGCAYRMKSWVHDBNugcayrmkswvhdbn",
            )
            record.sequence = record.sequence.translate(mapping)[::-1]
            if record.quality is not None:
                record.quality = record.quality[::-1]

    def _translate(self) -> None:
        records = self._need_sequences()
        for record in records:
            dna = record.sequence.upper().replace("U", "T")
            protein: list[str] = []
            for index in range(0, len(dna) - 2, 3):
                codon = dna[index:index + 3]
                protein.append(self.CODON_TABLE.get(codon, "X"))
            record.sequence = "".join(protein)
            record.quality = None
        self.sequence_format = "fasta"

    def _show_gc_content(self) -> None:
        records = self._need_sequences()
        rows: list[dict[str, str]] = []
        for record in records:
            sequence = record.sequence.upper().replace("U", "T")
            gc = sum(1 for base in sequence if base in {"G", "C"})
            percent = (gc / len(sequence) * 100) if sequence else 0.0
            rows.append(
                {
                    "name": record.name,
                    "length": str(len(sequence)),
                    "gc_percent": f"{percent:.2f}",
                }
            )
        self.output.add_table("GC content", ["name", "length", "gc_percent"], rows)

    def _compare_sequences(self, name: str) -> None:
        records = self._need_sequences()
        other, _ = self._read_sequences(name)
        by_name = {record.name: record for record in other}
        rows: list[dict[str, str]] = []
        exact_matches = 0
        identities: list[float] = []
        for record in records:
            partner = by_name.get(record.name)
            if partner is None:
                rows.append(
                    {
                        "name": record.name,
                        "other_length": "",
                        "identity_percent": "",
                        "exact_match": "no match",
                    }
                )
                continue
            denominator = max(len(record.sequence), len(partner.sequence))
            matching = sum(
                left == right
                for left, right in zip(record.sequence.upper(), partner.sequence.upper())
            )
            identity = 100.0 if denominator == 0 else matching / denominator * 100
            exact = record.sequence.upper() == partner.sequence.upper()
            exact_matches += int(exact)
            identities.append(identity)
            rows.append(
                {
                    "name": record.name,
                    "other_length": str(len(partner.sequence)),
                    "identity_percent": f"{identity:.2f}",
                    "exact_match": "yes" if exact else "no",
                }
            )
        self.output.add(
            "Sequence comparison",
            name,
            "",
            "Named pairs",
            f"{len(identities):,}",
            "",
            "Exact matches",
            f"{exact_matches:,}",
            "",
            "Average identity",
            f"{(sum(identities) / len(identities) if identities else 0):.2f}%",
        )
        self.output.add_table(
            "Comparison details",
            ["name", "other_length", "identity_percent", "exact_match"],
            rows,
        )

    def _show_current(self) -> None:
        if self.table is not None:
            self.output.add_table("The result", self.table.columns, self.table.rows)
            return
        if self.sequences is not None:
            self._show_sequences()
            return
        raise FigureLoomBioError(
            "There is no open file yet.\n\nStart with an instruction such as:\nOpen the file samples.csv."
        )

    def _save_current(self, name: str) -> None:
        if self.table is not None:
            self._save_table(name)
            return
        if self.sequences is not None:
            self._save_sequences(name)
            return
        raise FigureLoomBioError("There is no result to save yet.")

    def _save_table(self, name: str) -> None:
        table = self._need_table()
        output_name = self._numbered_output_name(name)
        path = self._path(output_name)
        if path.suffix.lower() not in {".csv", ".tsv"}:
            raise FigureLoomBioError(
                f"I cannot save the table as {name}.\n\nUse a CSV or TSV filename."
            )
        path.parent.mkdir(parents=True, exist_ok=True)
        delimiter = "\t" if path.suffix.lower() == ".tsv" else ","
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=table.columns, delimiter=delimiter)
            writer.writeheader()
            writer.writerows(table.rows)
        self.output.add("Saved the result", output_name)

    def _save_sequences(self, name: str) -> None:
        records = self._need_sequences()
        output_name = self._numbered_output_name(name)
        path = self._path(output_name)
        suffix = path.suffix.lower()
        path.parent.mkdir(parents=True, exist_ok=True)
        if suffix in self.FASTA_SUFFIXES:
            lines: list[str] = []
            for record in records:
                header = record.name
                if record.description:
                    header += f" {record.description}"
                lines.extend([f">{header}", record.sequence])
            path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        elif suffix in self.FASTQ_SUFFIXES:
            self._need_quality(records)
            lines = []
            for record in records:
                header = record.name
                if record.description:
                    header += f" {record.description}"
                lines.extend([f"@{header}", record.sequence, "+", record.quality or ""])
            path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        else:
            raise FigureLoomBioError(
                f"I cannot save the sequences as {name}.\n\nUse a FASTA or FASTQ filename."
            )
        self.output.add("Saved the sequences", output_name)

    def _numbered_output_name(self, name: str) -> str:
        if self.total_runs <= 1:
            return name
        path = Path(name)
        suffix = path.suffix
        stem = path.name[: -len(suffix)] if suffix else path.name
        numbered = f"{stem}-{self.run_number}{suffix}"
        return str(path.with_name(numbered))

    def _path(self, name: str) -> Path:
        path = Path(name).expanduser()
        if not path.is_absolute():
            path = self.folder / path
        return path.resolve()

    def _need_table(self) -> Table:
        if self.table is None:
            raise FigureLoomBioError(
                "There is no open table yet.\n\nStart with an instruction such as:\nOpen the file samples.csv."
            )
        return self.table

    def _need_sequences(self) -> list[SequenceRecord]:
        if self.sequences is None:
            raise FigureLoomBioError(
                "There is no open sequence file yet.\n\nStart with an instruction such as:\nOpen the file reads.fastq."
            )
        return self.sequences

    @staticmethod
    def _need_quality(records: list[SequenceRecord]) -> None:
        if any(record.quality is None for record in records):
            raise FigureLoomBioError(
                "This instruction needs FASTQ quality scores.\n\nOpen a FASTQ file first."
            )

    @staticmethod
    def _average_quality(record: SequenceRecord) -> float:
        if record.quality is None or not record.quality:
            return 0.0
        return sum(ord(character) - 33 for character in record.quality) / len(record.quality)

    @staticmethod
    def _natural_list(text: str) -> list[str]:
        cleaned = text.strip()
        cleaned = cleaned.replace(", and ", ", ")
        if "," not in cleaned and " and " in cleaned:
            left, right = cleaned.rsplit(" and ", 1)
            cleaned = f"{left}, {right}"
        return [item.strip() for item in cleaned.split(",") if item.strip()]

    @staticmethod
    def _is_number(value: str) -> bool:
        try:
            float(value)
        except ValueError:
            return False
        return True

    @staticmethod
    def _column(table: Table, requested: str) -> str:
        by_lower = {column.lower(): column for column in table.columns}
        actual = by_lower.get(requested.lower())
        if actual is None:
            available = "\n".join(table.columns)
            raise FigureLoomBioError(
                f"I could not find a column called {requested}.\n\n"
                "I found these columns:\n"
                f"{available}"
            )
        return actual
