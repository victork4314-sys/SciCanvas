from __future__ import annotations

import os
import unittest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

try:
    from PySide6.QtGui import QTextDocument
    from PySide6.QtWidgets import QApplication, QLabel
except ImportError:  # The ordinary language-only test environment does not install Qt.
    QApplication = None


@unittest.skipIf(QApplication is None, "PySide6 is tested by the desktop installer jobs")
class NativeVisualParityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.app = QApplication.instance() or QApplication(["FigureLoom Bio Desktop visual test"])

    def _painted_colors(self, source: str, dark: bool) -> list[list[str]]:
        from figureloom_bio.native_widgets import NativeSyntaxHighlighter

        document = QTextDocument()
        highlighter = NativeSyntaxHighlighter(document, dark=dark)
        document.setPlainText(source)
        highlighter.rehighlight()
        self.app.processEvents()

        painted: list[list[str]] = []
        block = document.firstBlock()
        while block.isValid():
            colors = ["" for _ in block.text()]
            layout = block.layout()
            self.assertIsNotNone(layout)
            for span in layout.formats():
                color = span.format.foreground().color().name().lower()
                for index in range(span.start, min(len(colors), span.start + span.length)):
                    colors[index] = color
            painted.append(colors)
            block = block.next()
        return painted

    def _assert_token_color(self, line: str, colors: list[str], token: str, expected: str) -> None:
        start = line.index(token)
        actual = colors[start : start + len(token)]
        self.assertTrue(actual, f"No painted characters were found for {token!r}")
        self.assertEqual(set(actual), {expected.lower()}, f"{token!r} did not use {expected}")

    def test_exact_web_palette_and_qt_token_colors(self) -> None:
        from figureloom_bio.native_widgets import DARK, LIGHT

        self.assertEqual(LIGHT["background"], "#f4f7f6")
        self.assertEqual(LIGHT["panel"], "#ffffff")
        self.assertEqual(LIGHT["accent"], "#2f7468")
        self.assertEqual(DARK["background"], "#181d1c")
        self.assertEqual(DARK["panel"], "#222927")
        self.assertEqual(DARK["accent"], "#78c4b5")

        lines = [
            "Open the file samples.csv.",
            "Keep only rows marked treated under condition.",
            "# This is a comment.",
            "This sentence is invalid",
        ]
        source = "\n".join(lines)

        for dark, palette in ((False, LIGHT), (True, DARK)):
            with self.subTest(dark=dark):
                painted = self._painted_colors(source, dark)
                self._assert_token_color(lines[0], painted[0], "Open the file ", palette["syntax_command"])
                self._assert_token_color(lines[0], painted[0], "samples.csv", palette["syntax_file"])
                self._assert_token_color(lines[1], painted[1], "treated", palette["syntax_value"])
                self._assert_token_color(lines[1], painted[1], "under", palette["syntax_word"])
                self._assert_token_color(lines[1], painted[1], "condition", palette["syntax_field"])
                self._assert_token_color(lines[2], painted[2], lines[2], palette["syntax_comment"])
                self._assert_token_color(lines[3], painted[3], lines[3], palette["syntax_invalid"])

    def test_native_window_keeps_every_function_in_web_style_groups(self) -> None:
        from figureloom_bio.native_ide import FEATURE_NAMES, NativeIdeWindow, tempfile_workspace

        with tempfile_workspace() as workspace:
            window = NativeIdeWindow(workspace)
            self.app.processEvents()
            try:
                self.assertEqual(window.windowTitle(), "FigureLoom Bio Desktop")
                self.assertEqual(window.centralWidget().objectName(), "ideRoot")
                self.assertEqual(window.editor.objectName(), "programEditor")
                self.assertEqual(window.file_tree.objectName(), "fileList")
                self.assertEqual(window.results.objectName(), "resultsList")
                self.assertEqual(window.tabs.count(), 2)
                self.assertEqual([window.tabs.tabText(index) for index in range(window.tabs.count())], ["Text", "Blocks"])

                group_labels = {
                    label.text()
                    for label in window.findChildren(QLabel)
                    if label.objectName() == "toolLabel"
                }
                self.assertEqual(group_labels, {"File", "Program", "Desktop"})
                self.assertTrue(set(FEATURE_NAMES).issubset(window.feature_names()))
            finally:
                window.close()
                self.app.processEvents()


if __name__ == "__main__":
    unittest.main(verbosity=2)
