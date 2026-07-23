from __future__ import annotations

from datetime import datetime
from pathlib import Path
import os
import platform
import subprocess
import sys
import tempfile
import traceback
from time import monotonic
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from PySide6.QtCore import QEventLoop, QTimer, Slot
from PySide6.QtWidgets import QApplication, QMainWindow, QMessageBox


MIN_INSTALLER_BYTES = 64 * 1024


def downloads_folder() -> Path:
    folder = Path.home() / "Downloads" / "FigureLoom Bio Updates"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def crash_report(name: str, error: BaseException) -> Path:
    candidates = [Path.home() / "Desktop", Path.home(), Path(tempfile.gettempdir())]
    folder = next(
        (candidate for candidate in candidates if candidate.exists() and os.access(candidate, os.W_OK)),
        Path(tempfile.gettempdir()),
    )
    path = folder / f"FigureLoom-Bio-{name}-Crash.txt"
    body = (
        f"FIGURELOOM BIO {name.upper()} CRASH\n\n"
        f"Time: {datetime.now().isoformat(timespec='seconds')}\n"
        f"Platform: {platform.platform()}\n"
        f"Python: {sys.version}\n\n"
        f"{''.join(traceback.format_exception(type(error), error, error.__traceback__))}"
    )
    try:
        path.write_text(body, encoding="utf-8")
    except OSError:
        path = Path(tempfile.gettempdir()) / path.name
        path.write_text(body, encoding="utf-8")
    return path


def simple_explanation(
    title: str,
    what_happened: str,
    how_to_fix: str,
    *,
    technical_detail: str = "",
) -> str:
    parts = [title, "", "What happened", what_happened.strip(), "", "How to fix it", how_to_fix.strip()]
    if technical_detail.strip():
        parts.extend(["", "Technical detail", technical_detail.strip()])
    return "\n".join(parts).strip()


def validate_installer(path: Path, suffix: str, signature: bytes) -> None:
    try:
        size = path.stat().st_size
    except OSError as error:
        raise RuntimeError(
            simple_explanation(
                "The downloaded installer could not be checked.",
                "The file was downloaded, but FigureLoom Bio could not read it.",
                "Delete the file, check access to the Downloads folder, and press Install or update again.",
                technical_detail=str(error),
            )
        ) from error
    if size < MIN_INSTALLER_BYTES:
        raise RuntimeError(
            simple_explanation(
                "The installer download is incomplete.",
                f"The file is only {size:,} bytes, which is too small to be the real installer.",
                "Check the internet connection and press Install or update again. The incomplete file was not opened.",
            )
        )
    header = path.read_bytes()[: max(4, len(signature))]
    if not header.startswith(signature):
        raise RuntimeError(
            simple_explanation(
                "The downloaded file is not a valid FigureLoom Bio installer.",
                "The server returned a different file instead of the expected installer.",
                "Do not open it. Check the connection and try the update again.",
                technical_detail=f"Expected {signature!r}; received {header!r} for {suffix}.",
            )
        )


def launch_installer(path: Path) -> None:
    if sys.platform == "win32":
        subprocess.Popen([str(path)], close_fds=True)
        return
    if sys.platform == "darwin":
        subprocess.Popen(["open", "-a", "Installer", str(path)], close_fds=True)
        return
    raise RuntimeError("The graphical updater opens Windows EXE and macOS PKG installers only.")


def _thread_running(window: Any) -> bool:
    thread = getattr(window, "_thread", None)
    return thread is not None and bool(thread.isRunning())


def _install_simple_error(tools: Any) -> None:
    def simple_error(action: str, error: BaseException) -> str:
        detail = str(error).strip() or error.__class__.__name__
        if isinstance(error, HTTPError):
            happened = f"The download server returned HTTP {error.code} instead of the installer."
            fix = "Check that GitHub opens in a browser, wait a moment, and press Install or update again."
        elif isinstance(error, URLError):
            happened = "The updater could not reach the official GitHub download."
            fix = "Check the internet connection, VPN, firewall, and DNS, then try again."
        elif isinstance(error, PermissionError):
            happened = "The computer blocked FigureLoom Bio from creating or opening a required file."
            fix = "Allow access to the Downloads folder, close other installer copies, and try again."
        elif isinstance(error, FileNotFoundError):
            happened = detail
            fix = "Run Install or update to restore the missing application or file."
        else:
            happened = "FigureLoom Bio reached an error and stopped instead of pretending the action succeeded."
            fix = "Read the technical detail below, correct that problem, and try the action again."
        return simple_explanation(
            f"{action} could not finish.",
            happened,
            fix,
            technical_detail=f"{error.__class__.__name__}: {detail}",
        )

    tools.simple_error = simple_error


def _install_download_worker(tools: Any) -> None:
    @Slot()
    def run(worker: Any) -> None:
        destination: Path | None = None
        try:
            url, suffix, signature = tools.platform_installer()
            destination = downloads_folder() / f"FigureLoom-Bio-Installer-{datetime.now():%Y%m%d-%H%M%S}{suffix}"
            worker.log.emit("Connecting to the official FigureLoom Bio download…")
            request = Request(url, headers={"User-Agent": "FigureLoom-Bio-Updater/1.0"})
            with urlopen(request, timeout=120) as response, destination.open("wb") as output:
                total = int(response.headers.get("Content-Length", "0") or 0)
                received = 0
                while True:
                    block = response.read(256 * 1024)
                    if not block:
                        break
                    output.write(block)
                    received += len(block)
                    if total:
                        value = min(90, 8 + int(received / total * 82))
                        worker.progress.emit(value, f"Downloading {received / 1024 / 1024:.1f} MB")
            worker.progress.emit(94, "Checking the downloaded installer")
            validate_installer(destination, suffix, signature)
            worker.log.emit(f"Checked installer: {destination}")
            worker.finished.emit(True, "The installer is ready", str(destination))
        except Exception as error:
            worker.log.emit(tools.simple_error("Downloading the FigureLoom Bio installer", error))
            worker.finished.emit(False, "The installer could not be downloaded", str(destination or ""))

    tools.DownloadWorker.run = run


def _install_test_worker(tools: Any) -> None:
    @Slot()
    def run(worker: Any) -> None:
        folder = worker.destination
        try:
            success, report, folder = tools.run_quick_test(folder)
        except Exception as error:
            try:
                folder = tools.create_test_files(folder)
            except Exception:
                folder.mkdir(parents=True, exist_ok=True)
            saved = crash_report("Test-Tool", error)
            report = simple_explanation(
                "The automatic test app stopped.",
                "The test did not finish, so FigureLoom Bio is not claiming that the installation works.",
                "Open the crash report below, run Repair from the updater, and run the test again.",
                technical_detail=f"{error}\n\nCrash report: {saved}",
            )
            try:
                (folder / "TEST-RESULT.txt").write_text(report + "\n", encoding="utf-8")
            except OSError:
                pass
            success = False
        worker.finished.emit(success, report, str(folder))

    tools.TestWorker.run = run


def _install_close_guards(tools: Any) -> None:
    def manager_close_event(window: Any, event: Any) -> None:
        if _thread_running(window):
            QMessageBox.information(
                window,
                tools.APP_NAME,
                simple_explanation(
                    "The updater is still working.",
                    "The download or installer check has not finished yet.",
                    "Wait for a finished or failed message, then close the updater normally.",
                ),
            )
            event.ignore()
            return
        QMainWindow.closeEvent(window, event)

    def test_close_event(window: Any, event: Any) -> None:
        if _thread_running(window):
            QMessageBox.information(
                window,
                tools.APP_NAME,
                simple_explanation(
                    "The automatic test is still running.",
                    "FigureLoom Bio is still opening the test files and checking the generated results.",
                    "Wait for Quick test passed or Quick test failed, then close the window.",
                ),
            )
            event.ignore()
            return
        QMainWindow.closeEvent(window, event)

    tools.ManagerWindow.closeEvent = manager_close_event
    tools.TestWindow.closeEvent = test_close_event


def _install_manager_handoff(tools: Any) -> None:
    original_thread_finished = tools.ManagerWindow._download_thread_finished

    @Slot(bool, str, str)
    def download_finished(window: Any, success: bool, message: str, path: str) -> None:
        window._set_busy(False)
        window.status.setObjectName("success" if success else "error")
        window.status.setText(message)
        window.progress.setValue(100 if success else 0)
        window.style().unpolish(window.status)
        window.style().polish(window.status)
        if not success:
            return
        try:
            installer = Path(path)
            launch_installer(installer)
            window._append(
                "The official installer was downloaded, checked, and opened. "
                "Finish the normal Windows or macOS installer steps."
            )
            window._close_after_download = True
        except Exception as error:
            window._append(tools.simple_error("Opening the downloaded installer", error))
            window.status.setObjectName("error")
            window.status.setText("The installer downloaded but did not open")
            window.style().unpolish(window.status)
            window.style().polish(window.status)

    def thread_finished(window: Any) -> None:
        original_thread_finished(window)
        if getattr(window, "_close_after_download", False):
            window._close_after_download = False
            QTimer.singleShot(150, window.close)

    tools.ManagerWindow._download_finished = download_finished
    tools.ManagerWindow._download_thread_finished = thread_finished


def _wait_for_test(window: Any, timeout_seconds: float = 90.0) -> None:
    loop = QEventLoop()
    timer = QTimer()
    timer.setInterval(25)
    deadline = monotonic() + timeout_seconds

    def poll() -> None:
        finished = (
            not _thread_running(window)
            and window._thread is None
            and window.status.text() in {"Quick test passed", "Quick test failed"}
        )
        if finished or monotonic() >= deadline:
            timer.stop()
            loop.quit()

    timer.timeout.connect(poll)
    timer.start()
    QTimer.singleShot(0, poll)
    loop.exec()
    if _thread_running(window):
        window._thread.quit()
        window._thread.wait(30_000)
    if _thread_running(window):
        raise RuntimeError("The automatic test worker did not finish within 90 seconds.")
    if window.status.text() != "Quick test passed":
        raise RuntimeError(window.report.toPlainText() or "The automatic test window did not pass.")


def _install_self_tests(tools: Any) -> None:
    def test_window_self_test() -> int:
        app = tools.application()
        window = tools.TestWindow(auto_run=True)
        window.show()
        _wait_for_test(window)
        window.close()
        app.processEvents()
        print("FIGURELOOM BIO TEST APP SELF TEST PASSED")
        return 0

    def manager_window_self_test() -> int:
        app = tools.application()
        window = tools.ManagerWindow()
        window.show()
        loop = QEventLoop()
        QTimer.singleShot(250, loop.quit)
        loop.exec()
        if not window.isVisible():
            raise RuntimeError("The updater did not remain open during its event-loop test.")
        temporary = Path(tempfile.mkdtemp(prefix="figureloom-updater-self-test-"))
        try:
            exe = temporary / "test.exe"
            exe.write_bytes(b"MZ" + b"0" * MIN_INSTALLER_BYTES)
            validate_installer(exe, ".exe", b"MZ")
            pkg = temporary / "test.pkg"
            pkg.write_bytes(b"xar!" + b"0" * MIN_INSTALLER_BYTES)
            validate_installer(pkg, ".pkg", b"xar!")
        finally:
            import shutil

            shutil.rmtree(temporary, ignore_errors=True)
        window.close()
        app.processEvents()
        print("FIGURELOOM BIO UPDATER SELF TEST PASSED")
        return 0

    tools.test_window_self_test = test_window_self_test
    tools.manager_window_self_test = manager_window_self_test


def _install_startup_reports(tools: Any) -> None:
    original_test = tools.show_test_window
    original_manager = tools.show_manager_window

    def show_test_window() -> int:
        try:
            return original_test()
        except Exception as error:
            saved = crash_report("Test-Tool", error)
            try:
                app = tools.application()
                QMessageBox.critical(
                    None,
                    tools.APP_NAME,
                    simple_explanation(
                        "The FigureLoom Bio test app could not open.",
                        "The app stopped during startup instead of silently disappearing.",
                        "Run Repair from the updater, then open the test app again.",
                        technical_detail=f"{error}\n\nCrash report: {saved}",
                    ),
                )
                app.processEvents()
            except Exception:
                pass
            return 1

    def show_manager_window() -> int:
        try:
            return original_manager()
        except Exception as error:
            saved = crash_report("Updater", error)
            try:
                app = tools.application()
                QMessageBox.critical(
                    None,
                    tools.APP_NAME,
                    simple_explanation(
                        "The FigureLoom Bio updater could not open.",
                        "The updater stopped during startup instead of hiding the error.",
                        "Reinstall FigureLoom Bio once from the official download, then use the repaired updater next time.",
                        technical_detail=f"{error}\n\nCrash report: {saved}",
                    ),
                )
                app.processEvents()
            except Exception:
                pass
            return 1

    tools.show_test_window = show_test_window
    tools.show_manager_window = show_manager_window


def install_platform_qt_final(tools: Any) -> None:
    if getattr(tools, "_final_reliability_installed", False):
        return
    _install_simple_error(tools)
    _install_download_worker(tools)
    _install_test_worker(tools)
    _install_close_guards(tools)
    _install_manager_handoff(tools)
    _install_self_tests(tools)
    _install_startup_reports(tools)
    tools._final_reliability_installed = True


__all__ = [
    "MIN_INSTALLER_BYTES",
    "crash_report",
    "downloads_folder",
    "install_platform_qt_final",
    "simple_explanation",
    "validate_installer",
]
