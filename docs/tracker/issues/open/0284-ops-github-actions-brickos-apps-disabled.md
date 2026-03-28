---
number: 284
title: "ops: GitHub Actions disabled for brickos-apps user account"
labels: [ops, infrastructure]
milestone: infrastructure
---

## Description

GitHub Actions is disabled at the user-level for the `brickos-apps` account. Error: "Actions has been disabled for this user." This prevents CI (ci-health.yml), Security Scanning (security.yml), and Deploy to Staging (deploy-staging.yml) workflows from triggering on push.

## What Works

- Dependabot workflows run (uses GitHub's own context, not user)
- Repo-level Actions settings are correct ("Allow all actions")
- Org-level Actions settings are correct ("Allow all actions", "All repositories")
- Member privileges are not blocking

## What Doesn't Work

- Push-triggered workflows don't fire
- Manual workflow_dispatch fails with "Actions has been disabled for this user"
- No Actions option in brickos-apps user settings (https://github.com/settings)

## Root Cause

GitHub has likely flagged `brickos-apps` as a bot/machine account and disabled Actions at the account level. This is not configurable through any settings UI.

## Fix Options

- [ ] Contact GitHub Support to enable Actions for brickos-apps
- [ ] Push from personal GitHub account to trigger workflows
- [ ] Create a GitHub App or use a PAT from an account with Actions enabled
