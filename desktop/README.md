# Pa’O Typing Tutor desktop

Windows and Ubuntu desktop apps built with **Rust and Tauri 2**, using the React
interface in `../frontend`. Lessons, keyboard guidance, and local fonts are
packaged with the app. Practice works offline and does not need a Supabase account.

## Project layout

- `src-tauri/src/main.rs`: Rust application entry point.
- `src-tauri/tauri.conf.json`: window, security, app identity, and installer settings.
- `src-tauri/tauri.linux.conf.json`: Ubuntu/Debian `.deb` packaging.
- `src-tauri/tauri.windows.conf.json`: Windows NSIS `.exe` packaging.
- `dist/`: generated frontend assets, including fonts and their licenses.
- `../frontend/src/features/lessons/bundledLessons.ts`: shared lesson content.
- `../.github/workflows/desktop-build.yml`: native builds for Windows x64 and Ubuntu x64.

## Install development tools

Install Node.js 24 LTS, pnpm 11.25.0, and the stable Rust toolchain. Keep
`Cargo.lock` and both `pnpm-lock.yaml` files in version control.

On Ubuntu, install the [Tauri build libraries](https://v2.tauri.app/start/prerequisites/):

```sh
sudo apt update
sudo apt install --no-install-recommends build-essential pkg-config libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev libssl-dev patchelf
```

On Windows, install Visual Studio Build Tools with **Desktop development with
C++**, the Windows SDK, and the MSVC Rust toolchain. Tauri uses Microsoft Edge
WebView2; the installer downloads its setup program if the runtime is missing.
That first runtime installation requires internet access. See the
[Windows prerequisites](https://v2.tauri.app/start/prerequisites/#windows).

Then, from this `desktop` directory:

```sh
pnpm --dir ../frontend install --frozen-lockfile
pnpm install --frozen-lockfile
pnpm dev
```

The development server uses `127.0.0.1:1420`. The app embeds its frontend in a
release build; it does not start a local web server when installed.

## Build installers

Run the command for the operating system you are building on:

```sh
# On Ubuntu
pnpm build:ubuntu

# On Windows
pnpm build:windows
```

Ubuntu output: `src-tauri/target/release/bundle/deb/*.deb`.
Windows output: `src-tauri/target/release/bundle/nsis/*-setup.exe`.

Install the Ubuntu package with `sudo apt install ./path/to/package.deb`, or run
the Windows setup executable. Windows installs for the current user. Installers
are unsigned unless you configure a signing certificate separately.

Linux binaries depend on the system libraries of the build environment. The
GitHub workflow uses Ubuntu 22.04 as its baseline. A local Ubuntu 24.04 build is
intended for Ubuntu 24.04 or newer; do not assume it runs on older releases.

For an optional portable Linux package, run `pnpm build --bundles appimage -- --locked`.
AppImage packaging requires additional Tauri tooling and is not the default.

## Windows build from Linux

Native Windows builds in GitHub Actions are the recommended release path. To
cross-compile locally, follow the [Tauri cross-compilation guide](https://v2.tauri.app/distribute/windows-installer/#build-windows-apps-on-linux-and-macos).
Install NSIS, LLVM, LLD, Clang, `cargo-xwin`, and the Windows Rust standard library:

```sh
sudo apt install nsis llvm lld clang
rustup target add x86_64-pc-windows-msvc
cargo install --locked cargo-xwin
XWIN_ARCH=x86_64 pnpm tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc -- --locked
```

Cross-compiled installers appear under
`src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`. They still need to be
tried on Windows before distribution.

If the default SDK extraction is slow, `cargo-xwin` also supports a Clang backend:

```sh
XWIN_CROSS_COMPILER=clang XWIN_CACHE_DIR="$PWD/.cache/msvc-sysroot" pnpm tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc -- --locked
```

This downloads a separate SDK cache on the first run. Keep using the same cache
directory for subsequent builds.

## GitHub builds

Push this project, then run **Desktop installers** in GitHub Actions. The workflow
builds each installer on its native operating system and uploads downloadable
artifacts. It also runs for pull requests touching the app and for tags beginning
with `desktop-v`. It does not publish a GitHub release automatically.

## Shared interface and data

Desktop builds use Vite's `desktop` mode, which bundles fonts, skips frontend
`.env` loading, uses relative asset URLs, and selects hash-based routes. Web builds
keep their existing routes. The desktop window can be resized down to 360 × 480.

Preferences use the webview's local storage in the application's OS profile.
They survive normal app restarts but are separate from the website's browser
storage. Editing a lesson in `bundledLessons.ts` takes effect in the next build.

The Rust app grants no filesystem, shell, or network plugin permissions to the
frontend. Its production content policy allows packaged scripts and fonts and
Tauri's internal IPC only.

## Checks

```sh
pnpm --dir ../frontend typecheck
pnpm --dir ../frontend exec vitest run src/features/simple --maxWorkers=1
pnpm check
pnpm ui:build
```

`pnpm check` needs the native build libraries. A full installer build also
compiles the Rust app. Check typing, Pa’O input, theme persistence, reloads, and
window resizing on each target OS before sharing a release.

## Artwork and fonts

The installer and application icons reuse the project's approved artwork in
`../TypingTutor-mobile/logo/Keyboard Progress Key Icon.png`. Run `pnpm icons` to
regenerate them. Local font files come from Fontsource packages; their SIL Open
Font License texts are included in the installed `licenses` directory.
