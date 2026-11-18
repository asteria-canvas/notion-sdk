import { describe, expect, it } from "vitest";
import { getHeadingId, getListItemRichText, groupBlocks, parseImageBlock } from "../src";
import type { ImageBlock } from "../src";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

const block = (type: string, extra: Record<string, unknown> = {}) =>
  ({ id: `${type}-id`, type, ...extra }) as unknown as BlockObjectResponse;

const text = (plain_text: string, href: string | null = null) => ({ plain_text, href });

const image = (caption: ReturnType<typeof text>[], source: "file" | "external" = "external") =>
  ({
    id: "img",
    type: "image",
    image: {
      type: source,
      file: { url: "https://file.example/a.png" },
      external: { url: "https://ext.example/a.png" },
      caption,
    },
  }) as unknown as ImageBlock;

describe("getHeadingId", () => {
  it("slugifies the joined text", () => {
    expect(getHeadingId([text("Hello "), text("World")])).toBe("hello-world");
    expect(getHeadingId([text("はじめに")])).toBe("はじめに");
  });
});

describe("groupBlocks", () => {
  it("groups consecutive list items and keeps order", () => {
    const blocks = [
      block("paragraph"),
      block("bulleted_list_item"),
      block("bulleted_list_item"),
      block("numbered_list_item"),
      block("bulleted_list_item"),
      block("divider"),
    ];
    const g = groupBlocks(blocks);
    expect(g.map((x) => x.type)).toEqual([
      "single",
      "bulleted_list",
      "numbered_list",
      "bulleted_list",
      "single",
    ]);
    expect(g[1].type === "bulleted_list" && g[1].items).toHaveLength(2);
  });
  it("does not mutate input and handles empty", () => {
    const blocks = [block("bulleted_list_item")];
    groupBlocks(blocks);
    expect(blocks).toHaveLength(1);
    expect(groupBlocks([])).toEqual([]);
  });
});

describe("getListItemRichText", () => {
  it("reads both list types and returns [] otherwise", () => {
    const rt = [text("x")];
    expect(getListItemRichText(block("bulleted_list_item", { bulleted_list_item: { rich_text: rt } }))).toBe(rt);
    expect(getListItemRichText(block("numbered_list_item", { numbered_list_item: { rich_text: rt } }))).toBe(rt);
    expect(getListItemRichText(block("paragraph"))).toEqual([]);
  });
});

describe("parseImageBlock", () => {
  it("reads src for external and file images", () => {
    expect(parseImageBlock(image([], "external")).src).toBe("https://ext.example/a.png");
    expect(parseImageBlock(image([], "file")).src).toBe("https://file.example/a.png");
  });
  it("uses a piped URL from the caption and strips it", () => {
    const r = parseImageBlock(image([text("Nice photo | https://example.com/x")]));
    expect(r).toMatchObject({ caption: "Nice photo", href: "https://example.com/x" });
  });
  it("accepts a piped site-relative path", () => {
    expect(parseImageBlock(image([text("Cap | /pricing")])).href).toBe("/pricing");
  });
  it("ignores a pipe that is not followed by a URL", () => {
    const r = parseImageBlock(image([text("a | b")]));
    expect(r).toMatchObject({ caption: "a | b", href: null });
  });
  it("falls back to a link on the caption text", () => {
    const r = parseImageBlock(image([text("Click", "https://link.example")]));
    expect(r).toMatchObject({ caption: "Click", href: "https://link.example" });
  });
  it("returns no caption and no href when absent", () => {
    expect(parseImageBlock(image([]))).toMatchObject({ caption: "", href: null });
  });
});
