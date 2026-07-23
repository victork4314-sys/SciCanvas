# FigureLoom Bio Linux Installer

FigureLoom Bio is installed only when a user chooses to install it. It is **not preinstalled into the Kasm image**, and there is no server-side Kasm image-builder step.

The same Linux installer works on a normal Ubuntu or Debian desktop and inside a running Kasm desktop session.

The `.flbio` language still has one built-in capability list. The installer does not create add-ons, language packages, or activation steps.

## Install on Ubuntu, Debian, or inside Kasm

Open the Linux terminal and run:

```bash
curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/figureloom-bio/linux/install-linux.sh | sudo bash
```

Inside Kasm, run that command from the terminal in the workspace session. It installs FigureLoom Bio into that Linux environment only. It does not rebuild or replace the Kasm Docker image.

The first command installs the local IDE, the language engine, the desktop test files, and the desktop installer.

## Use the installer window

Double-click **Install or Update FigureLoom Bio** on the desktop.

The window provides:

- **Install or update** to fetch the current repository version and install it;
- **Repair** to recreate missing launchers, the local IDE copy, or the test folder;
- **Run quick test** to exercise real CSV, FASTA, FASTQ, statistics, SVG figure, alignment, and tree paths;
- **Open IDE** to open the local FigureLoom Bio workspace;
- **Open test files** to open the unzipped desktop folder.

The progress bar shows the current stage. Details remain visible in the same window if something fails.

## Missing Linux pieces

The installer checks before changing anything. On Ubuntu and Debian it installs only missing basic pieces such as:

- Python 3;
- Python virtual-environment support;
- Python Tk support for the installer window;
- Git;
- tar.

A supported desktop browser must already be present. The local IDE supports Chromium, Google Chrome, Firefox, and Firefox ESR.

Optional external bioinformatics programs are not silently installed. Most FigureLoom Bio commands run with the built-in language engine. Tool-backed workflows remain explicit.

## What appears on the desktop

After installation the desktop contains:

- **Install or Update FigureLoom Bio**;
- **FigureLoom Bio IDE**;
- **Test FigureLoom Bio**;
- the unzipped **FigureLoom Bio Test Files** folder.

The test folder includes `quick-test.flbio`, sample CSV, FASTA, and FASTQ files, and a plain README. Running the quick test writes `TEST-RESULT.txt` and the generated outputs into that folder.

## Automatic verification

The user-run Linux installation path runs:

```bash
flbio doctor
flbio quick-test
```

The repository test workflow also rehearses a clean Linux desktop installation and verifies the updater, IDE launcher, test launcher, desktop icons, and unzipped test files.
