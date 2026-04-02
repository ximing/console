# X-Console Blog Visual Design System

**Version:** 1.0
**Date:** 2026-04-01
**Status:** Production Ready

---

## 1. Design Philosophy

The X-Console blog module embodies a **refined minimal** aesthetic inspired by Linear and Notion — clean surfaces with purposeful depth, restrained use of color, and an obsession with micro-interactions that make the interface feel alive without being distracting. Every pixel serves function; decoration emerges from structure, not addition.

The design operates on a **surface-based architecture**: content lives on layered planes that elevate through subtle shadows, blur, and tonal shifts. The green accent (#22c55e) is used sparingly — only for primary actions, active states, and moments that demand attention. This restraint ensures green never feels overused and always communicates "this matters."

---

## 2. Color System

### 2.1 Light Theme

#### Primary Scale (Green)
| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| primary-50 | `#f0fdf4` | `bg-primary-50` | Subtle tint backgrounds |
| primary-100 | `#dcfce7` | `bg-primary-100` | Hover backgrounds on light |
| primary-200 | `#bbf7d0` | `bg-primary-200` | Light borders |
| primary-300 | `#86efac` | `bg-primary-300` | Focus rings (light) |
| primary-400 | `#4ade80` | `bg-primary-400` | Dark mode focus, icons |
| primary-500 | `#22c55e` | `bg-primary-500` | **Primary accent — use sparingly** |
| primary-600 | `#16a34a` | `bg-primary-600` | Primary buttons, active states |
| primary-700 | `#15803d` | `bg-primary-700` | Button hover |
| primary-800 | `#166534` | `bg-primary-800` | Pressed state |
| primary-900 | `#145231` | `bg-primary-900` | Dark mode active text |
| primary-950 | `#0d3422` | `bg-primary-950` | Darkest tint |

#### Semantic Surfaces
| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| bg-primary | `#ffffff` | `bg-white` | Main content background |
| bg-surface | `#f9fafb` | `bg-gray-50` | Card backgrounds, sidebar |
| bg-elevated | `#ffffff` | `bg-white` | Elevated cards, modals |
| bg-overlay | `#f9fafb/80` | `bg-gray-50/80` | Blur overlays |

#### Text Scale
| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| text-primary | `#111827` | `text-gray-900` | Headlines, titles |
| text-secondary | `#374151` | `text-gray-700` | Body text |
| text-muted | `#6b7280` | `text-gray-500` | Captions, timestamps |
| text-disabled | `#9ca3af` | `text-gray-400` | Disabled states |

#### Border Scale
| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| border-default | `#e5e7eb` | `border-gray-200` | Default borders |
| border-subtle | `#f3f4f6` | `border-gray-100` | Hairlines, dividers |
| border-focus | `#22c55e` | `border-primary-500` | Focus state rings |

---

### 2.2 Dark Theme

#### Primary Scale (Green — same hue, adjusted for dark perception)
Same hex values as light theme, but applied contextually.

#### Semantic Surfaces
| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| bg-primary | `#09090b` | `bg-zinc-950` | App root background |
| bg-surface | `#18181b` | `bg-zinc-900` | Sidebar background |
| bg-elevated | `#27272a` | `bg-zinc-800` | Cards, elevated elements |
| bg-overlay | `#18181b/80` | `bg-zinc-900/80` | Blur overlays |

#### Text Scale
| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| text-primary | `#fafafa` | `text-zinc-50` | Headlines, titles |
| text-secondary | `#a1a1aa` | `text-zinc-400` | Body text |
| text-muted | `#71717a` | `text-zinc-500` | Captions, timestamps |
| text-disabled | `#52525b` | `text-zinc-600` | Disabled states |

#### Border Scale
| Token | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| border-default | `#27272a` | `border-zinc-800` | Default borders |
| border-subtle | `#3f3f46` | `border-zinc-700` | Hairlines, dividers |
| border-focus | `#4ade80` | `border-primary-400` | Focus state rings |

---

### 2.3 Semantic Status Colors

| Status | Light BG | Light Text | Dark BG | Dark Text |
|--------|----------|------------|---------|-----------|
| Success/Published | `bg-emerald-50` | `text-emerald-600` | `bg-emerald-500/10` | `text-emerald-400` |
| Warning/Draft | `bg-amber-50` | `text-amber-600` | `bg-amber-500/10` | `text-amber-400` |
| Error | `bg-red-50` | `text-red-600` | `bg-red-500/10` | `text-red-400` |

---

## 3. Typography

### 3.1 Font Family

**Primary Stack (Google Fonts via CSS):**
```css
font-family: 'Inter', 'Noto Sans JP', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Monospace (code blocks):**
```css
font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace;
```

### 3.2 Type Scale

Based on a 4px base grid, using Tailwind's default scale:

| Name | Size | Line Height | Letter Spacing | Tailwind Class | Usage |
|------|------|-------------|----------------|----------------|-------|
| xs | 12px / 0.75rem | 16px / 1rem | -0.01em | `text-xs` | Badges, timestamps |
| sm | 14px / 0.875rem | 20px / 1.25rem | -0.01em | `text-sm` | Captions, secondary text |
| base | 16px / 1rem | 24px / 1.5rem | 0 | `text-base` | Body text |
| lg | 18px / 1.125rem | 28px / 1.75rem | -0.01em | `text-lg` | Subheadlines |
| xl | 20px / 1.25rem | 28px / 1.75rem | -0.02em | `text-xl` | Card titles |
| 2xl | 24px / 1.5rem | 32px / 2rem | -0.02em | `text-2xl` | Page titles |
| 3xl | 30px / 1.875rem | 36px / 2.25rem | -0.02em | `text-3xl` | Section headers |
| 4xl | 36px / 2.25rem | 40px / 2.5rem | -0.03em | `text-4xl` | Hero titles |
| 5xl | 48px / 3rem | 1 / 1 | -0.03em | `text-5xl` | Marketing headers |

**Font Weights:**
- Normal: 400 — body text
- Medium: 500 — emphasis, subheadlines
- Semibold: 600 — titles, card headers
- Bold: 700 — primary headings

---

## 4. Spacing & Layout

### 4.1 Base Unit
**4px grid system** — all spacing values are multiples of 4.

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| 0 | 0px | `0` | Reset |
| 1 | 4px | `1` | Icon gaps |
| 2 | 8px | `2` | Tight spacing |
| 3 | 12px | `3` | Compact padding |
| 4 | 16px | `4` | Default padding |
| 5 | 20px | `5` | Card padding |
| 6 | 24px | `6` | Section gaps |
| 8 | 32px | `8` | Large gaps |
| 10 | 40px | `10` | Section separation |
| 12 | 48px | `12` | Page margins |
| 16 | 64px | `16` | Major sections |

### 4.2 Component Padding/Margin Scale

| Component | Padding | Margin | Tailwind |
|-----------|---------|--------|----------|
| Button (sm) | px-2.5 py-1.5 | — | `px-2.5 py-1.5` |
| Button (md) | px-4 py-2 | — | `px-4 py-2` |
| Button (lg) | px-6 py-3 | — | `px-6 py-3` |
| Card | p-5 | mb-4 | `p-5 mb-4` |
| Sidebar item | px-2 py-1.5 | — | `px-2 py-1.5` |
| Input | px-3 py-2 | — | `px-3 py-2` |
| Modal | p-6 | — | `p-6` |

### 4.3 Border Radius Scale

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| none | 0px | `rounded-none` | Sharp edges (rare) |
| sm | 4px | `rounded-sm` | Badges, small chips |
| md | 6px | `rounded-md` | Buttons, inputs |
| lg | 8px | `rounded-lg` | Cards |
| xl | 12px | `rounded-xl` | Modals, large cards |
| 2xl | 16px | `rounded-2xl` | Feature cards |
| full | 9999px | `rounded-full` | Pills, avatars |

### 4.4 Sidebar Width Specs

| Element | Width | Tailwind Class |
|---------|-------|----------------|
| Blog sidebar (resizable) | 260px default, 200px min, 400px max | `w-[260px]` |
| Left nav (app shell) | 240px | `w-60` |
| Search modal | 560px max | `max-w-[560px]` |

---

## 5. Component Visual Specs

### 5.1 BlogCard

**Light Theme:**
- Background: `bg-white`
- Border: `border border-gray-200/80`
- Border radius: `rounded-xl`
- Padding: `p-5`
- Shadow: `shadow-sm`

**Dark Theme:**
- Background: `dark:bg-zinc-900`
- Border: `dark:border-zinc-800/80`
- Shadow: `dark:shadow-black/20`

**Hover State (both themes):**
- Border: transitions to `border-primary-300/60 dark:border-primary-700/50`
- Shadow: `shadow-md`
- Transform: `scale-[1.01]`
- Transition: `transition-all duration-200`
- Subtle gradient overlay: `bg-gradient-to-br from-primary-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100`

**Active/Pressed State:**
- Transform: `scale-[0.99]`
- Shadow: `shadow-sm`

**Structure:**
```
┌─────────────────────────────────────────┐
│ [Icon] Title                     [Edit] │  ← Header row
│ Excerpt text here...                     │  ← Optional excerpt
│ [Dir Badge] [Status] [Tag] [Tag]   🕐   │  ← Footer row
└─────────────────────────────────────────┘
```

### 5.2 Sidebar (Blog)

**Light Theme:**
- Background: `bg-white/80 backdrop-blur-sm`
- Border right: `border-r border-gray-200/60`

**Dark Theme:**
- Background: `dark:bg-zinc-900/80 backdrop-blur-sm`
- Border right: `dark:border-r dark:border-zinc-800/50`

**Sections:**
1. **Search button area**: `px-2 py-2 border-b border-gray-100/80 dark:border-zinc-800/50`
2. **Tab bar**: Full width, `border-b border-gray-100/80 dark:border-zinc-800/50`
3. **Content area**: `flex-1 overflow-auto py-1`
4. **Action buttons**: `px-2 py-2 border-t border-gray-100/80 dark:border-zinc-800/50`

**Active Tab Indicator:**
- Border bottom: `border-b-2 border-primary-500`
- Text color: `text-primary-600 dark:text-primary-400`
- Background: `bg-primary-50/50 dark:bg-primary-900/10`

**Directory Tree Item:**
- Default: `hover:bg-gray-100/70 dark:hover:bg-zinc-800/50 text-gray-700 dark:text-zinc-300`
- Selected: `bg-primary-50/80 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400`
- Height: `py-1.5`, indent per level: `16px`

### 5.3 Buttons

#### Primary Button
**Light:**
- Background: `bg-primary-600`
- Text: `text-white`
- Hover: `hover:bg-primary-700`
- Active: `active:bg-primary-800`
- Shadow: `shadow-sm`

**Dark:**
- Background: `dark:bg-primary-600`
- Text: `dark:text-white`
- Hover: `dark:hover:bg-primary-500`

**Disabled:**
- Opacity: `opacity-50`
- Cursor: `cursor-not-allowed`
- Pointer events: `pointer-events-none`

#### Secondary Button
**Light:**
- Background: `bg-white`
- Border: `border border-gray-200`
- Text: `text-gray-700`
- Hover: `hover:bg-gray-50 hover:border-gray-300`

**Dark:**
- Background: `dark:bg-zinc-800`
- Border: `dark:border dark:border-zinc-700`
- Text: `dark:text-zinc-200`
- Hover: `dark:hover:bg-zinc-700 dark:hover:border-zinc-600`

#### Ghost Button
- Background: `bg-transparent`
- Text: `text-gray-600 dark:text-zinc-400`
- Hover: `hover:bg-gray-100 dark:hover:bg-zinc-800`
- Hover text: `hover:text-gray-900 dark:hover:text-zinc-200`

#### Icon Button
- Size: `p-2` (32x32)
- Border radius: `rounded-lg`
- Focus: `focus:outline-none focus:ring-2 focus:ring-primary-500/50`

#### Button Sizes
| Size | Padding | Font | Border Radius | Tailwind |
|------|---------|------|---------------|----------|
| sm | px-2.5 py-1.5 | `text-xs` | `rounded-md` | `px-2.5 py-1.5 text-xs` |
| md | px-4 py-2 | `text-sm` | `rounded-lg` | `px-4 py-2 text-sm` |
| lg | px-6 py-3 | `text-base` | `rounded-lg` | `px-6 py-3 text-base` |

### 5.4 Inputs & Search

#### Text Input
**Light:**
- Background: `bg-white`
- Border: `border border-gray-200`
- Border radius: `rounded-lg`
- Padding: `px-3 py-2`
- Text: `text-gray-900`
- Placeholder: `text-gray-400`

**Dark:**
- Background: `dark:bg-zinc-900`
- Border: `dark:border dark:border-zinc-800`
- Text: `dark:text-zinc-100`
- Placeholder: `dark:placeholder:text-zinc-500`

**Focus State:**
- Border: `border-primary-500 dark:border-primary-400`
- Ring: `ring-2 ring-primary-500/20 dark:ring-primary-400/20`
- Transition: `transition-all duration-150`

**Disabled:**
- Background: `bg-gray-50 dark:bg-zinc-900`
- Opacity: `opacity-60`
- Cursor: `cursor-not-allowed`

#### Search Button (Sidebar)
- Full width: `w-full`
- Padding: `px-3 py-2`
- Border radius: `rounded-lg`
- Icon: `Search` from lucide, `w-4 h-4`
- Text: `搜索`
- Default: `text-gray-500 bg-gray-50 dark:bg-zinc-800/50 dark:text-zinc-400`
- Hover: `hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-200`

### 5.5 Directory Tree

**Structure:**
```
[Expand] [Icon] Name                    [Actions on hover]
```

**Depth Indent:** 16px per level (`paddingLeft: depth * 16 + 8px`)

**Folder Icons:** Yellow/amber tint (`text-amber-500/80`)

**File Icons:** Blue tint (`text-blue-400/70`)

**Expand/Collapse Chevron:**
- Size: `w-3.5 h-3.5`
- Color: `text-gray-400 dark:text-zinc-500`
- Transition: `transition-transform duration-150`

**Hover Actions:**
- Container: `opacity-0 group-hover:opacity-100 transition-opacity`
- Buttons: `p-1 hover:bg-gray-200/80 dark:hover:bg-zinc-700 rounded`
- Icons: `w-3 h-3 text-gray-500 dark:text-zinc-400`

**Drop Target (drag & drop):**
- Ring: `ring-2 ring-primary-500/50`

---

## 6. Motion & Animation

### 6.1 Transition Durations

| Speed | Duration | Tailwind Class | Usage |
|-------|----------|----------------|-------|
| instant | 0ms | — | No transition |
| fast | 100ms | `duration-100` | Micro-interactions (hover, active) |
| normal | 150ms | `duration-150` | Default transitions |
| slow | 200ms | `duration-200` | Page transitions, modals |
| slower | 300ms | `duration-300` | Large reveals |

### 6.2 Easing Curves

| Curve | CSS | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| ease-default | `cubic-bezier(0.4, 0, 0.2, 1)` | `ease-out` | Most transitions |
| ease-in | `cubic-bezier(0.4, 0, 1, 1)` | `ease-in` | Exit animations |
| ease-out | `cubic-bezier(0, 0, 0.2, 1)` | `ease-out` | Enter animations |
| ease-in-out | `cubic-bezier(0.4, 0, 0.2, 1)` | `ease-in-out` | Symmetric transitions |
| spring | `cubic-bezier(0.34, 1.56, 0.64, 1)` | — | Bouncy feedback (use sparingly) |

### 6.3 Hover/Active/Focus Animations

| Element | Property | From | To | Duration |
|---------|----------|------|-----|----------|
| Button scale | transform | `scale(1)` | `scale(0.98)` | 100ms |
| Card hover | transform | `scale(1)` | `scale(1.01)` | 200ms |
| Card shadow | box-shadow | `shadow-sm` | `shadow-md` | 200ms |
| Opacity fade | opacity | `0` | `1` | 150ms |
| Slide up | transform | `translateY(4px)` | `translateY(0)` | 200ms |
| Chevron rotate | transform | `rotate(0deg)` | `rotate(90deg)` | 150ms |

### 6.4 Animation Keyframes (Existing)

```javascript
// Already defined in tailwind.config.js:
fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } }
slideUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } }
```

---

## 7. Visual Hierarchy & Depth

### 7.1 Shadow Scale

| Name | Light Theme | Dark Theme | Tailwind (Light) | Tailwind (Dark) |
|------|-------------|------------|-------------------|-----------------|
| shadow-xs | `0 1px 2px rgba(0,0,0,0.04)` | `0 1px 2px rgba(0,0,0,0.3)` | `shadow-xs` | `dark:shadow-xs` |
| shadow-sm | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)` | `0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)` | `shadow-sm` | `dark:shadow-black/20` |
| shadow-md | `0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)` | `0 4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)` | `shadow-md` | `dark:shadow-black/30` |
| shadow-lg | `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)` | `0 10px 15px rgba(0,0,0,0.5), 0 4px 6px rgba(0,0,0,0.4)` | `shadow-lg` | `dark:shadow-black/40` |
| shadow-xl | `0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)` | `0 20px 25px rgba(0,0,0,0.6), 0 10px 10px rgba(0,0,0,0.5)` | `shadow-xl` | `dark:shadow-black/50` |
| shadow-2xl | `0 25px 50px rgba(0,0,0,0.15)` | `0 25px 50px rgba(0,0,0,0.7)` | `shadow-2xl` | `dark:shadow-black/60` |

**Note:** Custom shadow utilities should be added to Tailwind config to include dark mode variants with proper rgba values.

### 7.2 Backdrop Blur Levels

| Level | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| none | 0 | — | Default |
| sm | 4px | `backdrop-blur-sm` | Subtle frosted glass |
| md | 8px | `backdrop-blur-md` | Sidebar, overlays |
| lg | 16px | `backdrop-blur-lg` | Modals, dialogs |
| xl | 24px | `backdrop-blur-xl` | High-elevation overlays |

### 7.3 Surface Layering

The interface is organized into distinct visual planes:

| Layer | Surface | Shadow | Blur | Usage |
|-------|---------|--------|------|-------|
| Ground (z-0) | `bg-gray-50` / `bg-zinc-950` | none | none | App background |
| Raised (z-10) | `bg-white` / `bg-zinc-900` | `shadow-sm` | none | Content areas, sidebar |
| Elevated (z-20) | `bg-white` / `bg-zinc-800` | `shadow-md` | `backdrop-blur-sm` | Cards, dropdowns |
| Floating (z-30) | `bg-white` / `bg-zinc-800` | `shadow-lg` | `backdrop-blur-md` | Modals, popovers |
| Overlay (z-40) | `bg-black/50` | none | `backdrop-blur-lg` | Modal scrim |

### 7.4 Border Treatment

| Element | Light | Dark | Style |
|---------|-------|------|-------|
| Hairline | `border-gray-100` | `border-zinc-800` | 1px, subtle |
| Default | `border-gray-200` | `border-zinc-700` | 1px, visible |
| Focus | `border-primary-500` | `border-primary-400` | 2px, ring accompanies |
| Subtle divider | `border-gray-100/80` | `border-zinc-800/50` | 1px, semi-transparent |

---

## 8. Implementation Notes

### 8.1 Tailwind Configuration Updates

The following custom utilities should be added to `tailwind.config.js`:

```javascript
// Custom shadows with dark mode support
boxShadow: {
  'xs': '0 1px 2px rgba(0,0,0,0.04)',
  'xs-dark': '0 1px 2px rgba(0,0,0,0.3)',
  'sm-dark': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
  'md-dark': '0 4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)',
  'lg-dark': '0 10px 15px rgba(0,0,0,0.5), 0 4px 6px rgba(0,0,0,0.4)',
  'xl-dark': '0 20px 25px rgba(0,0,0,0.6), 0 10px 10px rgba(0,0,0,0.5)',
}

// Transition timing functions
transitionTimingFunction: {
  'bounce-in': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
}
```

### 8.2 CSS Variables (Optional Enhancement)

For easier theming, consider defining CSS custom properties:

```css
:root {
  --color-primary: #22c55e;
  --color-primary-hover: #16a34a;
  --color-surface: #ffffff;
  --color-surface-elevated: #f9fafb;
  --color-border: #e5e7eb;
  /* ... */
}

html.dark {
  --color-surface: #09090b;
  --color-surface-elevated: #18181b;
  --color-border: #27272a;
  /* ... */
}
```

### 8.3 Key Files to Modify

| File | Changes |
|------|---------|
| `apps/web/tailwind.config.js` | Add custom shadows, update dark mode colors |
| `apps/web/src/index.css` | Add CSS variables, update scrollbar, focus states |
| `apps/web/src/pages/blogs/components/blog-card.tsx` | Apply design system props |
| `apps/web/src/pages/blogs/components/sidebar/index.tsx` | Apply surface colors, border treatment |
| `apps/web/src/pages/blogs/components/sidebar/search-button.tsx` | Apply ghost button styles |
| `apps/web/src/pages/blogs/components/sidebar/sidebar-tabs.tsx` | Apply tab indicator styles |
| `apps/web/src/pages/blogs/components/directory-tree/TreeNode.tsx` | Apply tree item states |

---

## 9. Accessibility Checklist

- [ ] All interactive elements have visible focus states (`focus-visible` ring)
- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for UI)
- [ ] Focus order follows visual order
- [ ] Reduced motion respected via `prefers-reduced-motion`
- [ ] All icons have `aria-label` or adjacent text labels
- [ ] Status badges use more than color alone (icon + text)

---

*End of Design Specification v1.0*
