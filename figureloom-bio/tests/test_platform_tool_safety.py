from __future__ import annotations

import ast
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
SAFETY = ROOT / "figureloom_bio" / "platform_tool_safety.py"


class PlatformToolSafetyTests(unittest.TestCase):
    def test_platform_tool_safety_is_valid_python(self) -> None:
        source = SAFETY.read_text(encoding="utf-8")
        ast.parse(source)

    def test_both_installed_utility_windows_show_and_paint(self) -> None:
        source = SAFETY.read_text(encoding="utf-8")
        self.assertIn("TestWindow(auto_run=False)", source)
        self.assertIn("ManagerWindow()", source)
        self.assertEqual(source.count("window.show()"), 2)
        self.assertEqual(source.count("window.repaint()"), 2)
        self.assertGreaterEqual(source.count("app.processEvents()"), 6)
        self.assertIn("window.report.viewport().update()", source)
        self.assertIn("window.log.viewport().update()", source)
        self.assertEqual(source.count("window.isVisible()"), 2)
        self.assertIn("test_window_self_test = painted_test_window_self_test", source)
        self.assertIn("manager_window_self_test = painted_manager_window_self_test", source)


if __name__ == "__main__":
    unittest.main()
