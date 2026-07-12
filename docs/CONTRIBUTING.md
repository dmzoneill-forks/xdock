# Contributing to XDock

We welcome contributions of all kinds -- bug fixes, new features, translations, documentation, and testing. PRs are reviewed promptly.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/xdock.git
   cd xdock
   npm ci
   ```
3. **Create a feature branch** from `master`:
   ```bash
   git checkout -b my-feature
   ```
4. **Set up devkit** for testing (see [Development Guide](DEVELOPMENT.md)):
   ```bash
   sudo dnf install mutter-devkit   # Fedora 43+
   make dev                          # launches nested GNOME Shell
   ```

## Development Workflow

1. Make your changes
2. Test in a nested session: `make dev`
3. Run unit tests: `make test`
4. Run linting: `make check`
5. If you changed visual output, run `make visual-regression` and update baselines if needed

See [Development Guide](DEVELOPMENT.md) for full details on make targets and the devkit workflow.

## Code Style

XDock uses ESLint configured in `eslint.config.mjs`. Key rules:

| Rule | Setting |
|---|---|
| Indentation | 4 spaces (no tabs) |
| Quotes | Single quotes (`'text'`) |
| Semicolons | Required |
| Max line length | 110 characters |
| Trailing commas | Required in multiline arrays/objects, forbidden in function args |
| Arrow parens | `as-needed` (omit parens for single params) |
| Variable casing | `camelCase` (allow `vfunc_*` and `on_*` prefixes for GObject) |
| Equality | Smart `===` / `!==` |

Run the linter before committing:

```bash
make check    # or: npx eslint .
```

### GNOME Shell conventions

- Use `GObject.registerClass` for new Clutter/St widget classes
- Prefix private methods with `_`
- Use `super._init()` in GObject subclasses
- Prefer arrow functions for callbacks
- Use `const` by default, `let` only when reassignment is needed

### File headers

All source files should include the license header:

```javascript
// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: Contributors to XDock
```

## Commit Messages

Use concise, descriptive commit messages. Follow this format:

```
<type>: <short description>

<optional body explaining why>
```

**Types:**
- `feat` -- new feature
- `fix` -- bug fix
- `refactor` -- code restructuring without behavior change
- `test` -- adding or updating tests
- `docs` -- documentation changes
- `chore` -- build, CI, or tooling changes
- `style` -- code style changes (whitespace, formatting)

**Examples:**

```
feat: add shelf-style trapezoid dock background

fix: prevent magnified icons from clipping at dock edges

test: add integration tests for per-monitor dock placement

refactor: extract shelf painting to dedicated method
```

Keep the first line under 72 characters. Use the body for context on *why*, not *what*.

## Pull Request Requirements

### Before submitting

- [ ] Code passes `make check` (ESLint)
- [ ] Unit tests pass: `make test`
- [ ] Changes tested in devkit: `make dev`
- [ ] Integration tests pass if applicable: `make integration-test`
- [ ] Visual regression checked if UI changed: `make visual-regression`

### PR description

Include:
- What the change does and why
- How you tested it
- Screenshots for visual changes (before/after)

### CI checks

Every PR triggers the following CI jobs automatically:

| Check | What it verifies |
|---|---|
| **Jest Unit Tests** | Pure logic tests pass |
| **Smoke Test** | Extension loads without crash on Fedora 43-45 (GNOME 49-51) |
| **Integration Tests** | Full test suite passes in headless GNOME Shell |
| **Visual Regression** | Screenshots match baselines (1% RMSE threshold) |
| **ESLint** | Code style compliance |
| **CodeQL** | Security static analysis |
| **Dependency Audit** | No known vulnerable dependencies |

All checks must pass before merge. If visual regression reports differences and the changes are intentional, update baselines:

```bash
make update-baselines
git add test/visual/baselines/
git commit -m "chore: update visual baselines"
```

### Review process

- PRs are reviewed by maintainers, typically within a few days
- Feedback is given as inline comments
- Address review comments with new commits (do not force-push during review)
- Once approved, a maintainer will merge

## Writing Tests

If your change adds new behavior, include tests:

- **Pure logic** (math, string manipulation, settings conversion): add Jest unit tests in `test/`
- **UI behavior** (actor tree changes, settings effects, visual output): add integration tests in `test/integration/`
- **Visual changes**: run `make update-baselines` to capture new reference screenshots

See [Testing Guide](TESTING.md) for test architecture and patterns.

## Bug Reports

File bugs at [https://github.com/dmzoneill-forks/xdock/issues](https://github.com/dmzoneill-forks/xdock/issues). Include:

- GNOME Shell version (`gnome-shell --version`)
- Fedora / distro version
- Steps to reproduce
- Expected vs actual behavior
- Journal output: `journalctl -b | grep -i xdock`

## Becoming a Co-Maintainer

We are actively looking for co-maintainers. If you are interested in helping with code review, triage, or releases, [open an issue](https://github.com/dmzoneill-forks/xdock/issues/new?title=Maintainer+Interest&labels=maintainer) and tell us about yourself and what areas you would like to help with.

Areas where help is especially welcome:
- Code review and PR triage
- Multi-monitor testing
- Wayland compatibility testing
- Translation coordination
- Documentation

## License

By contributing to XDock, you agree that your contributions will be licensed under the [GNU General Public License v2.0 or later](../COPYING).

## Related Docs

- [Development Guide](DEVELOPMENT.md) -- building, make targets, devkit
- [Testing Guide](TESTING.md) -- test tiers, writing tests, CI
- [Architecture](ARCHITECTURE.md) -- source file overview, actor tree, settings
