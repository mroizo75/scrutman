# Weglot Oversettelse Setup

Denne appen er konfigurert for å bruke Weglot for automatisk oversettelse til fransk.

## Setup Instruksjoner

### 1. Opprett Weglot-konto
- Gå til [Weglot Dashboard](https://dashboard.weglot.com/)
- Opprett en gratis konto
- Legg til ditt domene

### 2. Få API-nøkkel
- I Weglot dashboard, gå til "API Keys"
- Kopier din API-nøkkel

### 3. Konfigurer miljøvariabler
Opprett en `.env.local` fil i prosjektroten med følgende innhold:

```env
NEXT_PUBLIC_WEGLOT_API_KEY=din_weglot_api_nøkkel_her
```

### 4. Start applikasjonen
```bash
npm run dev
```

## Funksjoner

- **Automatisk oversettelse**: All tekst oversettes automatisk til fransk
- **Språkvelger**: Brukere kan bytte mellom engelsk og fransk
- **SEO-optimalisert**: Weglot håndterer hreflang-tagger og språkspesifikke URL-er
- **Redigerbare oversettelser**: Du kan redigere oversettelser i Weglot dashboard

## Konfigurasjon

Weglot er konfigurert med følgende innstillinger:
- **Originalspråk**: Engelsk (en)
- **Målspråk**: Fransk (fr)
- **Språkvelger**: Dropdown med flagg
- **Stil**: Moderne knapp-design

## Hvordan det fungerer

1. Weglot JavaScript-biblioteket lastes inn på alle sider
2. Når siden lastes, analyserer Weglot all tekst
3. Tekst oversettes automatisk til fransk
4. En språkvelger vises for brukere
5. Oversettelser kan redigeres i Weglot dashboard

## Support

For spørsmål om Weglot, se [Weglot dokumentasjon](https://developers.weglot.com/) eller kontakt Weglot support.
