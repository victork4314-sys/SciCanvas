from pathlib import Path
import tempfile
import unittest

from figureloom_bio.errors import FigureLoomBioError
from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner


class FigureLoomBioCoreTests(unittest.TestCase):
    def test_plain_sentence_program_runs(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "samples.csv").write_text(
                "sample,condition,status\n"
                "one,treated,passed\n"
                "two,control,passed\n"
                "three,treated,failed\n",
                encoding="utf-8",
            )
            program = root / "analysis.flbio"
            program.write_text(
                "Open the file samples.csv.\n"
                "Keep only rows marked treated under condition.\n"
                "Remove rows marked failed under status.\n"
                "Count the rows.\n"
                "Show the result.\n"
                "Save the result as clean.csv.\n",
                encoding="utf-8",
            )

            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()

            self.assertIn("Rows\n\n1", output)
            self.assertIn("one", output)
            self.assertNotIn("three", output)
            self.assertEqual(
                (root / "clean.csv").read_text(encoding="utf-8"),
                "sample,condition,status\n"
                "one,treated,passed\n",
            )

    def test_instruction_keeps_periods_inside_filename(self) -> None:
        instruction = parse("Open the file samples.csv.")[0]
        self.assertEqual(instruction.values, ("samples.csv",))

    def test_instructions_need_periods(self) -> None:
        with self.assertRaisesRegex(FigureLoomBioError, "needs a period"):
            parse("Open the file samples.csv")

    def test_column_errors_are_plain(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "samples.csv").write_text(
                "sample,status\none,passed\n", encoding="utf-8"
            )
            program = root / "analysis.flbio"
            program.write_text(
                "Open the file samples.csv.\n"
                "Keep only rows marked treated under condition.\n",
                encoding="utf-8",
            )

            with self.assertRaises(FigureLoomBioError) as caught:
                Runner(program).run(parse(program.read_text(encoding="utf-8")))

            message = caught.exception.plain_message()
            self.assertIn("I could not find a column called condition", message)
            self.assertIn("sample", message)
            self.assertIn("status", message)


if __name__ == "__main__":
    unittest.main()
