[CmdletBinding()]
param(
  [ValidateRange(1, 10)] [int] $MaxIssues = 10,
  [switch] $InitializeLabels,
  [switch] $DryRun,
  [string] $AgentCommand = $env:LIFEOS_AGENT_COMMAND
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

function Get-ReadyIssues {
  $json = & gh issue list --state open --label ready --limit 100 --json number,title,createdAt
  if ($LASTEXITCODE -ne 0) { throw 'Unable to read GitHub Issues.' }
  $issues = ($json -join "`n") | ConvertFrom-Json
  return @($issues | Sort-Object { [datetime]$_.createdAt })
}

function Get-OldestReadyIssue {
  return Get-ReadyIssues | Select-Object -First 1
}

function Invoke-ProjectChecks {
  param([string] $WorkingDirectory)
  $packageFiles = Get-ChildItem -Path $WorkingDirectory -Recurse -File -Filter package.json |
    Where-Object { $_.FullName -notmatch '[\\/]node_modules[\\/]' }
  foreach ($packageFile in $packageFiles) {
    $packageDirectory = $packageFile.Directory.FullName
    $package = Get-Content $packageFile.FullName -Raw | ConvertFrom-Json
    if (-not (Test-Path (Join-Path $packageDirectory 'node_modules'))) { Write-Host "Installing dependencies: $packageDirectory"; Invoke-RequiredCommand 'npm' @('install') $packageDirectory }
    if ($package.scripts.build) { Invoke-RequiredCommand 'npm' @('run', 'build') $packageDirectory; Write-Host 'Build passed.' }
    if ($package.scripts.lint) { Invoke-RequiredCommand 'npm' @('run', 'lint') $packageDirectory; Write-Host 'Lint passed.' }
    if ($package.scripts.test) { Invoke-RequiredCommand 'npm' @('run', 'test', '--', '--run') $packageDirectory; Write-Host 'Tests passed.' }
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

function Resolve-CodingAgentCommand {
  param([string] $ConfiguredCommand)

  if (-not [string]::IsNullOrWhiteSpace($ConfiguredCommand)) {
    if (Test-Path -LiteralPath $ConfiguredCommand -PathType Leaf) { return (Resolve-Path -LiteralPath $ConfiguredCommand).Path }
    $configuredExecutable = Get-Command $ConfiguredCommand -ErrorAction SilentlyContinue
    if ($configuredExecutable) { return $configuredExecutable.Source }
    throw "Configured coding agent command '$ConfiguredCommand' was not found. Set LIFEOS_AGENT_COMMAND or pass -AgentCommand with the full path to codex.exe."
  }

  # The Codex CLI bundled with the ChatGPT VS Code extension is the most reliable local option on this Windows setup.
  $bundledCodex = Get-ChildItem -Path (Join-Path $env:USERPROFILE '.vscode\extensions\openai.chatgpt-*\bin\windows-x86_64\codex.exe') -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($bundledCodex) { return $bundledCodex.FullName }

  $globalCodex = Get-Command 'codex' -ErrorAction SilentlyContinue
  if ($globalCodex) { return $globalCodex.Source }

  $available = @()
  if (Get-Command 'cursor' -ErrorAction SilentlyContinue) { $available += 'Cursor CLI (not compatible with this Codex runner)' }
  $detected = if ($available.Count) { " Detected: $($available -join ', ')." } else { '' }
  throw "No compatible Codex CLI was found.$detected Set LIFEOS_AGENT_COMMAND or pass -AgentCommand with the full path to codex.exe."
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'GitHub CLI (gh) is required. Install it and run gh auth login first.' }
if (-not (& gh auth status 2>$null)) { throw 'GitHub CLI is not authenticated. Run gh auth login first.' }
Set-Location $repoRoot

if ($DryRun) {
  $queuedIssues = Get-ReadyIssues
  Write-Host "Queue found: $($queuedIssues.Count) ready issue(s)."
  if ($queuedIssues.Count) { $queuedIssues | ForEach-Object { Write-Host "  #$($_.number)  $($_.title)  [$($_.createdAt)]" } }
  else { Write-Host 'No open issues are labeled ready.' }
  exit 0
}
if ($InitializeLabels) { Ensure-Labels; Write-Host 'Issue labels are initialized.'; exit 0 }
Ensure-Labels
$AgentCommand = Resolve-CodingAgentCommand $AgentCommand
Write-Host "Coding agent command: $AgentCommand"
& git -C $repoRoot show-ref --verify --quiet refs/remotes/origin/main
if ($LASTEXITCODE -ne 0) { throw 'A pushed origin/main baseline is required. Commit and push the project before starting autonomous execution.' }
$baselineRef = 'origin/main'

New-Item -ItemType Directory -Force -Path $worktreeRoot | Out-Null
$processed = 0
$failedIssues = @{}
while ($processed -lt $MaxIssues) {
  $issue = Get-OldestReadyIssue
  if (-not $issue) { Write-Host 'No open issues are labeled ready.'; break }
  $processed++
  $issueNumber = [int]$issue.number
  if ($failedIssues.ContainsKey($issueNumber)) { throw "Issue #$issueNumber has already failed during this run; stopping to avoid repeated attempts." }
  Write-Host "Starting issue #${issueNumber}: $($issue.title)"
  $branch = "agent/issue-$issueNumber"
  $worktree = Join-Path $worktreeRoot "issue-$issueNumber"

  try {
    if (Test-Path $worktree) { throw "Worktree already exists: $worktree. Inspect it before retrying this issue." }
    Invoke-RequiredCommand 'gh' @('issue', 'edit', "$issueNumber", '--remove-label', 'ready', '--add-label', 'in-progress')
    Invoke-RequiredCommand 'git' @('fetch', 'origin')
    Invoke-RequiredCommand 'git' @('worktree', 'add', '-b', $branch, $worktree, $baselineRef)
    Write-Host "Branch created: $branch"
    $issueDetails = & gh issue view $issueNumber --json title,body
    if ($LASTEXITCODE -ne 0) { throw 'Unable to read the full issue.' }
    $agentPrompt = @"
Repository context: fmaslim/LifeOS. Working directory: $worktree. Read the existing code and project documentation before changing anything.

Work only on GitHub issue #${issueNumber}. Full issue title, body, labels, and acceptance criteria follow:
$issueDetails

Implement the issue completely in this worktree. Do not modify secrets, credentials, production infrastructure, authentication, databases, or external systems. Stop without committing if the requested change is destructive or ambiguous and explain why in your final response. Run the relevant checks and fix every failure. When successful, commit the completed change with a concise message. Do not push or edit GitHub issue labels; the runner handles those steps.
"@
    Write-Host 'Agent running.'
    Invoke-RequiredCommand $AgentCommand @('exec', '--cd', $worktree, '--sandbox', 'workspace-write', '--ask-for-approval', 'never', $agentPrompt) $repoRoot
    for ($validationAttempt = 1; $validationAttempt -le 2; $validationAttempt++) {
      try { Invoke-ProjectChecks $worktree; break }
      catch {
        if ($validationAttempt -eq 2) { throw }
        $repairPrompt = "Validation failed for GitHub issue #$issueNumber. Fix the failure below in the current worktree, rerun the relevant checks, and amend or create the required commit. Do not push. Failure: $($_.Exception.Message)"
        Write-Host 'Validation failed; asking agent to fix and retry once.'
        Invoke-RequiredCommand $AgentCommand @('exec', '--cd', $worktree, '--sandbox', 'workspace-write', '--ask-for-approval', 'never', $repairPrompt) $repoRoot
      }
    }
    $commitCount = [int](& git -C $worktree rev-list --count "$baselineRef..HEAD")
    if ($commitCount -lt 1) { throw 'The agent completed without creating a commit.' }
    Write-Host 'Commit created.'
    Invoke-RequiredCommand 'git' @('-C', $worktree, 'push', '--set-upstream', 'origin', $branch)
    Write-Host 'Branch pushed.'
    Complete-Issue $issueNumber
    Invoke-RequiredCommand 'git' @('worktree', 'remove', $worktree)
    Write-Host "Issue completed: #$issueNumber."
  }
  catch {
    $reason = $_.Exception.Message
    $failedIssues[$issueNumber] = $true
    Write-Warning "Issue #$issueNumber blocked: $reason"
    try { Mark-Blocked $issueNumber $reason } catch { Write-Warning "Could not update GitHub issue #${issueNumber}: $($_.Exception.Message)" }
    # Keep failed worktrees for inspection; they are never force-deleted by this runner.
  }
  if ($processed -lt $MaxIssues) { Write-Host 'Moving to next issue.' }
}
Write-Host "Run finished after processing $processed issue(s)."
