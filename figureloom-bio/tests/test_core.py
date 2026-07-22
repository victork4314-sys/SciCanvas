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
                "sample,condition,status\none,treated,passed\ntwo,control,passed\nthree,treated,failed\n",
                encoding="utf-8",
            )
            program = root / "analysis.flbio"
            program.write_text(
                "Open the file samples.csv.\nKeep only rows marked treated under condition.\n"
                "Remove rows marked failed under status.\nCount the rows.\nShow the result.\n"
                "Save the result as clean.csv.\n",
                encoding="utf-8",
            )
            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()
            self.assertIn("Rows\n\n1", output)
            self.assertIn("one", output)
            self.assertNotIn("three", output)
            self.assertEqual((root / "clean.csv").read_text(encoding="utf-8"), "sample,condition,status\none,treated,passed\n")

    def test_program_can_repeat_and_number_fastq_outputs(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "reads.fastq").write_text("@read-1\nACGTAC\n+\nIIIIII\n", encoding="utf-8")
            program = root / "repeat.flbio"
            program.write_text(
                "Run this program 3 times.\n\nOpen the file reads.fastq.\nSave the result as clean.fastq.\n",
                encoding="utf-8",
            )
            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()
            for number in range(1, 4):
                self.assertEqual((root / f"clean-{number}.fastq").read_text(encoding="utf-8"), "@read-1\nACGTAC\n+\nIIIIII\n")
                self.assertIn(f"Run {number} of 3", output)

    def test_table_preparation_sentences_run_together(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "samples.csv").write_text(
                "sample,condition,status,age,unused\n"
                "sample-01,treated,passed,5,a\n"
                "sample-01,treated,failed,99,b\n"
                "sample-02,control,,12,c\n"
                "sample-03,treated,failed,,d\n",
                encoding="utf-8",
            )
            (root / "metadata.csv").write_text("sample,lab\nsample-01,south\nsample-02,north\nsample-03,west\n", encoding="utf-8")
            program = root / "prepare.flbio"
            program.write_text(
                "Open the file samples.csv.\nRemove duplicate rows using sample.\n"
                "Replace empty values under status with unknown.\nChange control to untreated under condition.\n"
                "Combine it with metadata.csv using sample.\nKeep only the columns sample, condition, status, age, and lab.\n"
                "Rename the column condition to group.\nPut the largest age first.\nSave the result as prepared.csv.\n",
                encoding="utf-8",
            )
            Runner(program).run(parse(program.read_text(encoding="utf-8")))
            self.assertEqual(
                (root / "prepared.csv").read_text(encoding="utf-8"),
                "sample,group,status,age,lab\nsample-02,untreated,unknown,12,north\nsample-01,treated,passed,5,south\nsample-03,treated,failed,,west\n",
            )

    def test_fasta_filter_conversion_and_translation(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "sequences.fasta").write_text(
                ">sample-17 chosen\nATGGCCATTGTAATGGGCCGCTGA\n"
                ">short\nATG\n"
                ">ambiguous\nATGNNNCCC\n",
                encoding="utf-8",
            )
            program = root / "sequence.flbio"
            program.write_text(
                "Open the file sequences.fasta.\nCount the sequences.\n"
                "Remove sequences shorter than 6 bases.\nRemove sequences containing N.\n"
                "Keep only sequences containing ATG.\nUse the sequence named sample-17.\n"
                "Translate the DNA into protein.\nShow the first 10 sequences.\n"
                "Save the result as protein.fasta.\n",
                encoding="utf-8",
            )
            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()
            saved = (root / "protein.fasta").read_text(encoding="utf-8")
            self.assertIn("MAIVMGR*", saved)
            self.assertIn("Sequences\n\n3", output)
            self.assertIn("sample-17", output)

    def test_dna_rna_and_reverse_complement(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "one.fasta").write_text(">one\nATGC\n", encoding="utf-8")
            program = root / "convert.flbio"
            program.write_text(
                "Open the file one.fasta.\nConvert the DNA to RNA.\nConvert the RNA to DNA.\n"
                "Find the reverse complement.\nSave the result as reverse.fasta.\n",
                encoding="utf-8",
            )
            Runner(program).run(parse(program.read_text(encoding="utf-8")))
            self.assertEqual((root / "reverse.fasta").read_text(encoding="utf-8"), ">one\nGCAT\n")

    def test_fastq_cleanup_and_quality_report(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            adapter = "AGATCGGAAGAGCACACGTCTGAACTCCAGTCA"
            (root / "reads.fastq").write_text(
                "@low\nACGTACGT\n+\n########\n"
                f"@adapter\nACGTACGT{adapter}\n+\n" + "I" * (8 + len(adapter)) + "\n"
                "@short\nACG\n+\nIII\n",
                encoding="utf-8",
            )
            program = root / "clean.flbio"
            program.write_text(
                "Open the file reads.fastq.\nCheck the quality.\nRemove reads with low quality.\n"
                "Remove reads shorter than 5 bases.\nRemove adapter sequences.\n"
                "Cut 2 bases from the beginning of each read.\nCut 2 bases from the end of each read.\n"
                "Check the quality again.\nShow the quality report.\nSave the result as clean.fastq.\n",
                encoding="utf-8",
            )
            output = Runner(program).run(parse(program.read_text(encoding="utf-8"))).render()
            self.assertEqual((root / "clean.fastq").read_text(encoding="utf-8"), "@adapter\nGTAC\n+\nIIII\n")
            self.assertIn("Quality report", output)
            self.assertIn("40.0", output)

    def test_paired_fastq_stays_paired(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "forward.fastq").write_text("@one/1\nACGTAC\n+\nIIIIII\n@two/1\nACGTAC\n+\nIIIIII\n", encoding="utf-8")
            (root / "reverse.fastq").write_text("@one/2\nTGCATG\n+\nIIIIII\n@two/2\nTGCATG\n+\n######\n", encoding="utf-8")
            program = root / "pair.flbio"
            program.write_text(
                "Open the files forward.fastq and reverse.fastq as a pair.\n"
                "Remove reads with low quality.\nSave the pair as clean-forward.fastq and clean-reverse.fastq.\n",
                encoding="utf-8",
            )
            Runner(program).run(parse(program.read_text(encoding="utf-8")))
            self.assertEqual((root / "clean-forward.fastq").read_text(encoding="utf-8"), "@one/1\nACGTAC\n+\nIIIIII\n")
            self.assertEqual((root / "clean-reverse.fastq").read_text(encoding="utf-8"), "@one/2\nTGCATG\n+\nIIIIII\n")

    def test_instruction_keeps_periods_inside_filename(self) -> None:
        self.assertEqual(parse("Open the file samples.csv.")[0].values, ("samples.csv",))

    def test_instructions_need_periods(self) -> None:
        with self.assertRaisesRegex(FigureLoomBioError, "needs a period"):
            parse("Open the file samples.csv")


if __name__ == "__main__":
    unittest.main()
