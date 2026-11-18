import { describe, expect, it } from "vitest";
import { getProp, getSlug, renderRichText, slugify } from "../src";
import type { PageObjectResponse } from "../src";

const page = (properties: Record<string, unknown>) =>
  ({ id: "page-id", properties }) as unknown as PageObjectResponse;

describe("slugify", () => {
  it("lowercases and hyphenates ASCII", () => {
    expect(slugify("  Hello World!  ")).toBe("hello-world");
  });
  it("keeps Japanese characters", () => {
    expect(slugify("お知らせ 2026")).toBe("お知らせ-2026");
  });
  it("returns empty string when nothing survives", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("getProp", () => {
  it("reads title, select, multi_select and number", () => {
    const p = page({
      t: { type: "title", title: [{ plain_text: "a" }, { plain_text: "b" }] },
      s: { type: "select", select: { name: "x" } },
      m: { type: "multi_select", multi_select: [{ name: "1" }, { name: "2" }] },
      n: { type: "number", number: 3 },
    });
    expect(getProp(p, "t")).toBe("ab");
    expect(getProp(p, "s")).toBe("x");
    expect(getProp(p, "m")).toEqual(["1", "2"]);
    expect(getProp(p, "n")).toBe(3);
  });
  it("returns null for missing properties", () => {
    expect(getProp(page({}), "nope")).toBeNull();
  });
});

describe("getSlug", () => {
  const title = { type: "title", title: [{ plain_text: "My Title" }] };
  it("prefers the explicit slug", () => {
    const p = page({ slug: { type: "rich_text", rich_text: [{ plain_text: " custom " }] }, タイトル: title });
    expect(getSlug(p)).toBe("custom");
  });
  it("falls back to slugified title", () => {
    expect(getSlug(page({ タイトル: title }))).toBe("my-title");
  });
  it("falls back to page id", () => {
    expect(getSlug(page({}))).toBe("page-id");
  });
  it("supports custom keys", () => {
    expect(getSlug(page({ Name: title }), { titleKey: "Name" })).toBe("my-title");
  });
});

describe("renderRichText", () => {
  const base = { bold: false, italic: false, code: false };
  it("applies annotations and converts newlines", () => {
    const html = renderRichText([
      { plain_text: "a\nb", annotations: { ...base, bold: true } },
    ]);
    expect(html).toBe("<strong>a<br>b</strong>");
  });
  it("renders external links with rel and optional class", () => {
    const html = renderRichText(
      [{ plain_text: "x", href: "https://e.com", annotations: base }],
      { linkClass: "link" },
    );
    expect(html).toBe(
      '<a href="https://e.com" target="_blank" rel="noopener noreferrer" class="link">x</a>',
    );
  });
  it("omits class when no linkClass given and keeps internal links in-tab", () => {
    const html = renderRichText([{ plain_text: "x", href: "/a", annotations: base }]);
    expect(html).toBe('<a href="/a">x</a>');
  });
});
