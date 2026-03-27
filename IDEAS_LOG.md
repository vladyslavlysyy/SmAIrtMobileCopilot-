# Ideas Log

## Implemented
- Map technician selector in Operations map panel.
- Automatic map zoom based on displayed points bounds.
- Responsive embedded full-height map sizing by viewport breakpoints.
- Fullscreen in-app map mode with close action.
- Robust map fallback renderer when external map tiles fail.
- Point label fallback order: address -> postal code -> coordinates -> "Sense adreca".
- Product modularization into Operacions, Planificacio, and Mètriques.
- Dynamic sidebar counters from backend data (pending and blocked).

## Active Rules
- Avoid hardcoded operational data in UI.
- Prefer backend-driven counts and datasets.
- Keep README aligned with each significant UX or API change.

## Next Candidates
- Enriquir localitzacio amb barri i ciutat reals des de backend (reverse geocoding + cache), evitant fallback generic.
- Fer el MapPanel totalment responsive (mobile-first: overlays, controls, taules i fullscreen en pantalles petites).
