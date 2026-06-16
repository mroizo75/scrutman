# ScrutMan — Skjermbilder oversikt
## Alle vinduer per rolle

---

## 🌐 OFFENTLIG (ingen innlogging)

| # | Skjerm | URL | Innhold |
|---|--------|-----|---------|
| 1 | **Forside** | `/` | Søk etter arrangement, liste over kommende stevner |
| 2 | **Arrangementsside** | `/events/[id]` | Info om stevnet, klubb, klasser, lenke til påmelding |
| 3 | **Påmelding** | `/events/[id]/register` | Velg klasse, kjøretøy, send påmelding |
| 4 | **Logg inn** | `/login` | E-post + passord |
| 5 | **Registrer** | `/register` | Opprett konto |

---

## 👤 FØRER (Athlete)

| # | Skjerm | URL | Innhold |
|---|--------|-----|---------|
| 6 | **Min profil** | `/profile` | Navn, lisensnummer, personinfo, mine påmeldinger |
| 7 | **Mine kjøretøy** | `/profile/vehicles` | Legg til / rediger biler |
| 8 | **Fører-dashboard** | `/athlete/dashboard` | Oversikt over mine stevner og status |
| 9 | **Mine dekk** | `/athlete/dashboard/tires` | Tabell med egne dekk, RFID, godkjenningsstatus, historikk |

---

## 🏁 INNSJEKK (Check-in)

| # | Skjerm | URL | Innhold |
|---|--------|-----|---------|
| 10 | **Innsjekk — velg stevne** | `/dashboard/checkin` | Liste over aktive stevner |
| 11 | **Innsjekk — stevne** | `/dashboard/checkin/[id]` | Sjekk inn deltakere, sanntidsliste, status per fører |

---

## 🔧 TEKNISK KONTROLL (Technical Inspector)

| # | Skjerm | URL | Innhold |
|---|--------|-----|---------|
| 12 | **Teknisk dashboard** | `/dashboard/technical` | Oversikt over biler til kontroll, status, merknader |

---

## ⚖️ VEKTKONTROLL (Weight Controller)

| # | Skjerm | URL | Innhold |
|---|--------|-----|---------|
| 13 | **Vekt — velg stevne** | `/dashboard/weight-control` | Liste over stevner |
| 14 | **Vektmåling** | `/dashboard/weight-control/[id]` | Registrer vekt per bil, status grønn/rød |
| 15 | **Vektliste** | `/dashboard/weight-control/[id]/list` | Liveoversikt alle målinger, CSV-eksport |
| 16 | **Vektrapporter** | `/dashboard/weight-control/[id]/reports` | Rapporter, PDF-nedlasting |

---

## 🚗 DEKK-PORTAL (Tyre Scanning)

| # | Skjerm | URL | Innhold |
|---|--------|-----|---------|
| 17 | **Tyre Scan Portal** | `/dashboard/tyre-scan-demo` | Startnummer → arm system → 4 hjul skannes → grønn/rød lampe |
| 18 | **RFID-skanning (event)** | `/dashboard/events/[id]/rfid-scan` | Manuell RFID-skanning knyttet til stevne |
| 19 | **Dekk-rapport** | `/dashboard/events/[id]/tyre-report` | Tabell per heat, PDF-nedlasting, incident-rapport |
| 20 | **Dekk (event)** | `/dashboard/events/[id]/tires` | Alle dekk registrert for stevnet |

---

## 🏢 KLUBBADMIN (Club Admin)

| # | Skjerm | URL | Innhold |
|---|--------|-----|---------|
| 21 | **Klubb-dashboard** | `/dashboard/club-admin` | Oversikt over klubbens stevner, brukere og innstillinger |
| 22 | **Arrangementer** | `/dashboard/events` | Opprett og administrer stevner |
| 23 | **Arrangement — klasser** | `/dashboard/events/[id]/classes` | Klasser og underdisipliner for stevnet |
| 24 | **Arrangement — påmeldinger** | `/dashboard/events/[id]/registrations` | Godkjenn/avslå påmeldinger, endre status |
| 25 | **Startliste** | `/dashboard/events/[id]/startliste` | Generer og eksporter startliste |
| 26 | **Vektgrenser** | `/dashboard/events/[id]/weight-limits` | Sett vektgrenser per klasse for stevnet |
| 27 | **Brukere** | `/dashboard/users` | Liste over klubbens brukere |
| 28 | **Ny bruker** | `/dashboard/users/new` | Opprett bruker (admin, teknisk osv.) |
| 29 | **Brukerdetalj** | `/dashboard/users/[id]` | Rediger bruker, endre rolle |
| 30 | **Klubber** | `/dashboard/clubs` | Oversikt over klubber (for admin-nivå) |
| 31 | **Klubbdetalj** | `/dashboard/clubs/[id]` | Rediger klubbinfo |
| 32 | **Klubbadministratorer** | `/dashboard/clubs/[id]/admins` | Hvem som er admin for klubben |
| 33 | **Klasser** | `/dashboard/clubs/classes` | Administrer klasser på tvers |

---

## 🏛️ FORBUNDSADMIN (Federation Admin)

| # | Skjerm | URL | Innhold |
|---|--------|-----|---------|
| 34 | **Forbund-dashboard** | `/dashboard/federation` | Statistikk, arrangementsoversikt, navigasjon |
| 35 | **Godkjente dekk** | `/dashboard/federation/approved-tires` | Liste og import (Excel/CSV) av godkjente dekkmodeller |
| 36 | **Dekkgrenser** | `/dashboard/federation/tire-limits` | Maks antall dekk per klasse/disiplin |
| 37 | **Forbundsadmins** | `/dashboard/federation/admins` | Inviter og administrer forbundsadministratorer |

---

## 🔴 FIA-DELEGAT (FIA Delegate)

| # | Skjerm | URL | Innhold |
|---|--------|-----|---------|
| 38 | **FIA-dashboard** | `/dashboard/fia` | Statistikk, status alle stevner og klubber |
| 39 | **FIA — stevner** | `/dashboard/fia/events` | Oversikt over alle stevner på tvers av klubber |
| 40 | **FIA — klubber** | `/dashboard/fia/clubs` | Oversikt over alle klubber |
| 41 | **FIA — godkjente dekk** | `/dashboard/fia/approved-tires` | FIA-lista over godkjente dekkmodeller (rediger/legg til) |
| 42 | **FIA — dekkoverføring** | `/dashboard/fia/tyre-assignments` | Offisiell overføring av dekk til fører (med dokumentasjon) |
| 43 | **FIA — underdisipliner** | `/dashboard/fia/sub-disciplines` | Administrer underdisipliner (f.eks. SuperBuggy, 1600cc) |
| 44 | **FIA — RFID-skanning** | `/dashboard/fia/rfid-scan` | Håndskannervisning: grønn/gul/rød per EPC-skann |

---

## ⚙️ SUPERADMIN (System Owner)

| # | Skjerm | URL | Innhold |
|---|--------|-----|---------|
| 45 | **Superadmin-dashboard** | `/dashboard/superadmin` | Systemstatus, statistikk, navigasjon |
| 46 | **Forbund** | `/dashboard/superadmin/federations` | Opprett og administrer forbund |
| 47 | **FIA-delegater** | `/dashboard/superadmin/fia-delegates` | Inviter og administrer FIA-delegater |
| 48 | **Hoved-dashboard** | `/dashboard` | Felles inngangspunkt etter innlogging (ruter videre etter rolle) |

---

## Tilgangsoversikt — hvem ser hva

| Skjerm | Fører | Innsjekk | Teknisk | Vekt | Dekk-portal | Klubbadmin | Forbund | FIA | Superadmin |
|--------|:-----:|:--------:|:-------:|:----:|:-----------:|:----------:|:-------:|:---:|:----------:|
| Forside | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mine dekk | ✅ | | | | | | | | |
| Min profil | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Innsjekk | | ✅ | | | | ✅ | | ✅ | ✅ |
| Teknisk kontroll | | | ✅ | | | ✅ | | ✅ | ✅ |
| Vektkontroll | | | | ✅ | | ✅ | | ✅ | ✅ |
| Dekk-portal / rapport | | | ✅ | | ✅ | ✅ | | ✅ | ✅ |
| Arrangementer (admin) | | | | | | ✅ | ✅ | ✅ | ✅ |
| Godkjente dekk | | | | | | | ✅ | ✅ | ✅ |
| FIA-oversikt | | | | | | | | ✅ | ✅ |
| Forbund-admin | | | | | | | ✅ | | ✅ |
| Superadmin | | | | | | | | | ✅ |

---

*Totalt: 48 skjermbilder · ScrutMan · Juni 2026*
