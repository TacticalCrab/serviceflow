<#
.SYNOPSIS
Builds and signs the universal Android release APK for this Tauri application.

.DESCRIPTION
Runs the Tauri Android release build, aligns the generated unsigned APK, signs
it with apksigner, and verifies the finished artifact. Android SDK Build Tools
are discovered automatically.

Passwords are not stored in this script. If ANDROID_KEYSTORE_PASSWORD is set,
apksigner reads the keystore password from it. If ANDROID_KEY_PASSWORD is set,
apksigner reads a separate key password from it. Otherwise apksigner prompts.

.EXAMPLE
.\build-signed-apk.ps1

.EXAMPLE
.\build-signed-apk.ps1 -KeystorePath C:\keys\release.jks -KeyAlias release

.EXAMPLE
.\build-signed-apk.ps1 -SkipBuild
#>
[CmdletBinding()]
param(
    [Parameter()]
    [string]$KeystorePath = (Join-Path $env:USERPROFILE "upload-keystore.jks"),

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$KeyAlias = "upload",

    [Parameter()]
    [string]$OutputPath = (Join-Path $PSScriptRoot "app-universal-release-signed.apk"),

    [Parameter()]
    [string]$AndroidSdkPath,

    [Parameter()]
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-ExternalCommand {
    param(
        [Parameter(Mandatory)]
        [string]$Command,

        [Parameter(Mandatory)]
        [string[]]$Arguments,

        [Parameter(Mandatory)]
        [string]$FailureMessage
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FailureMessage (exit code $LASTEXITCODE)."
    }
}

function Get-AbsolutePath {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [string]$BasePath
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $BasePath $Path))
}

function Find-AndroidSdk {
    param(
        [string]$ExplicitPath
    )

    $candidates = @()
    if (-not [string]::IsNullOrWhiteSpace($ExplicitPath)) {
        $candidates += $ExplicitPath
    }
    if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_SDK_ROOT)) {
        $candidates += $env:ANDROID_SDK_ROOT
    }
    if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_HOME)) {
        $candidates += $env:ANDROID_HOME
    }
    if (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
        $candidates += (Join-Path $env:LOCALAPPDATA "Android\Sdk")
    }

    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        $fullPath = Get-AbsolutePath -Path $candidate -BasePath (Get-Location).Path
        if (Test-Path -LiteralPath (Join-Path $fullPath "build-tools") -PathType Container) {
            return $fullPath
        }
    }

    throw "Android SDK not found. Set ANDROID_SDK_ROOT or pass -AndroidSdkPath."
}

function Find-BuildTools {
    param(
        [Parameter(Mandatory)]
        [string]$SdkPath
    )

    $buildToolsRoot = Join-Path $SdkPath "build-tools"
    $installations = Get-ChildItem -LiteralPath $buildToolsRoot -Directory |
        Where-Object {
            (Test-Path -LiteralPath (Join-Path $_.FullName "apksigner.bat") -PathType Leaf) -and
            (Test-Path -LiteralPath (Join-Path $_.FullName "zipalign.exe") -PathType Leaf)
        } |
        Sort-Object -Property @{
            Expression = {
                $versionMatch = [regex]::Match($_.Name, "^\d+(?:\.\d+){0,3}")
                if ($versionMatch.Success) {
                    [version]$versionMatch.Value
                }
                else {
                    [version]"0.0"
                }
            }
            Descending = $true
        }

    $latest = $installations | Select-Object -First 1
    if ($null -eq $latest) {
        throw "No Android Build Tools installation containing apksigner and zipalign was found in '$buildToolsRoot'."
    }

    return $latest
}

function Find-UnsignedReleaseApk {
    param(
        [Parameter(Mandatory)]
        [string]$RepositoryRoot,

        [Parameter(Mandatory)]
        [string]$FinalOutputPath
    )

    $expectedApk = Join-Path $RepositoryRoot "src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release-unsigned.apk"
    if (Test-Path -LiteralPath $expectedApk -PathType Leaf) {
        return Get-Item -LiteralPath $expectedApk
    }

    $searchRoot = Join-Path $RepositoryRoot "src-tauri\gen\android\app\build\outputs\apk"
    if (-not (Test-Path -LiteralPath $searchRoot -PathType Container)) {
        return $null
    }

    $allApks = Get-ChildItem -LiteralPath $searchRoot -Recurse -File -Filter "*.apk"

    $finalOutputFullPath = [System.IO.Path]::GetFullPath($FinalOutputPath)
    $releaseApks = $allApks | Where-Object {
        $_.FullName -match "(?i)release" -and
        -not [string]::Equals(
            [System.IO.Path]::GetFullPath($_.FullName),
            $finalOutputFullPath,
            [System.StringComparison]::OrdinalIgnoreCase
        )
    }

    $unsignedReleaseApks = @(
        $releaseApks | Where-Object { $_.Name -match "(?i)unsigned" }
    )
    if ($unsignedReleaseApks.Count -eq 1) {
        return $unsignedReleaseApks[0]
    }
    if ($unsignedReleaseApks.Count -gt 1) {
        $candidateList = ($unsignedReleaseApks.FullName | Sort-Object) -join "', '"
        throw "Multiple unsigned release APKs were found: '$candidateList'. Remove stale build outputs and try again."
    }

    return $null
}

$repositoryRoot = $PSScriptRoot
$androidProjectPath = Join-Path $repositoryRoot "src-tauri\gen\android"
$keystoreFullPath = Get-AbsolutePath -Path $KeystorePath -BasePath (Get-Location).Path
$outputFullPath = Get-AbsolutePath -Path $OutputPath -BasePath (Get-Location).Path

if (-not (Test-Path -LiteralPath $keystoreFullPath -PathType Leaf)) {
    throw "Keystore not found at '$keystoreFullPath'. Pass the correct path with -KeystorePath."
}

if (-not (Test-Path -LiteralPath $androidProjectPath -PathType Container)) {
    throw "The Android project is not initialized. Run 'npm run tauri -- android init' first."
}

$sdkPath = Find-AndroidSdk -ExplicitPath $AndroidSdkPath
$buildTools = Find-BuildTools -SdkPath $sdkPath
$apksigner = Join-Path $buildTools.FullName "apksigner.bat"
$zipalign = Join-Path $buildTools.FullName "zipalign.exe"

Write-Host "Android SDK: $sdkPath"
Write-Host "Build Tools: $($buildTools.Name)"

if (-not $SkipBuild) {
    $npm = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
    if ($null -eq $npm) {
        $npm = Get-Command "npm" -ErrorAction SilentlyContinue
    }
    if ($null -eq $npm) {
        throw "npm was not found on PATH. Install Node.js and reopen the terminal."
    }

    Write-Host "Building the universal Android release APK..."
    Push-Location $repositoryRoot
    try {
        Invoke-ExternalCommand `
            -Command $npm.Source `
            -Arguments @("run", "tauri", "--", "android", "build", "--apk", "--ci") `
            -FailureMessage "Tauri Android build failed"
    }
    finally {
        Pop-Location
    }
}

$unsignedApk = Find-UnsignedReleaseApk `
    -RepositoryRoot $repositoryRoot `
    -FinalOutputPath $outputFullPath

if ($null -eq $unsignedApk) {
    throw "No unsigned release APK was found. Run the script without -SkipBuild and inspect the Tauri build output."
}

if ([string]::Equals(
        [System.IO.Path]::GetFullPath($unsignedApk.FullName),
        $outputFullPath,
        [System.StringComparison]::OrdinalIgnoreCase
    )) {
    throw "The input APK and output APK paths must be different."
}

$outputDirectory = Split-Path -Parent $outputFullPath
if (-not (Test-Path -LiteralPath $outputDirectory -PathType Container)) {
    $null = New-Item -Path $outputDirectory -ItemType Directory -Force
}

$temporaryId = [guid]::NewGuid().ToString("N")
$alignedApk = Join-Path $outputDirectory ".aligned-unsigned-$temporaryId.apk"
$temporarySignedApk = Join-Path $outputDirectory ".signed-$temporaryId.apk"
$temporarySignature = "$temporarySignedApk.idsig"

try {
    Write-Host "Aligning '$($unsignedApk.FullName)'..."
    $parsedBuildToolsVersion = [version]([regex]::Match($buildTools.Name, "^\d+(?:\.\d+){0,3}").Value)
    if ($parsedBuildToolsVersion -ge [version]"35.0.0") {
        $alignArguments = @("-f", "-P", "16", "4", $unsignedApk.FullName, $alignedApk)
        $checkAlignArguments = @("-c", "-P", "16", "4", $temporarySignedApk)
    }
    else {
        $alignArguments = @("-f", "-p", "4", $unsignedApk.FullName, $alignedApk)
        $checkAlignArguments = @("-c", "-p", "4", $temporarySignedApk)
    }

    Invoke-ExternalCommand `
        -Command $zipalign `
        -Arguments $alignArguments `
        -FailureMessage "APK alignment failed"

    $signArguments = @(
        "sign",
        "--ks", $keystoreFullPath,
        "--ks-key-alias", $KeyAlias,
        "--out", $temporarySignedApk
    )

    if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_KEYSTORE_PASSWORD)) {
        $signArguments += @("--ks-pass", "env:ANDROID_KEYSTORE_PASSWORD")
    }
    if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_KEY_PASSWORD)) {
        $signArguments += @("--key-pass", "env:ANDROID_KEY_PASSWORD")
    }
    $signArguments += $alignedApk

    Write-Host "Signing with alias '$KeyAlias'..."
    Invoke-ExternalCommand `
        -Command $apksigner `
        -Arguments $signArguments `
        -FailureMessage "APK signing failed"

    Write-Host "Verifying signature and alignment..."
    Invoke-ExternalCommand `
        -Command $apksigner `
        -Arguments @("verify", "--verbose", "--print-certs", $temporarySignedApk) `
        -FailureMessage "APK signature verification failed"

    Invoke-ExternalCommand `
        -Command $zipalign `
        -Arguments $checkAlignArguments `
        -FailureMessage "Signed APK alignment verification failed"

    Move-Item -LiteralPath $temporarySignedApk -Destination $outputFullPath -Force

    $outputSignature = "$outputFullPath.idsig"
    if (Test-Path -LiteralPath $temporarySignature -PathType Leaf) {
        Move-Item -LiteralPath $temporarySignature -Destination $outputSignature -Force
    }
    elseif (Test-Path -LiteralPath $outputSignature -PathType Leaf) {
        Remove-Item -LiteralPath $outputSignature -Force
    }
}
finally {
    foreach ($temporaryFile in @($alignedApk, $temporarySignedApk, $temporarySignature)) {
        if (Test-Path -LiteralPath $temporaryFile -PathType Leaf) {
            Remove-Item -LiteralPath $temporaryFile -Force
        }
    }
}

$artifact = Get-Item -LiteralPath $outputFullPath
$sha256 = (Get-FileHash -LiteralPath $outputFullPath -Algorithm SHA256).Hash

Write-Host ""
Write-Host "Signed APK created successfully:"
Write-Host "  Path:   $($artifact.FullName)"
Write-Host "  Size:   $([math]::Round($artifact.Length / 1MB, 2)) MB"
Write-Host "  SHA256: $sha256"
