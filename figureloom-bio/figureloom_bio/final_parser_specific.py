from __future__ import annotations

import re
import sys

from . import parser as parser_module
from .errors import FigureLoomBioError


_FIRST_WORD = re.compile(r"[^\s:,.]+")


def install_final_parser_specific() -> None:
    if getattr(parser_module, "_final_specific_messages_installed", False):
        return
    previous_parse = parser_module.parse

    def parse_with_specific_messages(source: str):
        try:
            return previous_parse(source)
        except FigureLoomBioError as error:
            if not error.message.startswith("FigureLoom Bio could not match this instruction."):
                raise
            lines = str(source).splitlines()
            line_number = error.line_number or 1
            line = lines[line_number - 1].strip() if 1 <= line_number <= len(lines) else str(source).strip()
            match = _FIRST_WORD.match(line)
            first = match.group(0) if match else "(empty)"
            if first.casefold() in parser_module._known_command_words():
                message = (
                    f"I recognize the command word {first}, but the rest of this instruction does not use the exact wording or word order of a built-in sentence.\n\n"
                    "What happened\n"
                    "The action exists, but FigureLoom Bio could not safely decide which built-in instruction this line was meant to be. It stopped instead of guessing.\n\n"
                    "How to fix it\n"
                    "Open Sentences, search for this action, insert the complete built-in sentence, and then change only its filename, column name, value, or number.\n\n"
                    f"Instruction read\n{line}"
                )
            else:
                message = (
                    f"The first word {first} is not a FigureLoom Bio command word.\n\n"
                    "What happened\n"
                    "FigureLoom Bio could not identify the action this sentence should perform, so it stopped instead of guessing.\n\n"
                    "How to fix it\n"
                    "Start the sentence with a command shown in Sentences. Open Sentences, search for the action you need, and insert that complete sentence.\n\n"
                    f"Instruction read\n{line}"
                )
            raise FigureLoomBioError(message, line_number=error.line_number) from error

    parser_module.parse = parse_with_specific_messages
    for name, module in tuple(sys.modules.items()):
        if name.startswith("figureloom_bio") and module is not None and getattr(module, "parse", None) is previous_parse:
            setattr(module, "parse", parse_with_specific_messages)
    parser_module._final_specific_messages_installed = True


__all__ = ["install_final_parser_specific"]
