# notion-sdk

Reusable helpers for using Notion as a CMS: a client factory, typed property
extraction, recursive block fetching, slug helpers and rich text rendering.

## Install

Installed from git; pin to a tag.

```bash
pnpm add github:asteria-canvas/notion-sdk#v0.1.0
```

`@notionhq/client` (v5) is a peer dependency, so install it in the consumer too.

## Usage

```ts
import { createNotion, getProp, getSlug, renderRichText } from "notion-sdk";

const notion = createNotion({
  token: process.env.NOTION_ACCESS_TOKEN!,
  databaseId: process.env.NOTION_DATABASE_ID,
  dataSources: { ARTICLES: "…", SUB_CATEGORIES: "…" },
  // fetch: fetch.bind(globalThis), // Cloudflare Workers / Pages
});

const { results } = await notion.query("ARTICLES", {
  filter: { property: "ステータス", status: { equals: "完了" } },
});
const blocks = await notion.getBlocksDeep(results[0].id);
```

In Astro, read env via `import.meta.env` in your own wrapper and pass it in; the
SDK itself never touches `import.meta.env` or `process.env`.

### Helpers (no client needed)

`getProp`, `slugify`, `getSlug(page, { slugKey, titleKey })`, `getCoverUrl`,
`getIcon`, `renderRichText(richText, { linkClass })`.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

`dist/` is **committed** because consumers install from git. Run `pnpm build`
and commit `dist/` before tagging a release. `pnpm check:dist` fails if it's stale.

## Releasing

```bash
pnpm build && git add -A && git commit -m "release vX.Y.Z"
git tag vX.Y.Z
```
