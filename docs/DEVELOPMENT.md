# Development Guide

This guide covers building, testing, and iterating on XDock locally.

## Prerequisites

| Dependency | Purpose | Install (Fedora 43+) |
|---|---|---|
| `dart-sass` (or `sassc`) | Compile SCSS to CSS | `npm install -g sass` |
| `glib-compile-schemas` | Compile GSettings XML | `sudo dnf install glib2-devel` |
| `mutter-devkit` | Nested GNOME Shell test sessions | `sudo dnf install mutter-devkit` |
| `gettext` / `msgfmt` | Compile translations | `sudo dnf install gettext` |
| `Node.js 20+` | Unit tests (Jest) | `sudo dnf install nodejs` |
| `eslint` | Linting | `npm ci` (installed via devDependencies) |
| `podman` | Container-based smoke tests | `sudo dnf install podman` |
| `ImageMagick` | Visual regression diffs | `sudo dnf install ImageMagick` |

## Building from Source

```bash
git clone https://github.com/dmzoneill-forks/xdock.git
cd xdock
npm ci              # install dev dependencies (eslint, jest)
make extension      # compile schemas + stylesheet
make install        # copy to ~/.local/share/gnome-shell/extensions/
```

A shell reload is required after `make install`: log out and back in.

### SASS backend

The default SASS compiler is `dart-sass` (the `sass` command). Override with:

```bash
make extension SASS=sassc    # use sassc
make extension SASS=ruby     # use ruby-sass
```

## Make Targets

| Target | Description |
|---|---|
| `make dev` | **Primary dev workflow.** Symlinks source into the extensions dir and launches a nested GNOME Shell devkit session with XDock enabled. No build step needed for JS changes. |
| `make dev-no-ext` | Launch devkit without extensions (baseline comparison). |
| `make extension` | Compile schemas and stylesheet only. |
| `make install` | Build and copy to `~/.local/share/gnome-shell/extensions/`. |
| `make zip-file` | Build + lint + create distributable `.zip`. |
| `make check` | Run ESLint on all source files. |
| `make test` | Run Jest unit tests. |
| `make smoke-test` | Load extension in a local headless devkit session. |
| `make smoke-test-pod` | Load extension in a Podman container (Fedora rawhide). |
| `make integration-test` | Run the full integration test suite headless. |
| `make integration-test-interactive` | Run integration tests in a visible devkit window (holds 30s). |
| `make integration-test-screenshots` | Run integration tests and save a screenshot per test to `/tmp/`. |
| `make visual-regression` | Run integration screenshots then compare against baselines. |
| `make update-baselines` | Capture new screenshots and copy them to `test/visual/baselines/`. |
| `make clean` | Remove compiled schemas, stylesheet, and `_build/`. |

## Development Workflow with `make dev`

`make dev` is the fastest way to iterate:

1. It creates a symlink from `~/.local/share/gnome-shell/extensions/xdock@github.com` to your source tree.
2. It compiles schemas if needed.
3. It launches a nested GNOME Shell session  inside a window on your desktop.

```bash
make dev
```

**What reloads automatically:** JS file changes take effect the next time you re-run `make dev` (close the nested window, run again). No build step is needed.

**What requires recompiling:**
- Schema changes (`schemas/*.gschema.xml`): run `glib-compile-schemas schemas/`
- Stylesheet changes (`_stylesheet.scss`): run `make extension` or `sass --no-source-map _stylesheet.scss stylesheet.css`
- `Settings.ui` changes: no compile needed, but you must restart the prefs window

## Extension Reload Workflow

```bash
# 1. Edit source files
vim dash.js

# 2. Relaunch the nested session
make dev

# 3. Watch logs in another terminal
journalctl -f -o cat /usr/bin/gnome-shell | grep -i xdock
```

The nested session removes the `gnome-shell-disable-extensions` lockfile automatically. If extensions still do not load, delete it manually:

```bash
rm -f /run/user/$(id -u)/gnome-shell-disable-extensions
```

## Devkit Notes

- The nested session runs at higher CPU than normal -- this is expected for the devkit compositor.
- If you see "Not Responding", click **Wait** -- the session needs a few seconds to initialize.
- The session adds a virtual monitor after startup, so extensions initialize via the `monitors-changed` signal.
- For GNOME Shell < 49, use `--nested` instead of `--devkit`.
- The `gnome-shell-disable-extensions` lockfile is recreated periodically by the main GNOME session. `make dev` removes it automatically, but you may need to remove it again if the nested session was started without `make dev`.

## Debugging Tips

### Common issues

**Extension not loading in devkit:**
```bash
# Check if the extension is recognized
gnome-extensions list | grep xdock
# Verify the symlink exists
ls -la ~/.local/share/gnome-shell/extensions/xdock@github.com
# Remove the disable-extensions lockfile
rm -f /run/user/$(id -u)/gnome-shell-disable-extensions
```

**Schema errors after adding a new setting:**
```bash
# Recompile schemas
glib-compile-schemas schemas/
# Validate with strict mode to see warnings
glib-compile-schemas --strict schemas/
```

**Stylesheet not updating:**
```bash
# The devkit session loads the compiled CSS, not SCSS
sass --no-source-map _stylesheet.scss stylesheet.css
```

### GSettings from the command line

You can read and write extension settings without opening the preferences UI:

```bash
# Read a setting
gsettings --schemadir schemas/ get org.gnome.shell.extensions.xdock dock-position

# Write a setting
gsettings --schemadir schemas/ set org.gnome.shell.extensions.xdock dock-style 1

# Reset to default
gsettings --schemadir schemas/ reset org.gnome.shell.extensions.xdock shelf-angle

# List all settings
gsettings --schemadir schemas/ list-keys org.gnome.shell.extensions.xdock
```

## Project Structure

```
xdock/
  extension.js          # Entry point
  docking.js            # DockManager, DockedDash, DashSlideContainer
  dash.js               # DockDash (fork of GNOME Shell Dash)
  imports.js            # Re-export hub for all modules
  appIcons.js           # DockAppIcon (per-app icon)
  appIconIndicators.js  # Running/notification dot indicators
  intellihide.js        # Auto-hide when windows overlap
  utils.js              # Signal handlers, injections, color math
  theming.js            # ThemeManager, transparency, shelf rendering
  springAnimation.js    # Damped-spring physics animation driver
  prefs.js              # Preferences window (GTK4)
  Settings.ui           # Preferences dialog layout (GTK4 Builder XML)
  _stylesheet.scss      # SCSS source for the extension stylesheet
  stylesheet.css        # Compiled CSS (generated)
  features/             # Feature modules
    appIconsDecorator.js, appSpread.js, bounceAnimation.js,
    desktopIconsIntegration.js, dockProfiles.js, dockTiling.js,
    liveThumbnails.js, locations.js, locationsWorker.js,
    pinnedCommands.js, recentFilesMenu.js, windowPreview.js
  services/             # D-Bus and background service modules
    dbusmenuUtils.js, fileManager1API.js, launcherAPI.js,
    mprisMonitor.js, notificationsMonitor.js, screencastMonitor.js,
    wallpaperColorExtractor.js
  widgets/              # Dock UI widget modules
    commandPalette.js, mediaControls.js, quickSettings.js,
    volumeControl.js, volumeMenuItem.js, workspaceMinimap.js
  schemas/              # GSettings schema XML
  media/                # SVG icons and assets
  dependencies/         # GI module re-exports for compatibility
  indicators/           # Indicator rendering
  platform/             # Platform abstraction layer
  ui/                   # UI helpers
  po/                   # Translation files
  test/                 # All test code (see Testing Guide)
  docs/                 # This documentation
  Makefile              # Build and test targets
```

## Validating UI and Schemas

```bash
# Check Settings.ui XML validity
xmllint --noout Settings.ui

# Preview the preferences UI
gtk4-builder-tool preview Settings.ui

# Strict schema validation
glib-compile-schemas --strict schemas/
```

## Linting

```bash
make check          # or: npx eslint .
```

ESLint is configured in `eslint.config.mjs` with GJS and GNOME Shell globals. Key rules: 4-space indent, single quotes, semicolons required, 110-char max line length.

## Viewing Extension Logs

```bash
# Real-time log monitoring
journalctl -f -o cat /usr/bin/gnome-shell | grep -i xdock

# Or filter stderr from the devkit session
make dev 2>&1 | grep -E 'xdock|error|Error'
```

## Related Docs

- [Testing Guide](TESTING.md) -- test tiers, writing tests, CI
- [Architecture](ARCHITECTURE.md) -- source file overview, actor tree, settings
- [Contributing](CONTRIBUTING.md) -- how to submit changes
