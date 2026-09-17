# Dwesk PABX API Docs

VitePress documentation site for the Dwesk PABX API, deployed to GitHub Pages.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

Pushes to `main` build and publish via `.github/workflows/deploy.yml`.

Enable it once in the repo under Settings, Pages, Source, GitHub Actions.

The site is served under `/dxesk-pabx-api-docs/`. If you rename the repo, update `base` in
`.vitepress/config.mts` to match.

## Structure

```
guide/       getting started, auth, base URLs, TypeScript setup
api/         endpoint reference
webhooks/    inbound event reference
reference/   error codes, cause codes, audio, shared types
```

## Credentials

No real credentials are committed. Samples use placeholders such as
`<BASE64_USER_COLON_PASS>` and `<YOUR_COMPANY_ID>`. Keep it that way, because the site is
public.
