param([switch]$Build)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$jarFile = Join-Path $projectRoot 'target\meiye-live-1.0.0.jar'

if ($env:JAVA_HOME) {
    $javaCommand = Join-Path $env:JAVA_HOME 'bin\java.exe'
    if (-not (Test-Path -LiteralPath $javaCommand)) {
        throw 'JAVA_HOME must point to an installed JDK 21 or newer.'
    }
} else {
    $javaInfo = Get-Command java -ErrorAction SilentlyContinue
    if (-not $javaInfo) { throw 'Install JDK 21 or newer and set JAVA_HOME or add java to PATH.' }
    $javaCommand = $javaInfo.Source
}
$versionOutput = & $javaCommand --version 2>&1
$versionExitCode = $LASTEXITCODE
$javaVersion = ($versionOutput | Select-Object -First 1).ToString()
$versionMatch = [regex]::Match($javaVersion, '(?:openjdk|java)\s+(\d+)')
if ($versionExitCode -ne 0 -or -not $versionMatch.Success -or [int]$versionMatch.Groups[1].Value -lt 21) {
    throw "JDK 21 or newer is required. Detected: $javaVersion"
}

Push-Location $projectRoot
try {
    if ($Build -or -not (Test-Path -LiteralPath $jarFile)) {
        $mavenInfo = Get-Command mvn.cmd,mvn -ErrorAction SilentlyContinue | Select-Object -First 1
        $mvnCmd = if ($mavenInfo) { $mavenInfo.Source } elseif (Test-Path 'D:\JetBrains\IntelliJ IDEA 2022.2.5\plugins\maven\lib\maven3\bin\mvn.cmd') { 'D:\JetBrains\IntelliJ IDEA 2022.2.5\plugins\maven\lib\maven3\bin\mvn.cmd' } else { $null }
        if (-not $mvnCmd) { throw 'Install Maven 3.9 or newer and add mvn to PATH, then run: mvn clean package' }
        & $mvnCmd -B -ntp clean package
        if ($LASTEXITCODE -ne 0) { throw 'Maven build failed. See the build output above.' }
    }
    & $javaCommand -jar $jarFile @args
    $applicationExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $applicationExitCode
