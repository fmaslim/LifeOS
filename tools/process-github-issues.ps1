[CmdletBinding()]
param(
  [ValidateRange(1, 10)] [int] $MaxIssues = 10,
  [switch] $InitializeLabels,
  [switch] $DryRun,
  [string] $AgentCommand = 'codex'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$worktreeRoot = Join-Path $repoRoot '.lifeos-agent-worktrees'
$labels = @(
  @{ Name = 'ready'; Color = '0e8a16'; Description = 'Ready for autonomous agent execution' },
  @{ Name = 'in-progress'; Color = 'fbca04'; Description = 'Currently being handled by the agent' },
  @{ Name = 'blocked'; Color = 'd93f0b'; Description = 'Needs a human decision or intervention' },
  @{ Name = 'done'; Color = '5319e7'; Description = 'Completed by the autonomous agent' }
)

function Invoke-RequiredCommand {
  param([string] $FilePath, [string[]] $Arguments, [string] $WorkingDirectory = $repoRoot)
  Push-Location $WorkingDirectory
  try { & $FilePath @Arguments; if ($LASTEXITCODE -ne 0) { throw "Command failed: $FilePath $($Arguments -join ' ')" } }
  finally { Pop-Location }
}

function Ensure-Labels {
  foreach ($label in $labels) {
    # --force updates the expected state without touching any unrelated repository labels.
    Invoke-RequiredCommand 'gh' @('label', 'create', $label.Name, '--color', $label.Color, '--description', $label.Description, '--force')
  }
}

function Get-OldestReadyIssue {
  $json = & gh issue list --state open --label ready --limit 100 --json number,title,createdAt
  if ($LASTEXITCODE -ne 0) { throw 'Unable to read GitHub Issues.' }
  $issues = $json | ConvertFrom-Json
  return @($issues | Sort-Object { [datetime]$_.createdAt }) | Select-Object -First 1
}

function Invoke-ProjectChecks {
  param([string] $WorkingDirectory)
  $packageFiles = Get-ChildItem -Path $WorkingDirectory -Recurse -File -Filter package.json |
    Where-Object { $_.FullName -notmatch '[\\/]node_modules[\\/]' }
  foreach ($packageFile in $packageFiles) {
    $packageDirectory = $packageFile.Directory.FullName
    $package = Get-Content $packageFile.FullName -Raw | ConvertFrom-Json
    if (-not (Test-Path (Join-Path $packageDirectory 'node_modules'))) { Invoke-RequiredCommand 'npm' @('install') $packageDirectory }
    if ($package.scripts.build) { Invoke-RequiredCommand 'npm' @('run', 'build') $packageDirectory }
    if ($package.scripts.lint) { Invoke-RequiredCommand 'npm' @('run', 'lint') $packageDirectory }
    if ($package.scripts.test) { Invoke-RequiredCommand 'npm' @('run', 'test', '--', '--run') $packageDirectory }
  }
}

function Mark-Blocked {
  param([int] $IssueNumber, [string] $Reason)
  $comment = "Autonomous issue runner blocked this issue.``n``nReason: $Reason``n``nNo failing validation step was silently ignored. A human decision is required before relabeling this issue as `ready`."
  Invoke-RequiredCommand 'gh' @('issue', 'edit', "$IssueNumber", '--remove-label', 'in-progress', '--add-label', 'blocked', '--comment', $comment)
}

function Complete-Issue {
  param([int] $IssueNumber)
  Invoke-RequiredCommand 'gh' @('issue', 'edit', "$IssueNumber", '--remove-label', 'in-progress', '--add-label', 'done', '--close')
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'GitHub CLI (gh) is required. Install it and run gh auth login first.' }
if (-not (Get-Command $AgentCommand -ErrorAction SilentlyContinue)) { throw "Coding agent command '$AgentCommand' was not found." }
if (-not (& gh auth status 2>$null)) { throw 'GitHub CLI is not authenticated. Run gh auth login first.' }
Set-Location $repoRoot

Ensure-Labels
if ($InitializeLabels) { Write-Host 'Issue labels are initialized.'; exit 0 }
if ($DryRun) {
  $nextIssue = Get-OldestReadyIssue
  if ($nextIssue) { Write-Host "Runner is ready. Next issue: #$($nextIssue.number) - $($nextIssue.title)" }
  else { Write-Host 'Runner is ready. No open issues are labeled ready.' }
  exit 0
}
& git -C $repoRoot show-ref --verify --quiet refs/remotes/origin/main
if ($LASTEXITCODE -ne 0) { throw 'A pushed origin/main baseline is required. Commit and push the project before starting autonomous execution.' }
$baselineRef = 'origin/main'

New-Item -ItemType Directory -Force -Path $worktreeRoot | Out-Null
$processed = 0
while ($processed -lt $MaxIssues) {
  $issue = Get-OldestReadyIssue
  if (-not $issue) { Write-Host 'No open issues are labeled ready.'; break }
  $processed++
  $issueNumber = [int]$issue.number
  $branch = "agent/issue-$issueNumber"
  $worktree = Join-Path $worktreeRoot "issue-$issueNumber"

  try {
    if (Test-Path $worktree) { throw "Worktree already exists: $worktree. Inspect it before retrying this issue." }
    Invoke-RequiredCommand 'gh' @('issue', 'edit', "$issueNumber", '--remove-label', 'ready', '--add-label', 'in-progress')
    Invoke-RequiredCommand 'git' @('fetch', 'origin')
    Invoke-RequiredCommand 'git' @('worktree', 'add', '-b', $branch, $worktree, $baselineRef)
    $issueDetails = & gh issue view $issueNumber --json title,body
    if ($LASTEXITCODE -ne 0) { throw 'Unable to read the full issue.' }
    $agentPrompt = @"
Work only on GitHub issue #${issueNumber}: $issueDetails

Implement the issue completely in this worktree. Do not modify secrets, credentials, production infrastructure, authentication, databases, or external systems. Stop without committing if the requested change is destructive or ambiguous and explain why in your final response. Run the relevant checks and fix every failure. When successful, commit the completed change with a concise message. Do not push or edit GitHub issue labels; the runner handles those steps.
"@
    Invoke-RequiredCommand $AgentCommand @('exec', '--cd', $worktree, '--sandbox', 'workspace-write', '--ask-for-approval', 'never', $agentPrompt) $repoRoot
    Invoke-ProjectChecks $worktree
    $commitCount = [int](& git -C $worktree rev-list --count "$baselineRef..HEAD")
    if ($commitCount -lt 1) { throw 'The agent completed without creating a commit.' }
    Invoke-RequiredCommand 'git' @('-C', $worktree, 'push', '--set-upstream', 'origin', $branch)
    Complete-Issue $issueNumber
    Invoke-RequiredCommand 'git' @('worktree', 'remove', $worktree)
    Write-Host "Completed issue #$issueNumber."
  }
  catch {
    $reason = $_.Exception.Message
    Write-Warning "Issue #$issueNumber blocked: $reason"
    try { Mark-Blocked $issueNumber $reason } catch { Write-Warning "Could not update GitHub issue #${issueNumber}: $($_.Exception.Message)" }
    # Keep failed worktrees for inspection; they are never force-deleted by this runner.
  }
}
Write-Host "Run finished after processing $processed issue(s)."
