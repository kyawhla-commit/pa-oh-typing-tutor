# Pa’O Typing Tutor

Practice Pa’O typing with guided lessons, a visual keyboard, and live speed and accuracy feedback. The desktop app includes its lessons and fonts and works offline without an account.

## Downloads

Current release: [v1.0.1](https://github.com/kyawhla-commit/pa-oh-typing-tutor/releases/tag/desktop-v1.0.1).

| Computer | Requirements | Download |
| --- | --- | --- |
| Windows | Windows 10 or 11, x64 | [Windows installer](https://github.com/kyawhla-commit/pa-oh-typing-tutor/releases/download/desktop-v1.0.1/pa-oh-typing-tutor_1.0.1_windows_x64_setup.exe) |
| Ubuntu | Ubuntu 24.04, x86_64 / amd64 | [Ubuntu installer (.deb)](https://github.com/kyawhla-commit/pa-oh-typing-tutor/releases/download/desktop-v1.0.1/pa-oh-typing-tutor_1.0.1_ubuntu24.04_amd64.deb) |

See the [release notes](https://github.com/kyawhla-commit/pa-oh-typing-tutor/releases/tag/desktop-v1.0.1) for changes and limitations. [SHA-256 checksums](https://github.com/kyawhla-commit/pa-oh-typing-tutor/releases/download/desktop-v1.0.1/SHA256SUMS) are available for both installers.

### Install

**Windows:** Download and run the `.exe` installer. It is unsigned, so Windows may display an unknown-publisher warning. Internet access is needed during installation if the Microsoft WebView2 runtime is missing. The Windows installer has been built, but has not yet been tested on a Windows device.

**Ubuntu:** Download the `.deb`, open a terminal in its download folder, and run:

```sh
sudo apt install ./pa-oh-typing-tutor_1.0.1_ubuntu24.04_amd64.deb
```

Then open **Pa-O Typing Tutor** from your applications menu. This package was built and tested on Ubuntu 24.04; older Ubuntu versions are not supported by this download.

## Development

- [Desktop app](desktop/README.md): Rust and Tauri, Windows and Ubuntu build instructions.
- [Frontend](frontend/README.md): React interface and bundled lesson catalog.

Desktop releases are tagged `desktop-v<version>`. The GitHub Actions workflow builds installers for Windows and Ubuntu.
