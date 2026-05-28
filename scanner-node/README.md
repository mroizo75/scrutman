# ScrutMan Scanner Node

Lokal offline-kapabel skanner-node for ScrutMan. Kjøres på en Raspberry Pi 4 eller mini-PC ved motorsportbanen.

## Hva den gjør

- Cacher alle godkjente dekk og event-registreringer lokalt i SQLite
- Svarer på RFID- og strekkode-oppslag **innen 5 ms** — helt uten internett
- Logger alle skanninger lokalt og synkroniserer dem til sky når nett er tilgjengelig
- Synkroniserer automatisk hvert 30. sekund (konfigurerbart)

## Kompatible skannere

| Type | Kobling |
|------|---------|
| Håndholdt UHF (Zebra RFD40, Chainway C72) | HTTP GET mot `http://node-ip:3100/rfid/:epc` |
| Portal UHF (Impinj R700, Zebra FX9600) | LLRP → HTTP POST til `/rfid` eller `/scan-batch` |
| Strekkode-scanner (alle med HID/USB) | HTTP GET mot `/barcode/:code` eller POST `/barcode` |
| Nettleser på lokal nettleser | `http://node-ip:3100` |

> **Starlink**: Med Starlink fungerer cloud-versjonen direkte — men node-en gir deg også backup og sub-5 ms responstid lokalt.

## Oppsett

```bash
# Klon eller kopier scanner-node/-mappen til Pi-en
cd scanner-node
npm install
cp .env.example .env
nano .env         # Fyll inn SCRUTMAN_API_URL, SCRUTMAN_EVENT_ID, SCANNER_NODE_SECRET
npm run build
npm start
```

## .env-variabler

| Variabel | Eksempel | Beskrivelse |
|----------|---------|-------------|
| `SCRUTMAN_API_URL` | `https://scrutmanapp.no` | URL til ScrutMan cloud |
| `SCRUTMAN_EVENT_ID` | `clxxxx...` | Event-ID fra ScrutMan |
| `SCANNER_NODE_SECRET` | `sterk-hemmelig-token` | Delt token (sett også i ScrutMan .env) |
| `NODE_ID` | `node-portal-1` | Identifikator for denne fysiske noden |
| `NODE_NAME` | `Dekkskanner Portal 1` | Visningsnavn i logg og status |
| `PORT` | `3100` | Lokal HTTP-port |
| `SYNC_INTERVAL_SECONDS` | `30` | Synkroniseringsintervall |

## API-endepunkter

```
GET  /status           — Node-status, online/offline, sist synk, antall i kø
GET  /rfid/:epc        — Slå opp RFID EPC-kode (hex)
POST /rfid             — { epc: "E280..." } — for portal-skannere
GET  /barcode/:code    — Slå opp FIA strekkode (8–10 siffer)
POST /barcode          — { code: "12345678" }
POST /scan-batch       — [{ type: "RFID"|"BARCODE", value: "..." }]
POST /sync             — Tving manuell synkronisering
POST /sync/bundle      — Last ned bundle på nytt (etter ny dekk-registrering)
```

## Svar-format

```json
{
  "status": "GREEN",
  "reason": "Godkjent — registrert for dette eventet (FIA LT54)",
  "source": "local",
  "rfidEpc": "E28011700000...",
  "tire": {
    "manufacturer": "Michelin",
    "model": "Pilot Sport 4",
    "size": "225/45R17",
    "discipline": "AUTOCROSS",
    "ownerName": "Ola Nordmann",
    "registrationId": "..."
  }
}
```

`status` er alltid `GREEN`, `YELLOW` eller `RED` — klar for LED-lysring, lydvarsling osv.

## Autostart på Raspberry Pi (systemd)

```bash
sudo nano /etc/systemd/system/scrutman-scanner.service
```

```ini
[Unit]
Description=ScrutMan Scanner Node
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/scanner-node
EnvironmentFile=/home/pi/scanner-node/.env
ExecStart=/usr/bin/node /home/pi/scanner-node/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable scrutman-scanner
sudo systemctl start scrutman-scanner
sudo systemctl status scrutman-scanner
```

## Anbefalte skannere

- **Håndholdt UHF**: Chainway C72 (~4000 kr) eller Zebra RFD40
- **Portal UHF**: Impinj R700 + 2× antenner (dekker 2,5 m bredde)
- **Strekkode**: Godex / Honeywell USB-scanner (fra ~500 kr)
- **Raspberry Pi 4** 4 GB + 32 GB SD-kort + 4G USB-modem som backup til Starlink
