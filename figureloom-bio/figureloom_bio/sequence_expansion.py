from __future__ import annotations

import re
from typing import Any

from . import parser as _parser
from .errors import FigureLoomBioError
from .runtime import Runner, SequenceRecord


_EXTRA_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "remove_named_sequence",
        re.compile(r"remove the sequence named (.+)", re.IGNORECASE),
    ),
    (
        "rename_sequence",
        re.compile(r"rename the sequence (.+?) to (.+)", re.IGNORECASE),
    ),
    (
        "prefix_sequence_names",
        re.compile(r"add (.+) to the start of every sequence name", re.IGNORECASE),
    ),
    (
        "suffix_sequence_names",
        re.compile(r"add (.+) to the end of every sequence name", re.IGNORECASE),
    ),
    (
        "remove_duplicate_sequences",
        re.compile(r"remove duplicate sequences", re.IGNORECASE),
    ),
    (
        "shortest_sequences_first",
        re.compile(r"put the shortest sequences first", re.IGNORECASE),
    ),
    (
        "longest_sequences_first",
        re.compile(r"put the longest sequences first", re.IGNORECASE),
    ),
    (
        "show_sequence_lengths",
        re.compile(r"show the sequence lengths", re.IGNORECASE),
    ),
    (
        "find_shortest_sequence",
        re.compile(r"find the shortest sequence", re.IGNORECASE),
    ),
    (
        "find_longest_sequence",
        re.compile(r"find the longest sequence", re.IGNORECASE),
    ),
    (
        "keep_base_range",
        re.compile(r"keep bases ([1-9][0-9]*) to ([1-9][0-9]*)", re.IGNORECASE),
    ),
)

if not any(action == "remove_named_sequence" for action, _ in _parser._PATTERNS):
    _parser._PATTERNS = _EXTRA_PATTERNS + _parser._PATTERNS

_ORIGINAL_RUN_INSTRUCTION = Runner._run_instruction


def _single_records(runner: Runner) -> list[SequenceRecord]:
    if getattr(runner, "sequence_pair", None) is not None:
        raise FigureLoomBioError(
            "This instruction needs one FASTA or FASTQ file.\n\n"
            "Open one file instead of a paired read set."
        )
    return runner._need_sequences()


def _find_record(
    records: list[SequenceRecord], requested: str
) -> SequenceRecord | None:
    wanted = requested.casefold()
    return next(
        (record for record in records if record.name.casefold() == wanted),
        None,
    )


def _missing_sequence(
    records: list[SequenceRecord], requested: str
) -> FigureLoomBioError:
    available = "\n".join(record.name for record in records[:50])
    return FigureLoomBioError(
        f"I could not find a sequence named {requested}.\n\n"
        "I found these sequence names:\n"
        f"{available}"
    )


def _expanded_run_instruction(self: Runner, instruction: Any) -> None:
    action = instruction.action

    if action == "remove_named_sequence":
        records = _single_records(self)
        wanted = instruction.values[0].casefold()
        self.sequences = [
            record for record in records
            if record.name.casefold() != wanted
        ]
        return

    if action == "rename_sequence":
        records = _single_records(self)
        old_name, new_name = instruction.values
        record = _find_record(records, old_name)
        if record is None:
            raise _missing_sequence(records, old_name)
        if any(
            other is not record
            and other.name.casefold() == new_name.casefold()
            for other in records
        ):
            raise FigureLoomBioError(
                f"A sequence named {new_name} already exists."
            )
        record.name = new_name
        return

    if action == "prefix_sequence_names":
        prefix = instruction.values[0]
        for record in _single_records(self):
            record.name = f"{prefix}{record.name}"
        return

    if action == "suffix_sequence_names":
        suffix = instruction.values[0]
        for record in _single_records(self):
            record.name = f"{record.name}{suffix}"
        return

    if action == "remove_duplicate_sequences":
        seen: set[str] = set()
        kept: list[SequenceRecord] = []
        for record in _single_records(self):
            key = record.sequence.upper()
            if key in seen:
                continue
            seen.add(key)
            kept.append(record)
        self.sequences = kept
        return

    if action in {
        "shortest_sequences_first",
        "longest_sequences_first",
    }:
        records = _single_records(self)
        records.sort(
            key=lambda record: (
                len(record.sequence),
                record.name.casefold(),
            ),
            reverse=action == "longest_sequences_first",
        )
        return

    if action == "show_sequence_lengths":
        records = _single_records(self)
        self.output.add_table(
            "Sequence lengths",
            ["name", "length"],
            (
                {
                    "name": record.name,
                    "length": str(len(record.sequence)),
                }
                for record in records
            ),
        )
        return

    if action in {
        "find_shortest_sequence",
        "find_longest_sequence",
    }:
        records = _single_records(self)
        if not records:
            raise FigureLoomBioError("There are no sequences left.")
        chooser = (
            min
            if action == "find_shortest_sequence"
            else max
        )
        record = chooser(
            records,
            key=lambda item: (
                len(item.sequence),
                item.name.casefold(),
            ),
        )
        title = (
            "Shortest sequence"
            if action == "find_shortest_sequence"
            else "Longest sequence"
        )
        self.output.add(
            title,
            record.name,
            "",
            "Bases",
            f"{len(record.sequence):,}",
        )
        return

    if action == "keep_base_range":
        records = _single_records(self)
        start, end = (
            int(value) for value in instruction.values
        )
        if end < start:
            raise FigureLoomBioError(
                "The ending base must come after the starting base."
            )
        left = start - 1
        for record in records:
            record.sequence = record.sequence[left:end]
            if record.quality is not None:
                record.quality = record.quality[left:end]
        return

    _ORIGINAL_RUN_INSTRUCTION(self, instruction)


if not getattr(Runner, "_figureloom_sequence_expansion", False):
    Runner._run_instruction = _expanded_run_instruction
    Runner._figureloom_sequence_expansion = True
