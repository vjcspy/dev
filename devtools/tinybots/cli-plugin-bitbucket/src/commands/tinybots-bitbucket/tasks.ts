import { output } from '@aweave/cli-shared';
import { Args, Command, Flags } from '@oclif/core';

import { BitbucketClient } from '../../lib/client';

export class BitbucketTasks extends Command {
  static description = 'List all PR tasks (auto-fetches all pages)';

  static args = {
    repo: Args.string({ required: true, description: 'Repository slug' }),
    pr_id: Args.string({ required: true, description: 'Pull request ID' }),
  };

  static flags = {
    workspace: Flags.string({
      default: 'tinybots',
      description: 'Bitbucket workspace',
    }),
    format: Flags.string({
      default: 'json',
      options: ['json', 'markdown'],
      description: 'Output format',
    }),
    max: Flags.integer({ default: 500, description: 'Maximum items to fetch' }),
  };

  async run() {
    const { args, flags } = await this.parse(BitbucketTasks);
    const client = this.getClient(flags.workspace);
    const response = await client.listPRTasks(
      args.repo,
      parseInt(args.pr_id, 10),
      flags.max,
    );
    output(response, flags.format);
  }

  private getClient(workspace: string): BitbucketClient {
    const username = process.env.BITBUCKET_USER;
    const password = process.env.BITBUCKET_APP_PASSWORD;
    if (!username || !password) {
      this.error(
        'BITBUCKET_USER and BITBUCKET_APP_PASSWORD environment variables required.',
      );
    }
    return new BitbucketClient(workspace, username, password);
  }
}
