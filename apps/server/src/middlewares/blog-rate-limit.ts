import rateLimit from 'express-rate-limit';

const envelope = { code: 429, msg: '操作太频繁，请稍后再试', data: null };

export const commentLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: envelope,
});

export const likeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: envelope,
});

export const viewLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: envelope,
});
