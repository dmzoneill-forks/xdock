# Dash 2 X

A community-driven dock for the GNOME Shell.

**Forked from [Dash to Dock](https://github.com/micheleg/dash-to-dock) by Michele (micxgx@gmail.com).**

Dash 2 X is a community fork focused on timely updates, inclusive contribution, and user-centric development. We actively review and merge pull requests, welcome new contributors, and prioritize the features and fixes that users care about.

## Why this fork?

The original Dash to Dock is a great project, but development and PR reviews have slowed significantly. Dash 2 X exists to keep the extension moving forward:

- **Timely updates** — PRs are reviewed and merged promptly, not left open for years
- **Community driven** — decisions are made in the open with input from users and contributors
- **Inclusive contribution** — all skill levels welcome, clear guidelines, responsive maintainers
- **User centric** — features and fixes are prioritized based on what users actually need

## Want to help maintain?

We're actively looking for co-maintainers. If you're interested, [open an issue](https://github.com/dmzoneill-forks/dash-2-x/issues/new?title=Maintainer+Interest&labels=maintainer) and tell us a bit about yourself and what areas you'd like to help with.

## Features

In addition to all the original Dash to Dock functionality, Dash 2 X includes:

- Window preview on hover (Aero Peek style)
- App icon categories with drag-and-drop grouping
- Ungroup applications (per-window dock icons)
- Dock margin size customization
- Bounce animation for launching icons
- Cycle or minimize window behavior
- Location apps in separate dock section
- Improved intellihide and autohide fixes

## Installation from source

### Build Dependencies

To compile the stylesheet you'll need an implementation of SASS. Dash 2 X supports `dart-sass` (`sass`), `sassc`, and `ruby-sass`. We recommend `dart-sass` or `sassc`.

```bash
export SASS=dart
# or...
export SASS=ruby
```

### Building

```bash
git clone https://github.com/dmzoneill-forks/dash-2-x.git
make -C dash-2-x install
```

A Shell reload is required: <kbd>Alt</kbd>+<kbd>F2</kbd> then type `r` under Xorg, or log out and back in on Wayland. Enable the extension with *GNOME Extensions* app or *dconf*.

If `msgfmt` is not available:

```bash
# Install gettext from your distribution's repository
# Fedora: sudo dnf install gettext
# Ubuntu: sudo apt install gettext
```

## Contributing

We welcome contributions of all kinds — bug fixes, new features, translations, documentation, and testing.

1. Fork the repo and create a feature branch
2. Make your changes
3. Submit a pull request

PRs are reviewed promptly. If you're unsure about an approach, open an issue first to discuss.

## Bug Reporting

Report bugs at [https://github.com/dmzoneill-forks/dash-2-x/issues](https://github.com/dmzoneill-forks/dash-2-x/issues).

## License

Dash 2 X is distributed under the terms of the GNU General Public License, version 2 or later. See the COPYING file for details.
