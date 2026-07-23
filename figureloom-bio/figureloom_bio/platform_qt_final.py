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
from urllib.request import Request, urlopen

from PySide6.QtCore import QEventLoop, QTimer, Slot
from PySide6.QtWidgets import QApplication, QMessageBox


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


def simple_explanation(title: str, happened: str, fix: str, *, detail: str = "") -> str:
    parts = [title, "", "What happened", happened.strip(), "", "How to fix it", fix.strip()]
    if detail.strip():
        parts.extend(["", "Technical detail", detail.strip()])
    return "\n".join(parts).strip()


def validate_installer(path: Path, suffix: str, signature: bytes) -> None:
    size = path.stat().st_size
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
                detail=f"Expected {signature!r}; received {header!r} for {suffix}.",
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


def _install_error_wording(tools: Any) -> None:
    original = tools.simple_error

    def simple_error(action: str, error: BaseException) -> str:
        message = original(action, error)
        return message.replace("\nWhat to do\n", "\nHow to fix it\n").replace("\nDetails\n", "\nTechnical detail\n")

    tools.simple_error = simple_error


def _install_download(tools: Any) -> None:
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
                        worker.progress.emit(
                            min(90, 8 + int(received / total * 82)),
                            f"Downloading {received / 1024 / 1024:.1f} MB",
                        )
            worker.progress.emit(94, "Checking the downloaded installer")
            validate_installer(destination, suffix, signature)
            worker.log.emit(f"Checked installer: {destination}")
            worker.finished.emit(True, "The installer is ready", str(destination))
        except Exception as error:
            worker.log.emit(tools.simple_error("Downloading the FigureLoom Bio installer", error))
            worker.finished.emit(False, "The installer could not be downloaded", str(destination or ""))

    tools.DownloadWorker.run = run


def _install_handoff(tools: Any) -> None:
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
            launch_installer(Path(path))
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
            # Release the updater executable after handoff so Windows can replace it.
            QTimer.singleShot(150, window.close)

    tools.ManagerWindow._download_finished = download_finished
    tools.ManagerWindow._download_thread_finished = thread_finished


def _wait_for_test(window: Any, timeout_seconds: float = 90.0) -> None:
    loop = QEventLoop()
    timer = QTimer()
    timer.setInterval(25)
    deadline = monotonic() + timeout_seconds

    def poll() -> None:
        thread = getattr(window, "_thread", None)
        running = thread is not None and thread.isRunning()
        finished = not running and thread is None and window.status.text() in {"Quick test passed", "Quick test failed"}
        if finished or monotonic() >= deadline:
            timer.stop()
            loop.quit()

    timer.timeout.connect(poll)
    timer.start()
    QTimer.singleShot(0, poll)
    loop.exec()
    thread = getattr(window, "_thread", None)
    if thread is not None and thread.isRunning():
        thread.quit()
        thread.wait(30_000)
    if getattr(window, "_thread", None) is not None:
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

    def guarded(original: Any, name: str) -> int:
        try:
            return original()
        except Exception as error:
            saved = crash_report(name, error)
            try:
                app = tools.application()
                QMessageBox.critical(
                    None,
                    tools.APP_NAME,
                    simple_explanation(
                        f"The FigureLoom Bio {name.lower()} could not open.",
                        "The application stopped during startup instead of silently disappearing.",
                        "Run Repair from the updater. If the updater will not open, reinstall once from the official download.",
                        detail=f"{error}\n\nCrash report: {saved}",
                    ),
                )
                app.processEvents()
            except Exception:
                pass
            return 1

    tools.show_test_window = lambda: guarded(original_test, "Test Tool")
    tools.show_manager_window = lambda: guarded(original_manager, "Updater")


def install_platform_qt_final(tools: Any) -> None:
    if getattr(tools, "_final_reliability_installed", False):
        return
    _install_error_wording(tools)
    _install_download(tools)
    _install_handoff(tools)
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
