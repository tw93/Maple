---
name: github-ops
description: Use this skill for GitHub issue, PR, and release operations for Maple browser extension via gh CLI.
---

# GitHub Operations Skill

Use this skill when working with GitHub issues, PRs, and releases for Maple.

## Golden Rule

**ALWAYS use `gh` CLI** for GitHub operations.

## Release Workflow

```bash
# Build all extensions
npm run build

# Output in dist/
# - Maple.zip (Chrome)
# - FirefoxMaple.zip (Firefox)
# - NewTab.zip
# - Theme.zip
```

## Issue Handling

```bash
# View issue
gh issue view 123

# List issues
gh issue list --state open

# NEVER comment without explicit user request
```

## Safety Rules

1. **NEVER** break extension manifest format
2. **NEVER** comment on issues without explicit request
3. **ALWAYS** test in Chrome after changes
4. **ALWAYS** prepare responses for user review first

## Issue Language

Draft replies in the same language as the issue author.
