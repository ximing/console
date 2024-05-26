import type { UserInfoDto } from '@x-console/dto';

// Extend Express Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: UserInfoDto;
    }
  }
}
