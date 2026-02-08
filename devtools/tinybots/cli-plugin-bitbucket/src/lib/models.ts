/**
 * Bitbucket data models.
 *
 * Port of Python tinybots/bitbucket/models.py.
 * Interfaces + factory functions replace Python dataclasses.
 */

export interface BitbucketUser {
  uuid: string;
  display_name: string;
  account_id: string | null;
}

export interface PRComment {
  id: number;
  content: string;
  author: BitbucketUser;
  file_path: string | null;
  line: number | null;
  created_on: string | null;
}

export interface PRTask {
  id: number;
  content: string;
  state: 'RESOLVED' | 'UNRESOLVED';
  comment_id: number | null;
  creator: BitbucketUser | null;
}

export interface PullRequest {
  id: number;
  title: string;
  description: string | null;
  author: BitbucketUser;
  source_branch: string;
  destination_branch: string;
  state: 'OPEN' | 'MERGED' | 'DECLINED' | 'SUPERSEDED';
  created_on: string | null;
}

// Factory functions

export function parseBitbucketUser(
  data: Record<string, unknown>,
): BitbucketUser {
  return {
    uuid: (data.uuid as string) ?? '',
    display_name: (data.display_name as string) ?? 'Unknown',
    account_id: (data.account_id as string) ?? null,
  };
}

export function parsePRComment(data: Record<string, unknown>): PRComment {
  const inline = (data.inline ?? {}) as Record<string, unknown>;
  const contentObj = (data.content ?? {}) as Record<string, unknown>;

  return {
    id: (data.id as number) ?? 0,
    content: (contentObj.raw as string) ?? '',
    author: parseBitbucketUser((data.user ?? {}) as Record<string, unknown>),
    file_path: (inline.path as string) ?? null,
    line: (inline.to as number) ?? null,
    created_on: (data.created_on as string) ?? null,
  };
}

export function parsePRTask(data: Record<string, unknown>): PRTask {
  const comment = (data.comment ?? {}) as Record<string, unknown>;
  const contentObj = (data.content ?? {}) as Record<string, unknown>;
  const creatorData = data.creator as Record<string, unknown> | undefined;

  return {
    id: (data.id as number) ?? 0,
    content: (contentObj.raw as string) ?? '',
    state: ((data.state as string) ?? 'UNRESOLVED') as
      | 'RESOLVED'
      | 'UNRESOLVED',
    comment_id: comment.id != null ? (comment.id as number) : null,
    creator: creatorData ? parseBitbucketUser(creatorData) : null,
  };
}

export function parsePullRequest(data: Record<string, unknown>): PullRequest {
  const source = (data.source ?? {}) as Record<string, unknown>;
  const sourceBranch = (source.branch ?? {}) as Record<string, unknown>;
  const dest = (data.destination ?? {}) as Record<string, unknown>;
  const destBranch = (dest.branch ?? {}) as Record<string, unknown>;

  return {
    id: (data.id as number) ?? 0,
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? null,
    author: parseBitbucketUser((data.author ?? {}) as Record<string, unknown>),
    source_branch: (sourceBranch.name as string) ?? '',
    destination_branch: (destBranch.name as string) ?? '',
    state: ((data.state as string) ?? 'OPEN') as PullRequest['state'],
    created_on: (data.created_on as string) ?? null,
  };
}
