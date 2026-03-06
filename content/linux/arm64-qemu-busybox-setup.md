---
title: "Building an ARM64 Linux System with BusyBox and QEMU"
tags: ["linux", "arm64", "kernel", "qemu", "embedded", "busybox"]
date: "2026-03-06"
---

Exploring core embedded concepts often starts by building a functional operating system from the ground up. This guide details a **clean, architecturally correct Linux ARM64 bring-up flow** from scratch. 

By the end of this walkthrough, you will have compiled a custom Linux kernel, built a minimal static userland using BusyBox, packaged it into an initramfs, and booted the entire system seamlessly within the QEMU emulator. We will also cover setting up kernel-level debugging using GDB.

---

## 1. Preparing the Environment and Source Code

Let's begin by ensuring our host machine has `git` installed, and then fetch the Linux kernel source tree. We'll perform a shallow clone of the stable `v6.6` branch to significantly reduce download time and disk usage.

```bash
sudo apt update
sudo apt install -y git-all
```

```bash
git clone --depth 1 --branch v6.6 \
  https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git linux
```

---

## 2. Installing Toolchains and Dependencies

Building an operating system for a different architecture (ARM64) on your host machine (likely x86_64) requires a cross-compilation toolchain and several core build utilities.

### Core Build Tools
These are standard packages required for compiling complex C-based systems like the kernel:

```bash
sudo apt install -y \
  git make gcc flex bison bc file \
  ca-certificates curl \
  libssl-dev \
  libncurses-dev libncurses5-dev libncursesw5-dev \
  libelf-dev dwarves \
  build-essential
```

### ARM64 Cross Toolchain
We need the GNU C Compiler specifically targeted for `aarch64-linux-gnu` architecture in order to build our ARM64 executables.

```bash
sudo apt install -y \
  gcc-aarch64-linux-gnu \
  binutils-aarch64-linux-gnu \
  libc6-dev-arm64-cross
```

### Emulation with QEMU
QEMU will allow us to emulate an ARM64 hardware platform (`virt` machine) directly on our host computer without needing a physical development board.

```bash
sudo apt install -y \
  qemu-system-aarch64 \
  qemu-system-arm \
  qemu-user qemu-user-static
```

### Filing and Packaging Utilities
These tools are necessary for packaging our `initramfs` filesystem archive later in the guide.

```bash
sudo apt install -y cpio tree bzip2
```

---

## 3. Configuring and Compiling the Linux Kernel

*Reference for deeper reading: [Linux Kernel Labs - Kernel Development on ARM](https://linux-kernel-labs.github.io/refs/heads/master/labs/arm_kernel_development.html)*

### Generating the Default Configuration

The kernel provides a sensible default configuration for ARM64 platforms. Navigate into your cloned `linux` directory and generate the default configuration using `make defconfig`:

```bash
make ARCH=arm64 defconfig

# OR
# To build with CLANG Compiler, add LLVM=1
ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- LLVM=1 make olddefconfig

# OR
# To build with CLANG Compiler, add LLVM=1
ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- LLVM=1 make defconfig
```

### Enabling `devtmpfs` (CRITICAL STEP)

We need the kernel to automatically manage device nodes (like `/dev/console` and `/dev/tty`) so we don't have to manually create them using `mknod`. We can enable the `devtmpfs` filesystem through the kernel's text-based configuration menu.

Run the menu configuration tool:

```bash
make ARCH=arm64 menuconfig
```

Navigate to the following path and ensure both options are enabled (`[*]`):

```text
Device Drivers  --->
  Generic Driver Options  --->
    [*] Maintain a devtmpfs filesystem
    [*]   Automount devtmpfs at /dev
```

This configuration eliminates the need for manual creation of essential device nodes:
* `/dev/null`
* `/dev/tty`
* `/dev/console`

### Compiling the Kernel Image and Device Trees

With the configuration saved, proceed to compile the kernel image and the Device Tree Blobs (DTBs). We'll utilize all available CPU cores (`-j$(nproc)`) to drastically speed up compilation.

```bash
make -j$(nproc) \
  ARCH=arm64 \
  CROSS_COMPILE=aarch64-linux-gnu- \
  Image dtbs

# OR
# To build with CLANG Compiler, add LLVM=1
ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- LLVM=1 make -j$(nproc) Image dtbs

```

---

## 4. BusyBox: The Minimal Userland

Next we will build the userland. A Linux kernel doesn't do much on its own; it requires user-space binaries like `ls`, `sh`, and `mount`. BusyBox combines tiny versions of many common UNIX utilities into a single small executable—perfect for embedded systems.

### Clone the Repository

```bash
git clone https://git.busybox.net/busybox
cd busybox
```

### Configure for a Static ARM64 Build

Generate the default configuration:

```bash
make ARCH=arm64 defconfig
```

Using a static binary means the BusyBox executable won't rely on shared C libraries at runtime. Edit the hidden `.config` file within the `busybox` directory to ensure dynamic linking is disabled:

```text
CONFIG_STATIC=y
CONFIG_TC=n
```

### Build & Install Userland

Compile the BusyBox binary and populate the installation directory:

```bash
make -j$(nproc) \
  ARCH=arm64 \
  CROSS_COMPILE=aarch64-linux-gnu- \
  install
```

Upon successful completion, BusyBox installs all of its utility symlinks into a new directory:
```text
_install/
```

---

## 5. Structuring the Initramfs

The `initramfs` serves as our temporary initial root filesystem. The Linux kernel will load this into RAM during boot and execute the first program it finds.

Change into the BusyBox installation directory and create the essential standard Linux system directories:

```bash
cd _install

mkdir -p \
  proc sys dev etc tmp \
  bin sbin usr/bin usr/sbin
```

> *Tip: Notice that we don't need to populate the `/dev` folder with manual hardware nodes because we explicitly configured the kernel to handle this via `devtmpfs`.*

---

## 6. The First User Process: `/init`

When the Linux kernel finishes booting, it searches the initramfs for an executable named `/init` to hand over control to user-space. Let's create a minimal script that mounts our virtual filesystems and drops us into a shell.

Create the file:

```bash
vi init
```

Paste the following shell script contents into `init`:

```sh
#!/bin/sh

echo "Booted into ARM64 initramfs"

mount -t proc none /proc
mount -t sysfs none /sys

export PATH=/bin:/sbin:/usr/bin:/usr/sbin

exec /bin/sh
```

Make sure the script is marked as executable, or the kernel will panic when attempting to run it:

```bash
chmod +x init
```

---

## 7. Packaging the Initramfs Archive

The kernel expects the initramfs to be bundled as a compressed `cpio` archive. Run the following command from within the `_install` directory to neatly package the filesystem structure up into a single file named `initramfs.cpio` in your build root.

```bash
find . -print0 | cpio --null -ov --format=newc > ../../initramfs.cpio
```

(Optional) You can gzip the archive to save space:

```bash
gzip ../../initramfs.cpio
```

---

## 8. Booting the System in QEMU

We now have our kernel (`Image`) and our root filesystem (`initramfs.cpio`). It's time to bring the system to life using QEMU. 

The following command launches a headless (`-nographic`) ARM64 virtual machine, simulating a Cortex-A57 processor with 1GB of RAM, and tells the kernel to output logs directly to the serial console (`ttyAMA0`).

```bash
qemu-system-aarch64 \
  -machine virt \
  -cpu cortex-a57 \
  -m 1024M \
  -nographic \
  -kernel arch/arm64/boot/Image \
  -initrd initramfs.cpio \
  -append "console=ttyAMA0"
```

If everything was built correctly, you should see the Linux kernel boot log fly by, followed by the `"Booted into ARM64 initramfs"` echo statement and an active root shell prompt!

---

## 9. Advanced: QEMU and Kernel Debugging (GDB)

If you intend to step through kernel initialization code or debug kernel panics, QEMU has built-in support for GDB.

### Start QEMU in Debug Mode

By appending the `-S` (freeze CPU at startup) and `-s` (shorthand for `-gdb tcp::1234`) flags, QEMU will launch the virtual machine but immediately pause execution and wait for a remote GDB connection.

```bash
qemu-system-aarch64 \
  -machine virt \
  -cpu cortex-a57 \
  -m 1024M \
  -nographic \
  -kernel arch/arm64/boot/Image \
  -initrd initramfs.cpio \
  -append "console=ttyAMA0" \
  -S -s
```

### Connect with GDB

Open a second terminal window. Start the ARM64 cross-architecture GDB debugger and point it at the uncompressed `vmlinux` binary (which contains all the kernel debugging symbols).

```bash
aarch64-linux-gnu-gdb vmlinux
```

Inside the GDB prompt, connect to the QEMU instance on port `1234`, set a breakpoint at the `start_kernel` entry function, and resume execution:

```gdb
target remote :1234
break start_kernel
continue
```

---

## 10. Compiling C Code for AARCH64

Want to write your own custom applications for your new OS? The following command demonstrates how to cross-compile a C file statically for the target ARM64 architecture so that it can execute freely within the QEMU environment without relying on shared object files.

```bash
# Host
aarch64-linux-gnu-gcc -static -O2 repro.c -o repro
```

---

## Optional Architectural Deep Dives

### 11. BusyBox `init` + `/etc/inittab`

This configuration is only needed if you decide to rely on `/sbin/init` as your primary initialization daemon instead of writing your own `/init` script.

Example `/etc/inittab`:

```text
::sysinit:/bin/mount -t proc proc /proc
::sysinit:/bin/mount -t sysfs sysfs /sys
::respawn:/bin/sh
::ctrlaltdel:/bin/reboot
```

### 12. Using `initramfs_list.txt`

As an alternative to manually packaging the archive with `cpio`, you can instruct the kernel build system to dynamically generate the initramfs using an instruction text file:

```text
dir /proc 0755 0 0
dir /sys 0755 0 0
file /init init 0755 0 0
```

Build the kernel and pass the text file source:

```bash
make ARCH=arm64 INITRAMFS_SOURCE=initramfs_list.txt
```

### 13. Initramfs + systemd

*Note: This is an advanced workflow and separate architectural track, **not recommended for early learning**.*

Integrating a heavy `systemd` environment requires:
* Dynamic linking compatibility
* Comprehensive `/usr` and `/lib` structures
* `udev` support
* `tmpfs` mounts
* Specific kernel command-line arguments:

  ```text
  init=/lib/systemd/systemd
  ```

---

## Summary Checklist

If you are ever troubleshooting your bring-up sequence, make sure you meet these exact requirements:

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **BusyBox (static)** | Required | `CONFIG_STATIC=y` is crucial for missing library avoidance. |
| **devtmpfs** | Required | Automates `/dev` console generation. |
| **`/init`** | Required | The first script spawned by the kernel. |
| **`/etc/inittab`** | Optional | Only needed if running the `/sbin/init` daemon. |
| **systemd** | Advanced | Requires comprehensive userland library support. |
| **GDB + QEMU** | Recommended | The cleanest way to debug kernel internals. |
