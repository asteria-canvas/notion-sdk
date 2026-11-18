import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { slugify } from "./helpers";

type PlainRichText = { plain_text: string };

export type ImageBlock = Extract<BlockObjectResponse, { type: "image" }>;

/** Joins rich text into plain text (no HTML). */
export function getPlainText(richText: PlainRichText[]): string {
  return richText.map((t) => t.plain_text).join("");
}

/** Anchor id for a heading, derived from its text. Matches `slugify`. */
export function getHeadingId(richText: PlainRichText[]): string {
  return slugify(getPlainText(richText));
}

export type GroupedBlock<T extends BlockObjectResponse = BlockObjectResponse> =
  | { type: "bulleted_list"; items: T[] }
  | { type: "numbered_list"; items: T[] }
  | { type: "single"; block: T };

/**
 * Groups consecutive list items into one bulleted/numbered list so renderers
 * can emit a single <ul>/<ol>. All other blocks pass through as "single".
 * Does not mutate the input.
 */
export function groupBlocks<T extends BlockObjectResponse>(blocks: T[]): GroupedBlock<T>[] {
  const grouped: GroupedBlock<T>[] = [];
  for (const block of blocks) {
    if (block.type === "bulleted_list_item" || block.type === "numbered_list_item") {
      const listType = block.type === "bulleted_list_item" ? "bulleted_list" : "numbered_list";
      const last = grouped[grouped.length - 1];
      if (last?.type === listType) {
        last.items.push(block);
      } else {
        grouped.push({ type: listType, items: [block] });
      }
    } else {
      grouped.push({ type: "single", block });
    }
  }
  return grouped;
}

/** Rich text of a bulleted/numbered list item; empty for any other block. */
export function getListItemRichText(block: BlockObjectResponse) {
  if (block.type === "bulleted_list_item") return block.bulleted_list_item.rich_text;
  if (block.type === "numbered_list_item") return block.numbered_list_item.rich_text;
  return [];
}

export type ParsedImage = {
  src: string;
  /** Caption text with any trailing `| url` link removed. */
  caption: string;
  /** Link target, or null when the image isn't linked. */
  href: string | null;
};

/**
 * Extracts src, caption and link from an image block.
 *
 * The Notion API doesn't expose an image's native link, so the href comes from
 * the caption: "Caption text | https://example.com" (the URL is stripped from
 * the displayed caption), otherwise a link set on the caption text itself.
 */
export function parseImageBlock(block: ImageBlock): ParsedImage {
  const src = block.image.type === "file" ? block.image.file.url : block.image.external.url;
  const rawCaption = getPlainText(block.image.caption);
  const pipe = rawCaption.lastIndexOf("|");
  const piped = pipe >= 0 ? rawCaption.slice(pipe + 1).trim() : "";
  const hasPipedHref = /^(https?:\/\/|\/)\S+$/.test(piped);
  const caption = hasPipedHref ? rawCaption.slice(0, pipe).trim() : rawCaption;
  const href = hasPipedHref ? piped : (block.image.caption.find((t) => t.href)?.href ?? null);
  return { src, caption, href };
}
