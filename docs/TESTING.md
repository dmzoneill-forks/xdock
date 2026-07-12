# Testing Guide

XDock uses a three-tier testing strategy: Jest unit tests, GJS integration tests, and visual regression checks.

## Test Architecture

```
Tier 1: Jest Unit Tests (Node.js)
  Pure logic: color math, magnification falloff, icon sizing, dock position
  ~1700 lines across 2 test files, ~184 tests, ~90% coverage
  Mocked GI modules (St, Clutter, GObject, Gio, Meta, Shell)

Tier 2: GJS Integration Tests (gnome-shell-test-tool)
  Full GNOME Shell session running headless or in devkit
  14 test files, ~3500 lines, tests real Clutter actors + GSettings
  Runs inside the compositor with access to the live actor tree

Tier 3: Visual Regression (screenshot diff)
  Screenshots from Tier 2 compared pixel-by-pixel against baselines
  ~299 baseline images in test/visual/baselines/
  Uses ImageMagick `compare` with RMSE threshold (1%)
```

## Running Tests Locally

### Unit tests (Tier 1)

```bash
make test
# or
npm test
# or with coverage
NODE_OPTIONS='--experimental-vm-modules' npx jest --coverage
```

Unit tests run in Node.js with mocked GI modules from `test/__mocks__/`. They test pure functions that do not require the GNOME Shell runtime.

### Integration tests (Tier 2)

Requires `mutter-devkit` (`sudo dnf install mutter-devkit`).

```bash
# Headless (CI-style, no hold)
make integration-test

# Interactive (visible devkit window, holds 30s for inspection)
make integration-test-interactive

# With per-test screenshots saved to /tmp/
make integration-test-screenshots
```

### Visual regression (Tier 3)

Requires `ImageMagick` and `bc`.

```bash
# Run screenshots then compare against baselines
make visual-regression

# Update baselines after intentional visual changes
make update-baselines
```

### Smoke tests

```bash
# Local (requires mutter-devkit)
make smoke-test

# Container (requires podman)
make smoke-test-pod
```

## Test File Structure

```
test/
  __mocks__/           # GI module stubs for Jest (gi.js, etc.)
  utils.test.js        # Jest unit tests for utils.js (1616 lines)
  dash-math.test.js    # Jest unit tests for dash math functions (79 lines)
  setup.js             # Jest global setup
  globalSetup.js       # Jest global setup hook
  integration/
    runner.js           # Entry point: discovers .test.js files, runs them
    helpers.js          # Shared utilities (assertions, screenshots, settings)
    dock-basics.test.js        # Extension loading, dock presence, position
    dock-features.test.js      # Feature-specific dock behavior
    shelf-style.test.js        # Shelf/trapezoid rendering and settings
    magnification.test.js      # Icon magnification and clip behavior
    app-icons.test.js          # App icon presence and interaction
    icon-indicators.test.js    # Running/notification indicators
    auto-hide.test.js          # Autohide and intellihide behavior
    per-monitor.test.js        # Multi-monitor dock placement
    preferences-ui.test.js     # Preferences dialog validation
    settings-binding.test.js   # GSettings round-trip verification
    spring-animation.test.js   # Spring physics animation
    theming.test.js            # Theme manager and transparency
    visual-changes.test.js     # Visual state change detection
    window-previews.test.js    # Window preview (Aero Peek) behavior
  smoke/
    load-extension.js   # Minimal smoke test: extension loads without crash
    run-in-pod.sh       # Podman container smoke test runner
  visual/
    baselines/          # ~299 reference screenshots (PNG)
    scripts/
      compare.sh        # Diff screenshots against baselines (RMSE)
      update-baselines.sh  # Copy latest screenshots to baselines/
```

## Writing New Integration Tests

Integration tests run inside GNOME Shell via `gnome-shell-test-tool`. They are plain GJS scripts (not ESM modules) loaded by the runner with `new Function()`.

### Test file template

Each test file exports a `getTests()` function that returns an array of `{name, fn}` objects:

```javascript
// test/integration/my-feature.test.js

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function getTests() {
    const {Gio, St} = imports.gi;

    function findDock() {
        const uiGroup = global.stage.get_children().find(c => c.name === 'uiGroup');
        return uiGroup?.get_children().find(c => c.name === 'dashtodockContainer');
    }

    return [
        {name: 'my feature works', fn() {
            const dock = findDock();
            assert(dock !== null, 'dock should exist');
            // Test your feature...
        }},

        {name: 'setting round-trips correctly', fn() {
            const s = getXDockSettings();  // injected by runner
            const orig = s.get_boolean('my-setting');
            s.set_boolean('my-setting', !orig);
            const changed = s.get_boolean('my-setting');
            s.set_boolean('my-setting', orig);
            assert(changed === !orig, 'setting should toggle');
        }},
    ];
}

exports.getTests = getTests;
```

### Key patterns

- **`getXDockSettings()`** -- injected by the runner, returns a `Gio.Settings` for the extension schema. Use it instead of constructing settings manually.
- **`screenshot(name)`** -- injected by the runner, captures the current frame to `/tmp/xdock-test-{name}.png`. Used automatically when `XDOCK_TEST_SCREENSHOTS=1`.
- **`assert(condition, message)`** -- throw on failure. Define locally or use the helpers.
- **Actor tree walking** -- start from `global.stage`, find `uiGroup`, then `dashtodockContainer`.
- **`pumpMainLoop(ms)`** -- the runner pumps the GLib main loop between tests (50ms) so layout/paint settle before screenshots.
- **Async tests** -- return a Promise from `fn()` and the runner will await it.

### Adding unit tests

For pure-logic functions:

1. Ensure needed GI symbols are stubbed in `test/__mocks__/gi.js`
2. Add tests to `test/utils.test.js` or create a new `test/*.test.js` file
3. Run `make test` to verify

Functions that depend on Clutter actors or the Shell runtime cannot be unit-tested -- use integration tests instead.

## CI Pipeline

GitHub Actions runs on every push and PR (`.github/workflows/test.yml`):

| Job | What it does |
|---|---|
| **Jest Unit Tests** | `npm test` on Ubuntu with Node.js 20 |
| **Smoke Test** | Build extension in Podman containers (Fedora 43/GNOME 49, Fedora 44/GNOME 50), verify no crash errors in journal |
| **Integration Tests** | Run the full test suite headless in a Podman container (Fedora 44), capture screenshots |
| **Visual Regression** | Compare screenshots against `test/visual/baselines/` using ImageMagick RMSE (1% threshold) |

### Visual regression in CI

- Screenshots are captured during integration tests with `XDOCK_TEST_SCREENSHOTS=1`
- Each screenshot is compared against its baseline using `compare -metric RMSE`
- If RMSE > 1%, the screenshot is flagged as changed
- Diff artifacts (`*_baseline.png`, `*_actual.png`, `*_diff.png`) are uploaded as GitHub Actions artifacts
- On PRs, a comment is posted listing the number of visual differences

### Updating baselines

After intentional visual changes:

```bash
make update-baselines
git add test/visual/baselines/
git commit -m "Update visual baselines"
```

## Screenshot Overlay System

When `XDOCK_TEST_SCREENSHOTS=1` is set, the runner captures a screenshot after every test. Each screenshot is annotated with the test name using ImageMagick `convert`:

- Embossed text centered on the screenshot
- Dark shadow at +2,+2 offset, white text at +0,+0
- Font: Helvetica-Bold, 36pt
- If ImageMagick is not available, screenshots are saved without the overlay

This makes it easy to identify which test produced which screenshot when reviewing visual regression artifacts.

## Related Docs

- [Development Guide](DEVELOPMENT.md) -- building, make targets, devkit
- [Architecture](ARCHITECTURE.md) -- source file overview, actor tree
- [Contributing](CONTRIBUTING.md) -- PR requirements, code style
