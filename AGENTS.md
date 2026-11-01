# Repository context workflow

This repository has a local CodeGraph index. For cross-file changes, architecture work, refactors, or impact analysis:

1. Run `codegraph status --root .`.
2. If files changed, run `codegraph sync --root .`.
3. Start with `codegraph orient --root . --budget small`.
4. Use `codegraph explore "<task terms>" --root .` or `codegraph refs/deps/rdeps` for the selected symbol.
5. Before handoff, use `codegraph review` or `codegraph impact --base HEAD --head WORKTREE` when the Git baseline is available.

CodeGraph complements rather than replaces `rg`, Maven/Vite builds, tests, and compiler diagnostics. Do not treat an unresolved or partial graph edge as proof that no dependency exists.

Project-specific usage and architecture anchors are documented in `CODEGRAPH.md`.
