/**
 * Bitbucket API client with MCP-style responses.
 *
 * Port of Python tinybots/bitbucket/client.py.
 * Auto-fetches all pages for paginated Bitbucket API endpoints.
 */

import {
  ContentType,
  createPaginatedResponse,
  HTTPClient,
  HTTPClientError,
  MCPContent,
  MCPError,
  MCPResponse,
} from '@aweave/cli-shared';

import {
  parsePRComment,
  parsePRTask,
  parsePullRequest,
  type PRComment,
  type PRTask,
} from './models';

export class BitbucketClient {
  private static readonly BASE_URL = 'https://api.bitbucket.org/2.0';

  private workspace: string;
  private http: HTTPClient;

  constructor(workspace: string, username: string, appPassword: string) {
    this.workspace = workspace;
    this.http = new HTTPClient({
      baseUrl: BitbucketClient.BASE_URL,
      auth: { username, password: appPassword },
      headers: { Accept: 'application/json' },
    });
  }

  private repoPath(repoSlug: string): string {
    return `/repositories/${this.workspace}/${repoSlug}`;
  }

  /**
   * Fetch all pages from a Bitbucket paginated endpoint.
   */
  private async fetchAllPages(
    path: string,
    params?: Record<string, string>,
    maxItems = 500,
  ): Promise<[Record<string, unknown>[], number | undefined]> {
    const allItems: Record<string, unknown>[] = [];
    let totalCount: number | undefined;
    const queryParams = { ...params, pagelen: '100' };

    let currentUrl: string | undefined;
    let firstRequest = true;

    while (true) {
      let data: Record<string, unknown>;
      if (firstRequest) {
        data = await this.http.get(path, queryParams);
        firstRequest = false;
      } else {
        data = await this.http.getUrl(currentUrl!);
      }

      const values = (data.values ?? []) as Record<string, unknown>[];
      allItems.push(...values);

      if (totalCount === undefined) {
        totalCount = data.size as number | undefined;
      }

      currentUrl = data.next as string | undefined;
      if (!currentUrl || allItems.length >= maxItems) break;
    }

    return [allItems.slice(0, maxItems), totalCount];
  }

  async getPR(repoSlug: string, prId: number): Promise<MCPResponse> {
    try {
      const path = `${this.repoPath(repoSlug)}/pullrequests/${prId}`;
      const data = await this.http.get(path);
      const pr = parsePullRequest(data);

      return new MCPResponse({
        success: true,
        content: [
          new MCPContent({
            type: ContentType.JSON,
            data: pr as unknown as Record<string, unknown>,
          }),
        ],
        metadata: {
          workspace: this.workspace,
          repo_slug: repoSlug,
          resource_type: 'pull_request',
        },
      });
    } catch (e) {
      if (e instanceof HTTPClientError) {
        return new MCPResponse({
          success: false,
          error: new MCPError({
            code: e.code,
            message: e.message,
            suggestion: e.suggestion,
          }),
        });
      }
      throw e;
    }
  }

  async listPRComments(
    repoSlug: string,
    prId: number,
    maxItems = 500,
  ): Promise<MCPResponse> {
    try {
      const path = `${this.repoPath(repoSlug)}/pullrequests/${prId}/comments`;
      const [allData, totalCount] = await this.fetchAllPages(
        path,
        undefined,
        maxItems,
      );

      const comments = allData.map(parsePRComment);

      return createPaginatedResponse({
        items: comments,
        total: totalCount ?? comments.length,
        hasMore: false,
        nextOffset: undefined,
        formatter: (c: PRComment) =>
          new MCPContent({
            type: ContentType.JSON,
            data: c as unknown as Record<string, unknown>,
          }),
        metadata: {
          workspace: this.workspace,
          repo_slug: repoSlug,
          pr_id: prId,
          resource_type: 'pr_comments',
        },
      });
    } catch (e) {
      if (e instanceof HTTPClientError) {
        return new MCPResponse({
          success: false,
          error: new MCPError({
            code: e.code,
            message: e.message,
            suggestion: e.suggestion,
          }),
        });
      }
      throw e;
    }
  }

  async listPRTasks(
    repoSlug: string,
    prId: number,
    maxItems = 500,
  ): Promise<MCPResponse> {
    try {
      const path = `${this.repoPath(repoSlug)}/pullrequests/${prId}/tasks`;
      const [allData, totalCount] = await this.fetchAllPages(
        path,
        undefined,
        maxItems,
      );

      const tasks = allData.map(parsePRTask);

      return createPaginatedResponse({
        items: tasks,
        total: totalCount ?? tasks.length,
        hasMore: false,
        nextOffset: undefined,
        formatter: (t: PRTask) =>
          new MCPContent({
            type: ContentType.JSON,
            data: t as unknown as Record<string, unknown>,
          }),
        metadata: {
          workspace: this.workspace,
          repo_slug: repoSlug,
          pr_id: prId,
          resource_type: 'pr_tasks',
        },
      });
    } catch (e) {
      if (e instanceof HTTPClientError) {
        return new MCPResponse({
          success: false,
          error: new MCPError({
            code: e.code,
            message: e.message,
            suggestion: e.suggestion,
          }),
        });
      }
      throw e;
    }
  }
}
