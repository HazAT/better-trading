# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Better PathOfExile Trading is a browser extension that enhances the pathofexile.com trade site for Path of Exile and Path of Exile 2. Built with Ember.js 3.14 and TypeScript.

## Common Commands

All development commands go through the Makefile:

```bash
make dependencies    # Install dependencies (npm ci)
make dev             # Build and watch for development
make test            # Run test suite
make verify          # Run all linters and type checking
make format          # Auto-format code
make package         # Package for Chrome and Firefox
make package-chrome  # Package for Chrome only
```

Run a single test file:
```bash
npx ember exam --filter "service-name" --mocha-reporter spec
```

## Architecture

### Pod-Based Structure

The app uses Ember's pod structure where components, routes, and their templates/styles are co-located:

```
app/
├── pods/
│   ├── components/     # UI components with co-located templates/styles
│   └── [route-name]/   # Routes with co-located route.ts, template.hbs, controller.ts
├── services/           # Business logic and state management
├── utilities/          # Pure helper functions
└── types/              # TypeScript type definitions
```

### Services Architecture

Business logic lives in `app/services/`. Key services:
- `bookmarks.ts` - Bookmark management with subfolder `bookmarks/` for related utilities
- `storage.ts` - Browser extension storage abstraction
- `poe-ninja.ts` - External pricing data integration
- `item-results/` - Trade result processing
- `trade-location/` - URL/location state management
- `search-panel.ts` - Search panel state

### Extension Structure

```
extension/
├── background.js      # Service worker (Manifest v3)
└── icon*.png          # Extension icons
```

The Ember app bootstraps into `#better-trading-container` and only initializes when the `#trade` element exists on the page.

## Code Quality

### Linting Stack
- ESLint for TypeScript/JavaScript
- Stylelint for SCSS
- ember-template-lint for Handlebars
- Prettier for formatting (single quotes, 120 char width)

### Testing
- Framework: Ember Mocha + Chai + Sinon
- Tests live in `tests/unit/services/`
- 60% coverage minimum enforced (branches, functions, lines, statements)

### TypeScript
- Strict mode enabled
- Target: ES2019

## Extension Constraints

- No `eval()` - Required for Manifest v3 compatibility
- Firefox builds require vendor.js patches (handled by `make package-firefox`)
- Cross-browser compatibility required for Chrome and Firefox
