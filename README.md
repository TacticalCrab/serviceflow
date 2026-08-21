# ServiceFlow

ServiceFlow is a local-first desktop application for managing service and repair requests. It provides a Polish-language workflow for registering devices, tracking repairs, managing costs and producing printable repair cards without requiring an external server.

The interface is branded **ServiceFlow**. The native product name, executable, installer files and application identifier currently retain the internal `cafe-service` name.

## Features

- Dashboard with repair totals, revenue and cost summaries, and scheduled device collections and returns.
- Service-request lifecycle management with search, filtering and eight repair statuses.
- Customer, device, transport, repair-step and cost tracking.
- Request editing, closing, reopening and deletion.
- Printable A4 repair cards that can also be saved as PDF.
- Configurable company details, document font and company stamp.
- Per-user local SQLite storage with no separate database server.

## Technology

| Layer | Technology |
| --- | --- |
| Desktop runtime | Tauri 2 and Rust |
| Interface | React, TypeScript and Vite |
| Styling | Tailwind CSS and shadcn/ui components |
| Validation and forms | Zod and TanStack Form |
| Persistence | SQLite through `rusqlite` |

## Prerequisites

All platforms require:

- [Node.js](https://nodejs.org/) LTS with npm.
- The stable [Rust toolchain](https://www.rust-lang.org/tools/install).

See the official [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for the latest platform-specific instructions.

### Windows

Install:

- Microsoft C++ Build Tools with the **Desktop development with C++** workload.
- Microsoft Edge WebView2 Runtime. It is normally already installed on current Windows 10 and Windows 11 systems.
- The stable MSVC Rust toolchain:

```powershell
rustup default stable-msvc
```

MSI generation also requires the Windows VBSCRIPT optional feature. It is enabled by default on most installations; enable it in **Windows Features** if the build fails while running `light.exe`.

### Ubuntu and Debian

Ubuntu 22.04 or Debian 12 is a good baseline for distributable Linux builds. Install the native dependencies with:

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  xdg-utils
```

Instructions for Fedora, Arch, openSUSE and other distributions are available in the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## Development

From the repository root, install the JavaScript dependencies and start the native application:

```bash
npm ci
npm run tauri -- dev
```

The development window uses Vite at `http://localhost:1420`, with the Rust backend providing the SQLite and Tauri commands. Running `npm run dev` by itself starts only the browser frontend; database-backed screens require the native Tauri application.

### Useful commands

| Command | Purpose |
| --- | --- |
| `npm run tauri -- dev` | Run the complete desktop application in development mode |
| `npm run dev` | Run only the Vite frontend |
| `npm run build` | Type-check and build the frontend |
| `npm run tauri -- build` | Build the release application and all bundles supported by the current OS |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Run the Rust database and command tests |

## Local data

The application creates `cafe-service.sqlite3` in Tauri's per-user application-data directory. Service requests, company settings and the uploaded company stamp are stored in this database. There is currently no cloud sync, authentication or built-in backup/export feature.

No user database is embedded in an installer and installing a new build with the same application identifier reuses the existing application-data directory. For a safe manual backup, close the application and copy the entire application-data directory.

## Building and deploying

Tauri bundles are platform-specific. Build Windows installers on Windows and Linux packages inside Linux. If both are required from one development machine, use virtual machines or CI runners for the other operating system.

The generated Vite `dist` directory is not a standalone web deployment: the application depends on native Tauri commands for persistence.

The repository already enables bundling with `bundle.active: true` and `bundle.targets: "all"` in `src-tauri/tauri.conf.json`. The explicit commands below generate only the most useful formats for each platform.

Before creating a release, keep the version values in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` synchronized.

### Windows installers

Run this command on Windows:

```powershell
npm ci
npm run tauri -- build --bundles nsis,msi
```

Artifacts are written to:

| Format | Output | Typical use |
| --- | --- | --- |
| NSIS setup executable | `src-tauri/target/release/bundle/nsis/*-setup.exe` | Standard interactive installation |
| Windows Installer | `src-tauri/target/release/bundle/msi/*.msi` | Managed or enterprise deployment |

The default installer checks for WebView2 and downloads its bootstrapper when necessary. For offline deployment, configure a different `bundle.windows.webviewInstallMode` before building. See the [Tauri Windows installer guide](https://v2.tauri.app/distribute/windows-installer/) for installer modes and WebView2 options.

Unsigned installers can trigger Microsoft Defender SmartScreen warnings. Code-sign installers before distributing them publicly; see [Tauri's Windows code-signing guide](https://v2.tauri.app/distribute/sign/windows/).

### Android APK

Initialize the Android project once, then use the signing script from PowerShell:

```powershell
npm run tauri -- android init
.\build-signed-apk.ps1
```

By default, the script uses `%USERPROFILE%\upload-keystore.jks`, the `upload` key alias, and writes `app-universal-release-signed.apk` in the repository root. Override these values when needed:

```powershell
.\build-signed-apk.ps1 `
  -KeystorePath C:\keys\release.jks `
  -KeyAlias release `
  -OutputPath .\serviceflow-release.apk
```

The script builds the universal release APK, finds the newest Android SDK Build Tools, aligns the APK, signs it, and verifies both the signature and alignment. It asks for the keystore password interactively. For non-interactive builds, provide passwords through the `ANDROID_KEYSTORE_PASSWORD` and optional `ANDROID_KEY_PASSWORD` environment variables; do not commit them to the repository.

### Linux packages

Run this command inside Ubuntu 22.04, Debian 12 or another supported Linux build environment:

```bash
npm ci
npm run tauri -- build --bundles deb,appimage
```

Artifacts are written to:

| Format | Output | Typical use |
| --- | --- | --- |
| Debian package | `src-tauri/target/release/bundle/deb/*.deb` | Ubuntu, Debian and compatible distributions |
| AppImage | `src-tauri/target/release/bundle/appimage/*.AppImage` | Portable distribution across many Linux distributions |

Install the Debian package with:

```bash
sudo apt install ./src-tauri/target/release/bundle/deb/*.deb
```

Run the AppImage without installing it:

```bash
chmod +x src-tauri/target/release/bundle/appimage/*.AppImage
./src-tauri/target/release/bundle/appimage/*.AppImage
```

To generate an RPM instead:

```bash
npm run tauri -- build --bundles rpm
```

Linux binaries inherit their minimum `glibc` requirement from the build environment. Build on the oldest supported base distribution; Tauri recommends Ubuntu 22.04 or Debian 12 as practical Tauri 2 baselines. See the [AppImage distribution guide](https://v2.tauri.app/distribute/appimage/) for compatibility details.

### Automated releases

[Tauri's GitHub Actions guide](https://v2.tauri.app/distribute/pipelines/github/) describes how to build and attach platform packages to a GitHub release. Use matching runners for the desired artifacts:

| Runner | Artifacts |
| --- | --- |
| `windows-latest` | NSIS `.exe` and MSI |
| `ubuntu-22.04` | `.deb` and `.AppImage` |

Code-signing credentials should be stored as CI secrets and never committed to the repository.

## Project structure

```text
src/                         React interface
  components/                Shared interface components
  features/                  Feature schemas, APIs and document rendering
  views/                     Application screens and routes
src-tauri/                   Native Tauri application
  src/commands.rs            Tauri commands and business operations
  src/database.rs            SQLite initialization and migrations
  src/models.rs              Rust data contracts
  icons/                     Desktop and mobile application icons
public/                      Static frontend assets
```

## Further documentation

- [Tauri build and distribution overview](https://v2.tauri.app/distribute/)
- [Tauri CLI reference](https://v2.tauri.app/reference/cli/)
- [Tauri configuration reference](https://v2.tauri.app/reference/config/)
