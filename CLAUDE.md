# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude (via Anthropic API) to generate React components based on natural language descriptions. The app features a split-screen interface with a chat interface on the left and a live preview/code editor on the right.

## Key Commands

### Setup and Development
```bash
npm run setup          # Install dependencies, generate Prisma client, and run migrations
npm run dev           # Start development server with Turbopack
npm run dev:daemon    # Start dev server as background daemon (logs to logs.txt)
npm run build         # Build for production
npm test              # Run Vitest tests
npm run lint          # Run ESLint
```

### Database
```bash
npx prisma generate        # Generate Prisma client
npx prisma migrate dev     # Run database migrations
npm run db:reset           # Reset database (force)
npx prisma studio          # Open Prisma Studio for database inspection
```

### Testing
```bash
npm test                              # Run all tests in watch mode
npm test -- --run                     # Run all tests once
npm test -- path/to/test.test.tsx     # Run specific test file
```

## Architecture

### Core Concepts

**Virtual File System (VFS)**: The application uses an in-memory file system (`VirtualFileSystem` class in `src/lib/file-system.ts`) to store generated code without writing to disk. Files are persisted to the database as JSON when users are authenticated.

**AI Tool Integration**: The chat API (`src/app/api/chat/route.ts`) provides two AI tools to Claude:
- `str_replace_editor`: View, create, and edit files using string replacement or insertion
- `file_manager`: Rename and delete files/folders

**Mock Provider**: If no `ANTHROPIC_API_KEY` is set, the app falls back to `MockLanguageModel` (in `src/lib/provider.ts`) which generates static React components to demonstrate functionality without API calls.

### Application Flow

1. User sends a message via `ChatInterface` component
2. Message is sent to `/api/chat` route with current VFS state and conversation history
3. Claude generates code using the two file-editing tools
4. Tool calls are streamed back and executed on the VFS
5. `FileSystemContext` syncs the VFS state with React components
6. `PreviewFrame` compiles and renders the generated code using Babel standalone
7. For authenticated users, VFS state and messages are persisted to Prisma database

### Data Flow

- **Client State**: `FileSystemContext` manages VFS instance and file selection state
- **Chat State**: `ChatContext` manages messages and streaming from the AI
- **Database**: Projects store serialized VFS state in `data` field (JSON) and messages in `messages` field (JSON array)
- **Session**: JWT-based authentication stored in HTTP-only cookies (see `src/lib/auth.ts`)

### Important File Structures

**VFS Operations**: All file operations go through `VirtualFileSystem` class methods:
- Files are stored in a Map with normalized paths (always start with `/`)
- Parent directories are created automatically
- The root `/App.jsx` file is the entry point for generated apps

**Component Generation**: Generated React components must:
- Export a default export
- Use Tailwind CSS for styling (not inline styles)
- Import other project files using `@/` alias (e.g., `import Counter from '@/components/Counter'`)
- Not create HTML files (App.jsx is the entry point)

**Preview Rendering**: `PreviewFrame` (`src/components/preview/PreviewFrame.tsx`):
- Uses Babel standalone to transpile JSX to JavaScript in the browser
- Runs in an isolated environment without access to node_modules
- Only React and React-DOM are available as external dependencies

## Database Schema

The app uses Prisma with SQLite (`prisma/dev.db`). Key models:

- **User**: `id`, `email`, `password` (bcrypt hashed), timestamps
- **Project**: `id`, `name`, `userId`, `messages` (JSON string), `data` (JSON string with VFS state), timestamps
  - `userId` is optional (supports anonymous projects)
  - Cascade delete when user is deleted

## Authentication

JWT-based auth using `jose` library:
- Tokens stored in HTTP-only cookies
- Session verification in middleware for project routes
- Anonymous users can create projects without authentication (tracked via `anon-work-tracker.ts`)

## Testing

Tests use Vitest with React Testing Library:
- Test files are colocated in `__tests__` directories
- Tests use `jsdom` environment for DOM manipulation
- Path aliases (`@/`) are configured via `vite-tsconfig-paths`

## Tech Stack Details

- **Next.js 15**: App Router with React Server Components
- **React 19**: Latest with concurrent features
- **Tailwind CSS v4**: Latest major version
- **Vercel AI SDK**: For streaming AI responses with tool support
- **Monaco Editor**: Code editor with syntax highlighting
- **Babel Standalone**: Browser-based JSX compilation for preview
- **Prisma**: ORM with SQLite (output to `src/generated/prisma`)

## Code Generation Prompt

The system prompt for Claude is in `src/lib/prompts/generation.tsx`. Key constraints:
- Must create `/App.jsx` as root file with default export
- Use Tailwind CSS (no hardcoded styles)
- Import non-library files with `@/` alias
- No HTML files (App.jsx is entry point)
- Virtual FS operates on root route `/`
- Use comments sparingly. Only comment complex code.
- The database schema is defined in @prisma/schema.prisma. Reference it anytime you need to understand the data stored in the database.