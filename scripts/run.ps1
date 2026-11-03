[CmdletBinding()]
param(
    [ValidateSet('server', 'client', 'test')]
    [string]$Mode,
    [string]$ServerHost = '',
    [int]$ServerPort = 0
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Find-Jdk21 {
    $candidates = @()
    if ($env:JAVA_HOME) { $candidates += $env:JAVA_HOME }
    $candidates += Get-ChildItem "$env:USERPROFILE\.jdks" -Directory -ErrorAction SilentlyContinue |
        Where-Object Name -Match '21' | Select-Object -ExpandProperty FullName
    $candidates += Get-ChildItem "$env:ProgramFiles\Eclipse Adoptium" -Directory -ErrorAction SilentlyContinue |
        Where-Object Name -Match 'jdk-21' | Select-Object -ExpandProperty FullName
    $candidates += Get-ChildItem "$env:ProgramFiles\Java" -Directory -ErrorAction SilentlyContinue |
        Where-Object Name -Match 'jdk-21' | Select-Object -ExpandProperty FullName

    foreach ($candidate in $candidates | Select-Object -Unique) {
        $java = Join-Path $candidate 'bin\java.exe'
        if (!(Test-Path $java)) { continue }
        # Java writes version information to stderr. Windows PowerShell 5.1 turns
        # that into NativeCommandError when ErrorActionPreference is Stop.
        $previousPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = 'Continue'
            $version = (& $java -version 2>&1 | Select-Object -First 1) -join ''
        } finally {
            $ErrorActionPreference = $previousPreference
        }
        if ($version -match 'version "21[\.]') { return $candidate }
    }
    throw 'JDK 21 not found. Install JDK 21 or set JAVA_HOME to a JDK 21 folder.'
}

if ([string]::IsNullOrWhiteSpace($Mode)) {
    Write-Host 'NihongoQuest launcher'
    Write-Host '  1. server - start Server Dashboard'
    Write-Host '  2. client - start player application'
    Write-Host '  3. test   - run all tests'
    $choice = Read-Host 'Choose 1, 2 or 3'
    $Mode = switch ($choice) {
        '1' { 'server' }
        '2' { 'client' }
        '3' { 'test' }
        default { throw 'Invalid choice.' }
    }
}

$jdk = Find-Jdk21
$env:JAVA_HOME = $jdk
$env:PATH = "$(Join-Path $jdk 'bin');$env:PATH"

if ($Mode -eq 'client') {
    if ($ServerHost) { $env:NIHONGO_SERVER_HOST = $ServerHost }
    if ($ServerPort -gt 0) { $env:NIHONGO_SERVER_PORT = $ServerPort.ToString() }
    $displayHost = if ($env:NIHONGO_SERVER_HOST) { $env:NIHONGO_SERVER_HOST } else { 'localhost' }
    $displayPort = if ($env:NIHONGO_SERVER_PORT) { $env:NIHONGO_SERVER_PORT } else { '5000' }
    Write-Host "Client connecting to ${displayHost}:${displayPort}"
}

Set-Location $root
switch ($Mode) {
    'server' { & .\mvnw.cmd -q -Pserver-dashboard javafx:run }
    'client' { & .\mvnw.cmd -q javafx:run }
    'test'   { & .\mvnw.cmd clean test }
}
exit $LASTEXITCODE
