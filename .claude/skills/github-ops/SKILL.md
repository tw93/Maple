---
name: github-ops
description: Use this skill for GitHub issue, PR, and release operations for tw93.github.io blog via gh CLI.
---

# GitHub Operations Skill

Use this skill when working with GitHub issues, PRs, and content publishing for tw93.github.io.

## Golden Rule

**ALWAYS use `gh` CLI** for GitHub operations.

## Content Publishing Workflow

```bash
# Local preview
npm run dev

# Build
npm run build
```

## Post Structure

- Posts: `_posts/` (Chinese), `_posts_en/` (English)
- PPT: Use `layout: ppt`, past date to hide
- Images: Use CDN for auto WebP optimization

## Issue Handling

```bash
# View issue
gh issue view 123

# List issues
gh issue list --state open

# NEVER comment without explicit user request
```

## Safety Rules

1. **NEVER** delete existing posts
2. **NEVER** comment on issues without explicit request
3. **ALWAYS** test locally with `npm run dev`
4. **ALWAYS** prepare responses for user review first

## Issue Language

Draft replies in the same language as the issue author (Chinese or English).
