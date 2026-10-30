$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if ([System.Environment]::OSVersion.Platform -ne 'Win32NT') { throw 'Build app-image này cần Windows 10/11 x64.' }
if ((& javac -version) -notmatch '21\.') {
    throw 'Cần JDK 21 trên PATH.'
}
& .\mvnw.cmd clean package
if ($LASTEXITCODE -ne 0) { throw 'Maven build thất bại.' }
& .\mvnw.cmd dependency:copy-dependencies '-DincludeScope=runtime' '-DoutputDirectory=target\package-input'
if ($LASTEXITCODE -ne 0) { throw 'Không sao chép được dependencies.' }
Copy-Item 'target\nihongoquest-1.0-SNAPSHOT.jar' 'target\package-input\'
$modules = 'java.base,java.desktop,java.logging,java.sql,java.naming,java.net.http,jdk.unsupported,jdk.crypto.ec'
& jpackage --type app-image --name NihongoQuest --dest target\windows-app-image `
    --input target\package-input --main-jar nihongoquest-1.0-SNAPSHOT.jar `
    --main-class com.nihongoquest.client.ClientLauncher --add-modules $modules `
    --java-options '--enable-native-access=ALL-UNNAMED'
if ($LASTEXITCODE -ne 0) { throw 'jpackage thất bại.' }
& jpackage --type app-image --name NihongoQuestServer --dest target\windows-app-image `
    --input target\package-input --main-jar nihongoquest-1.0-SNAPSHOT.jar `
    --main-class com.nihongoquest.server.ServerLauncher --add-modules $modules `
    --java-options '--enable-native-access=ALL-UNNAMED'
if ($LASTEXITCODE -ne 0) { throw 'jpackage server thất bại.' }
Copy-Item 'src\main\resources\licenses' 'target\windows-app-image\NihongoQuest\licenses' -Recurse
Copy-Item 'src\main\resources\licenses' 'target\windows-app-image\NihongoQuestServer\licenses' -Recurse
Write-Host 'App images: target\windows-app-image\NihongoQuest và NihongoQuestServer'
