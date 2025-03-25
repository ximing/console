import { JsonController, Get, QueryParam, Res, UseBefore, Req } from 'routing-controllers';
import { Service } from 'typedi';

import { config } from '../../config/config.js';
import { BlogVisitorService } from '../../services/blog-visitor.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { createOAuthState, consumeOAuthState } from '../../utils/oauth-state.js';
import { requireVisitor } from '../../middlewares/visitor-auth.js';

import type { Request, Response } from 'express';

@Service()
@JsonController('/api/v1/blog/auth')
export class BlogAuthController {
  constructor(private blogVisitorService: BlogVisitorService) {}

  @Get('/github')
  startGithubAuth(@QueryParam('origin') origin: string, @Res() res: Response) {
    const allowed = config.blog.allowedOrigins;
    const target = allowed.includes(origin) ? origin : allowed[0];
    const state = createOAuthState(target);
    const url =
      `https://github.com/login/oauth/authorize?client_id=${config.blog.githubClientId}` +
      `&redirect_uri=${encodeURIComponent(config.blog.githubCallbackUrl)}` +
      `&scope=read:user&state=${state}`;
    return res.redirect(url);
  }

  @Get('/github/callback')
  async githubCallback(
    @QueryParam('code') code: string,
    @QueryParam('state') state: string,
    @Res() res: Response
  ) {
    const entry = consumeOAuthState(state);
    if (!entry || !code) {
      return res.status(400).type('html').send('<p>授权已过期，请关闭窗口重试。</p>');
    }

    try {
      const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: config.blog.githubClientId,
          client_secret: config.blog.githubClientSecret,
          code,
        }),
      });
      const tokenData = (await tokenResp.json()) as { access_token?: string };
      if (!tokenData.access_token) throw new Error('no access_token');

      const userResp = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'x-console-blog-auth',
          Accept: 'application/vnd.github+json',
        },
      });
      const profile = (await userResp.json()) as {
        id: number;
        login: string;
        name?: string | null;
        avatar_url?: string;
      };

      const visitor = await this.blogVisitorService.upsertFromGithubProfile(profile);
      const token = this.blogVisitorService.signToken(visitor.id);

      return res.type('html').send(`<!doctype html><html><body><script>
        if (window.opener) {
          window.opener.postMessage({ type: 'blog-auth', token: ${JSON.stringify(token)} }, ${JSON.stringify(entry.origin)});
        }
        window.close();
      </script><p>登录成功，正在关闭窗口…</p></body></html>`);
    } catch (error) {
      logger.error('blog github oauth callback error:', error);
      return res.status(500).type('html').send('<p>登录失败，请关闭窗口重试。</p>');
    }
  }

  @Get('/me')
  @UseBefore(requireVisitor)
  me(@Req() req: Request) {
    const v = req.visitor!;
    return ResponseUtility.success({
      id: v.id,
      githubId: v.githubId,
      login: v.login,
      name: v.name ?? undefined,
      avatarUrl: v.avatarUrl ?? undefined,
      status: v.status,
      createdAt: v.createdAt.toISOString(),
      lastLoginAt: v.lastLoginAt.toISOString(),
    });
  }
}
