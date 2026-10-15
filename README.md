# agent-skills

Personal collection of Claude Code skills, packaged as a plugin (`agent-skills`) in a marketplace (`joachimwedin`).

## Install

```
/plugin marketplace add joachimwedin/agent-skills
/plugin install agent-skills@joachimwedin
```

Each Claude Code config dir has its own plugin state. For a non-default config dir, run the install with `CLAUDE_CONFIG_DIR=<dir>`.

## Usage

`/agent-skills:<skill>` always works. Bare `/<skill>` also works when no other skill or command has the name.

## Updating

```
/plugin marketplace update joachimwedin
claude plugin update agent-skills@joachimwedin
```

Third-party marketplaces don't auto-update by default; turn it on under `/plugin` -> Marketplaces. There is no `version` field, so every commit is an update.

## Layout

Skills live under `skills/<name>/`. The manifests are in `.claude-plugin/`.

## License

MIT - see [LICENSE](./LICENSE).

## Acknowledgements

Many of these skills originated from, or were adapted from, [mattpocock/skills](https://github.com/mattpocock/skills) (MIT licensed, Copyright (c) 2026 Matt Pocock) - some used as-is, others edited more heavily. Credit for the underlying ideas belongs there; thanks to Matt Pocock for sharing them.

`deep-review`'s [DESIGN-STANDARDS.md](./skills/deep-review/DESIGN-STANDARDS.md) is adapted from cursor/plugins' [thermo-nuclear-code-quality-review](https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review/SKILL.md) skill (MIT licensed, Copyright (c) 2026 Cursor).

`pr-report`, `pr-risk`, and `pr-walkthrough` are based on Gullstrand Heander, Sergeyuk, Zakharov, Söderberg & Mukhortov, "Trust-Calibrated Code Review," ESEM 2026 ([doi:10.4230/LIPIcs.ESEM.2026.89](https://doi.org/10.4230/LIPIcs.ESEM.2026.89)).
