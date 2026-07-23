from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from figureloom_bio import Runner
from figureloom_bio.parser import parse


DNA_ONE = "ATG" + ("GCC" * 30) + "TAA"
DNA_TWO = "ATG" + ("GCC" * 15) + "GTC" + ("GCC" * 14) + "TAA"
DNA_THREE = "ATG" + ("GCT" * 30) + "TAA"
PROTEIN_ONE = "MKKLLLLLLLLLLAAAAGGGGVVVVVVVVVVVVVVVVVVVV"
PROTEIN_TWO = "MSTNPKPQRKTKRNTNRRPQDVKFPGGGQIVGGVYLLLFFFVVVVVVVV"


class CompleteLanguageTests(unittest.TestCase):
    def test_completed_sentences_parse_to_real_actions(self) -> None:
        source = """Copy the file as copied.fasta.
Rename the file to renamed.fasta.
List the files.
Find repeated sequences.
Find palindromes.
Find start codons.
Find stop codons.
Find open reading frames.
Join the sequences.
Compare the sequences.
Show the alignment.
Save the alignment as alignment.fasta.
Find variants.
Count the variants.
Show the variants.
Save the variants as variants.csv.
Find genes.
Count the genes.
Show the genes.
Save the genes as genes.csv.
Find signal peptides.
Find transmembrane regions.
Find PCR primers.
Check the primers.
Show the primers.
Build a phylogenetic tree.
Show the tree.
Save the tree as tree.nwk.
Calculate the average under count.
Calculate the median under count.
Calculate the standard deviation under count.
Calculate the minimum under count.
Calculate the maximum under count.
Normalize the counts under count.
Compare treated and control under condition.
Create a histogram from count.
Create a bar chart from sample and count.
Create a scatter plot from x and y.
Create a box plot from count.
"""
        actions = [instruction.action for instruction in parse(source)]
        self.assertEqual(len(actions), 39)
        self.assertEqual(actions[0], "copy_file")
        self.assertEqual(actions[-1], "create_box_plot")
        self.assertEqual(len(actions), len(set(actions)))

    def test_alignment_variants_genes_primers_and_tree_create_real_files(self) -> None:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "sequences.fasta").write_text(
                f">sample-one\n{DNA_ONE}\n>sample-two\n{DNA_TWO}\n>sample-three\n{DNA_THREE}\n",
                encoding="utf-8",
            )
            program = root / "program.flbio"
            source = """Open the file sequences.fasta.
Compare the sequences.
Show the alignment.
Save the alignment as alignment.fasta.
Find variants.
Count the variants.
Show the variants.
Save the variants as variants.csv.
Open the file sequences.fasta.
Find genes.
Count the genes.
Show the genes.
Save the genes as genes.csv.
Open the file sequences.fasta.
Find PCR primers.
Check the primers.
Show the primers.
Open the file sequences.fasta.
Build a phylogenetic tree.
Show the tree.
Save the tree as tree.nwk.
"""
            output = Runner(program).run(parse(source)).render()

            self.assertIn("Sequence comparison", output)
            self.assertIn("Variants", output)
            self.assertIn("Genes", output)
            self.assertIn("PCR primers", output)
            self.assertIn("Phylogenetic tree", output)
            for name in ("alignment.fasta", "variants.csv", "genes.csv", "tree.nwk"):
                self.assertTrue((root / name).exists(), name)
                self.assertGreater((root / name).stat().st_size, 0, name)
            self.assertIn("substitution", (root / "variants.csv").read_text(encoding="utf-8"))
            self.assertIn("gene-1", (root / "genes.csv").read_text(encoding="utf-8"))
            self.assertTrue((root / "tree.nwk").read_text(encoding="utf-8").strip().endswith(";"))

    def test_sequence_discovery_and_protein_checks_are_real_tables(self) -> None:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            repeated = f">one\n{DNA_ONE}\n>two\n{DNA_ONE}\n>three\nATGCAT\n"
            (root / "sequences.fasta").write_text(repeated, encoding="utf-8")
            (root / "proteins.fasta").write_text(
                f">protein-one\n{PROTEIN_ONE}\n>protein-two\n{PROTEIN_TWO}\n",
                encoding="utf-8",
            )
            source = """Open the file sequences.fasta.
Find repeated sequences.
Open the file sequences.fasta.
Find palindromes.
Open the file sequences.fasta.
Find start codons.
Open the file sequences.fasta.
Find stop codons.
Open the file sequences.fasta.
Find open reading frames.
Open the file proteins.fasta.
Find signal peptides.
Open the file proteins.fasta.
Find transmembrane regions.
"""
            output = Runner(root / "program.flbio").run(parse(source)).render()
            for title in (
                "Repeated sequences",
                "Palindromes",
                "Start codons",
                "Stop codons",
                "Open reading frames",
                "Signal peptide candidates",
                "Transmembrane region candidates",
            ):
                self.assertIn(title, output)

    def test_statistics_normalization_group_comparison_and_charts(self) -> None:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "samples.csv").write_text(
                "sample,condition,count,x,y\n"
                "a,treated,10,1,2\n"
                "b,treated,20,2,5\n"
                "c,control,5,3,7\n"
                "d,control,15,4,11\n",
                encoding="utf-8",
            )
            source = """Open the file samples.csv.
Calculate the average under count.
Calculate the median under count.
Calculate the standard deviation under count.
Calculate the minimum under count.
Calculate the maximum under count.
Normalize the counts under count.
Create a histogram from count.
Create a bar chart from sample and count.
Create a scatter plot from x and y.
Create a box plot from count.
Open the file samples.csv.
Compare treated and control under condition.
"""
            output = Runner(root / "program.flbio").run(parse(source)).render()
            for title in (
                "Average",
                "Median",
                "Standard deviation",
                "Minimum",
                "Maximum",
                "Normalized counts",
                "Compared treated and control",
            ):
                self.assertIn(title, output)
            for name in ("histogram.svg", "bar-chart.svg", "scatter-plot.svg", "box-plot.svg"):
                content = (root / name).read_text(encoding="utf-8")
                self.assertIn("<svg", content)
                self.assertNotIn("TODO", content)

    def test_copy_rename_and_list_files_change_real_files(self) -> None:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "source.fasta").write_text(f">one\n{DNA_ONE}\n", encoding="utf-8")
            source = """Open the file source.fasta.
Copy the file as copied.fasta.
Rename the file to renamed.fasta.
List the files.
"""
            output = Runner(root / "program.flbio").run(parse(source)).render()
            self.assertTrue((root / "copied.fasta").exists())
            self.assertTrue((root / "renamed.fasta").exists())
            self.assertFalse((root / "source.fasta").exists())
            self.assertIn("copied.fasta", output)
            self.assertIn("renamed.fasta", output)

    def test_completed_commands_run_inside_decisions_and_recipes(self) -> None:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "sequences.fasta").write_text(
                f">sample-one\n{DNA_ONE}\n>sample-two\n{DNA_TWO}\n",
                encoding="utf-8",
            )
            source = """Make a recipe called Compare samples:
    Compare the sequences.
    Find variants.

Open the file sequences.fasta.
If the result is not empty:
    Use the recipe Compare samples.
Otherwise:
    Stop the program.
"""
            from figureloom_bio.control_flow import run_flow_program

            output = run_flow_program(root / "program.flbio", source).render()
            self.assertIn("Sequence comparison", output)
            self.assertIn("Variants", output)
            self.assertIn("The condition was true", output)


if __name__ == "__main__":
    unittest.main()
