# Arcjet CLI

The CLI is the preferred way to connect to the Arcjet platform from a terminal session.

## Install

The simplest way is `npx` (no install required):

```bash
npx -y @arcjet/cli@latest <command>
```

For frequent use, install the binary:

```bash
# npm
npm install -g @arcjet/cli

# Homebrew
brew install arcjet/tap/arcjet

# Install script (macOS Apple Silicon/Intel, Linux x86_64/arm64)
curl -sSfL https://arcjet.com/cli/install.sh | bash
```

Or download the latest archive for your platform from https://github.com/arcjet/cli/releases, extract it, and place the `arcjet` binary somewhere on your `PATH`. Available for macOS (Apple Silicon, Intel), Linux (x86_64, arm64), and Windows (x86_64, arm64).

Verify: `arcjet version`

## Authentication

Most users will not have `ARCJET_TOKEN` set in their shell. The default path is the browser-based device authorization flow, which works the same way as `gh auth login`, `fly auth login`, or `vercel login`:

```bash
arcjet auth login
```

The CLI prints a one-time code and opens a URL. The user confirms the code in their browser, and the CLI stores the resulting credentials locally. Subsequent commands authenticate automatically.

Check the current state:

```bash
arcjet auth status
```

Sign out:

```bash
arcjet auth logout
```

> **Note:** If `arcjet auth status` reports the user is not signed in, run `arcjet auth login` and wait for confirmation in the browser before continuing. Do not prompt the user for a token — the device flow is the expected path.

## Agent Usage

Two flags keep output predictable:

- `--output json` — emit machine-readable JSON (default when stdout is not a TTY)
- `--fields <a,b,c>` — limit output to listed top-level keys (use aggressively to keep context small)

```bash
arcjet teams list --output json --fields id,name
arcjet sites list --team-id team_01abc123 --output json --fields id,name
arcjet requests list --site-id site_01abc123 --output json --fields id,conclusion,path
```

## Common Workflows

**Bootstrap a project:** `arcjet auth login` → `arcjet teams list` → `arcjet sites list --team-id <id>` (or `arcjet sites create`) → `arcjet sites get-key --site-id <id>` → write key to `.env` as `ARCJET_KEY`.

**Investigate a request:** `arcjet requests list --site-id <id>` → `arcjet requests details --site-id <id> --request-id <id>` → `arcjet requests explain --site-id <id> --request-id <id>`

**Daily security briefing:** `arcjet briefing --site-id <id>`

**Manage remote rules:** `arcjet rules list` → `arcjet rules create` (DRY_RUN) → `arcjet analyze dry-run-impact` → `arcjet rules promote` (LIVE)

## Command Reference

Run `arcjet help` to see all available commands, or `arcjet <command> help` for details on a specific command (e.g. `arcjet rules help`, `arcjet analyze help`).

## Invariants

- Always confirm with the user before write/delete operations. Mutating commands require `--confirm`.
- Site IDs: `site_<suffix>` (TypeID format). Team IDs: `team_<suffix>`.
- Commands and parameters are a stable API contract.
