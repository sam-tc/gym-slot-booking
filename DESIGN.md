# Design note

## Direction

The interface uses a calm, active-lifestyle look: warm off-white page surfaces, deep green actions, a small lime accent, and generous spacing. The visual hierarchy keeps session time and booking actions prominent while secondary details stay quieter.

## Components

- **Sign-in card:** centered, narrow, and self-contained, with a segmented Login/Register control.
- **Top navigation:** shared page header that wraps on smaller screens.
- **Session cards:** responsive grid cards with a lime edge, time heading, capacity details, and a full-width action.
- **Admin sections:** grouped panels for session creation, session lists, check-in, and selected booking details.

## Interaction and accessibility

The layout collapses to a single column on phones, maintains visible keyboard focus, uses native date/time inputs, and exposes page feedback through live status regions. Buttons have explicit disabled states and readable contrast against their backgrounds.

The UI is implemented with shared CSS and existing HTML/JavaScript rather than a component framework, so new screens should reuse the existing `.topbar`, `.page-container`, `.session-grid`, `.session-card`, `.admin-section`, and button classes.
