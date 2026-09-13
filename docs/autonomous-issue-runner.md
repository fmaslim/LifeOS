# Autonomous issue runner

LifeOS uses GitHub Issues as the work queue. The runner processes one issue at a time, always selecting the oldest open issue labeled `ready`.

## Required labels

The runner creates and maintains these labels automatically:

- `ready` — eligible for work
- `in-progress` — currently being worked
- `blocked` — requires a human decision
- `done` — completed and closed

## Creating work

Create one focused GitHub Issue per independently deployable change. Include acceptance criteria, affected area, test expectations, and any constraints. Do not add `ready` until the issue is clear enough for autonomous execution. Never place secrets, credentials, or production access instructions in an issue.

## Starting the loop

From the repository root, ensure GitHub CLI is authenticated (`gh auth login`), commit or stash your local work, and push a baseline `main` branch to `origin` first. Then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\process-github-issues.ps1
```

The command initializes labels, processes up to 10 issues, creates one `agent/issue-<number>` branch per issue, pushes each completed branch, and closes the corresponding issue with the `done` label. Review or merge the pushed branches through your normal GitHub workflow.

To only create or normalize the labels:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\process-github-issues.ps1 -InitializeLabels
```

To verify the runner can read the queue without starting an agent:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\process-github-issues.ps1 -DryRun
```

## Safe stopping and failure behavior

Stop safely with `Ctrl+C` between agent actions. The current issue will retain `in-progress` if interrupted; inspect it, then relabel it `ready` to retry or `blocked` if it needs a decision.

For each issue the runner reads the complete issue, invokes Codex, runs `npm install` when dependencies are absent, build, lint, and available test scripts. It never silently ignores a failed command. A failure, no commit, unsafe request, or ambiguous change adds a clear GitHub comment and the `blocked` label, then the runner continues with the next `ready` issue.

The runner never processes more than 10 issues per invocation, never runs more than one issue concurrently, and does not automatically alter secrets, credentials, production infrastructure, databases, authentication, or external systems. Failed worktrees are preserved under `.lifeos-agent-worktrees` for inspection and are never force-deleted.
