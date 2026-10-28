# Nightwolf arrival — the first safe hour

Small Door · 28 October 2026 · One Workshop draft PR #20

## What is arriving

The intended machine is a ThinkPad T480, i7, 64 GB RAM, 512 GB storage, FHD touch, with a genuine charger. The current planned software stack is **Artix Linux, i3, and rsync**. This note is an arrival plan, not proof that the delivered hardware matches the listing. The approximate complete-build cost discussed is $591, with the laptop itself $231 delivered. These are planning figures, not an inventory inspection.

## First principle

Do not install, wipe, repartition, synchronize, or migrate the Workshop on arrival. The first hour should establish what the actual machine is, what works, and whether its disk and battery are healthy. A returned or misdescribed machine is much easier to resolve before changing its original installation.

## Arrival gates

**1. Physical and seller check.** Photograph the as-received machine, charger label, ports, and any damage. Compare the seller's exact listing and receipt with the unit's model, display, RAM, SSD, and included charger. Confirm the charger actually charges over USB-C; the label alone does not establish authenticity or electrical health. Inspect both USB-C ports and the power connector carefully. Check hinges, keyboard, trackpad, screen, touch input, speakers, Wi-Fi, and external display output where available.

**2. Firmware and storage check.** Before installing anything, confirm firmware recognizes the intended RAM and SSD. Record BIOS/UEFI version and boot mode. Check whether a supervisor password or storage lock prevents changing necessary settings. Boot a trusted Linux live environment without altering the installed disk. Inspect storage capacity, SMART/NVMe health when tools support it, and whether the system reports charging and both batteries if fitted. A nominal 512 GB drive will appear smaller in GiB; that is not by itself a defect.

**3. Memory and thermal check.** Verify that the full intended 64 GB is actually recognized by the firmware and operating system. A listing that says 64 GB is not evidence until the machine reports it. Check idle and moderate-load temperatures, fan behavior, stability, and battery condition. A brief memory test is useful before trusting the machine with Workshop holdings.

**4. Baseline and reversibility.** Record hardware and firmware observations in a dated Markdown receipt. If retaining the original installation matters, make a verified backup before replacing it. Keep installation media and a recovery path. Do not treat a copied file as a verified backup until it can be read back.

**5. Artix, then i3, then rsync.** Choose the Artix installation and init system deliberately after verifying hardware support. Establish boot, network, storage, display, power, and recovery first. Then configure i3 for a keyboard-light, lid-down-friendly workflow without assuming the laptop's touch screen must be used. Set up rsync with explicit source/destination and a dry run before any real copy. Never enable automatic deletion or two-way assumptions on the first sync.

**6. Workshop landing.** Begin with one invented Markdown file and a second local copy. Land, read back, change, recover, and verify its bytes. Then exercise the existing isolated One Workshop Markdown-index rebuild and source-receipt tests. Do not import historical Google Drive holdings, visitor folios, or private sources until identity, permissions, backup, and return roads have been independently reviewed.

## What success looks like

The machine boots reliably, reports the expected hardware, charges safely, can read and write an ordinary local Markdown file, can recover a verified copy, and can rebuild a disposable index from retained Markdown without replacing the source. The Workshop remains usable if the index or graphical interface disappears. No public site is changed by completing these checks.

## Not yet done

This is a practical readiness note, not an executed hardware check. Nightwolf has not been physically inspected through this work, Artix is not installed here, and no live source synchronization has been authorized. The separate PR #20 prototypes remain fictional and unmerged. Do not confuse readiness with deployment.

Powerful finger. Trustworthy result. — Small Door
