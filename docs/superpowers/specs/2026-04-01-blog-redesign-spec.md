# X-Console Blog Visual Redesign - Complete Specification

**Version:** 1.0
**Date:** 2026-04-01
**Status:** Ready for Implementation
**Team:** Design Architect + Frontend Developer

---

## Executive Summary

This specification defines a complete visual redesign of the X-Console blog module, implementing a **refined minimal** aesthetic inspired by Linear and Notion. The redesign provides full **light/dark theme support** with **green (#22c55e)** as the primary accent color.

**Key Changes:**
- Complete design token system (colors, typography, spacing, shadows)
- Surface-based architecture with clear visual hierarchy
- Modern component styling with polished hover/focus states
- Professional motion and animation guidelines
- Systematic migration path from current implementation

---

## Part 1: Design System

### 1. Design Philosophy

The X-Console blog module embodies a **refined minimal** aesthetic — clean surfaces with purposeful depth, restrained use of color, and an obsession with micro-interactions that make the interface feel alive without being distracting. Every pixel serves function; decoration emerges from structure, not addition.

The design operates on a **surface-based architecture**: content lives on layered planes that elevate through subtle shadows, blur, and tonal shifts. The green accent (#22c55e) is used sparingly — only for primary actions, active states, and moments that demand attention.

### 2. Color System

#### Light Theme Palette

| Token | Hex | Usage |
|-------|-----|-------|
| primary-50 | `#f0fdf4` | Subtle tint backgrounds |
| primary-100 | `#dcfce7` | Hover backgrounds |
| primary-200 | `#bbf7d0` | Light borders |
| primary-300 | `#86efac` | Focus rings |
| primary-400 | `#4ade80` | Dark mode focus, icons |
| **primary-500** | **`#22c55e`** | **Primary accent — use sparingly** |
| primary-600 | `#16a34a` | Primary buttons, active states |
| primary-700 | `#15803d` | Button hover |
| primary-800 | `#166534` | Pressed state |
| primary-900 | `#145231` | Dark mode active text |

**Semantic Surfaces (Light):**
| Token | Hex | Usage |
|-------|-----|-------|
| bg-primary | `#ffffff` | Main content background |
| bg-surface | `#f9fafb` | Card backgrounds, sidebar |
| bg-elevated | `#ffffff` | Elevated cards, modals |
| bg-overlay | `#f9fafb/80` | Blur overlays |

**Text (Light):**
| Token | Hex | Usage |
|-------|-----|-------|
| text-primary | `#111827` | Headlines, titles |
| text-secondary | `#374151` | Body text |
| text-muted | `#6b7280` | Captions, timestamps |

**Borders (Light):**
| Token | Hex | Usage |
|-------|-----|-------|
| border-default | `#e5e7eb` | Default borders |
| border-subtle | `#f3f4f6` | Hairlines, dividers |
| border-focus | `#22c55e` | Focus state rings |

#### Dark Theme Palette

**Semantic Surfaces (Dark):**
| Token | Hex | Usage |
|-------|-----|-------|
| bg-primary | `#09090b` | App root background (zinc-950) |
| bg-surface | `#18181b` | Sidebar background (zinc-900) |
| bg-elevated | `#27272a` | Cards, elevated elements (zinc-800) |
| bg-overlay | `#18181b/80` | Blur overlays |

**Text (Dark):**
| Token | Hex | Usage |
|-------|-----|-------|
| text-primary | `#fafafa` | Headlines, titles (zinc-50) |
| text-secondary | `#a1a1aa` | Body text (zinc-400) |
| text-muted | `#71717a` | Captions, timestamps (zinc-500) |

**Borders (Dark):**
| Token | Hex | Usage |
|-------|-----|-------|
| border-default | `#27272a` | Default borders (zinc-800) |
| border-subtle | `#3f3f46` | Hairlines, dividers (zinc-700) |
| border-focus | `#4ade80` | Focus state rings |

### 3. Typography

**Font Stack:**
```css
font-family: 'Inter', 'Noto Sans JP', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Type Scale:**
| Name | Size | Line Height | Tailwind Class |
|------|------|-------------|----------------|
| xs | 12px | 16px | `text-xs` |
| sm | 14px | 20px | `text-sm` |
| base | 16px | 24px | `text-base` |
| lg | 18px | 28px | `text-lg` |
| xl | 20px | 28px | `text-xl` |
| 2xl | 24px | 32px | `text-2xl` |
| 3xl | 30px | 36px | `text-3xl` |

**Font Weights:** 400 (body), 500 (emphasis), 600 (titles), 700 (headings)

### 4. Spacing & Layout

**4px Base Grid System**

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| 1 | 4px | `1` | Icon gaps |
| 2 | 8px | `2` | Tight spacing |
| 4 | 16px | `4` | Default padding |
| 5 | 20px | `5` | Card padding |
| 6 | 24px | `6` | Section gaps |
| 8 | 32px | `8` | Large gaps |

**Border Radius Scale:**
| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| sm | 4px | `rounded-sm` | Badges |
| md | 6px | `rounded-md` | Buttons, inputs |
| lg | 8px | `rounded-lg` | Cards |
| xl | 12px | `rounded-xl` | Modals |

**Sidebar Width:** 260px default, 200px min, 400px max

### 5. Component Visual Specs

#### BlogCard
```
┌─────────────────────────────────────────┐
│ [Icon] Title                     [Edit] │  ← Header
│ Excerpt text here...                     │  ← Optional excerpt
│ [Dir Badge] [Status] [Tag]        🕐   │  ← Footer
└─────────────────────────────────────────┘
```

**Light:** `bg-white border border-gray-200/80 rounded-xl p-5 shadow-sm`
**Dark:** `dark:bg-zinc-900 dark:border-zinc-800/80 dark:shadow-black/20`

**Hover:** `scale-[1.01] shadow-md border-primary-300/60 dark:border-primary-700/50 transition-all duration-200`

#### Sidebar
**Light:** `bg-white/80 backdrop-blur-sm border-r border-gray-200/60`
**Dark:** `dark:bg-zinc-900/80 dark:border-zinc-800/50`

**Active Tab:** `border-b-2 border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10`

**Directory Item:**
- Default: `hover:bg-gray-100/70 dark:hover:bg-zinc-800/50 text-gray-700 dark:text-zinc-300`
- Selected: `bg-primary-50/80 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400`

#### Buttons

| Type | Light | Dark |
|------|-------|------|
| Primary | `bg-primary-600 text-white hover:bg-primary-700` | `dark:bg-primary-600 dark:hover:bg-primary-500` |
| Secondary | `bg-white border-gray-200 text-gray-700 hover:bg-gray-50` | `dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200` |
| Ghost | `bg-transparent text-gray-600 hover:bg-gray-100` | `dark:text-zinc-400 dark:hover:bg-zinc-800` |

**Sizes:** sm (`px-2.5 py-1.5 text-xs`), md (`px-4 py-2 text-sm`), lg (`px-6 py-3 text-base`)

#### Inputs
**Light:** `bg-white border-gray-200 rounded-lg px-3 py-2`
**Dark:** `dark:bg-zinc-900 dark:border-zinc-800`
**Focus:** `border-primary-500 dark:border-primary-400 ring-2 ring-primary-500/20`

### 6. Motion & Animation

| Speed | Duration | Tailwind | Usage |
|-------|----------|----------|-------|
| fast | 100ms | `duration-100` | Micro-interactions |
| normal | 150ms | `duration-150` | Default transitions |
| slow | 200ms | `duration-200` | Page transitions |
| slower | 300ms | `duration-300` | Large reveals |

**Easing:** `ease-out` for most, `ease-in-out` for symmetric

**Hover Animations:**
- Button press: `scale(0.98)` in 100ms
- Card hover: `scale(1.01)` + shadow-md in 200ms
- Chevron rotate: `rotate(90deg)` in 150ms

### 7. Visual Hierarchy & Depth

**Shadow Scale:**
| Name | Light | Dark |
|------|-------|------|
| shadow-sm | 0 1px 3px rgba(0,0,0,0.08) | 0 1px 3px rgba(0,0,0,0.4) |
| shadow-md | 0 4px 6px rgba(0,0,0,0.07) | 0 4px 6px rgba(0,0,0,0.4) |
| shadow-lg | 0 10px 15px rgba(0,0,0,0.1) | 0 10px 15px rgba(0,0,0,0.5) |

**Surface Layers:**
| Layer | Light | Dark | Usage |
|-------|-------|------|-------|
| Ground | `bg-gray-50` | `bg-zinc-950` | App background |
| Raised | `bg-white` + shadow-sm | `bg-zinc-900` | Content areas |
| Elevated | `bg-white` + shadow-md + blur-sm | `bg-zinc-800` | Cards |
| Floating | `bg-white` + shadow-lg + blur-md | `bg-zinc-800` | Modals |

---

## Part 2: Implementation Plan

### Phase 1: Foundation

**1.1 Update `apps/web/src/index.css`**
- Add Google Fonts import (Inter)
- Add CSS custom properties for all design tokens (light + dark)
- Update scrollbar dark mode colors to zinc palette
- Preserve existing utilities (scrollbar, focus, tables)

**1.2 Update `apps/web/tailwind.config.js`**
- Remove custom `dark:` color scale (use standard zinc)
- Add semantic color extensions (surface, text, border)
- Add custom shadow variants with dark mode
- Add transition timing functions
- Update font families (Inter + JetBrains Mono)

### Phase 2: Component Migration

**2.1 Sidebar Components** (in order)
1. `sidebar/index.tsx`
2. `sidebar/search-button.tsx`
3. `sidebar/sidebar-tabs.tsx`
4. `sidebar/recent-blog-list.tsx`

**2.2 Tree Components**
5. `directory-tree/index.tsx`
6. `directory-tree/TreeNode.tsx`

**2.3 Content Components**
7. `blog-card.tsx`
8. `blogs.tsx`

### Phase 3: Polish & Verification
- Verify hover states (scale, shadow transitions)
- Verify focus rings
- Accessibility check (WCAG AA)
- Reduced motion support

---

## Files to Modify

| File | Priority | Key Changes |
|------|----------|-------------|
| `apps/web/src/index.css` | 1 | CSS variables, fonts, scrollbar |
| `apps/web/tailwind.config.js` | 1 | Colors, shadows, fonts |
| `apps/web/src/pages/blogs/components/sidebar/index.tsx` | 2 | Surface colors, borders |
| `apps/web/src/pages/blogs/components/sidebar/search-button.tsx` | 2 | Ghost button styles |
| `apps/web/src/pages/blogs/components/sidebar/sidebar-tabs.tsx` | 2 | Tab indicator |
| `apps/web/src/pages/blogs/components/sidebar/recent-blog-list.tsx` | 2 | List item states |
| `apps/web/src/pages/blogs/components/directory-tree/index.tsx` | 2 | Tree container |
| `apps/web/src/pages/blogs/components/directory-tree/TreeNode.tsx` | 2 | Tree item states |
| `apps/web/src/pages/blogs/components/blog-card.tsx` | 3 | Card styling, hover |
| `apps/web/src/pages/blogs/blogs.tsx` | 3 | Content area bg |

---

## Key Migration Notes

1. **Replace `dark:bg-dark-*` with `dark:bg-zinc-*`** - The current `dark-900` etc. should become `zinc-900`
2. **Use `border-gray-200/80`** instead of `border-gray-200` for softer borders
3. **Shadows**: Add dark mode variants explicitly rather than using opacity hacks
4. **Primary color usage**: Reserve primary-500/600 for actions; use muted versions for backgrounds

---

## Success Criteria

- [ ] Light/dark theme toggle works seamlessly
- [ ] All components match design spec colors
- [ ] Hover states provide smooth 200ms transitions
- [ ] Focus rings visible on all interactive elements
- [ ] No console errors in either theme
- [ ] WCAG AA contrast compliance
- [ ] Reduced motion preference respected

---

*End of Complete Specification*
