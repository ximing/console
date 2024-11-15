# Blog Visual Redesign - Tailwind/CSS Implementation Plan

**Version:** 1.0
**Date:** 2026-04-01
**Status:** Ready for Implementation
**Based on:** `2026-04-01-blog-visual-design.md`

---

## 1. CSS Architecture

### 1.1 Design Tokens as CSS Custom Properties

The design spec defines semantic tokens. These should be implemented as CSS custom properties in `index.css` to enable:
- Easy theming via CSS variable overrides
- Dark mode via `html.dark` class
- Consistent reference across all components

**Proposed CSS Variable Structure:**

```css
/* Light Theme (default) */
:root {
  /* Primary - Green Scale */
  --color-primary-50: #f0fdf4;
  --color-primary-100: #dcfce7;
  --color-primary-200: #bbf7d0;
  --color-primary-300: #86efac;
  --color-primary-400: #4ade80;
  --color-primary-500: #22c55e;  /* Primary accent */
  --color-primary-600: #16a34a;
  --color-primary-700: #15803d;
  --color-primary-800: #166534;
  --color-primary-900: #145231;
  --color-primary-950: #0d3422;

  /* Semantic Surfaces */
  --color-bg-primary: #ffffff;
  --color-bg-surface: #f9fafb;
  --color-bg-elevated: #ffffff;
  --color-bg-overlay: rgba(249, 250, 251, 0.8);

  /* Text */
  --color-text-primary: #111827;
  --color-text-secondary: #374151;
  --color-text-muted: #6b7280;
  --color-text-disabled: #9ca3af;

  /* Borders */
  --color-border-default: #e5e7eb;
  --color-border-subtle: #f3f4f6;
  --color-border-focus: #22c55e;

  /* Status Colors */
  --color-success-bg: #ecfdf5;
  --color-success-text: #059669;
  --color-warning-bg: #fffbeb;
  --color-warning-text: #d97706;
  --color-error-bg: #fef2f2;
  --color-error-text: #dc2626;
}

/* Dark Theme */
html.dark {
  /* Semantic Surfaces */
  --color-bg-primary: #09090b;
  --color-bg-surface: #18181b;
  --color-bg-elevated: #27272a;
  --color-bg-overlay: rgba(24, 24, 27, 0.8);

  /* Text */
  --color-text-primary: #fafafa;
  --color-text-secondary: #a1a1aa;
  --color-text-muted: #71717a;
  --color-text-disabled: #52525b;

  /* Borders */
  --color-border-default: #27272a;
  --color-border-subtle: #3f3f46;
  --color-border-focus: #4ade80;

  /* Status Colors */
  --color-success-bg: rgba(16, 185, 129, 0.1);
  --color-success-text: #34d399;
  --color-warning-bg: rgba(245, 158, 11, 0.1);
  --color-warning-text: #fbbf24;
  --color-error-bg: rgba(239, 68, 68, 0.1);
  --color-error-text: #f87171;
}
```

### 1.2 Dark Mode Strategy

**Decision: Use `html.dark` class strategy (already in place)**

Current implementation uses `html.dark` which is correct. The Tailwind config already has `darkMode: 'class'`.

Benefits:
- Works with Tailwind's `dark:` variant
- Can be toggled without page reload
- Matches the design spec approach

### 1.3 index.css Structure

**Proposed structure for clean theming:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* === BASE LAYER === */
@layer base {
  :root {
    /* Design tokens as CSS variables */
    --color-primary: #22c55e;
    /* ... all tokens from section 1.1 */
  }

  html.dark {
    /* Dark theme overrides */
  }

  /* Element defaults */
  body { ... }
  /* ... */
}

/* === COMPONENTS LAYER === */
@layer components {
  /* Reusable component classes if needed */
}

/* === UTILITIES LAYER === */
@layer utilities {
  /* Custom utilities */
}
```

**Key existing styles to preserve:**
- Custom scrollbar (webkit and Firefox)
- Focus ring (`:focus-visible`)
- Reduced motion (`@media (prefers-reduced-motion: reduce)`)
- Table styles (already well-structured)
- Color picker dark mode overrides

**Styles to update:**
- Root font family (add Inter from Google Fonts)
- Scrollbar dark mode colors (use zinc palette)

---

## 2. Tailwind Config Changes

### 2.1 Color Tokens

**Current state:** Already has `primary` scale and `dark` scale (custom).

**Changes needed:**
1. Keep `primary` scale (it's already correct)
2. **Replace `dark` scale with `zinc`** - the `dark:` prefix in Tailwind doesn't map to a `dark:` color key; it uses `darkMode: 'class'` to apply dark variants. Components currently use `dark:bg-dark-900` but should use `dark:bg-zinc-900`.

**Updated tailwind.config.js colors section:**

```javascript
colors: {
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#145231',
    950: '#0d3422',
  },
  // Use zinc for dark theme surfaces (standard Tailwind)
  // zinc-50: #fafafa
  // zinc-100: #f5f5f5
  // ...
  // zinc-900: #18181b (sidebar bg)
  // zinc-950: #09090b (app bg)
},
```

**Note:** Remove the `dark:` color scale entirely. Dark mode is handled via Tailwind's `dark:` variant which reads the same color scales but interprets them for dark contexts, OR by explicitly using zinc color names with `dark:` prefix.

### 2.2 Extend Theme with Semantic Colors

```javascript
theme: {
  extend: {
    colors: {
      // Existing primary scale...
      surface: {
        primary: 'var(--color-bg-primary)',
        secondary: 'var(--color-bg-surface)',
        elevated: 'var(--color-bg-elevated)',
        overlay: 'var(--color-bg-overlay)',
      },
      text: {
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        muted: 'var(--color-text-muted)',
        disabled: 'var(--color-text-disabled)',
      },
      border: {
        default: 'var(--color-border-default)',
        subtle: 'var(--color-border-subtle)',
        focus: 'var(--color-border-focus)',
      },
    },
    // ... existing extensions
  },
},
```

### 2.3 Custom Shadows with Dark Mode Support

The design spec defines different shadow values for dark mode. Add these to `boxShadow`:

```javascript
boxShadow: {
  'xs': '0 1px 2px rgba(0,0,0,0.04)',
  'xs-dark': '0 1px 2px rgba(0,0,0,0.3)',
  'sm': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
  'sm-dark': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
  'md': '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
  'md-dark': '0 4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)',
  'lg': '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
  'lg-dark': '0 10px 15px rgba(0,0,0,0.5), 0 4px 6px rgba(0,0,0,0.4)',
  'xl': '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)',
  'xl-dark': '0 20px 25px rgba(0,0,0,0.6), 0 10px 10px rgba(0,0,0,0.5)',
  '2xl': '0 25px 50px rgba(0,0,0,0.15)',
  '2xl-dark': '0 25px 50px rgba(0,0,0,0.7)',
},
```

### 2.4 Custom Transition Timing

```javascript
transitionTimingFunction: {
  'bounce-in': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
},
```

### 2.5 Font Family - Add Inter

```javascript
fontFamily: {
  // ... existing
  sans: ['Inter', 'Noto Sans JP', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', 'monospace'],
},
```

**Note:** This requires adding Inter via Google Fonts in `index.html` or via `@import` in CSS.

### 2.6 Animation Duration

```javascript
transitionDuration: {
  'fast': '100ms',
  'normal': '150ms',
  'slow': '200ms',
  'slower': '300ms',
},
```

---

## 3. File-by-File Implementation Plan

### 3.1 `apps/web/src/index.css`

**Changes:**

| Section | Current | Change To |
|---------|---------|-----------|
| Root variables | Uses `color-scheme: light` with hardcoded colors | Add CSS custom properties for all design tokens |
| Font family | System stack | Add Inter via `@import` |
| Scrollbar (dark) | `dark-700` | `zinc-800` |
| Focus ring | Uses `#22c55e` directly | Use `var(--color-primary)` |
| Scrollbar thumb (dark) | `#4b5563` | `#3f3f46` (zinc-800) |
| Scrollbar thumb hover (dark) | `#6b7280` | `#52525b` (zinc-600) |

**New additions:**
- All CSS custom properties from section 1.1
- Dark theme override block with zinc palette
- `@import` for Google Fonts (Inter)

### 3.2 `apps/web/tailwind.config.js`

**Changes:**

| Section | Current | Change To |
|---------|---------|-----------|
| `dark:` color scale | Custom `dark: { 50-950 }` | Remove entirely - use standard zinc |
| `primary` scale | Already correct | No change needed |
| `fontFamily.sans` | Only Noto Sans JP | Add Inter as first choice |
| `fontFamily.mono` | Not defined | Add JetBrains Mono |
| `scale` | Has 102 | Keep (1.02 for card hover) |
| Shadows | Default Tailwind shadows | Add dark mode variants |

**New additions:**
- Semantic color extensions (surface, text, border)
- Custom shadow scale with dark variants
- Transition timing function for bounce-in
- Extended transition durations

### 3.3 `apps/web/src/pages/blogs/components/blog-card.tsx`

**Changes to className strings:**

| Line | Current | Change To |
|------|---------|-----------|
| 40 | `bg-white dark:bg-dark-900` | `bg-white dark:bg-zinc-900` |
| 40 | `border-gray-200 dark:border-dark-700/60` | `border-gray-200/80 dark:border-zinc-800/80` |
| 40 | `hover:shadow-lg dark:hover:shadow-black/20` | `hover:shadow-md dark:hover:shadow-md-dark` |
| 40 | Remove `transition-all` and add specific transitions | `transition-all duration-200 ease-out` |
| 43 | Gradient overlay | Already correct per spec |
| 50 | `group-hover:text-primary-600 dark:group-hover:text-primary-400` | Already correct |
| 67 | `text-gray-600 dark:text-gray-400/80` | `text-gray-600 dark:text-zinc-400` |

**Note:** The BlogCard is already well-implemented with primary colors. Main changes are:
- Border opacity from `/60` to `/80`
- Shadow improvements
- Using zinc instead of dark-900

### 3.4 `apps/web/src/pages/blogs/components/sidebar/index.tsx`

**Changes:**

| Element | Current | Change To |
|---------|---------|-----------|
| Container bg | `bg-white/80 dark:bg-dark-900/80` | `bg-white/80 dark:bg-zinc-900/80` |
| Border | `border-gray-200/60 dark:border-dark-700/50` | `border-gray-200/60 dark:border-zinc-800/50` |
| Action button text | `text-gray-600 dark:text-gray-400` | `text-gray-600 dark:text-zinc-400` |
| Action button hover | `hover:bg-gray-100/80 dark:hover:bg-dark-700/50` | `hover:bg-gray-100/80 dark:hover:bg-zinc-800/50` |

### 3.5 `apps/web/src/pages/blogs/components/sidebar/search-button.tsx`

**Changes:**

| Current | Change To |
|---------|--------|
| `text-gray-500 dark:text-gray-400` | `text-gray-500 dark:text-zinc-400` |
| `hover:bg-gray-100/80 dark:hover:bg-dark-700/50` | `hover:bg-gray-100/80 dark:hover:bg-zinc-800/50` |

### 3.6 `apps/web/src/pages/blogs/components/sidebar/sidebar-tabs.tsx`

**Changes:** Minimal - already follows spec closely

| Current | Change To |
|---------|--------|
| `border-b border-gray-100/80 dark:border-dark-700/50` | `border-b border-gray-100/80 dark:border-zinc-800/50` |

### 3.7 `apps/web/src/pages/blogs/components/sidebar/recent-blog-list.tsx`

**Changes:**

| Element | Current | Change To |
|---------|---------|-----------|
| Item hover | `hover:bg-gray-100/70 dark:hover:bg-dark-700/50` | `hover:bg-gray-100/70 dark:hover:bg-zinc-800/50` |
| Selected | `bg-primary-50/80 dark:bg-primary-900/20` | Already correct per spec |
| Empty text | `text-gray-500 dark:text-gray-400` | `text-gray-500 dark:text-zinc-500` |

### 3.8 `apps/web/src/pages/blogs/components/directory-tree/index.tsx`

**Changes:**

| Element | Current | Change To |
|---------|---------|-----------|
| "All blogs" item | `text-gray-700 dark:text-gray-300` | `text-gray-700 dark:text-zinc-300` |
| "All blogs" hover | `hover:bg-gray-100/70 dark:hover:bg-dark-700/50` | `hover:bg-gray-100/70 dark:hover:bg-zinc-800/50` |
| Empty text | `text-gray-500 dark:text-gray-400` | `text-gray-500 dark:text-zinc-500` |

### 3.9 `apps/web/src/pages/blogs/components/directory-tree/TreeNode.tsx`

**Changes:**

| Element | Current | Change To |
|---------|---------|-----------|
| Item default | `hover:bg-gray-100/70 dark:hover:bg-dark-700/50 text-gray-700 dark:text-gray-300` | `hover:bg-gray-100/70 dark:hover:bg-zinc-800/50 text-gray-700 dark:text-zinc-300` |
| Item selected | `bg-primary-50/80 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400` | Already correct per spec |
| Hover action buttons | `hover:bg-gray-200/80 dark:hover:bg-dark-600` | `hover:bg-gray-200/80 dark:hover:bg-zinc-700` |
| Chevron color | `text-gray-400 dark:text-gray-500` | `text-gray-400 dark:text-zinc-500` |
| Action icon color | `text-gray-500 dark:text-gray-400` | `text-gray-500 dark:text-zinc-400` |

### 3.10 `apps/web/src/pages/blogs/blogs.tsx`

**Changes:**

| Element | Current | Change To |
|---------|---------|-----------|
| Content area bg | `bg-gray-50 dark:bg-dark-900` | `bg-gray-50 dark:bg-zinc-950` |

---

## 4. Migration Strategy

### Phase 1: Foundation (CSS + Tailwind Config)

**Step 1.1:** Update `index.css`
- Add Google Fonts import (Inter)
- Add CSS custom properties for all design tokens
- Update scrollbar dark mode colors
- Preserve all existing utilities (scrollbar, focus, tables, etc.)

**Step 1.2:** Update `tailwind.config.js`
- Remove custom `dark:` color scale
- Add semantic color extensions
- Add custom shadow variants with dark mode
- Add transition timing functions
- Update font families

**Validation:** Run `pnpm dev:web` and verify:
- No console errors
- Dark mode toggle works
- All colors render correctly

### Phase 2: Component Migration

**Step 2.1:** Migrate Sidebar components
- `sidebar/index.tsx`
- `sidebar/search-button.tsx`
- `sidebar/sidebar-tabs.tsx`
- `sidebar/recent-blog-list.tsx`

**Step 2.2:** Migrate Tree components
- `directory-tree/index.tsx`
- `directory-tree/TreeNode.tsx`

**Step 2.3:** Migrate BlogCard
- `blog-card.tsx`

**Step 2.4:** Update main blogs page
- `blogs.tsx`

**Validation:** Each component should be tested in both light and dark modes.

### Phase 3: Polish

**Step 3.1:** Verify hover states
- Card hover with scale transform
- Button press states
- Focus rings

**Step 3.2:** Verify animations
- Duration values match spec
- Easing curves correct

**Step 3.3:** Accessibility check
- Focus visible on all interactive elements
- Color contrast (WCAG AA)
- Reduced motion support

---

## 5. Priority Order

### Priority 1: Foundation (Must do first)
1. `apps/web/src/index.css` - CSS variables and base styles
2. `apps/web/tailwind.config.js` - Tailwind extensions

### Priority 2: Core Components (Sidebar)
1. `apps/web/src/pages/blogs/components/sidebar/index.tsx`
2. `apps/web/src/pages/blogs/components/sidebar/search-button.tsx`
3. `apps/web/src/pages/blogs/components/sidebar/sidebar-tabs.tsx`
4. `apps/web/src/pages/blogs/components/sidebar/recent-blog-list.tsx`

### Priority 3: Tree Components
5. `apps/web/src/pages/blogs/components/directory-tree/index.tsx`
6. `apps/web/src/pages/blogs/components/directory-tree/TreeNode.tsx`

### Priority 4: Content Components
7. `apps/web/src/pages/blogs/components/blog-card.tsx`
8. `apps/web/src/pages/blogs/blogs.tsx`

### Priority 5: Polish & Verification
9. Verify all hover states
10. Verify animations
11. Accessibility verification

---

## 6. Key Risks & Mitigations

### Risk: Color Token Mapping
**Issue:** Components use mixed patterns (`dark:bg-dark-900` vs `dark:bg-zinc-900`)
**Mitigation:** Systematic find/replace with careful verification. The dark palette is already zinc-based in Tailwind, just need to use it explicitly.

### Risk: Shadow Dark Mode
**Issue:** Default Tailwind shadows don't have dark mode variants
**Mitigation:** Add explicit shadow-dark variants to tailwind config.

### Risk: Breaking Changes
**Issue:** CSS variable changes could affect other parts of the app
**Mitigation:** CSS variables are scoped to specific elements via component-level classes, not global.

---

## 7. Implementation Checklist

- [ ] Add Google Fonts (Inter) import to index.css
- [ ] Add CSS custom properties for light theme
- [ ] Add CSS custom properties for dark theme (html.dark)
- [ ] Update scrollbar styles for dark mode (zinc palette)
- [ ] Update focus ring to use CSS variable
- [ ] Remove custom `dark:` color scale from tailwind.config.js
- [ ] Add semantic color extensions to tailwind.config.js
- [ ] Add custom shadow variants with dark mode to tailwind.config.js
- [ ] Add transition timing functions to tailwind.config.js
- [ ] Update font families in tailwind.config.js
- [ ] Migrate sidebar/index.tsx to use zinc colors
- [ ] Migrate sidebar/search-button.tsx
- [ ] Migrate sidebar/sidebar-tabs.tsx
- [ ] Migrate sidebar/recent-blog-list.tsx
- [ ] Migrate directory-tree/index.tsx
- [ ] Migrate directory-tree/TreeNode.tsx
- [ ] Migrate blog-card.tsx
- [ ] Migrate blogs.tsx
- [ ] Test light mode
- [ ] Test dark mode
- [ ] Verify hover states
- [ ] Verify focus states
- [ ] Accessibility check

---

*End of Implementation Plan*
