from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable


@dataclass
class Section:
    title: str
    lines: list[str] = field(default_factory=list)


class PlainOutput:
    """Collects results as separate, spacious sections."""

    def __init__(self) -> None:
        self.sections: list[Section] = []

    def add(self, title: str, *lines: str) -> None:
        self.sections.append(Section(title=title, lines=list(lines)))

    def add_table(self, title: str, columns: list[str], rows: Iterable[dict[str, str]]) -> None:
        rows_list = list(rows)
        if not columns:
            self.add(title, "The file has no columns.")
            return

        widths = {
            column: max(
                len(column),
                *(len(str(row.get(column, ""))) for row in rows_list),
            )
            for column in columns
        }
        header = "  ".join(column.ljust(widths[column]) for column in columns)
        divider = "  ".join("-" * widths[column] for column in columns)
        lines = [header, divider]
        for row in rows_list:
            lines.append(
                "  ".join(str(row.get(column, "")).ljust(widths[column]) for column in columns)
            )
        if not rows_list:
            lines.append("No rows found.")
        self.add(title, *lines)

    def render(self) -> str:
        rendered: list[str] = []
        for section in self.sections:
            rendered.append(section.title)
            rendered.append("")
            rendered.extend(section.lines)
            rendered.append("")
        return "\n".join(rendered).rstrip() + "\n"
