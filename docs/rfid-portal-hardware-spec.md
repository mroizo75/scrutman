# ScrutMan — RFID Portal Scanning System
## Hardware & Software Specification

> **Philosophy:** Plug-and-play. Set up the tent, plug in cables, launch the app, and the system is live.  
> All communication runs over a local network (LAN/Wi-Fi) — no internet required for the portal itself.

---

## 1. Portal Overview

```
           ┌──────────────────────────────────────────┐
           │          POP-UP TENT (6×3 m suggested)   │
           │                                          │
           │   [ANT 1]  [ANT 2]        [ANT 3] [ANT 4]
           │      │        │              │       │   │
           │   ┌──────────────────────────────────┐   │
           │   │         PORTAL FRAME             │   │
           │   │      (car drives through)        │   │
           │   └──────────────────────────────────┘   │
           │                                          │
           │         READ ZONE         VERIFY ZONE    │
           │       (Ant 1 + Ant 2)   (Ant 3 + Ant 4)  │
           │                                          │
           │           🟢 / 🔴  SIGNAL LAMP           │
           │                                          │
           │   [Windows PC]  ←→  [ScrutMan Cloud]    │
           └──────────────────────────────────────────┘
```

A car drives slowly through the portal frame (approx. 5–10 km/h).  
- **Zone 1 (Read):** Antennas 1 & 2 capture all 4 tyre RFID tags  
- **Zone 2 (Verify):** Antennas 3 & 4 confirm reads — reduce missed tags to near zero  
- **Signal lamp** turns **GREEN** (all 4 tyres OK) or **RED** (one or more tyres failed)  

---

## 2. Hardware Components

### 2.1 UHF RFID Reader

| Property | Specification |
|----------|---------------|
| **Model** | UHF RFID Parking/Portal Reader (4-port) |
| **Reference** | [Alibaba — Custom UHF RFID Tag Parking Reader](https://www.alibaba.com/product-detail/Custom-UHF-RFID-Tag-Parking-Reader_1601600279153.html) |
| **Standard** | EPC Gen2 / ISO 18000-6C (FIA LT54 compatible) |
| **Frequency** | EU: 865–868 MHz / Global: 902–928 MHz |
| **Ports** | 4 antenna ports (one reader handles all 4 antennas) |
| **Interface** | RJ-45 Ethernet (TCP/IP) or USB |
| **Output** | EPC string + RSSI + timestamp per tag read |
| **Quantity** | **1 unit** |

> One 4-port reader is sufficient. All 4 antennas connect to this single reader.

---

### 2.2 RFID Antennas

| Property | Specification |
|----------|---------------|
| **Type** | Directional / panel antenna (linearly polarised) |
| **Gain** | 8–12 dBi |
| **Read range** | 0.5–2 m (adjusted via power settings) |
| **Connector** | RP-SMA or N-type (match reader) |
| **Mount** | Side-mount on portal frame (2 per side = 4 total) |
| **Quantity** | **4 units** |

**Placement:** Mount antennas at approximately **hub height (30–60 cm from ground)**, aimed inward at the tyre sidewall. This is where the FIA RFID label is placed per LT54 regulations.

```
Side view of portal frame:

  LEFT SIDE           RIGHT SIDE
  ─────────           ──────────
  [Ant 1] ──→    ←── [Ant 2]    (Zone 1 — Read)
  [Ant 3] ──→    ←── [Ant 4]    (Zone 2 — Verify)
  
  Car travels left → right (or right → left)
  Tyres pass between antenna pairs
```

---

### 2.3 Portal Frame

| Property | Specification |
|----------|---------------|
| **Type** | Aluminium modular frame (tripod uprights + crossbar) |
| **Width** | ≥ 3 m (standard car width + clearance) |
| **Height** | ≥ 2 m |
| **Material** | Aluminium (non-metallic preferred to avoid RF interference) |
| **Assembly** | Tool-free clip/bolt system, packs into carry bag |
| **Tent** | 6×3 m pop-up canopy tent to house the station |

---

### 2.4 Signal Lamp (Traffic Light)

| Property | Specification |
|----------|---------------|
| **Type** | Industrial LED signal tower / traffic light (3-colour) |
| **Colours used** | 🟢 Green = PASS · 🔴 Red = FAIL · 🟡 Amber = Scanning in progress |
| **Interface** | USB-controlled relay module **or** RS-232 serial **or** network relay |
| **Recommended** | USB relay board (e.g., Sainsmart 4-channel USB relay) connected to lamp via relay |
| **Visibility** | ≥ 30 m range, outdoor rated (IP65 minimum) |
| **Quantity** | **2 units** (one each side of portal, facing the driver and the marshal) |

> **Alternative (plug-and-play):** Network-controlled smart relays (e.g., Shelly Pro 2) allow the Windows app to trigger lamps over HTTP — no serial driver needed.

---

### 2.5 Windows PC (Control Station)

| Property | Specification |
|----------|---------------|
| **Form factor** | Mini-PC (e.g., Intel NUC, Beelink SER series) or ruggedised laptop |
| **OS** | Windows 10 / 11 (64-bit) |
| **RAM** | 8 GB minimum |
| **Storage** | 256 GB SSD |
| **Network** | Gigabit Ethernet + Wi-Fi (dual) |
| **Ports** | 2× USB-A (reader + relay), 1× HDMI (monitor/status screen) |
| **Power** | UPS-backed (small UPS or power bank for the PC) |
| **Monitor** | 15–24" display for operator view, optional separate display facing driver |

---

### 2.6 Network Equipment

| Item | Purpose |
|------|---------|
| **4G/5G Router** (or Starlink) | Internet uplink to sync with ScrutMan cloud |
| **Gigabit switch (8-port)** | LAN backbone — connects PC, reader, lamps |
| **Cat6 patch cables** (5m, 10m) | Reader ↔ switch ↔ PC |
| **Wi-Fi Access Point** (optional) | For tablet/phone access by marshals |

> If internet is unavailable, the system operates in **offline mode** (local SQLite cache) and syncs to the cloud when connectivity is restored — this is already built into the ScrutMan architecture.

---

### 2.7 Cable & Power

| Item | Specification |
|------|---------|
| **Antenna cables** | LMR-195 or equivalent, RP-SMA, length 3–5 m each |
| **Power strip** | 6-outlet with surge protection |
| **Extension cable** | 25 m heavy-duty (230V / 16A) |
| **Generator** (optional) | 1 kW petrol/inverter type if no mains power at venue |

---

## 3. Software Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Windows PC — ScrutMan Portal App               │
│                                                             │
│  ┌─────────────────┐    ┌────────────────────────────────┐  │
│  │  RFID Reader    │    │  ScrutMan Desktop App           │  │
│  │  SDK / TCP      │───▶│  (Electron or WPF)              │  │
│  │  Port 6000      │    │                                 │  │
│  └─────────────────┘    │  1. Receive EPC tags            │  │
│                         │  2. Dedup within 2 s window     │  │
│  ┌─────────────────┐    │  3. Look up in local SQLite      │  │
│  │  Lamp Relay     │◀───│  4. Trigger lamp via relay      │  │
│  │  USB/HTTP       │    │  5. Log session to local DB      │  │
│  └─────────────────┘    │  6. Sync to ScrutMan cloud API  │  │
│                         └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │  HTTPS
                               ▼
                    ┌─────────────────────┐
                    │  ScrutMan Cloud API  │
                    │  (Next.js / MySQL)   │
                    │                     │
                    │  - Driver registry  │
                    │  - Approved tyres   │
                    │  - Scan sessions    │
                    └─────────────────────┘
```

### 3.1 Windows Desktop Application

The desktop app is the brain of the portal station. Recommended stack:

| Option | Technology | Pros |
|--------|-----------|------|
| **A (preferred)** | **Electron + React** | Reuses existing Next.js/React knowledge, web UI, easy updates |
| B | Tauri + React | Lighter than Electron, Rust backend |
| C | WPF / .NET | Native Windows, best serial/USB support |

**Core features:**

- **Start number input** — operator types/scans the start number before the car enters
- **RFID tag listener** — opens TCP socket to reader (or USB COM port), receives EPC strings in real time
- **Deduplication window** — 2-second window groups all reads from one pass
- **Local lookup** — compares received EPCs against the driver's registered tyre set (from local SQLite, synced from cloud before the event)
- **Lamp control** — sends signal to USB relay or HTTP endpoint to flip lamp colour
- **Operator display** — large-font result screen showing start #, driver name, each wheel status
- **Offline mode** — queues sessions locally and pushes to cloud when online
- **Sync bundle** — downloads the full event data (drivers + registered tyres) before the session starts

### 3.2 Scan Session Logic

```
Operator enters start number
        │
        ▼
System arms → amber lamp ON
        │
        ▼
Car drives through portal (2–4 seconds)
        │
        ▼
Reader sends EPC tags for each tyre (up to 8 reads per tag)
        │
        ▼
App deduplicates (unique EPCs in window)
        │
        ▼
For each wheel position (FL, FR, RL, RR):
  - Find EPC in driver's registered tyre list
  - Status must be ACTIVE
  └─ Match? → GREEN
  └─ No match? → RED
        │
        ▼
All 4 GREEN → GREEN lamp ON (3 seconds)
Any RED     → RED lamp ON (stays until operator resets)
        │
        ▼
Session logged + synced to cloud
```

### 3.3 Wheel Position Detection

Since all 4 antennas are in one reader, wheel position is inferred from **which antenna port** the tag was strongest on:

| Antenna port | Position |
|-------------|----------|
| Port 1 (Zone 1 Left) | Front-Left (FL) |
| Port 2 (Zone 1 Right) | Front-Right (FR) |
| Port 3 (Zone 2 Left) | Rear-Left (RL) |
| Port 4 (Zone 2 Right) | Rear-Right (RR) |

> RSSI (signal strength) from each port is used to assign the correct wheel position.

---

## 4. Complete Shopping List

| # | Item | Qty | Source |
|---|------|-----|--------|
| 1 | UHF RFID 4-port portal reader (EPC Gen2) | 1 | [Alibaba](https://www.alibaba.com/product-detail/Custom-UHF-RFID-Tag-Parking-Reader_1601600279153.html) |
| 2 | UHF RFID panel antenna, 8–12 dBi | 4 | Same supplier as reader |
| 3 | Antenna cable (LMR-195, RP-SMA, 5 m) | 4 | RF cable supplier |
| 4 | Aluminium portal frame (3 m wide) | 1 | Event equipment supplier |
| 5 | Pop-up canopy tent (6×3 m) | 1 | Local/online |
| 6 | Industrial LED signal tower (IP65) | 2 | Industrial supplier |
| 7 | USB relay board (4-channel) | 1 | Sainsmart / Amazon |
| 8 | Mini-PC (Intel NUC or Beelink) | 1 | Local electronics |
| 9 | 15" display (operator) | 1 | Local electronics |
| 10 | 4G/5G router (or Starlink) | 1 | Telia / Starlink |
| 11 | Gigabit 8-port switch | 1 | TP-Link / Netgear |
| 12 | Cat6 patch cables (5 m + 10 m) | 4 | Local |
| 13 | Heavy-duty power strip + 25 m extension | 1 | Local |
| 14 | Small UPS (for PC) | 1 | APC / Eaton |

---

## 5. Physical Setup — Step by Step

```
Day-of setup time target: 45 minutes (2 people)
```

1. **Erect tent** (6×3 m) and position at entry/exit of designated lane
2. **Assemble portal frame** — position inside tent, centred in lane
3. **Mount antennas** on frame uprights — 2 per side, at tyre hub height (≈ 45 cm)
4. **Connect antenna cables** to reader (ports 1–4)
5. **Place reader** in weatherproof box on the frame or tent edge
6. **Connect reader** to switch via Cat6
7. **Mount signal lamps** — one facing incoming driver, one facing marshal
8. **Connect lamps** to USB relay board on PC
9. **Power everything** via power strip (generator or mains)
10. **Boot Windows PC** — launch ScrutMan Portal App
11. **Sync event data** — app downloads driver + tyre list from cloud (or uses cached data)
12. **Test** — walk a RFID test tag through each antenna zone, confirm reads and lamp

---

## 6. Connectivity Modes

| Mode | Description | Lamp response time |
|------|------------|-------------------|
| **Online** | Live sync to cloud per scan | < 1 s |
| **Offline (cached)** | Uses last synced event data from local SQLite | < 0.5 s |
| **Post-event sync** | Queued sessions uploaded when connectivity restored | N/A |

---

## 7. What ScrutMan Already Has Built

The following is already implemented in the ScrutMan system and ready to receive data from the portal:

- ✅ `POST /api/scan-sessions` — receives and stores scan results per heat
- ✅ `GET /api/events/[eventId]/portal-lookup` — returns driver + registered tyres for a start number
- ✅ `GET /api/events/[eventId]/sync-bundle` — full offline data bundle for pre-event sync
- ✅ Tyre Inspection Report with per-heat tables and incident PDF generation
- ✅ Incident PDF per failed scan session
- ✅ Final Event Summary PDF

**What needs to be built:**
- [ ] Windows desktop app (Electron + React recommended)
- [ ] RFID reader SDK integration (vendor provides SDK or TCP protocol docs)
- [ ] USB relay driver for lamp control
- [ ] Installer/auto-update mechanism for the Windows app

---

*Document version: 1.0 — May 2026 — ScrutMan FIA Tyre Portal System*
