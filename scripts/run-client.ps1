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
        $version = (& $java -version 2>&1 | Select-Object -First 1) -join ''
        if ($version -match 'version "21[\.]') { return $candidate }
    }
    throw 'Không tìm thấy JDK 21. Hãy cài JDK 21 hoặc đặt JAVA_HOME tới JDK 21.'
}

$jdk = Find-Jdk21
$env:JAVA_HOME = $jdk
$env:PATH = "$(Join-Path $jdk 'bin');$env:PATH"
Set-Location $root
& .\mvnw.cmd -q javafx:run
exit $LASTEXITCODE
