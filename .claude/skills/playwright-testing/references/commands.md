# Playwright MCP Command Reference

## Navigation Commands

### browser_navigate
Navigate to a URL.
```javascript
browser_navigate("https://example.com")
browser_navigate("http://localhost:3000/dashboard")
```

### browser_navigate_back / browser_navigate_forward
Navigate browser history.
```javascript
browser_navigate_back()
browser_navigate_forward()
```

### browser_tabs
List all open browser tabs.
```javascript
browser_tabs()
// Returns: [{index: 0, url: "...", title: "..."}]
```

### browser_tab_new
Open a new tab with optional URL.
```javascript
browser_tab_new("https://example.com")
```

### browser_tab_select
Switch to a specific tab by index.
```javascript
browser_tab_select(1)  // Switch to second tab
```

### browser_tab_close
Close the current tab.
```javascript
browser_tab_close()
```

## Interaction Commands

### browser_click
Click an element.
```javascript
browser_click("#submit")
browser_click("button.primary")
browser_click("text=Sign In")
browser_click("[data-testid='login-button']")
```

### browser_type
Type text into an input field.
```javascript
browser_type("#email", "user@example.com")
browser_type("input[name='search']", "query")
```

### browser_fill_form
Fill multiple form fields at once.
```javascript
browser_fill_form({
  "#email": "user@example.com",
  "#password": "secret123",
  "#name": "John Doe"
})
```

### browser_select_option
Select an option from a dropdown.
```javascript
browser_select_option("#country", "US")
browser_select_option("select[name='role']", "admin")
```

### browser_hover
Hover over an element (triggers hover states).
```javascript
browser_hover(".menu-item")
browser_hover("#dropdown-trigger")
```

### browser_press_key
Press a keyboard key.
```javascript
browser_press_key("Enter")
browser_press_key("Escape")
browser_press_key("Tab")
browser_press_key("ArrowDown")
browser_press_key("Control+a")  // Select all
browser_press_key("Meta+c")     // Copy (Mac)
```

### browser_drag
Drag an element to another location.
```javascript
browser_drag("#source", "#target")
browser_drag(".draggable", ".drop-zone")
```

### browser_file_upload
Upload a file to a file input.
```javascript
browser_file_upload("#file-input", "/path/to/file.pdf")
```

## Evidence & Validation Commands

### browser_take_screenshot
Capture a screenshot of the current viewport.
```javascript
browser_take_screenshot()
// Screenshot saved to .playwright-mcp/ folder
```

### browser_snapshot
Get the DOM structure and accessibility tree.
```javascript
browser_snapshot()
// Returns: DOM tree with ARIA roles
```

### browser_console_messages
Get browser console messages (logs, errors, warnings).
```javascript
browser_console_messages()
// Returns: [{type: "error", text: "..."}, ...]
```

### browser_network_requests
Get network requests made by the page.
```javascript
browser_network_requests()
// Returns: [{url: "...", method: "GET", status: 200}, ...]
```

### browser_evaluate
Execute JavaScript in the browser context.
```javascript
browser_evaluate("document.title")
browser_evaluate("window.scrollTo(0, 1000)")
browser_evaluate("localStorage.getItem('token')")
browser_evaluate("document.querySelectorAll('.item').length")
```

## Viewport Commands

### browser_resize
Set the browser viewport size.
```javascript
browser_resize(1440, 900)   // Desktop
browser_resize(768, 1024)   // Tablet
browser_resize(375, 812)    // Mobile
```

## Waiting Commands

### browser_wait_for
Wait for an element or text to appear.
```javascript
// Wait for text
browser_wait_for("Welcome back")

// Wait for element
browser_wait_for("#dashboard")
browser_wait_for(".loading-complete")

// Wait for element to disappear
browser_wait_for("hidden=#spinner")
```

## Dialog Commands

### browser_handle_dialog
Handle JavaScript dialogs (alert, confirm, prompt).
```javascript
// Accept dialog
browser_handle_dialog("accept")

// Dismiss dialog
browser_handle_dialog("dismiss")

// Accept with input (for prompts)
browser_handle_dialog("accept", "input text")
```

## Browser Management

### browser_close
Close the browser instance.
```javascript
browser_close()
```

### browser_install
Install browser binaries if needed.
```javascript
browser_install()
```