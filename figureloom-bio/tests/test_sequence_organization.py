from pathlib import Path
import tempfile
import unittest

from figureloom_bio.errors import FigureLoomBioError
from figureloom_bio.parser import parse
from figureloom_bio.runtime import Runner


class SequenceOrganizationTests(unittest.TestCase):
    def test_names_duplicates_and_named_sequence_work_together(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "sequences.fasta").write_text(
                ">sample-17\nATGCGT\n"
                ">duplicate\nATGCGT\n"
                ">other\nAAAA\n",
                encoding="utf-8",
            )
            program = root / "names.flbio"
            program.write_text(
                "Open the file sequences.fasta.\n"
                "Remove duplicate sequences.\n"
                "Use the sequence named sample-17.\n"
                "Rename the sequence sample-17 to chosen.\n"
                "Add run- to the start of every sequence name.\n"
                "Add -clean to the end of every sequence name.\n"
                "Save the result as chosen.fasta.\n",
                encoding="utf-8",
            )

            Runner(program).run(
                parse(program.read_text(encoding="utf-8"))
            )

            self.assertEqual(
                (root / "chosen.fasta").read_text(encoding="utf-8"),
                ">run-chosen-clean\nATGCGT\n",
            )

    def test_length_order_summary_and_base_range(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "reads.fastq").write_text(
                "@long\nAACCGGTT\n+\nIIIIIIII\n"
                "@short\nACGT\n+\n!!!!\n",
                encoding="utf-8",
            )
            program = root / "lengths.flbio"
            program.write_text(
                "Open the file reads.fastq.\n"
                "Put the longest sequences first.\n"
                "Show the sequence lengths.\n"
                "Find the shortest sequence.\n"
                "Find the longest sequence.\n"
                "Keep bases 2 to 4.\n"
                "Save the result as ranged.fastq.\n",
                encoding="utf-8",
            )

            output = Runner(program).run(
                parse(program.read_text(encoding="utf-8"))
            ).render()

            self.assertIn("Sequence lengths", output)
            self.assertIn("Shortest sequence", output)
            self.assertIn("Longest sequence", output)
            self.assertEqual(
                (root / "ranged.fastq").read_text(encoding="utf-8"),
                "@long\nACC\n+\nIII\n"
                "@short\nCGT\n+\n!!!\n",
            )

    def test_name_tools_refuse_paired_reads_plainly(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for name in ("forward.fastq", "reverse.fastq"):
                (root / name).write_text(
                    "@one\nACGT\n+\nIIII\n",
                    encoding="utf-8",
                )
            program = root / "paired.flbio"
            program.write_text(
                "Open the files forward.fastq and reverse.fastq as a pair.\n"
                "Remove duplicate sequences.\n",
                encoding="utf-8",
            )

            with self.assertRaisesRegex(
                FigureLoomBioError,
                "one FASTA or FASTQ file",
            ):
                Runner(program).run(
                    parse(program.read_text(encoding="utf-8"))
                )


if __name__ == "__main__":
    unittest.main()
