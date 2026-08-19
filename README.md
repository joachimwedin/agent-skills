# agent-skills

Personal collection of Claude Code skills. Symlinked into `~/.claude/skills`.

## Layout

Each skill lives under `skills/<name>/`. Running `link.sh` uses [GNU Stow](https://www.gnu.org/software/stow/) to symlink every skill in `skills/` into `~/.claude/skills/<name>`, and never touches anything else already there (a real directory, or a symlink from elsewhere).

## Usage

Run `./link.sh` after cloning or pulling:

- Adds a symlink for every skill currently under `skills/`.
- Prunes symlinks for skills that have since been deleted or renamed, asking before each removal.

## License

MIT - see [LICENSE](./LICENSE).

## Acknowledgements

Many of these skills originated from, or were adapted from, [mattpocock/skills](https://github.com/mattpocock/skills) (MIT licensed, Copyright (c) 2026 Matt Pocock) - some used as-is, others edited more heavily. Credit for the underlying ideas belongs there; thanks to Matt Pocock for sharing them.
