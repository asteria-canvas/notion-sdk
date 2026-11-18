// src/client.ts
import { Client } from "@notionhq/client";
function createNotion(config) {
  let client = null;
  function getClient() {
    if (!client) {
      client = new Client({ auth: config.token, fetch: config.fetch });
    }
    return client;
  }
  async function getBlocksDeep(blockId) {
    const blocks = [];
    let cursor;
    do {
      const res = await getClient().blocks.children.list({
        block_id: blockId,
        page_size: 100,
        start_cursor: cursor
      });
      blocks.push(
        ...res.results.filter((b) => "type" in b)
      );
      cursor = res.has_more ? res.next_cursor ?? void 0 : void 0;
    } while (cursor);
    await Promise.all(
      blocks.map(async (block) => {
        if (block.has_children && block.type !== "table") {
          block.children = await getBlocksDeep(block.id);
        }
      })
    );
    return blocks;
  }
  return {
    /** The underlying @notionhq/client instance, for anything not wrapped here. */
    getClient,
    /** Retrieves the root database (requires `databaseId` in config). */
    getDatabase: async () => {
      if (!config.databaseId) throw new Error("createNotion: `databaseId` is required for getDatabase()");
      return await getClient().databases.retrieve({ database_id: config.databaseId });
    },
    /** Queries a data source by its configured name. Returns pages only. */
    query: async (source, params) => {
      return await getClient().dataSources.query({
        data_source_id: config.dataSources[source],
        ...params,
        result_type: "page"
      });
    },
    getPage: async (pageId) => {
      return await getClient().pages.retrieve({ page_id: pageId });
    },
    /** Fetches a single page (up to 100) of a block's direct children. */
    getBlocks: async (blockId) => {
      return await getClient().blocks.children.list({ block_id: blockId, page_size: 100 });
    },
    /** Fetches a block's children recursively, paginating and attaching `children`. */
    getBlocksDeep
  };
}

// src/helpers.ts
function getProp(page, key) {
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
        return r.array.map((item) => {
          if (item.type === "select") return item.select?.name ?? null;
          if (item.type === "rich_text") return item.rich_text.map((t) => t.plain_text).join("");
          if (item.type === "number") return item.number;
          return null;
        }).filter((v) => v !== null);
      return null;
    }
    default:
      return null;
  }
}
function slugify(text) {
  return text.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w぀-ヿ一-鿿-]/g, "").replace(/--+/g, "-").replace(/^-|-$/g, "");
}
function getSlug(page, options = {}) {
  const { slugKey = "slug", titleKey = "\u30BF\u30A4\u30C8\u30EB" } = typeof options === "string" ? { titleKey: options } : options;
  const explicit = getProp(page, slugKey);
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  const title = getProp(page, titleKey);
  if (typeof title === "string" && title.trim()) return slugify(title) || page.id;
  return page.id;
}
function getCoverUrl(cover) {
  if (cover?.type === "file") return cover.file.url;
  if (cover?.type === "external") return cover.external.url;
  return null;
}
function getIcon(page) {
  if (!page.icon) return null;
  if (page.icon.type === "emoji") return { type: "emoji", value: page.icon.emoji };
  if (page.icon.type === "icon")
    return {
      type: "img",
      value: `https://www.notion.so/icons/${page.icon.icon.name}_${page.icon.icon.color}.svg`
    };
  if (page.icon.type === "external") return { type: "img", value: page.icon.external.url };
  if (page.icon.type === "file") return { type: "img", value: page.icon.file.url };
  return null;
}
function renderRichText(richText, options = {}) {
  const { linkClass } = options;
  return richText.map((t) => {
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
  }).join("");
}
export {
  createNotion,
  getCoverUrl,
  getIcon,
  getProp,
  getSlug,
  renderRichText,
  slugify
};
