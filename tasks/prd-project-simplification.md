# PRD: Project Simplification and Restructuring

## Introduction

This project is being migrated and simplified from a full-featured AI-powered note-taking system (AIMO) to a minimal boilerplate with only user authentication. The goal is to create a clean, well-documented foundation for future features while removing all memo/note-taking, AI, vector database, and other complex functionality.

## Goals

- Create a minimal viable project with only user registration and login
- Replace LanceDB with MySQL using Drizzle ORM
- Maintain current frontend tech stack (React 19 + Vite + Tailwind) with light/dark theme support
- Maintain current backend tech stack (Express.js + routing-controllers + TypeDI)
- Keep shared DTOs in `packages/dto` for type safety
- Generate comprehensive CLAUDE.md documentation for future development
- Remove all unnecessary code, dependencies, and files

## User Stories

### US-001: Update CLAUDE.md with simplified project documentation
**Description:** As a developer, I need comprehensive documentation so I can understand the project structure and conventions for future development.

**Acceptance Criteria:**
- [ ] CLAUDE.md includes detailed overview of monorepo structure
- [ ] Documents all development commands (dev, build, test, lint)
- [ ] Explains frontend architecture (React 19, routing, state management, theming)
- [ ] Explains backend architecture (Express, controllers, services, DI pattern)
- [ ] Documents MySQL/Drizzle setup and migration system
- [ ] Includes code style and TypeScript configuration details
- [ ] Provides examples for common tasks (adding endpoints, DTOs, etc.)
- [ ] Lists environment variables with descriptions
- [ ] Typecheck passes

### US-002: Remove LanceDB and vector-related dependencies
**Description:** As a developer, I need to remove all LanceDB and vector database code so the project uses only MySQL.

**Acceptance Criteria:**
- [ ] Remove LanceDB dependencies from package.json
- [ ] Delete `src/sources/lancedb.ts` and related files
- [ ] Remove all embedding/vector-related services (EmbeddingService, MultimodalEmbeddingService)
- [ ] Remove OpenAI and AI-related dependencies
- [ ] Update environment variables to remove LanceDB configuration
- [ ] Typecheck passes
- [ ] Build succeeds

### US-003: Set up MySQL with Drizzle ORM
**Description:** As a developer, I need MySQL configured with Drizzle ORM so we have a proper relational database foundation.

**Acceptance Criteria:**
- [ ] Install mysql2 and drizzle-orm dependencies
- [ ] Create Drizzle connection configuration in `src/db/connection.ts`
- [ ] Set up drizzle.config.ts for migrations
- [ ] Create users table schema with Drizzle
- [ ] Create initial migration for users table
- [ ] Update .env.example with MySQL connection variables
- [ ] Add migration npm scripts to package.json
- [ ] Typecheck passes
- [ ] Migrations run successfully

### US-004: Simplify database schema to users only
**Description:** As a developer, I need to remove all non-user tables so the database only contains authentication data.

**Acceptance Criteria:**
- [ ] Remove all memo-related schemas (memos, attachments, categories, tags, relations)
- [ ] Remove AI-related schemas (conversations, messages, daily-recommendations)
- [ ] Remove push-rules schema
- [ ] Keep only users table with fields: id, email, password, username, avatar, createdAt, updatedAt
- [ ] Delete old migration files
- [ ] Create fresh migration with users table only
- [ ] Typecheck passes

### US-005: Implement user registration endpoint
**Description:** As a user, I want to register a new account so I can access the application.

**Acceptance Criteria:**
- [ ] Create RegisterDto in packages/dto with email, password, username fields
- [ ] Create POST /api/v1/auth/register endpoint in auth.controller.ts
- [ ] Implement UserService.register() with bcrypt password hashing
- [ ] Validate email format and uniqueness
- [ ] Return JWT token and user info on success
- [ ] Return appropriate error codes for validation failures
- [ ] Typecheck passes
- [ ] Test with curl/Postman

### US-006: Implement user login endpoint
**Description:** As a user, I want to log in to my account so I can access protected features.

**Acceptance Criteria:**
- [ ] Create LoginDto in packages/dto with email and password fields
- [ ] Create POST /api/v1/auth/login endpoint in auth.controller.ts
- [ ] Implement UserService.login() with bcrypt password verification
- [ ] Return JWT token and user info on success
- [ ] Return 401 for invalid credentials
- [ ] Typecheck passes
- [ ] Test with curl/Postman

### US-007: Implement JWT authentication middleware
**Description:** As a developer, I need JWT authentication middleware so I can protect endpoints.

**Acceptance Criteria:**
- [ ] Keep existing auth-handler middleware
- [ ] Update to work with MySQL user lookup
- [ ] Verify JWT token and attach user to request
- [ ] Return 401 for missing/invalid tokens
- [ ] Typecheck passes

### US-008: Clean up backend services and controllers
**Description:** As a developer, I need to remove all non-auth services and controllers so the codebase is minimal.

**Acceptance Criteria:**
- [ ] Remove all controllers except auth.controller and user.controller
- [ ] Remove all services except user.service and auth.service (if separate)
- [ ] Remove attachment, memo, AI, OCR, ASR, category, tag, push-rule services
- [ ] Remove scheduler service and related code
- [ ] Remove channel/notification services
- [ ] Update src/controllers/index.ts to only register remaining controllers
- [ ] Typecheck passes
- [ ] Build succeeds

### US-009: Implement frontend registration page
**Description:** As a user, I want a registration form so I can create a new account.

**Acceptance Criteria:**
- [ ] Create registration form component with email, username, password fields
- [ ] Add form validation (email format, password length)
- [ ] Call POST /api/v1/auth/register on submit
- [ ] Store JWT token in localStorage on success
- [ ] Redirect to home page after successful registration
- [ ] Show error messages for validation failures
- [ ] Works in both light and dark themes
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-010: Implement frontend login page
**Description:** As a user, I want a login form so I can access my account.

**Acceptance Criteria:**
- [ ] Create login form component with email and password fields
- [ ] Call POST /api/v1/auth/login on submit
- [ ] Store JWT token in localStorage on success
- [ ] Redirect to home page after successful login
- [ ] Show error message for invalid credentials
- [ ] Works in both light and dark themes
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-011: Implement light/dark theme toggle
**Description:** As a user, I want to switch between light and dark themes so I can use the app comfortably in different environments.

**Acceptance Criteria:**
- [ ] Create ThemeService with localStorage persistence
- [ ] Add theme toggle button in header/navbar
- [ ] Apply theme using Tailwind's dark mode (class strategy)
- [ ] Theme persists across page refreshes
- [ ] Default to system preference on first visit
- [ ] Smooth transition between themes
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-012: Create minimal home page for authenticated users
**Description:** As a user, I want to see a welcome page after logging in so I know authentication worked.

**Acceptance Criteria:**
- [ ] Create simple home page showing "Welcome, [username]"
- [ ] Display user avatar if available
- [ ] Add logout button that clears token and redirects to login
- [ ] Protected route - redirects to login if not authenticated
- [ ] Works in both light and dark themes
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-013: Clean up frontend pages and components
**Description:** As a developer, I need to remove all memo/gallery/AI-related pages so the frontend is minimal.

**Acceptance Criteria:**
- [ ] Remove pages: gallery, ai-explore, settings (except theme)
- [ ] Remove components: memo-editor, attachment-uploader, calendar-heatmap, tag-input, etc.
- [ ] Remove all memo/AI-related services and API calls
- [ ] Keep only: auth pages, home page, theme toggle, protected route
- [ ] Update router to only include remaining routes
- [ ] Typecheck passes
- [ ] Build succeeds

### US-014: Update shared DTOs package
**Description:** As a developer, I need to update the DTOs package to only include auth-related types.

**Acceptance Criteria:**
- [ ] Remove all memo, attachment, AI, category, tag DTOs
- [ ] Keep/create: UserDto, LoginDto, RegisterDto, UserInfoDto
- [ ] Rebuild DTO package successfully
- [ ] Both frontend and backend import from @aimo-console/dto
- [ ] Typecheck passes in all packages

### US-015: Clean up dependencies and package.json files
**Description:** As a developer, I need to remove unused dependencies so the project is lean.

**Acceptance Criteria:**
- [ ] Remove LanceDB, vectordb, Apache Arrow dependencies
- [ ] Remove OpenAI, AI SDK dependencies
- [ ] Remove OCR, ASR, image processing dependencies
- [ ] Remove file storage adapters (S3, OSS) - keep local only if needed
- [ ] Remove unused frontend dependencies
- [ ] Run pnpm install to update lockfile
- [ ] Verify all apps build successfully
- [ ] Typecheck passes

### US-016: Update environment configuration
**Description:** As a developer, I need updated .env.example files so configuration is clear.

**Acceptance Criteria:**
- [ ] Update apps/server/.env.example with only required variables
- [ ] Include: DATABASE_URL, JWT_SECRET, PORT, CORS_ORIGIN
- [ ] Remove: OpenAI, LanceDB, S3, OSS, AI-related variables
- [ ] Add comments explaining each variable
- [ ] Update root .env.example if exists
- [ ] Typecheck passes

### US-017: Update Docker configuration
**Description:** As a developer, I need updated Docker files so the simplified app can be containerized.

**Acceptance Criteria:**
- [ ] Update Dockerfile to remove LanceDB setup
- [ ] Add MySQL connection in docker-compose.yml
- [ ] Remove migration-specific Docker files (Dockerfile.migrate, docker-compose.migrate.yml)
- [ ] Update Makefile commands for new setup
- [ ] Test docker build succeeds
- [ ] Document Docker setup in CLAUDE.md

### US-018: Update migration system
**Description:** As a developer, I need a clean migration system for MySQL so schema changes are manageable.

**Acceptance Criteria:**
- [ ] Remove all existing migration scripts in src/migrations/scripts/
- [ ] Create single initial migration: 001-create-users-table.ts
- [ ] Update migration executor to work with Drizzle
- [ ] Remove LanceDB-specific migration code
- [ ] Test migrations run successfully
- [ ] Document migration workflow in CLAUDE.md
- [ ] Typecheck passes

### US-019: Clean up configuration files
**Description:** As a developer, I need to remove unused config files and update relevant ones.

**Acceptance Criteria:**
- [ ] Remove electron-related configs (apps/client/)
- [ ] Update ESLint configs to remove unused rules
- [ ] Update tsconfig files to remove unused paths
- [ ] Clean up turbo.json pipeline if needed
- [ ] Remove unused scripts from package.json files
- [ ] Typecheck passes
- [ ] Build succeeds

### US-020: Remove task and documentation artifacts
**Description:** As a developer, I need to clean up old task files and documentation.

**Acceptance Criteria:**
- [ ] Remove tasks/archive/ directory completely
- [ ] Remove old PRD files (prd-lancedb-to-mysql-migration.md, etc.)
- [ ] Remove DOCKER_MIGRATION_GUIDE.md, QUICK_START_MIGRATION.md
- [ ] Remove scripts/ralph/ directory
- [ ] Keep only: README.md, CLAUDE.md, LICENSE, this PRD
- [ ] Update README.md to reflect simplified project
- [ ] Typecheck passes

## Functional Requirements

**Authentication:**
- FR-1: System must support user registration with email, username, and password
- FR-2: System must hash passwords using bcrypt before storage
- FR-3: System must validate email format and uniqueness during registration
- FR-4: System must support user login with email and password
- FR-5: System must issue JWT tokens on successful authentication
- FR-6: System must protect routes using JWT middleware
- FR-7: System must return appropriate error codes for auth failures

**Database:**
- FR-8: System must use MySQL as the primary database
- FR-9: System must use Drizzle ORM for database operations
- FR-10: System must support database migrations via Drizzle
- FR-11: System must store only user data (no memos, attachments, etc.)

**Frontend:**
- FR-12: Frontend must support light and dark themes
- FR-13: Theme preference must persist in localStorage
- FR-14: Frontend must display registration and login forms
- FR-15: Frontend must store JWT token in localStorage
- FR-16: Frontend must redirect unauthenticated users to login
- FR-17: Frontend must display authenticated user info on home page

**Architecture:**
- FR-18: Shared types must be defined in packages/dto
- FR-19: Backend must use routing-controllers for endpoints
- FR-20: Backend must use TypeDI for dependency injection
- FR-21: Business logic must be in service classes
- FR-22: Frontend must use React 19 + Vite + Tailwind
- FR-23: Frontend must use @rabjs/react for state management

## Non-Goals (Out of Scope)

- No memo/note-taking functionality
- No AI features (chat, embeddings, recommendations)
- No file attachments or media handling
- No OCR or ASR capabilities
- No vector database or semantic search
- No push notifications or scheduled tasks
- No social features (sharing, public memos)
- No category or tag management
- No Electron desktop client
- No Chrome extension
- No advanced user features (profile editing, avatar upload, password reset)
- No S3/OSS cloud storage integration
- No email verification or two-factor authentication

## Design Considerations

**Frontend:**
- Reuse existing Tailwind configuration for theming
- Keep minimal component library (buttons, forms, inputs)
- Simple, clean UI focused on authentication flow
- Responsive design for mobile and desktop

**Backend:**
- Maintain existing architectural patterns (controllers → services → database)
- Keep middleware structure (error handling, auth)
- Simple user table schema with essential fields only
- Standard REST API conventions

## Technical Considerations

**Dependencies to Keep:**
- Frontend: React 19, React Router, Vite, Tailwind, @rabjs/react, axios
- Backend: Express, routing-controllers, TypeDI, Drizzle ORM, mysql2, bcrypt, jsonwebtoken
- Shared: TypeScript, ESLint, Prettier

**Dependencies to Remove:**
- LanceDB, vectordb, Apache Arrow
- OpenAI SDK, AI SDK
- OCR libraries (tesseract, zhipu)
- ASR libraries (OpenAI Whisper)
- S3/OSS SDKs
- Image processing libraries
- Electron dependencies
- Any other AI/ML related packages

**Database Schema:**
```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Environment Variables:**
```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/dbname

# JWT
JWT_SECRET=your-super-secret-key-at-least-32-characters-long

# Server
PORT=3000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

## Success Metrics

- Codebase reduced by >80% (measured by lines of code)
- All unnecessary dependencies removed
- Build time reduced significantly
- Clear, comprehensive documentation in CLAUDE.md
- Successful user registration and login flow
- Theme switching works seamlessly
- All typechecks pass
- Docker build succeeds with new setup

## Implementation Order

**Phase 1: Backend Cleanup (US-002, US-003, US-004, US-008, US-018)**
1. Remove LanceDB and vector dependencies
2. Set up MySQL with Drizzle
3. Simplify database schema to users only
4. Clean up services and controllers
5. Update migration system

**Phase 2: Backend Auth (US-005, US-006, US-007)**
1. Implement registration endpoint
2. Implement login endpoint
3. Verify JWT middleware works

**Phase 3: Frontend Cleanup (US-013, US-014)**
1. Remove unnecessary pages and components
2. Update shared DTOs package

**Phase 4: Frontend Auth & Theme (US-009, US-010, US-011, US-012)**
1. Implement registration page
2. Implement login page
3. Implement theme toggle
4. Create minimal home page

**Phase 5: Cleanup & Documentation (US-001, US-015, US-016, US-017, US-019, US-020)**
1. Update CLAUDE.md with comprehensive documentation
2. Clean up dependencies
3. Update environment configuration
4. Update Docker configuration
5. Clean up config files
6. Remove old documentation artifacts

## Open Questions

- Should we keep any example CRUD feature (e.g., simple todo list) to demonstrate patterns?
- Do we need a user profile page or is the home page sufficient?
- Should we implement logout endpoint on backend or just clear token client-side?
- Do we need any admin/system endpoints (health check, version info)?
- Should avatar be a URL field or should we implement avatar upload?
