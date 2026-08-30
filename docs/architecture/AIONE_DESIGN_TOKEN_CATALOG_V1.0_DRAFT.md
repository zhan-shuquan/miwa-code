# AIONE Design Token Catalog V1.0 RC

Status: Release Candidate / Pending Freeze

## Purpose
Create one visual source of truth for AIONE so that visual changes propagate globally and page-level hardcoded styles do not accumulate.

## 1. Token hierarchy
Use three layers:

Primitive Token -> Semantic Token -> Component Token

Example:
- primitive.green.600
- semantic.action.primary
- component.button.primary.background

Pages should consume semantic/component tokens, not raw color values.

## 2. Color tokens
### Neutral
- background.canvas
- background.surface
- background.subtle
- border.default
- border.subtle
- text.primary
- text.secondary
- text.tertiary
- text.disabled

### Brand / action
- brand.miwa.green
- action.primary
- action.primary.hover
- action.secondary
- navigation.active
- focus.ring

### State
- success
- warning
- error
- info
- risk
- overdue
- disabled

AIONE principle:
- white / warm white / neutral / light gray dominate the interface.
- Miwa green is reserved for key actions, navigation activation, confirmation and small brand accents.
- Miwa red is reserved for risk, error, overdue, exception and blocking states.
- main content should avoid large decorative green/red surfaces unless business meaning requires them.

## 3. Typography tokens
- font.family.ui
- font.family.content
- font.size.xs/sm/md/lg/xl/2xl/3xl
- font.weight.regular/medium/semibold/bold
- line.height.compact/normal/relaxed
- letter.spacing.default/compact/wide

Rules:
- hierarchy must be clear.
- body text must remain comfortably readable.
- avoid page-level font-size overrides.

## 4. Spacing tokens
Recommended scale:
- space.0
- space.1
- space.2
- space.3
- space.4
- space.6
- space.8
- space.10
- space.12
- space.16
- space.20
- space.24

Use spacing tokens for padding, gaps and section rhythm. No arbitrary one-off spacing unless documented.

## 5. Radius tokens
- radius.none
- radius.sm
- radius.md
- radius.lg
- radius.full

Avoid per-page arbitrary corner radii.

## 6. Border tokens
- border.width.default
- border.width.strong
- border.color.default
- border.color.subtle
- border.color.focus
- border.color.error

## 7. Shadow tokens
- shadow.none
- shadow.xs
- shadow.sm
- shadow.md
- shadow.overlay

AIONE uses light elevation; shadows should not become a decorative visual language.

## 8. Size tokens
- control.height.sm/md/lg
- icon.size.sm/md/lg
- avatar.size.sm/md/lg
- sidebar.width
- aside.width
- header.height
- content.maxWidth

## 9. Breakpoint tokens
- breakpoint.sm
- breakpoint.md
- breakpoint.lg
- breakpoint.xl

Responsive behavior should be defined by Page Type and shared components, not one-off page CSS.

## 10. Motion tokens
- motion.duration.fast
- motion.duration.normal
- motion.duration.slow
- motion.easing.standard
- motion.easing.enter
- motion.easing.exit

Motion should communicate state/transition, not decorate.

## 11. State tokens
- state.hover
- state.focus
- state.selected
- state.active
- state.disabled
- state.loading
- state.error
- state.archived
- state.deleted

## 12. Data visualization tokens
Analytics should have a separate semantic token layer for series, comparison, positive/negative and thresholds. Do not hardcode chart colors per dashboard.

## 13. Publication tokens
Publication / electronic-document output needs separate print tokens:
- print.page.a4
- print.margin
- print.header
- print.footer
- print.pageNumber
- print.cover
- print.typography

Web and print may share semantic content but need different presentation tokens.

## 14. Icon tokens
Material Symbols is the default icon source. Components should reference semantic icon names where useful instead of embedding arbitrary icon assets.

## 15. i18n interaction with tokens
Visual tokens must not encode language-specific business meaning. Typography and size rules must tolerate Chinese, Japanese and English labels without page-specific visual forks. Language-specific differences should be handled through shared locale/typography configuration rather than duplicated page CSS.

## 16. Hardcode prohibition
Do not introduce new page-level hardcoded values for:
- colors
- typography
- spacing
- radius
- shadows
- common control sizes
- common state styling

Exceptions require an explicit business/visual reason and should be candidates for promotion into tokens if repeated.

## 17. Governance
- One CURRENT token definition.
- Deprecated tokens must be tracked.
- Token changes should be reviewed for cross-page impact.
- CI should progressively detect raw color values and known deprecated tokens.
- Components, not pages, are the primary token consumers.

## 18. Implementation priority
P0: neutral/background/text/action/state colors; typography; spacing; radius; borders; control sizes.
P1: shadows, responsive breakpoints, motion, analytics tokens.
P2: publication tokens, automated token linting and token documentation UI.
