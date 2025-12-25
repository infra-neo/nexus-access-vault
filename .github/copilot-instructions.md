# Nexus Access Vault - Copilot Instructions

## Project Overview

Nexus Access Vault is a comprehensive access management and resource provisioning platform. It provides organizations with centralized control over user access, device management, cloud provider integrations, and security policies. The platform features role-based access control (RBAC), audit logging, session management, and an enrollment wizard for streamlined onboarding.

**Key Features:**
- Multi-tenant organization management
- User and group management with RBAC
- Device enrollment and tracking
- Cloud provider and hypervisor integrations
- Headscale VPN integration
- Security policies and audit logging
- Session management and access monitoring
- Application marketplace for resource provisioning

## Tech Stack

- **Frontend Framework**: React 18.3.1
- **Language**: TypeScript 5.8.3
- **Build Tool**: Vite 5.4.19
- **UI Components**: shadcn-ui with Radix UI primitives
- **Styling**: Tailwind CSS 3.4.17
- **Routing**: React Router DOM 6.30.1
- **State Management**: TanStack React Query 5.83.0
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Form Handling**: React Hook Form 7.61.1 with Zod validation
- **Icons**: Lucide React 0.462.0
- **Development**: Node.js with npm/bun package managers

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn-ui base components
│   ├── apps/           # Application-specific components
│   ├── organizations/  # Organization management components
│   ├── policies/       # Policy management components
│   └── AuthProvider.tsx # Authentication context provider
├── pages/              # Route-level page components
│   ├── Dashboard.tsx
│   ├── Auth.tsx
│   ├── Users.tsx
│   ├── Organizations.tsx
│   └── ...
├── hooks/              # Custom React hooks
├── integrations/       # Third-party integrations
│   └── supabase/       # Supabase client and types
├── lib/                # Utility functions and helpers
└── main.tsx           # Application entry point

supabase/
├── functions/          # Supabase Edge Functions
└── migrations/         # Database migrations
```

## Coding Guidelines

### TypeScript

- Use TypeScript for all new files (.tsx for React components, .ts for utilities)
- Type safety is relaxed with `noImplicitAny: false` and `strictNullChecks: false`
- Avoid explicit type annotations when types can be inferred
- Use `any` type when necessary (project allows this)
- Path aliases use `@/` for imports from the `src/` directory

### React Components

- Use functional components with hooks
- Export components as default exports for pages
- Use named exports for utility components
- Component file names use PascalCase (e.g., `Dashboard.tsx`)
- Follow React Hooks rules (hooks at component top level, correct dependencies)

**Example Component Structure:**
```tsx
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function MyComponent() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    // Implementation
  };
  
  return (
    <div className="container mx-auto p-6">
      <Card>
        {/* Content */}
      </Card>
    </div>
  );
}
```

### Styling

- Use Tailwind CSS utility classes for all styling
- Follow mobile-first responsive design principles
- Use shadcn-ui components for consistent UI patterns
- Common container pattern: `<div className="container mx-auto p-6">`
- Use spacing utilities: `p-*` for padding, `m-*` for margin, `gap-*` for flex/grid gaps

### State Management

- Use React Query (@tanstack/react-query) for server state
- Use local component state (useState) for UI state
- Use Context API (AuthProvider) for global auth state
- Avoid prop drilling by using context when appropriate

### Data Fetching

- Use Supabase client from `@/integrations/supabase/client`
- Always handle loading and error states
- Use async/await for Supabase queries
- Check authentication status before sensitive operations

**Example Supabase Query:**
```tsx
const { data, error } = await supabase
  .from('profiles')
  .select('*, organizations(*)')
  .eq('id', userId)
  .single();

if (error) {
  console.error('Error loading profile:', error);
  return;
}
```

### Authentication

- Use `useAuth()` hook to access current user, session, profile, and roles
- Check user roles with `hasRole(role)` method
- Protected routes should verify authentication status
- Navigate to `/auth` for unauthenticated users

### Forms

- Use React Hook Form with Zod validation
- Use shadcn-ui form components for consistency
- Handle form errors gracefully with error messages
- Show loading states during submission

### ESLint Configuration

- Follows TypeScript ESLint recommended rules
- React Hooks plugin enforces hooks rules
- React Refresh plugin for fast refresh support
- Unused variables rule is disabled (`@typescript-eslint/no-unused-vars: off`)

### Error Handling

- Always catch and handle errors in async operations
- Log errors to console for debugging
- Show user-friendly error messages using toast notifications
- Use try-catch blocks for critical operations

### Performance

- Use lazy loading for route components when appropriate
- Memoize expensive computations with useMemo
- Optimize re-renders with useCallback for event handlers
- Leverage React Query caching for data fetching

## Key Conventions

- **File naming**: PascalCase for components, camelCase for utilities
- **Import ordering**: External libraries first, then internal imports with `@/`
- **Component organization**: UI components in `/components/ui/`, feature components in `/components/<feature>/`
- **Page components**: Place in `/pages/` directory, export as default
- **Routing**: Define routes in `App.tsx` with React Router
- **Icons**: Use Lucide React icons throughout the application

## Development Workflow

### Running the Application

```bash
npm install          # Install dependencies
npm run dev          # Start development server (port 8080)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Building and Testing

- Use `npm run lint` to check code quality before committing
- Use `npm run build` to verify production builds work
- Development server runs on port 8080

## Common Patterns

### Role-Based Access Control

```tsx
const { profile, hasRole } = useAuth();

if (hasRole('org_admin') || hasRole('global_admin')) {
  // Admin-only features
}
```

### Loading States

```tsx
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadData();
}, []);

const loadData = async () => {
  setLoading(true);
  try {
    // Fetch data
  } finally {
    setLoading(false);
  }
};

if (loading) {
  return <div>Loading...</div>;
}
```

### Dialog Components

- Use shadcn-ui Dialog components for modals
- Control dialog state with local useState
- Place dialog trigger buttons outside the dialog content
- Handle form submission within dialogs

## Supabase Integration

- Database client configured in `@/integrations/supabase/client`
- Authentication handles user sessions automatically
- Use Row Level Security (RLS) policies for data access control
- Real-time subscriptions available for live updates

## Important Notes

- This is a Lovable project (lovable.dev platform)
- Changes can be made via Lovable UI or local development
- Project uses both npm and bun (bun.lockb present)
- Environment variables stored in `.env` file
- Supabase URL and keys configured via environment variables
- TypeScript strict mode is relaxed for faster development

## Best Practices

- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use shadcn-ui components for consistent design
- Follow existing patterns in the codebase
- Write self-documenting code with clear variable names
- Add comments only for complex business logic
- Ensure responsive design for all new features
- Test authentication flows thoroughly
- Validate user input with Zod schemas
- Use semantic HTML elements for accessibility
