import { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  GroupFilterOperatorArray,
  PropertyFilter,
  TimestampFilter,
} from "@notionhq/client/build/src/api-endpoints";

export type NotionConfig<TSources extends Record<string, string>> = {
  /** Notion integration token. */
  token: string;
  /** Root database ID. Only needed for `getDatabase()`. */
  databaseId?: string;
  /** Map of friendly names to data source IDs, e.g. { ARTICLES: "..." }. */
  dataSources: TSources;
  /** Custom fetch (e.g. `fetch.bind(globalThis)` on Cloudflare Workers). */
  fetch?: typeof fetch;
};

export type QueryParams = {
  filter?:
    | { or: GroupFilterOperatorArray }
    | { and: GroupFilterOperatorArray }
    | PropertyFilter
    | TimestampFilter;
  filter_properties?: string[];
  sorts?: Array<
    | { property: string; direction: "ascending" | "descending" }
    | { timestamp: "created_time" | "last_edited_time"; direction: "ascending" | "descending" }
  >;
};

export type BlockWithChildren = BlockObjectResponse & { children?: BlockWithChildren[] };

/**
 * Creates a Notion client wrapper. State is per-instance (no module singleton),
 * and the underlying @notionhq/client is created lazily on first use.
 */
export function createNotion<TSources extends Record<string, string>>(
  config: NotionConfig<TSources>,
) {
  let client: Client | null = null;

  function getClient(): Client {
    if (!client) {
      client = new Client({ auth: config.token, fetch: config.fetch });
    }
    return client;
  }

  async function getBlocksDeep(blockId: string): Promise<BlockWithChildren[]> {
    const blocks: BlockWithChildren[] = [];
    let cursor: string | undefined;
    do {
      const res = await getClient().blocks.children.list({
        block_id: blockId,
        page_size: 100,
        start_cursor: cursor,
      });
      blocks.push(
        ...(res.results.filter((b): b is BlockObjectResponse => "type" in b) as BlockWithChildren[]),
      );
      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    } while (cursor);

    await Promise.all(
      blocks.map(async (block) => {
        // `table` rows are fetched by the consumer's table renderer.
        if (block.has_children && block.type !== "table") {
          block.children = await getBlocksDeep(block.id);
        }
      }),
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
    query: async (source: keyof TSources & string, params?: QueryParams) => {
      return await getClient().dataSources.query({
        data_source_id: config.dataSources[source],
        ...params,
        result_type: "page",
      });
    },

    getPage: async (pageId: string) => {
      return await getClient().pages.retrieve({ page_id: pageId });
    },

    /** Fetches a single page (up to 100) of a block's direct children. */
    getBlocks: async (blockId: string) => {
      return await getClient().blocks.children.list({ block_id: blockId, page_size: 100 });
    },

    /** Fetches a block's children recursively, paginating and attaching `children`. */
    getBlocksDeep,
  };
}

export type Notion<TSources extends Record<string, string>> = ReturnType<
  typeof createNotion<TSources>
>;
