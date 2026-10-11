---
name: Luz de Velador
colors:
  surface: '#11102d'
  surface-dim: '#11102d'
  surface-bright: '#373655'
  surface-container-lowest: '#0b0a27'
  surface-container-low: '#191835'
  surface-container: '#1d1c3a'
  surface-container-high: '#282745'
  surface-container-highest: '#333250'
  on-surface: '#e3dfff'
  on-surface-variant: '#d4c4b1'
  inverse-surface: '#e3dfff'
  inverse-on-surface: '#2e2d4b'
  outline: '#9d8e7d'
  outline-variant: '#504537'
  surface-tint: '#fabb5b'
  primary: '#ffd49a'
  on-primary: '#442b00'
  primary-container: '#f2b455'
  on-primary-container: '#6b4600'
  inverse-primary: '#815600'
  secondary: '#8cd5ba'
  on-secondary: '#00382a'
  secondary-container: '#015b47'
  on-secondary-container: '#88d1b7'
  tertiary: '#dad7ff'
  on-tertiary: '#2d2c51'
  tertiary-container: '#bdbbe8'
  on-tertiary-container: '#4b4a70'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb2'
  primary-fixed-dim: '#fabb5b'
  on-primary-fixed: '#291800'
  on-primary-fixed-variant: '#624000'
  secondary-fixed: '#a7f2d6'
  secondary-fixed-dim: '#8cd5ba'
  on-secondary-fixed: '#002117'
  on-secondary-fixed-variant: '#00513e'
  tertiary-fixed: '#e2dfff'
  tertiary-fixed-dim: '#c5c2f0'
  on-tertiary-fixed: '#18173b'
  on-tertiary-fixed-variant: '#444369'
  background: '#11102d'
  on-background: '#e3dfff'
  surface-variant: '#333250'
typography:
  display-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Bricolage Grotesque
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  action-verb:
    fontFamily: Bricolage Grotesque
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
  tabular-counter:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system is tailored for extreme cognitive offloading under mental exhaustion. Designed around the metaphor of a single nightstand lamp glowing softly inside a darkened, cluttered house, the visual language reduces decision paralysis when the user has zero spare energy. 

- **Personality:** Calming, companionable, hush-toned, unhurried, and deeply protective of circadian rhythms.
- **Design Style:** A nocturnal tactile-minimalist aesthetic. It uses atmospheric tonal depth, low retinal strain, single-task illumination, and strict thumb-zone accessibility within the lower third of mobile screens.
- **Atmospheric Rule:** Never present a wall of chores. Only the singular active step emerges into warm light; completed items dissolve into quiet mint satisfaction, and prospective tasks remain asleep in the background shadow.

## Colors

The palette operates under an uncompromising dark-mode environment, mimicking ambient lamplight against deep night shadows.

- **Background (`#171633` - Noche):** Deep midnight base canvas; grounds the retina without harsh OLED black clipping.
- **Surface (`#232246` - Pared):** Elevated backdrop for structural panels, drawers, and card housings.
- **Primary Text (`#F1EEF9` - Hueso):** High-legibility softened bone tone; avoids 100% white glare.
- **Secondary Text (`#A8A4C6` - Humo):** Muted smoke purple for meta-labels, subtexts, and secondary prompts.
- **Accent (`#F2B455` - Velador):** Warm amber glow used sparingly. Strictly limited to the immediate single active step, focused inputs, and the primary progression trigger.
- **Success (`#7FC8AE` - Menta apacible):** Soft soothing mint reserved exclusively for validated tasks and completed steps.
- **Structural Outlines:** `color-mix(in oklab, #F1EEF9 12%, transparent)` everywhere to retain delicate structure without harsh vector contrast.
- **Hard Constraints:** Absolutely zero saturated reds or alarms; no loud multi-stop gradients; no harsh flash states.

## Typography

Typography establishes clear visual weight while respecting mental quietness:

- **Bricolage Grotesque (600):** Expressive, tactile, and grounded. Restricted exclusively to screen entry headers, key milestones, and the primary action verb driving the current task (e.g., *«Levantá»*, *«Guardá»*, *«Dejá»*).
- **Inter (surrogate for Instrument Sans in runtime tokens):** Neutral, legible, low-fatigue sans-serif used across body instructions, meta descriptors, form fields, button content, and micro-labels.
- **Tabular Figures:** Always apply tabular number features (`tnum`) to step indicators and timers to prevent optical jitter as state advances.

## Layout & Spacing

A thumb-anchored, fluid mobile-first layout. Because users access the interface in bed, on a couch, or while pacing an unkempt room in dim conditions, primary mechanics conform strictly to ergonomics:

- **Thumb Zone Allocation:** All interactive stepping controls, confirmation bars, and step progressions must live pinned inside the lower 35% of the viewport.
- **Breathing Headroom:** The upper portion of the screen remains unburdened, displaying only quiet contextual orientation and muted breadcrumbs.
- **Single-Focus Card Stage:** The active challenge occupies a solitary prominent card centered vertically above the bottom control sheet, keeping peripheral noise completely masked.

## Elevation & Depth

Visual hierarchy does not use harsh drop-shadows or high-luminance borders; it relies on quiet light dispersion.

- **Signature Dual-Layer Ambient Shadow:** 
  `box-shadow: 0 1px 2px rgb(0 0 0 / 0.35), 0 12px 32px -12px rgb(9 8 24 / 0.85);`
  Applied to the active card and floating interaction sheets to simulate subtle vertical detachment from `#171633`.
- **The "Velador" Focal Halo:** The active step card features a gentle, localized warm inner border glow:
  `border: 1px solid color-mix(in oklab, #F2B455 35%, transparent);` with an optional micro ambient perimeter reflection `0 0 24px -6px rgb(242 180 85 / 0.12)`.
- **Dormant Surfaces:** Dormant or queued cards sit flat against `#171633`, surfaced with `#232246` and bound only by `color-mix(in oklab, #F1EEF9 12%, transparent)`.

## Shapes

The geometric vocabulary feels welcoming and soft to the touch, avoiding angular aggression:

- **Cards & Stage Panels:** Explicitly sculpted with `20px` border radius (`rounded-[20px]`).
- **Interactive Controls, Chips & Inputs:** Formed with `14px` border radius (`rounded-[14px]`).
- **Pills / Micro Tags:** Fully rounded pill shapes (`9999px`) reserved only for non-interactive micro status indicators (e.g., step dots, session pills).

## Components

### Action Button (Primary)
- **Position:** Anchored in the bottom thumb zone, full-width or substantial fixed width (min-height: 54px).
- **Styling:** Background `#F2B455`, text `#171633` in Bricolage Grotesque (600) for the verb + Inter for context.
- **Radius:** 14px.
- **Shadow:** Dual-layer night shadow with `0 0 16px rgb(242 180 85 / 0.20)`.
- **Press State:** Dims slightly to `#DDA043` with a scale down to `0.98`.

### Secondary & Deferral Buttons
- **Styling:** Background `transparent`, border `1px solid color-mix(in oklab, #F1EEF9 12%, transparent)`, text `#A8A4C6`.
- **Role:** Actions like "Hacer algo más fácil" or "Dejarlo acá por hoy". Non-demanding, non-judgmental.

### Active Task Card (The "Velador" Stage)
- **Styling:** Background `#232246`, border `1px solid color-mix(in oklab, #F2B455 32%, transparent)`, radius `20px`.
- **Padding:** 24px internal spacing.
- **Hierarchy:** Action verb highlighted in `#F2B455`, core instruction in `#F1EEF9` (18px), context note in `#A8A4C6` (14px).

### Completed Step State
- **Feedback:** Immediate transformation to border `1px solid color-mix(in oklab, #7FC8AE 35%, transparent)`.
- **Check Indicator:** `#7FC8AE` subtle checkmark icon, action text shifts gently to muted `#A8A4C6` with strikethrough before quietly transitioning to the next step.

### Passive Cue Chips & Filters
- **Styling:** Background `#171633`, border `1px solid color-mix(in oklab, #F1EEF9 12%, transparent)`, text `#A8A4C6`, radius `14px`, height `36px`.
- **Active State:** Background `#232246`, border `1px solid #F2B455`, text `#F1EEF9`.

### Text Inputs / Room Selectors
- **Styling:** Background `#1F1E3E`, radius `14px`, border `1px solid color-mix(in oklab, #F1EEF9 12%, transparent)`. Text `#F1EEF9`, placeholder `#A8A4C6`.
- **Focus:** Border turns to warm amber `#F2B455` without sudden flashes.