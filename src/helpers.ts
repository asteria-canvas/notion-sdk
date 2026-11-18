import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export type { PageObjectResponse };

/** Typed property extraction for the common Notion property types. */
export function getProp(page: PageObjectResponse, key: string) {
  const prop = page.properties[key];
  if (!prop) return null;
  switch (prop.type) {
    case "title":
      return prop.title.map((t) => t.plain_text).join("");
    case "rich_text":
      return prop.rich_text.map((t) => t.plain_text).join("");
    case "select":
      return prop.select?.name ?? null;
    case "multi_select":
      return prop.multi_select.map((o) => o.name);
    case "date":
      return prop.date?.start ?? null;
    case "url":
      return prop.url;
    case "number":
      return prop.number;
    case "checkbox":
      return prop.checkbox;
    case "relation":
      return prop.relation.map((r) => r.id);
    case "formula":
      return prop.formula.type === "string" ? prop.formula.string : "";
    case "rollup": {
      const r = prop.rollup;
      if (r.type === "number") return r.number;
      if (r.type === "date") return r.date?.start ?? null;
      if (r.type === "array")
        return r.array
          .map((item) => {
            if (item.type === "select") return item.select?.name ?? null;
            if (item.type === "rich_text") return item.rich_text.map((t) => t.plain_text).join("");
            if (item.type === "number") return item.number;
            return null;
          })
          .filter((v) => v !== null);
      return null;
    }
    default:
      return null;
  }
}

/** URL-safe slug. Keeps ASCII word chars, hiragana/katakana and CJK ideographs. */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w぀-ヿ一-鿿-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "");
}

export type GetSlugOptions = {
  /** Property holding an editor-controlled slug. Default: "slug". */
  slugKey?: string;
  /** Title property used as the fallback. Default: "タイトル". */
  titleKey?: string;
};

/**
 * Resolves the URL slug for a page: the editor-controlled slug property,
 * falling back to a slugified title, then the Notion page ID.
 */
export function getSlug(page: PageObjectResponse, options: GetSlugOptions | string = {}): string {
  // A bare string is accepted as titleKey for backwards compatibility.
  const { slugKey = "slug", titleKey = "タイトル" } =
    typeof options === "string" ? { titleKey: options } : options;
  const explicit = getProp(page, slugKey);
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  const title = getProp(page, titleKey);
  if (typeof title === "string" && title.trim()) return slugify(title) || page.id;
  return page.id;
}

export function getCoverUrl(cover: PageObjectResponse["cover"]): string | null {
  if (cover?.type === "file") return cover.file.url;
  if (cover?.type === "external") return cover.external.url;
  return null;
}

export function getIcon(page: PageObjectResponse): { type: "emoji" | "img"; value: string } | null {
  if (!page.icon) return null;
  if (page.icon.type === "emoji") return { type: "emoji", value: page.icon.emoji };
  if (page.icon.type === "icon")
    return {
      type: "img",
      value: `https://www.notion.so/icons/${page.icon.icon.name}_${page.icon.icon.color}.svg`,
    };
  if (page.icon.type === "external") return { type: "img", value: page.icon.external.url };
  if (page.icon.type === "file") return { type: "img", value: page.icon.file.url };
  return null;
}

export type RenderRichTextOptions = {
  /** CSS class applied to rendered links. Default: none. */
  linkClass?: string;
};

type RichTextItem = {
  plain_text: string;
  href?: string | null;
  annotations: { bold: boolean; italic: boolean; code: boolean };
};

/**
 * Converts Notion rich text to an HTML string (bold, italic, code, links).
 * Note: plain_text is inserted unescaped, matching the original behaviour.
 */
export function renderRichText(richText: RichTextItem[], options: RenderRichTextOptions = {}) {
  const { linkClass } = options;
  return richText
    .map((t) => {
      let text = t.plain_text.replace(/\n/g, "<br>");
      if (t.annotations.code) text = `<code>${text}</code>`;
      if (t.annotations.bold) text = `<strong>${text}</strong>`;
      if (t.annotations.italic) text = `<em>${text}</em>`;
      if (t.href) {
        const isExternal = /^https?:\/\//.test(t.href);
        const attrs = isExternal ? ` target="_blank" rel="noopener noreferrer"` : "";
        const cls = linkClass ? ` class="${linkClass}"` : "";
        text = `<a href="${t.href}"${attrs}${cls}>${text}</a>`;
      }
      return text;
    })
    .join("");
}
