---
title: "Docker Environment Setup for ARM64"
tags: ["linux", "docker", "arm64", "qemu"]
date: "2026-03-06"
---

When developing for embedded Linux systems and emulating environments like ARM64 via QEMU, using a dedicated Docker container helps keep your host machine clean and ensures a reproducible build system.

This guide provides a comprehensive `Dockerfile` to set up all necessary cross-compilation toolchains, followed by commonly used commands to manage the container.

## 1. The Environment Setup (Dockerfile)

Below is the complete `Dockerfile` used to rapidly provision an Ubuntu 24.04 environment containing all the necessary dependencies to compile an ARM64 Linux kernel and BusyBox. 

```dockerfile
# Use an official Linux base image (Ubuntu here, but you can swap with debian/alpine/etc.)
FROM ubuntu:24.04

# Prevents interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Update and install basic tools
RUN apt-get update && apt-get install -y \
    sudo \
    bash \
    vim \
    curl \
    make \
    ca-certificates \
    gcc-aarch64-linux-gnu \
    binutils-aarch64-linux-gnu \
    libc6-dev-arm64-cross \
    bc \
    file \
    qemu-system-aarch64 \
    qemu-user \
    qemu-user-static \
    libssl-dev \
    libncurses-dev \
    git-all \
    build-essential \
    libncurses5-dev \
    libelf-dev \
    dwarves \
    qemu-system-arm \
    qemu-system-misc \
    && rm -rf /var/lib/apt/lists/*

# Create user 'rakuram' with home directory and sudo access
RUN useradd -ms /bin/bash rakuram && \
    echo "rakuram ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Switch to the new user
USER rakuram
WORKDIR /home/rakuram

# Default command
CMD [ "bash" ]
```

## 2. Docker Execution Commands

Once you have saved the above `Dockerfile` in an empty directory, execute the following commands to interact with the container.

### Building the Image

Build the container image and assign it a tag (e.g., `linux-rakuram`):

```bash
docker build -t linux-rakuram .
```

### Running the Container

Below are different methods to start your first instance of the built image. These initial setup commands are typically only required once.

- **Standard Run (Non-Root User):**
  ```bash
  docker run -it --name linux-rakuram linux-rakuram
  ```

- **Run with Root Permissions:**
  ```bash
  docker run -it --name linux-rakuram --user root linux-rakuram
  ```

### Mounting the Host Filesystem

You can seamlessly mount a host directory directly into your container. This allows you to compile code within the container but save it permanently on your host machine.

- **Standard Mount:**
  ```bash
  docker run -it --name linux-rakuram -v "C:\Users\admin\linux_share":/home/rakuram/linux_share linux-rakuram
  ```

- **Root Mount (Note: execution mapping may take longer):**
  ```bash
  docker run -it --user root -v "C:\Users\admin\linux_share":/home/rakuram/linux_share linux-rakuram
  ```

### Terminal Multiplexing

To open multiple active terminal windows connected to the same running instance:

```bash
docker exec -it <container_id> bash
```

### State Management

- **List All Containers (running and stopped):**
  ```bash
  docker ps -a
  ```

- **Commit Container Changes:** Save modifications directly into the image payload:
  ```bash
  docker commit <Commit-ID> linux-rakuram
  ```

### Volume & Image Cleanup

Free up host disk space by removing stopped assets:

- **Remove stopped containers:** `docker container prune -f`
- **Remove dangling images:** `docker image prune -f`
- **Remove unused volumes:** `docker volume prune -f`

> [!WARNING]
> Running `docker system prune -a -f --volumes` will remove **all** unused images (not just dangling ones). If you want to keep your base `linux-rakuram` image available, simply restrict pruning to containers and volumes.

## Resources

- **Kernel on QEMU:** [qemu-arm64-howto.md](https://www.kernel.org/pub/linux/kernel/people/will/docs/qemu/qemu-arm64-howto.md)
- **QEMU Device Tree:** [devicetree/dt_qemu.html](https://docs.u-boot.org/en/stable/develop/devicetree/dt_qemu.html)
- **Minimal Kernel Boot:** [minlinux2](https://github.com/bluedragon1221/minlinux2)
