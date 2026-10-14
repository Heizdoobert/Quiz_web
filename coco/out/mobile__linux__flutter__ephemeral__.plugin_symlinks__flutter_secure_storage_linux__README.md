# mobile/linux/flutter/ephemeral/.plugin_symlinks/flutter_secure_storage_linux/README.md
lines:130 exports:
---
# flutter_secure_storage_linux

This is the platform-specific implementation of `flutter_secure_storage` for Linux.

## Features

- Secure storage using `libsecret` library.
- Compatible with various Linux keyring services like GNOME Keyring and KDE KWallet.

## Installation

Install [libsecret](https://github.com/GNOME/libsecret) — both the development package (to build) and the runtime package (to run). The runtime package (`libsecret-1-0`) is typically pre-installed on most Linux desktops.

<details>
<summary>apt / dnf / pacman</summary>

Ubuntu / Debian-based (Linux Mint, Pop!_OS, …):

```shell
sudo apt install libsecret-1-0 libsecret-1-dev
```

Fedora / RHEL / CentOS:

```shell
sudo dnf install libsecret libsecret-devel
```

Arch-based (single package contains both):

```shell
sudo pacman -S libsecret
```

</details>

<details>
<summary>Flatpak / Flathub</summary>

libsecret is included in Freedesktop runtime 25.08+ (also GNOME runtime 49, KDE runtime 6.10 and 5.15-25.08), so no extra manifest entry is needed:
