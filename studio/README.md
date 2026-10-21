# Diego Suarez — Sanity Studio

This Studio manages the music project catalog for Sanity project `rr2covtm`, dataset `production`.

## Local development

From the repository root:

```sh
npm --prefix studio ci
npm run dev:studio
```

Open the URL printed by the CLI (normally `http://localhost:3333`) and sign in with the GitHub account that has access to this Sanity project. CLI login and Studio browser login are separate sessions; do not put an API token in the frontend.

## Editing projects

Open **Proyectos musicales**, create a document and fill in the title, artist, cover and alternative text, format, year, contribution roles and description. The description is limited to 160 characters so it can fit the mobile record layout.

Use **Orden en el carrusel** to sort projects (lowest number first) and **Mostrar en la web** to control visibility. Save unfinished work as a draft; publish only when ready. The Spotify and Apple Music controls remain placeholders without URLs, as requested.

The portfolio must be connected separately to read published documents from this dataset. Publishing in Studio stores the content in Sanity; the frontend integration determines when it appears on the website.

## Checks

```sh
npm --prefix studio run typecheck
npm run build:studio
```

## Hosting the panel

When ready to publish the Studio, run `npm --prefix studio run deploy` and choose an available Studio hostname. This is separate from deploying the portfolio on Vercel. No Studio deployment is performed automatically by the portfolio build.

The project owner manages invitations in Sanity Manage. Each editor should use their own account; no shared passwords are needed.
