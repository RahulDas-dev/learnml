---
name: playwright-testing
description: 'Browser automation and UI testing with Playwright MCP. Use when testing web pages, taking screenshots, verifying UI behavior, checking console errors, testing responsive design, or automating browser interactions.'
---

# Playwright Testing Skill

## When to Use
- Testing web pages and UI components
- Taking screenshots for visual verification
- Checking browser console for errors
- Testing responsive design across viewports
- Automating form submissions and interactions
- Verifying page content and elements

## Screenshot Folder

**Always save screenshots to `.playwright-mcp/` folder**

## Dev Server URL Detection

**Do NOT hardcode URLs.** Determine the dev server URL dynamically:

### Check if Dev Server is Running
```bash
# Run the check script
./.github/skills/playwright-testing/scripts/check-devserver.sh

# Or manually check common ports
lsof -i :3000 -sTCP:LISTEN  # Next.js default
lsof -i :5173 -sTCP:LISTEN  # Vite default
lsof -i :8000 -sTCP:LISTEN  # Python/FastAPI default
```

### URL Detection Rules

| Check | Port | URL |
|-------|------|-----|
| `package.json` has `"next"` | 3000 | `http://localhost:3000` |
| `package.json` has `"vite"` | 5173 | `http://localhost:5173` |
| `pyproject.toml` has `uvicorn` | 8000 | `http://localhost:8000` |
| `.env` has `PORT=XXXX` | XXXX | `http://localhost:XXXX` |
| `next.config.ts` custom port | check file | as configured |

### Before Testing - Always Verify

```bash
# 1. Check what's running
lsof -i -P | grep LISTEN | grep -E ':(3000|3001|5173|8000|8080)'

# 2. Or use the script
bash .github/skills/playwright-testing/scripts/check-devserver.sh
```

### If Server Not Running

```bash
# Next.js / React
pnpm run dev

# Vite
pnpm run dev

# Python FastAPI
uv run uvicorn backend.app:app --reload --port 8000
```

## Quick Start

### 1. Verify Dev Server
```bash
lsof -i :3000 -sTCP:LISTEN  # Check if running
```

### 2. Navigate to Page
```javascript
browser_navigate("http://localhost:3000")  // Use detected port
```

### 3. Take Screenshot
```javascript
browser_take_screenshot()  // Saves to .playwright-mcp/
```

### 4. Check for Errors
```javascript
browser_console_messages()
```

## Core Commands

### Navigation
| Command | Description |
|---------|-------------|
| `browser_navigate(url)` | Go to URL |
| `browser_navigate_back()` | Go back |
| `browser_navigate_forward()` | Go forward |
| `browser_tabs()` | List open tabs |
| `browser_tab_new(url)` | Open new tab |
| `browser_tab_select(index)` | Switch tab |
| `browser_tab_close()` | Close current tab |

### Interaction
| Command | Description |
|---------|-------------|
| `browser_click(selector)` | Click element |
| `browser_type(selector, text)` | Type into input |
| `browser_fill_form(data)` | Fill form fields |
| `browser_select_option(selector, value)` | Select dropdown |
| `browser_hover(selector)` | Hover over element |
| `browser_press_key(key)` | Press keyboard key |
| `browser_drag(from, to)` | Drag and drop |
| `browser_file_upload(selector, path)` | Upload file |

### Evidence & Validation
| Command | Description |
|---------|-------------|
| `browser_take_screenshot()` | Capture screenshot |
| `browser_snapshot()` | Get DOM/accessibility tree |
| `browser_console_messages()` | Get console logs |
| `browser_network_requests()` | Get network activity |
| `browser_evaluate(script)` | Run JavaScript |

### Viewport & Responsiveness
| Command | Description |
|---------|-------------|
| `browser_resize(width, height)` | Set viewport size |

### Waiting
| Command | Description |
|---------|-------------|
| `browser_wait_for(selector/text)` | Wait for element/text |

### Dialogs
| Command | Description |
|---------|-------------|
| `browser_handle_dialog(action)` | Accept/dismiss alerts |

## Common Workflows

### Quick Visual Check
```javascript
// 1. Navigate
browser_navigate("http://localhost:3000/dashboard")

// 2. Wait for load
browser_wait_for("Dashboard")

// 3. Screenshot
browser_take_screenshot()

// 4. Check errors
browser_console_messages()
```

### Responsive Testing
```javascript
// Desktop
browser_resize(1440, 900)
browser_take_screenshot()

// Tablet
browser_resize(768, 1024)
browser_take_screenshot()

// Mobile
browser_resize(375, 812)
browser_take_screenshot()
```

### Form Testing
```javascript
// Fill form
browser_type("#email", "test@example.com")
browser_type("#password", "password123")
browser_click("button[type='submit']")

// Wait for result
browser_wait_for("Welcome")
browser_take_screenshot()
```

### Interactive State Testing
```javascript
// Hover state
browser_hover(".card")
browser_take_screenshot()

// Click state
browser_click(".dropdown-trigger")
browser_wait_for(".dropdown-menu")
browser_take_screenshot()
```

## Viewport Sizes

| Device | Width | Height |
|--------|-------|--------|
| Mobile | 375px | 812px |
| Tablet | 768px | 1024px |
| Desktop | 1440px | 900px |
| Large Desktop | 1920px | 1080px |

## Selectors

Use these selector strategies:
```javascript
// By ID
browser_click("#submit-button")

// By class
browser_click(".primary-button")

// By text content
browser_click("text=Submit")

// By role
browser_click("role=button[name='Submit']")

// By test ID (recommended)
browser_click("[data-testid='submit']")

// Complex selectors
browser_click("form button.primary")
```

## References
- [Command Reference](./references/commands.md) - All Playwright MCP commands
- [Testing Patterns](./references/patterns.md) - Common testing workflows
- [Selectors Guide](./references/selectors.md) - Element selection strategies