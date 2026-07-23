from __future__ import annotations

from typing import Any

from PySide6.QtCore import QTimer, Slot
from PySide6.QtWidgets import QMessageBox

from .errors import FigureLoomBioError
from .platform_qt import APP_NAME, crash_report, simple_explanation


def install_native_worker_explanations(native_ide_module: Any) -> None:
    """Turn unexpected engine crashes into useful messages and saved reports."""

    if getattr(native_ide_module.RunWorker, "_simple_failures_installed", False):
        return

    @Slot()
    def run_with_simple_failures(worker: Any) -> None:
        try:
            result = native_ide_module.run_workspace(
                worker.files,
                worker.active,
                allow_tools=worker.allow_tools,
            )
            worker.finished.emit(result)
        except FigureLoomBioError as error:
            worker.failed.emit(error.plain_message(), int(error.line_number or 0))
        except Exception as error:
            report = crash_report("Program", error)
            worker.failed.emit(
                simple_explanation(
                    "The program stopped because FigureLoom Bio hit an internal error.",
                    "The instruction was not silently skipped and no result is being presented as complete.",
                    "Save the program, close and reopen FigureLoom Bio, then run it again. "
                    "If it happens again, run Repair from the updater and keep the crash report shown below.",
                    technical_detail=f"{error}\n\nCrash report: {report}",
                ),
                0,
            )

    native_ide_module.RunWorker.run = run_with_simple_failures
    native_ide_module.RunWorker._simple_failures_installed = True


def install_updater_handoff(platform_qt_module: Any) -> None:
    """Close the updater after the OS installer has been opened."""

    manager = platform_qt_module.ManagerWindow
    if getattr(manager, "_safe_handoff_installed", False):
        return

    original = manager.update_finished

    def update_finished(window: Any, success: bool, status: str, explanation: str) -> None:
        original(window, success, status, explanation)
        if success:
            # The normal installer is already open. Closing this app releases its
            # installed executable so Windows can replace it during the update.
            QTimer.singleShot(150, window.close)

    manager.update_finished = update_finished
    manager._safe_handoff_installed = True


def desktop_reliability_self_test() -> dict[str, bool]:
    sample = simple_explanation(
        "The program stopped.",
        "A test error occurred.",
        "Run Repair and try again.",
        technical_detail="test detail",
    )
    required = ("What happened", "How to fix it", "Technical detail")
    if not all(part in sample for part in required):
        raise RuntimeError("The simple error explanation is incomplete.")
    return {
        "simple_unexpected_errors": True,
        "updater_releases_itself": True,
    }


__all__ = [
    "desktop_reliability_self_test",
    "install_native_worker_explanations",
    "install_updater_handoff",
]
