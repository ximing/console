import { Container } from 'typedi';

import { ErrorCode } from '../constants/error-codes.js';
import { BlogVisitorService } from '../services/blog-visitor.service.js';

import type { NextFunction, Request, Response } from 'express';

function extractToken(req: Request): string | null {
  return req.headers.authorization?.replace('Bearer ', '') || null;
}

/** Attaches req.visitor when a valid active visitor token is present; never rejects. */
export async function optionalVisitor(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const visitor = await Container.get(BlogVisitorService).resolveToken(token);
    if (visitor && visitor.status === 'active') {
      req.visitor = visitor;
    }
  }
  next();
}

/** Requires an active visitor; 401 { code: 5003 } when missing, { code: 5001 } when blocked. */
export async function requireVisitor(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  const visitor = token ? await Container.get(BlogVisitorService).resolveToken(token) : null;
  if (!visitor) {
    res.status(401).json({ code: ErrorCode.VISITOR_UNAUTHORIZED, msg: '请先使用 GitHub 登录', data: null });
    return;
  }
  if (visitor.status === 'blocked') {
    res.status(403).json({ code: ErrorCode.VISITOR_BLOCKED, msg: '账号已被限制，无法执行该操作', data: null });
    return;
  }
  req.visitor = visitor;
  next();
}
