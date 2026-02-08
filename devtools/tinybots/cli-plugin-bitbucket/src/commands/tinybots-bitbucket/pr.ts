import { output } from '@aweave/cli-shared';
import { Args, Command, Flags } from '@oclif/core';

import { BitbucketClient } from '../../lib/client';

export class BitbucketPr extends Command {
  static description = 'Get pull request details';

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
  };

  async run() {
    const { args, flags } = await this.parse(BitbucketPr);
    const client = this.getClient(flags.workspace);
    const response = await client.getPR(args.repo, parseInt(args.pr_id, 10));
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
