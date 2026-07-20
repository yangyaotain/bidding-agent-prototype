[CmdletBinding()]
param(
    [string]$Message = "chore: deploy prototype update",
    [switch]$CheckOnly,
    [switch]$RemoteCheckOnly,
    [ValidateRange(15, 300)]
    [int]$PagesTimeoutSeconds = 90,
    [ValidateRange(10, 120)]
    [int]$NetworkTimeoutSeconds = 45,
    [string]$PagesUrl = "https://yangyaotain.github.io/bidding-agent-prototype/"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:RepoRoot = $PSScriptRoot
$script:StrictUtf8 = [System.Text.UTF8Encoding]::new($false, $true)
$script:GitPath = $null

function Write-Step {
    param([Parameter(Mandatory = $true)][string]$Text)
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function Invoke-GitCommand {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    & $script:GitPath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git $($Arguments -join ' ')"
    }
}

function Get-GitOutput {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $output = & $script:GitPath @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git $($Arguments -join ' ')"
    }
    return (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
}

function Invoke-NetworkGit {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][int]$TimeoutSeconds
    )

    if ($Arguments | Where-Object { $_ -match "\s" }) {
        throw "Network Git arguments must not contain whitespace."
    }

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $script:GitPath
    $startInfo.Arguments = $Arguments -join " "
    $startInfo.WorkingDirectory = $script:RepoRoot
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    $timedOut = $false

    try {
        [void]$process.Start()
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
            $timedOut = $true
            try {
                $process.Kill()
                $process.WaitForExit()
            } catch {
                # The process may have exited between the timeout and Kill().
            }
        } else {
            $process.WaitForExit()
        }

        $stdout = [string]$stdoutTask.Result
        $stderr = [string]$stderrTask.Result
        $exitCode = if ($timedOut) { 124 } else { $process.ExitCode }

        if ($stdout.Trim()) {
            Write-Host $stdout.Trim()
        }
        if ($stderr.Trim()) {
            Write-Host $stderr.Trim()
        }

        return [pscustomobject]@{
            Success  = (-not $timedOut -and $exitCode -eq 0)
            TimedOut = $timedOut
            ExitCode = $exitCode
            Output   = $stdout.Trim()
            Error    = $stderr.Trim()
        }
    } finally {
        $process.Dispose()
    }
}

function Get-Divergence {
    param([Parameter(Mandatory = $true)][string]$Branch)

    $value = Get-GitOutput @("rev-list", "--left-right", "--count", "HEAD...origin/$Branch")
    $parts = @($value -split "\s+" | Where-Object { $_ })
    if ($parts.Count -ne 2) {
        throw "Unable to parse branch divergence: $value"
    }
    return [pscustomobject]@{
        Ahead  = [int]$parts[0]
        Behind = [int]$parts[1]
    }
}

function Resolve-NodePath {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCommand) {
        return $nodeCommand.Source
    }

    $bundledNode = "C:\Users\Yangy\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
    if (Test-Path -LiteralPath $bundledNode) {
        return $bundledNode
    }

    throw "Node.js was not found on PATH or in the bundled Codex runtime."
}

function Test-StaticPrototype {
    Write-Step "Running static validation"

    Invoke-GitCommand @("diff", "--check")
    Invoke-GitCommand @("diff", "--cached", "--check")

    $nodePath = Resolve-NodePath
    $jsFiles = @(
        Get-ChildItem -Path $script:RepoRoot -Recurse -File -Filter "*.js" |
            Where-Object { $_.FullName -notmatch "[\\/](\.git|\.codex-submit-test|node_modules)[\\/]" }
    )
    foreach ($file in $jsFiles) {
        & $nodePath --check $file.FullName
        if ($LASTEXITCODE -ne 0) {
            throw "JavaScript syntax check failed: $($file.FullName)"
        }
    }

    $textExtensions = @(".html", ".css", ".js", ".md", ".json", ".txt", ".svg", ".ps1")
    $textFiles = @(
        Get-ChildItem -Path $script:RepoRoot -Recurse -File |
            Where-Object {
                $_.Extension -in $textExtensions -and
                $_.FullName -notmatch "[\\/](\.git|\.codex-submit-test|node_modules)[\\/]"
            }
    )
    foreach ($file in $textFiles) {
        try {
            [void]$script:StrictUtf8.GetString([System.IO.File]::ReadAllBytes($file.FullName))
        } catch {
            throw "UTF-8 validation failed: $($file.FullName)"
        }
    }

    $cssFiles = @(
        Get-ChildItem -Path $script:RepoRoot -Recurse -File -Filter "*.css" |
            Where-Object { $_.FullName -notmatch "[\\/](\.git|\.codex-submit-test|node_modules)[\\/]" }
    )
    foreach ($file in $cssFiles) {
        $content = [System.IO.File]::ReadAllText($file.FullName, $script:StrictUtf8)
        $openCount = ([regex]::Matches($content, "\{")).Count
        $closeCount = ([regex]::Matches($content, "\}")).Count
        if ($openCount -ne $closeCount) {
            throw "CSS brace mismatch: $($file.FullName) open=$openCount close=$closeCount"
        }
    }

    $htmlFiles = @(
        Get-ChildItem -Path $script:RepoRoot -Recurse -File -Filter "*.html" |
            Where-Object { $_.FullName -notmatch "[\\/](\.git|\.codex-submit-test|node_modules)[\\/]" }
    )
    $missingReferences = @()
    foreach ($file in $htmlFiles) {
        $content = [System.IO.File]::ReadAllText($file.FullName, $script:StrictUtf8)
        foreach ($tag in @("html", "body")) {
            $openCount = ([regex]::Matches($content, "<$tag(?:\s|>)", "IgnoreCase")).Count
            $closeCount = ([regex]::Matches($content, "</$tag\s*>", "IgnoreCase")).Count
            if ($openCount -ne 1 -or $closeCount -ne 1) {
                throw "HTML structure check failed: $($file.FullName) tag=$tag open=$openCount close=$closeCount"
            }
        }

        $matches = [regex]::Matches(
            $content,
            '(?:href|src)\s*=\s*["'']([^"'']+\.(?:css|js)(?:[?#][^"'']*)?)["'']',
            "IgnoreCase"
        )
        foreach ($match in $matches) {
            $reference = ($match.Groups[1].Value -split "[?#]")[0]
            if ($reference -match "^(?:https?:|//|data:|javascript:)") {
                continue
            }
            $target = if ($reference.StartsWith("/")) {
                Join-Path $script:RepoRoot $reference.TrimStart("/")
            } else {
                Join-Path $file.DirectoryName $reference
            }
            if (-not (Test-Path -LiteralPath $target)) {
                $missingReferences += "$($file.FullName) -> $reference"
            }
        }
    }
    if ($missingReferences.Count -gt 0) {
        throw "Missing local HTML CSS/JS references:`n$($missingReferences -join "`n")"
    }

    Write-Host "JS_CHECK_OK=$($jsFiles.Count)"
    Write-Host "UTF8_CHECK_OK=$($textFiles.Count)"
    Write-Host "CSS_BRACE_CHECK_OK=$($cssFiles.Count)"
    Write-Host "HTML_STRUCTURE_REF_CHECK_OK=$($htmlFiles.Count)"
}

function Get-NormalizedUtf8Hash {
    param([Parameter(Mandatory = $true)][byte[]]$Bytes)

    $text = $script:StrictUtf8.GetString($Bytes)
    $normalized = $text.Replace("`r`n", "`n").Replace("`r", "`n")
    $normalizedBytes = [System.Text.Encoding]::UTF8.GetBytes($normalized)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        return [BitConverter]::ToString($sha.ComputeHash($normalizedBytes)).Replace("-", "")
    } finally {
        $sha.Dispose()
    }
}

function Get-RemoteBytes {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$TimeoutMilliseconds = 20000
    )

    $request = [System.Net.HttpWebRequest]::Create($Url)
    $request.Method = "GET"
    $request.Timeout = $TimeoutMilliseconds
    $request.ReadWriteTimeout = $TimeoutMilliseconds
    $request.UserAgent = "Bidding-Agent-Prototype-Deploy"
    $request.Headers["Cache-Control"] = "no-cache"

    $response = $null
    $stream = $null
    $memory = [System.IO.MemoryStream]::new()
    try {
        $response = $request.GetResponse()
        if ([int]$response.StatusCode -ne 200) {
            throw "HTTP $([int]$response.StatusCode)"
        }
        $stream = $response.GetResponseStream()
        $stream.CopyTo($memory)
        return $memory.ToArray()
    } finally {
        if ($stream) {
            $stream.Dispose()
        }
        if ($response) {
            $response.Dispose()
        }
        $memory.Dispose()
    }
}

function Get-VerificationFiles {
    param([Parameter(Mandatory = $true)][string[]]$ChangedFiles)

    $webFiles = @(
        $ChangedFiles |
            Where-Object { [System.IO.Path]::GetExtension($_).ToLowerInvariant() -in @(".html", ".js", ".css") } |
            Where-Object { Test-Path -LiteralPath (Join-Path $script:RepoRoot $_) } |
            Select-Object -Unique
    )
    $selected = @()
    foreach ($extension in @(".html", ".js", ".css")) {
        $candidate = $webFiles |
            Where-Object { [System.IO.Path]::GetExtension($_).ToLowerInvariant() -eq $extension } |
            Select-Object -First 1
        if ($candidate) {
            $selected += $candidate
        }
    }
    if ($selected.Count -lt 3) {
        $selected += @($webFiles | Where-Object { $_ -notin $selected } | Select-Object -First (3 - $selected.Count))
    }
    return @($selected | Select-Object -Unique)
}

function Test-PagesDeployment {
    param(
        [Parameter(Mandatory = $true)][string[]]$Files,
        [Parameter(Mandatory = $true)][string]$Commit,
        [Parameter(Mandatory = $true)][int]$TimeoutSeconds
    )

    if ($Files.Count -eq 0) {
        Write-Host "No changed HTML/CSS/JS files; Pages content hash check skipped."
        return
    }

    Write-Step "Waiting for GitHub Pages content"
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    $shortCommit = $Commit.Substring(0, [Math]::Min(8, $Commit.Length))
    $baseUrl = $PagesUrl.TrimEnd("/") + "/"

    while ($true) {
        $allMatched = $true
        $rows = @()

        foreach ($file in $Files) {
            $localPath = Join-Path $script:RepoRoot $file
            $localBytes = [System.IO.File]::ReadAllBytes($localPath)
            $localHash = Get-NormalizedUtf8Hash -Bytes $localBytes
            $encodedPath = (($file -replace "\\", "/") -split "/" |
                ForEach-Object { [Uri]::EscapeDataString($_) }) -join "/"
            $url = "$baseUrl$encodedPath?v=$shortCommit"

            try {
                $remoteBytes = Get-RemoteBytes -Url $url
                $remoteHash = Get-NormalizedUtf8Hash -Bytes $remoteBytes
                $matched = $localHash -eq $remoteHash
                if (-not $matched) {
                    $allMatched = $false
                }
                $rows += [pscustomobject]@{
                    File       = $file
                    Http       = 200
                    LocalBytes = $localBytes.Length
                    RemoteBytes = $remoteBytes.Length
                    HashMatch  = $matched
                }
            } catch {
                $allMatched = $false
                $rows += [pscustomobject]@{
                    File       = $file
                    Http       = "pending"
                    LocalBytes = $localBytes.Length
                    RemoteBytes = 0
                    HashMatch  = $false
                }
            }
        }

        if ($allMatched) {
            $rows | Format-Table -AutoSize
            Write-Host "PAGES_CONTENT_OK=$shortCommit"
            return
        }

        if ([DateTime]::UtcNow -ge $deadline) {
            $rows | Format-Table -AutoSize
            throw "GitHub Pages did not publish the current content within $TimeoutSeconds seconds."
        }

        Write-Host "Pages is not current yet; retrying in 5 seconds..."
        Start-Sleep -Seconds 5
    }
}

$originalLocation = Get-Location
try {
    Set-Location -LiteralPath $script:RepoRoot

    $gitCommand = Get-Command git -ErrorAction SilentlyContinue
    if (-not $gitCommand) {
        throw "Git was not found on PATH."
    }
    $script:GitPath = $gitCommand.Source

    if (-not (Test-Path -LiteralPath (Join-Path $script:RepoRoot ".git"))) {
        throw "The project is not a Git repository."
    }

    $branch = Get-GitOutput @("branch", "--show-current")
    if ($branch -ne "main") {
        throw "Release must run from main; current branch is '$branch'."
    }
    [void](Get-GitOutput @("remote", "get-url", "origin"))

    if ($CheckOnly -and $RemoteCheckOnly) {
        throw "Use either -CheckOnly or -RemoteCheckOnly, not both."
    }

    if (-not $CheckOnly) {
        Write-Step "Checking origin/main with the default Git TLS backend"
        $fetch = Invoke-NetworkGit -Arguments @("fetch", "origin", $branch) -TimeoutSeconds $NetworkTimeoutSeconds
        if (-not $fetch.Success) {
            Write-Warning "Fetch failed once; using one lightweight ls-remote fallback."
            $remoteProbe = Invoke-NetworkGit `
                -Arguments @("ls-remote", "origin", "refs/heads/$branch") `
                -TimeoutSeconds ([Math]::Min(30, $NetworkTimeoutSeconds))
            if (-not $remoteProbe.Success) {
                throw "Unable to verify origin/main. Stop here instead of switching to API or credential workarounds."
            }

            $remoteSha = @($remoteProbe.Output -split "\s+" | Where-Object { $_ })[0]
            $trackingSha = Get-GitOutput @("rev-parse", "origin/$branch")
            if ($remoteSha -ne $trackingSha) {
                throw "origin/main changed, but fetch failed. Retry after the GitHub connection recovers."
            }
        }

        $divergence = Get-Divergence -Branch $branch
        if ($divergence.Behind -gt 0) {
            Write-Step "Rebasing local work onto origin/main"
            $pull = Invoke-NetworkGit `
                -Arguments @("pull", "--rebase", "--autostash", "origin", $branch) `
                -TimeoutSeconds ([Math]::Max(60, $NetworkTimeoutSeconds))
            if (-not $pull.Success) {
                throw "Rebase failed. Resolve the repository state manually; no push was attempted."
            }
            $divergence = Get-Divergence -Branch $branch
        }
        if ($divergence.Behind -gt 0) {
            throw "The local branch is still behind origin/main."
        }
        Write-Host "AHEAD_BEHIND=$($divergence.Ahead) $($divergence.Behind)"

        if ($RemoteCheckOnly) {
            Write-Host ""
            Write-Host "REMOTE_CHECK_OK" -ForegroundColor Green
            return
        }
    }

    Write-Step "Reviewing workspace changes"
    Invoke-GitCommand @("status", "--short", "--branch")
    Invoke-GitCommand @("diff", "--stat")

    Test-StaticPrototype

    if ($CheckOnly) {
        Write-Host ""
        Write-Host "CHECK_ONLY_OK" -ForegroundColor Green
        return
    }

    Write-Step "Staging release files"
    Invoke-GitCommand @("add", "-A")
    Invoke-GitCommand @("diff", "--cached", "--check")

    & $script:GitPath diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host "No changes to commit."
        return
    }
    if ($LASTEXITCODE -ne 1) {
        throw "Unable to determine whether staged changes exist."
    }

    $changedOutput = Get-GitOutput @("diff", "--cached", "--name-only", "--diff-filter=ACMRT")
    $changedFiles = @($changedOutput -split "`n" | Where-Object { $_ })
    $verificationFiles = Get-VerificationFiles -ChangedFiles $changedFiles

    Write-Step "Creating commit"
    Invoke-GitCommand @("commit", "-m", $Message)
    $head = Get-GitOutput @("rev-parse", "HEAD")
    Write-Host "COMMIT=$head"
    Write-Host "MESSAGE=$Message"

    Write-Step "Pushing main with the default Git TLS backend"
    $push = Invoke-NetworkGit -Arguments @("push", "origin", $branch) -TimeoutSeconds ([Math]::Max(60, $NetworkTimeoutSeconds))
    if (-not $push.Success) {
        Write-Warning "Push did not report success; checking the remote hash before deciding whether it failed."
    }

    $remoteCheck = Invoke-NetworkGit `
        -Arguments @("ls-remote", "origin", "refs/heads/$branch") `
        -TimeoutSeconds ([Math]::Min(30, $NetworkTimeoutSeconds))
    if ($remoteCheck.Success) {
        $remoteHead = @($remoteCheck.Output -split "\s+" | Where-Object { $_ })[0]
        if ($remoteHead -ne $head) {
            throw "Remote main is $remoteHead, expected $head. The release was not deployed."
        }
        $trackingHead = Get-GitOutput @("rev-parse", "origin/$branch")
        if ($trackingHead -ne $head) {
            Invoke-GitCommand @("update-ref", "refs/remotes/origin/$branch", $head)
        }
    } elseif (-not $push.Success) {
        throw "Push and remote verification both failed."
    } else {
        Write-Warning "Push succeeded, but ls-remote verification was unavailable; Pages content verification will decide the result."
    }

    $finalDivergence = Get-Divergence -Branch $branch
    Write-Host "AHEAD_BEHIND=$($finalDivergence.Ahead) $($finalDivergence.Behind)"
    if ($finalDivergence.Ahead -ne 0 -or $finalDivergence.Behind -ne 0) {
        throw "Local main is not aligned with origin/main after push."
    }

    Test-PagesDeployment `
        -Files $verificationFiles `
        -Commit $head `
        -TimeoutSeconds $PagesTimeoutSeconds

    Write-Host ""
    Write-Host "DEPLOY_OK=$head" -ForegroundColor Green
    Write-Host "PAGES_URL=$PagesUrl"
} finally {
    Set-Location -LiteralPath $originalLocation
}
