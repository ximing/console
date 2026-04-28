import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { bindServices, register, resolve, RSRoot, RSStrict } from '@rabjs/react';
import './index.css';
import App from './App.tsx';

import { AuthService } from './services/auth.service';
import { BlogService } from './services/blog.service';
import { DirectoryService } from './services/directory.service';
import { ThemeService } from './services/theme.service';
import { ToastService } from './services/toast.service';
import { TagService } from './services/tag.service';
import { UserService } from './services/user.service';
import { UserModelService } from './services/user-model.service';
import { TaskService } from './services/task.service';
import { NotificationService } from './services/notification.service';
import { ApiTokenService } from './services/api-token.service';
import { GithubService } from './pages/github/github.service';
import { MiniMaxTokenService } from './services/minimax-token.service';

/**
 * Register services globally
 * These are accessible throughout the entire application
 */
const AppWithServices = bindServices(App, []);
register(AuthService);
register(BlogService);
register(DirectoryService);
register(ThemeService);
register(ToastService);
register(UserService);
register(UserModelService);
register(TaskService);
register(NotificationService);
register(TagService);
register(ApiTokenService);
register(GithubService);
register(MiniMaxTokenService)
// Initialize theme before rendering
resolve(ThemeService).loadTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RSRoot>
      <RSStrict>
        <AppWithServices />
      </RSStrict>
    </RSRoot>
  </StrictMode>
);
