# AIONE Windows Node.js Setup V1.0

## Why this is required

The browser UI itself does not require Node.js. The local AI Secretary Preview backend does.

If Windows shows `npm is not recognized`, Node.js/npm is not available in the current Windows environment or is not on PATH.

## Preferred setup

1. Double-click `SETUP_NODE_LTS.cmd` in the AIONE package root.
2. It first tries Windows Package Manager (`winget`) to install the current Node.js LTS package.
3. If automatic setup is unavailable, it opens the official Node.js download page.
4. Install the LTS release with npm included.
5. Run `START_AI_SECRETARY_PREVIEW.cmd` again.

## Launcher hardening in V1.8.1

The preview launcher no longer assumes that `npm` is already on PATH. It searches:

- the current PATH;
- `%ProgramFiles%\\nodejs`;
- `%ProgramFiles(x86)%\\nodejs`;
- `%LOCALAPPDATA%\\Programs\\nodejs`;
- the directory containing the discovered `node.exe`.

If Node.js/npm is absent, it stops with a clear prerequisite message instead of reporting an AIONE backend failure.
