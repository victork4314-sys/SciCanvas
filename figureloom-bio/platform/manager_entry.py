import os
import sys


if "--self-test" in sys.argv:
    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from figureloom_bio.platform_qt_tools import show_manager_window


if __name__ == "__main__":
    raise SystemExit(show_manager_window())
