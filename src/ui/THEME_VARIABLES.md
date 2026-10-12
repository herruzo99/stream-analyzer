# Theme Variable Naming Convention

## Reciprocal Surface/Text System

This naming system ensures proper contrast by embedding affinity/anti-affinity rules directly in variable names.

### Core Principle

- **Surface A** backgrounds pair with **text-on-B** colors
- **Surface B** backgrounds pair with **text-on-A** colors

This reciprocal relationship is theme-agnostic and works across all themes.

### Variable Categories

#### Backgrounds

```css
--bg-surface-A-main          /* Primary content area */
--bg-surface-A-elevated      /* Elevated surfaces (cards, tooltips) */
--bg-surface-B-panel         /* Panels, sidebars, navigation (semi-transparent) */
--bg-surface-B-panel-opaque  /* Opaque version of panels */
--bg-surface-B-modal         /* Modals, dialogs */
```

#### Text (Reciprocal Pairing)

```css
/* For text ON surface A backgrounds */
--text-on-B-primary          /* Primary text color */
--text-on-B-secondary        /* Muted/secondary text */

/* For text ON surface B backgrounds */
--text-on-A-primary          /* Primary text color */
--text-on-A-secondary        /* Muted/secondary text */
```

#### Borders

```css
--border-on-A                /* Borders for surface A contexts */
--border-on-B                /* Borders for surface B contexts */
```

#### Accents (Theme-Agnostic)

```css
--primary-accent             /* Main interactive color */
--primary-accent-hover       /* Hover state */
--primary-accent-glow        /* Glow/shadow effect */
--secondary-accent           /* Secondary actions */
--tertiary-accent            /* Tertiary actions */
--accent-gradient-from       /* Gradient start */
--accent-gradient-via        /* Gradient middle */
--accent-gradient-to         /* Gradient end */
```

#### Status Colors (Theme-Agnostic)

```css
--color-success              /* Success states */
--color-error                /* Error states */
--color-warning              /* Warning states */
--color-info                 /* Informational states */
```

#### Charts

```css
--chart-1 through --chart-10 /* Data visualization colors */
```

#### Syntax Highlighting

```css
--syntax-tag                 /* HTML/XML tags */
--syntax-attr                /* Attributes */
--syntax-string              /* String literals */
--syntax-number              /* Number literals */
--syntax-boolean             /* Boolean values */
--syntax-comment             /* Comments */
--syntax-value               /* Generic values */
```

## Usage Examples

### Standard Light Theme

- Surface A = White content area → uses `--text-on-B` (dark text)
- Surface B = Dark panels → uses `--text-on-A` (light text)

### Standard Dark Theme

- Surface A = Dark main area → uses `--text-on-B` (light text)
- Surface B = Darker panels → uses `--text-on-A` (even lighter text)

## Migration Status

✅ **Completed:** Standard Dark, Standard Light
⏳ **Pending:** 7 remaining themes (Obsidian Amber, Cyberpunk, Midnight Mint, Solar Flare, Light Executive, Neon Daydream, Arctic Night, Ink Parchment)

**Note:** UI components need to be updated to use the new variable names. The old variables will be removed after migration is complete.
