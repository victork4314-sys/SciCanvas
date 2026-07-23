from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import json
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class CatalogCommand:
    id: str
    theme: str
    label: str
    kind: str
    example: str


@dataclass(frozen=True)
class LanguageCatalog:
    version: str
    syntax: dict[str, str]
    themes: tuple[str, ...]
    commands: tuple[CatalogCommand, ...]


@lru_cache(maxsize=1)
def load_language_catalog() -> LanguageCatalog:
    path = Path(__file__).with_name("language_catalog.json")
    raw: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    commands = tuple(CatalogCommand(**item) for item in raw["commands"])
    ids = [command.id for command in commands]
    if len(ids) != len(set(ids)):
        raise RuntimeError("The FigureLoom Bio language catalog contains duplicate command IDs.")
    examples = [command.example for command in commands]
    if len(examples) != len(set(examples)):
        raise RuntimeError("The FigureLoom Bio language catalog contains duplicate examples.")
    known_themes = set(raw["themes"])
    missing = sorted({command.theme for command in commands} - known_themes)
    if missing:
        raise RuntimeError("The language catalog is missing themes: " + ", ".join(missing))
    return LanguageCatalog(
        version=str(raw["version"]),
        syntax={str(key): str(value) for key, value in raw["syntax"].items()},
        themes=tuple(str(theme) for theme in raw["themes"]),
        commands=commands,
    )


def commands_for_theme(theme: str) -> tuple[CatalogCommand, ...]:
    wanted = theme.strip().casefold()
    return tuple(
        command
        for command in load_language_catalog().commands
        if command.theme.casefold() == wanted
    )


__all__ = [
    "CatalogCommand",
    "LanguageCatalog",
    "commands_for_theme",
    "load_language_catalog",
]
