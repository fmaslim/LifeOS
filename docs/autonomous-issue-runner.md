# Autonomous GitHub Issue Runner

LifeOS uses GitHub Issues as a sequential work queue. The runner selects the oldest open issue with the `ready` label and processes only one issue at a time.

## Prerequisites

- Authenticate GitHub CLI: `gh auth login`.
- Commit and push a clean `origin/main` baseline; normal execution refuses to run without it.
- Install Node.js and npm for frontend validation.
- Ensure the GitHub token has repository and workflow access.

## Labels and issue creation

The runner manages `ready`, `in-progress`, `blocked`, and `done`. Create one focused issue per independent change, including complete requirements, acceptance criteria, affected area, and test expectations. Never label ambiguous, destructive, credential, secret, production-infrastructure, database, authentication, or irreversible work as `ready`.

Initialize labels only:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\process-github-issues.ps1 -InitializeLabels
```

## Coding-agent detection

For normal execution the runner selects Codex in this order: `-AgentCommand`, `LIFEOS_AGENT_COMMAND`, the Codex executable bundled with the ChatGPT VS Code extension, then a global `codex` command. It prints the selected executable before it updates any issue.

On this Windows machine, the bundled executable is:

```text
C:\Users\fmasl\.vscode\extensions\openai.chatgpt-26.908.40401-win32-x64\bin\windows-x86_64\codex.exe
```

Explicit command:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\process-github-issues.ps1 -AgentCommand "$env:USERPROFILE\.vscode\extensions\openai.chatgpt-26.908.40401-win32-x64\bin\windows-x86_64\codex.exe"
```

Or configure the current PowerShell session:

```powershell
$env:LIFEOS_AGENT_COMMAND = "$env:USERPROFILE\.vscode\extensions\openai.chatgpt-26.908.40401-win32-x64\bin\windows-x86_64\codex.exe"
```

## Dry-run: read-only queue validation

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\process-github-issues.ps1 -DryRun
```

Dry-run does not require or invoke Codex. It makes no GitHub writes and creates no branches, worktrees, commits, or files. It lists every open `ready` issue in execution order.

## Start execution

After reviewing dry-run output:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\process-github-issues.ps1 -MaxIssues 10
```

Each issue starts from a freshly fetched `origin/main` in an isolated `agent/issue-<number>` worktree. The agent receives full issue details and is limited to that issue. The runner runs `npm install` only when needed, plus build, lint, and available tests. A failed validation receives one remediation pass from Codex, and failures are never ignored. A successful commit and non-force push of the issue branch are required before the issue is labeled `done` and closed.

## Stopping and blocked work

Use `Ctrl+C` to stop safely between commands. An interrupted issue remains `in-progress`; inspect it before relabeling it `ready` or `blocked`.

When work cannot be completed, the runner adds a clear GitHub comment, removes `in-progress`, applies `blocked`, and moves to the next ready issue. It does not retry that issue again in the same run. Failed worktrees are preserved under `.lifeos-agent-worktrees` and are never force-deleted.

## Troubleshooting

- **No coding agent found:** pass `-AgentCommand` with the full executable path or set `LIFEOS_AGENT_COMMAND`.
- **No `origin/main` baseline:** commit and push the initial repository state before normal execution.
- **Issue stays in progress:** inspect its branch/worktree, then relabel it `ready` to retry or `blocked` for human input.
- **Validation fails:** review the issue comment and preserved worktree before retrying.
