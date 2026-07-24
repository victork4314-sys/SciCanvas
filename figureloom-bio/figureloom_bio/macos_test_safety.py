from __future__ import annotations

from pathlib import Path
import os
import subprocess
import sys
import traceback
from typing import Any

from PySide6.QtCore import QObject, Signal, Slot


PASS_MARKER = "FIGURELOOM BIO QUICK TEST PASSED"


def _clean_child_environment() -> dict[str, str]:
    """Return an environment safe for launching another frozen executable."""

    environment = os.environ.copy()
    environment["PYINSTALLER_RESET_ENVIRONMENT"] = "1"
    environment["MPLBACKEND"] = "Agg"
    for name in tuple(environment):
        if name.startswith("_PYI_"):
            environment.pop(name, None)
    for name in (
        "PYTHONHOME",
        "PYTHONPATH",
        "DYLD_LIBRARY_PATH",
        "DYLD_FALLBACK_LIBRARY_PATH",
    ):
        environment.pop(name, None)
    return environment


def install_macos_test_safety(platform_qt_module: Any) -> None:
    """Run the real macOS quick test without unsafe Qt cross-thread UI work."""

    if sys.platform != "darwin":
        return
    if getattr(platform_qt_module, "_macos_test_safety_installed", False):
        return

    def execute_installed_test(destination: Path) -> tuple[bool, str, str]:
        folder = destination.expanduser().resolve()
        success = False
        report = ""
        try:
            cli = Path("/usr/local/bin/flbio")
            if not cli.is_file():
                raise FileNotFoundError(
                    "The installed FigureLoom Bio command was not found at /usr/local/bin/flbio."
                )

            completed = subprocess.run(
                [str(cli), "quick-test", str(folder)],
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
                env=_clean_child_environment(),
            )
            report = "\n".join(
                part.strip()
                for part in (completed.stdout, completed.stderr)
                if part and part.strip()
            ).strip()

            if completed.returncode != 0:
                raise RuntimeError(
                    f"The installed quick test exited with code {completed.returncode}.\n\n"
                    f"{report or 'The command did not provide any additional details.'}"
                )
            if PASS_MARKER not in report:
                raise RuntimeError(
                    "The installed quick test ended without its required passed message.\n\n"
                    f"{report or 'The command did not provide any additional details.'}"
                )
            success = True
        except subprocess.TimeoutExpired as error:
            report = platform_qt_module.simple_error(
                "The automatic FigureLoom Bio test",
                RuntimeError(
                    "The installed quick test did not finish within two minutes. "
                    "It was stopped so the Test window would not remain frozen."
                ),
            )
            platform_qt_module.save_failure_details(folder, report, repr(error))
        except Exception as error:  # The visible Test window must always survive.
            report = platform_qt_module.simple_error(
                "The automatic FigureLoom Bio test", error
            )
            platform_qt_module.save_failure_details(
                folder, report, traceback.format_exc()
            )
        return success, report, str(folder)

    class MacOSTestWorker(QObject):
        finished = Signal(bool, str, str)

        def __init__(self, destination: Path) -> None:
            super().__init__()
            self.destination = destination

        @Slot()
        def run(self) -> None:
            self.finished.emit(*execute_installed_test(self.destination))

    original_test_finished = platform_qt_module.TestWindow._test_finished

    def deterministic_self_test() -> int:
        """Prove the installed command and real Test window on the UI thread.

        The ordinary Test app still uses MacOSTestWorker in the background. The
        command-line --self-test path does not need a nested QThread/QEventLoop;
        running it directly makes CI deterministic and still applies the real
        result to a real native TestWindow before checking the visible status.
        """

        app = platform_qt_module.application()
        window = platform_qt_module.TestWindow(auto_run=False)
        window.show()
        app.processEvents()
        if not window.isVisible():
            raise RuntimeError("The native Test window did not open.")

        success, report, folder = execute_installed_test(platform_qt_module.test_folder())
        original_test_finished(window, success, report, folder)
        app.processEvents()

        if not success or window.status.text() != "Quick test passed":
            raise RuntimeError(report or "The automatic Test window did not pass.")
        if not Path(folder, "quick-volcano.svg").is_file():
            raise RuntimeError("The Test window passed without creating the volcano plot.")

        window.close()
        app.processEvents()
        return 0

    @Slot(bool, str, str)
    def finish_and_exit_headless(self: Any, success: bool, report: str, folder: str) -> None:
        original_test_finished(self, success, report, folder)
        if os.environ.get("QT_QPA_PLATFORM", "").casefold() != "offscreen":
            return
        app = platform_qt_module.QApplication.instance()
        if app is not None:
            platform_qt_module.QTimer.singleShot(0, app.quit)

    platform_qt_module.TestWorker = MacOSTestWorker
    if "--self-test" in sys.argv:
        platform_qt_module.test_window_self_test = deterministic_self_test
    else:
        platform_qt_module.TestWindow._test_finished = finish_and_exit_headless
    platform_qt_module._macos_test_safety_installed = True


__all__ = ["install_macos_test_safety"]
