# Contributing to Block Wrap Printer

Thanks for your interest in contributing to Block Wrap Printer! This project aims to make it easy for anyone to create printable nets to wrap cardboard boxes in Minecraft textures.

---

## Getting Started

Block Wrap Printer is a single-file, zero-build web application:

1. **No build step or package manager:** You don't need `npm`, `yarn`, or any bundler.
2. **Run locally:** Open `index.html` directly in any modern web browser, or serve it using any simple static file server:
   ```bash
   python3 -m http.server 8000
   # or
   npx serve .
   ```
3. **Assets:** Texture assets live in `assets/source/`, and self-hosted web fonts live in `assets/fonts/`.

---

## Regression checks

Run `node --test tests/*.test.cjs` with Node.js 18 or newer. These checks cover
print geometry, input validation, unit conversion, and PDF layout without adding
a build step or runtime dependencies. Also visually inspect generated PDFs: the
layout tests use a recording PDF implementation and do not replace a render check.

## Commit Guidelines: Conventional Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for all git commit messages. This helps keep the project history readable, consistent, and structured.

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

* **`<type>`** (required): Describes the kind of change.
* **`<scope>`** (optional): A noun describing the section of the codebase affected (e.g., `fonts`, `pdf`, `ui`, `deps`, `presets`).
* **`<description>`** (required): Short summary in the imperative, present tense ("add", "fix", "update", not "added" or "adds"). Lowercase and no trailing period.

### Allowed Types

| Type | Description |
| :--- | :--- |
| `feat` | A new feature or capability for the user |
| `fix` | A bug fix |
| `docs` | Documentation changes only (e.g., `README.md`, `CONTRIBUTING.md`) |
| `style` | Formatting or styling changes that do not affect code logic |
| `refactor` | Code restructuring without fixing a bug or adding a feature |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `build` | Changes to build/deployment scripts or configurations |
| `ci` | Changes to CI/CD workflows or configurations |
| `chore` | Routine tasks, dependency updates, repo cleanup, or maintenance |
| `revert` | Reverts a previous commit |

### Examples

```bash
feat(presets): add obsidian block preset
fix(pdf): fix tab overlap calculation on tabloid paper
docs: update instructions in README
chore(deps): update jsPDF to 4.2.1
feat(fonts)!: switch to self-hosted fonts
```

*(Note: Adding an exclamation mark `!` after the type/scope signifies a breaking change.)*

---

## Git Commit Hooks

This repository includes a git hook to automatically validate commit messages against the Conventional Commits format before commits are accepted.

To activate the repository's hooks after cloning, run:

```bash
git config core.hooksPath .githooks
```

The hook lives in [`.githooks/commit-msg`](.githooks/commit-msg). If a commit message does not match the Conventional Commits format, the hook will reject the commit and provide guidance on the expected structure.

---

## Submitting Pull Requests

1. **Branch naming:** Use descriptive branch names prefixed with the commit type, e.g.:
   * `feat/custom-skin-import`
   * `fix/letter-paper-margins`
   * `chore/tidy-assets`
2. **Keep PRs focused:** Submit smaller, single-purpose PRs where possible.
3. **Verify in browser:** Always test `index.html` across different browser window sizes and check generated PDFs (single page and multi-page layouts) before opening a PR.
4. **License & Assets:** Minecraft textures belong to Mojang/Microsoft and are included solely for personal fan use. Do not commit copyrighted textures without noting source and rights.
