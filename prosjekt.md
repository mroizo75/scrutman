Vi skal lage et NextJS prosjekt med shadcn og nextAuth V4. Alt dette er installert.
Jeg skal ha en mysql db med prisma som styrer backend. Det skal være hundrevis av klubber så dette må det ta høyde for. Det skal også vøre slik at alt skal oppdateres automatisk om det er endringer, det vil si at om det er lagt til en vekt, melding eller slik så skal dette synes med en gang. Så løsning for dette må være med. Bruk alle optimale funksjoner som trengs for å løse dette. Det skal også være moderne, fresht, profesjonelt design som virkelig skal synes. Det skal hete ScrutMan App 

1. Klubb og Multitenancy

    Hver klubb har et eget "namespace" 

    Middleware brukes til å validere tilgang og "injecte" klubbdata basert på brukerens rolle og klubbtilknytning

2. Arrangement

    Klubber kan lage arrangementer (eventer) knyttet til sin klubb

    Arrangement har startdato, påmeldingsperiode, klasseliste og tekniske kriterier

3. Påmelding

    Utøver logger inn → velger klubb og arrangement → registrerer seg (og evt. kjøretøy) med startnummer

    Data knyttes til userId, eventId, og startNumber

4. Teknisk kontroll

    Skjema for teknisk sjekk basert på definerte kriterier (f.eks. "bur", "brannslukker", "setefeste")

    Ved avvik: skriver årsak → logger som feil

    Mulig å sette status: OK / Ikke OK

5. Vektkontroll

    Søk opp kjøretøy via startnummer

    Registrer vekt → valider mot krav (fra klasse)

    Om vekt er OK → lagre

    Om ikke OK → generer automatisk rapport (PDF/tekst) og logg avvik

6. Logging og historikk

    Alle operasjoner logges per:

        Startnummer

        Arrangement

        Klubb

    Full revisjon av alt som har skjedd

    7. Superadmin
        Det skal være en superadmin som skal lage klubbene og tilegne en bruker til denne klubben.