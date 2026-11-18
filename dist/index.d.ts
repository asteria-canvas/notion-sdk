import * as _notionhq_client_build_src_api_endpoints from '@notionhq/client/build/src/api-endpoints';
import { BlockObjectResponse, GroupFilterOperatorArray, PropertyFilter, TimestampFilter, PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
export { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import * as _notionhq_client from '@notionhq/client';
import { Client } from '@notionhq/client';

type NotionConfig<TSources extends Record<string, string>> = {
    /** Notion integration token. */
    token: string;
    /** Root database ID. Only needed for `getDatabase()`. */
    databaseId?: string;
    /** Map of friendly names to data source IDs, e.g. { ARTICLES: "..." }. */
    dataSources: TSources;
    /** Custom fetch (e.g. `fetch.bind(globalThis)` on Cloudflare Workers). */
    fetch?: typeof fetch;
};
type QueryParams = {
    filter?: {
        or: GroupFilterOperatorArray;
    } | {
        and: GroupFilterOperatorArray;
    } | PropertyFilter | TimestampFilter;
    filter_properties?: string[];
    sorts?: Array<{
        property: string;
        direction: "ascending" | "descending";
    } | {
        timestamp: "created_time" | "last_edited_time";
        direction: "ascending" | "descending";
    }>;
};
type BlockWithChildren = BlockObjectResponse & {
    children?: BlockWithChildren[];
};
/**
 * Creates a Notion client wrapper. State is per-instance (no module singleton),
 * and the underlying @notionhq/client is created lazily on first use.
 */
declare function createNotion<TSources extends Record<string, string>>(config: NotionConfig<TSources>): {
    /** The underlying @notionhq/client instance, for anything not wrapped here. */
    getClient: () => Client;
    /** Retrieves the root database (requires `databaseId` in config). */
    getDatabase: () => Promise<_notionhq_client.GetDatabaseResponse>;
    /** Queries a data source by its configured name. Returns pages only. */
    query: (source: keyof TSources & string, params?: QueryParams) => Promise<_notionhq_client_build_src_api_endpoints.PageOrDataSourceListResponse>;
    getPage: (pageId: string) => Promise<_notionhq_client.GetPageResponse>;
    /** Fetches a single page (up to 100) of a block's direct children. */
    getBlocks: (blockId: string) => Promise<_notionhq_client.ListBlockChildrenResponse>;
    /** Fetches a block's children recursively, paginating and attaching `children`. */
    getBlocksDeep: (blockId: string) => Promise<BlockWithChildren[]>;
};
type Notion<TSources extends Record<string, string>> = ReturnType<typeof createNotion<TSources>>;

/** Typed property extraction for the common Notion property types. */
declare function getProp(page: PageObjectResponse, key: string): string | number | boolean | (string | number)[] | null;
/** URL-safe slug. Keeps ASCII word chars, hiragana/katakana and CJK ideographs. */
declare function slugify(text: string): string;
type GetSlugOptions = {
    /** Property holding an editor-controlled slug. Default: "slug". */
    slugKey?: string;
    /** Title property used as the fallback. Default: "タイトル". */
    titleKey?: string;
};
/**
 * Resolves the URL slug for a page: the editor-controlled slug property,
 * falling back to a slugified title, then the Notion page ID.
 */
declare function getSlug(page: PageObjectResponse, options?: GetSlugOptions | string): string;
declare function getCoverUrl(cover: PageObjectResponse["cover"]): string | null;
declare function getIcon(page: PageObjectResponse): {
    type: "emoji" | "img";
    value: string;
} | null;
type RenderRichTextOptions = {
    /** CSS class applied to rendered links. Default: none. */
    linkClass?: string;
};
type RichTextItem = {
    plain_text: string;
    href?: string | null;
    annotations: {
        bold: boolean;
        italic: boolean;
        code: boolean;
    };
};
/**
 * Converts Notion rich text to an HTML string (bold, italic, code, links).
 * Note: plain_text is inserted unescaped, matching the original behaviour.
 */
declare function renderRichText(richText: RichTextItem[], options?: RenderRichTextOptions): string;

export { type BlockWithChildren, type GetSlugOptions, type Notion, type NotionConfig, type QueryParams, type RenderRichTextOptions, createNotion, getCoverUrl, getIcon, getProp, getSlug, renderRichText, slugify };
