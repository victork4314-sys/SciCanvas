from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from importlib.resources import files
import json
from typing import Any


@dataclass(frozen=True)
class LanguageCommand:
    id: str
    theme: str
    kind: str
    example: str


@dataclass(frozen=True)
class LanguageTheme:
    id: str
    title: str


@dataclass(frozen=True)
class LanguageManifest:
    version: int
    file_extension: str
    grammar: dict[str, Any]
    themes: tuple[LanguageTheme, ...]
    commands: tuple[LanguageCommand, ...]

    def command(self, command_id: str) -> LanguageCommand | None:
        wanted = command_id.strip().casefold()
        return next((item for item in self.commands if item.id.casefold() == wanted), None)

    def commands_for_theme(self, theme: str) -> tuple[LanguageCommand, ...]:
        wanted = theme.strip().casefold()
        return tuple(item for item in self.commands if item.theme.casefold() == wanted)


@lru_cache(maxsize=1)
def language_manifest() -> LanguageManifest:
    resource = files(__package__).joinpath("language_manifest.json")
    payload = json.loads(resource.read_text(encoding="utf-8"))
    manifest = LanguageManifest(
        version=int(payload["version"]),
        file_extension=str(payload["file_extension"]),
        grammar=dict(payload["grammar"]),
        themes=tuple(LanguageTheme(**item) for item in payload["themes"]),
        commands=tuple(LanguageCommand(**item) for item in payload["commands"]),
    )
    _validate(manifest)
    return manifest


def _validate(manifest: LanguageManifest) -> None:
    if manifest.file_extension != ".flbio":
        raise ValueError("The FigureLoom Bio manifest must use the .flbio extension.")
    if manifest.grammar.get("instruction_ending") != ".":
        raise ValueError("Normal FigureLoom Bio instructions must end with a period.")
    if manifest.grammar.get("block_header_ending") != ":":
        raise ValueError("FigureLoom Bio block headers must end with a colon.")
    if manifest.grammar.get("current_result_name") != "the file":
        raise ValueError('The current result must be called "the file".')

    theme_ids = [theme.id for theme in manifest.themes]
    if len(theme_ids) != len(set(theme_ids)):
        raise ValueError("The language manifest contains duplicate theme IDs.")

    command_ids = [command.id for command in manifest.commands]
    if len(command_ids) != len(set(command_ids)):
        raise ValueError("The language manifest contains duplicate command IDs.")

    known_themes = set(theme_ids)
    for command in manifest.commands:
        if command.theme not in known_themes:
            raise ValueError(f"{command.id} uses an unknown theme: {command.theme}")
        if command.kind not in {"instruction", "header"}:
            raise ValueError(f"{command.id} has an unknown command kind: {command.kind}")
        expected = ":" if command.kind == "header" else "."
        if not command.example.endswith(expected):
            raise ValueError(f"{command.id} must end with {expected}")
        if command.example.endswith(":."):
            raise ValueError(f"{command.id} contains the invalid colon-period ending.")
        if "TODO" in command.example.upper():
            raise ValueError(f"{command.id} contains placeholder text.")


__all__ = [
    "LanguageCommand",
    "LanguageManifest",
    "LanguageTheme",
    "language_manifest",
]
