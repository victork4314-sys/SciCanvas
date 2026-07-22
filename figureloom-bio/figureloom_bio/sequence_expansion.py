from __future__ import annotations

import re
from typing import Any

from .errors import FigureLoomBioError
from . import parser as _parser
from .runtime import Runner, SequenceRecord


_EXTRA_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("use_named_sequence", re.compile(r"use the sequence named (.+)", re.IGNORECASE)),
    ("remove_named_sequence", re.compile(r"remove the sequence named (.+)", re.IGNORECASE)),
    ("rename_sequence", re.compile(r"rename the sequence (.+?) to (.+)", re.IGNORECASE)),
    (
        "prefix_sequence_names",
        re.compile(r"add (.+) to the start of every sequence name", re.IGNORECASE),
    ),
    (
        "suffix_sequence_names",
        re.compile(r"add (.+) to the end of every sequence name", re.IGNORECASE),
    ),
    ("remove_duplicate_sequences", re.compile(r"remove duplicate sequences", re.IGNORECASE)),
    ("shortest_sequences_first", re.compile(r"put the shortest sequences first", re.IGNORECASE)),
    ("longest_sequences_first", re.compile(r"put the longest sequences first", re.IGNORECASE)),
    ("show_sequence_lengths", re.compile(r"show the sequence lengths", re.IGNORECASE)),
    ("find_shortest_sequence", re.compile(r"find the shortest sequence", re.IGNORECASE)),
    ("find_longest_sequence", re.compile(r"find the longest sequence", re.IGNORECASE)),
    (
        "keep_base_range",
        re.compile(r"keep bases ([1-9][0-9]*) to ([1-9][0-9]*)", re.IGNORECASE),
    ),
    ("check_quality", re.compile(r"check the quality", re.IGNORECASE)),
    (
        "keep_longer_than",
        re.compile(r"keep only sequences longer than ([0-9]+) bases", re.IGNORECASE),
    ),
    (
        "keep_only_motif",
        re.compile(r"keep only sequences containing (.+)", re.IGNORECASE),
    ),
    ("dna_to_rna", re.compile(r"convert the DNA to RNA", re.IGNORECASE)),
    ("rna_to_dna", re.compile(r"convert the RNA to DNA", re.IGNORECASE)),
)

if not any(action == "use_named_sequence" for action, _ in _parser._PATTERNS):
    _parser._PATTERNS = _EXTRA_PATTERNS + _parser._PATTERNS

_ORIGINAL_RUN_INSTRUCTION = Runner._run_instruction


def _find_record(records: list[SequenceRecord], requested: str) -> SequenceRecord | None:
    wanted = requested.casefold()
    return next((record for record in records if record.name.casefold() == wanted), None)


def _copy_record(record: SequenceRecord) -> SequenceRecord:
    return SequenceRecord(
        name=record.name,
        description=record.description,
        sequence=record.sequence,
        quality=record.quality,
    )


def _plain_missing_sequence(records: list[SequenceRecord], requested: str) -> FigureLoomBioError:
    available = "\n".join(record.name for record in records)
    return FigureLoomBioError(
        f"I could not find a sequence named {requested}.\n\n"
        f"I found these sequence names:\n{available}"
    )


def _expanded_run_instruction(self: Runner, instruction: Any) -> None:
    action = instruction.action

    if action == "use_named_sequence":
        records = self._need_sequences()
        record = _find_record(records, instruction.values[0])
        if record is None:
            raise _plain_missing_sequence(records, instruction.values[0])
        self.sequences = [_copy_record(record)]
        return

    if action == "remove_named_sequence":
        records = self._need_sequences()
        wanted = instruction.values[0].casefold()
        self.sequences = [record for record in records if record.name.casefold() != wanted]
        return

    if action == "rename_sequence":
        records = self._need_sequences()
        old_name, new_name = instruction.values
        record = _find_record(records, old_name)
        if record is None:
            raise _plain_missing_sequence(records, old_name)
        if any(other is not record and other.name.casefold() == new_name.casefold() for other in records):
            raise FigureLoomBioError(f"A sequence named {new_name} already exists.")
        record.name = new_name
        return

    if action == "prefix_sequence_names":
        prefix = instruction.values[0]
        for record in self._need_sequences():
            record.name = f"{prefix}{record.name}"
        return

    if action == "suffix_sequence_names":
        suffix = instruction.values[0]
        for record in self._need_sequences():
            record.name = f"{record.name}{suffix}"
        return

    if action == "remove_duplicate_sequences":
        seen: set[str] = set()
        kept: list[SequenceRecord] = []
        for record in self._need_sequences():
            key = record.sequence.upper()
            if key in seen:
                continue
            seen.add(key)
            kept.append(record)
        self.sequences = kept
        return

    if action in {"shortest_sequences_first", "longest_sequences_first"}:
        records = self._need_sequences()
        records.sort(
            key=lambda record: (len(record.sequence), record.name.casefold()),
            reverse=action == "longest_sequences_first",
        )
        return

    if action == "show_sequence_lengths":
        records = self._need_sequences()
        self.output.add_table(
            "Sequence lengths",
            ["name", "length"],
            ({"name": record.name, "length": str(len(record.sequence))} for record in records),
        )
        return

    if action in {"find_shortest_sequence", "find_longest_sequence"}:
        records = self._need_sequences()
        if not records:
            raise FigureLoomBioError("There are no sequences left.")
        chooser = min if action == "find_shortest_sequence" else max
        record = chooser(records, key=lambda item: (len(item.sequence), item.name.casefold()))
        title = "Shortest sequence" if action == "find_shortest_sequence" else "Longest sequence"
        self.output.add(title, record.name, "", "Bases", f"{len(record.sequence):,}")
        return

    if action == "keep_base_range":
        records = self._need_sequences()
        start, end = (int(value) for value in instruction.values)
        if end < start:
            raise FigureLoomBioError("The ending base must come after the starting base.")
        left = start - 1
        for record in records:
            record.sequence = record.sequence[left:end]
            if record.quality is not None:
                record.quality = record.quality[left:end]
        return

    if action == "check_quality":
        records = self._need_sequences()
        self._need_quality(records)
        qualities = [self._average_quality(record) for record in records]
        average = sum(qualities) / len(qualities) if qualities else 0.0
        self.output.add(
            "Read quality",
            "Reads",
            f"{len(records):,}",
            "",
            "Average quality",
            f"{average:.2f}",
            "",
            "Lowest average quality",
            f"{min(qualities, default=0.0):.2f}",
            "",
            "Highest average quality",
            f"{max(qualities, default=0.0):.2f}",
        )
        return

    if action == "keep_longer_than":
        self._keep_min_length(int(instruction.values[0]) + 1)
        return

    if action == "keep_only_motif":
        self._filter_motif(instruction.values[0], keep=True)
        return

    if action == "dna_to_rna":
        self._convert_to_rna()
        return

    if action == "rna_to_dna":
        self._convert_to_dna()
        return

    _ORIGINAL_RUN_INSTRUCTION(self, instruction)


if not getattr(Runner, "_figureloom_sequence_expansion", False):
    Runner._run_instruction = _expanded_run_instruction
    Runner._figureloom_sequence_expansion = True
