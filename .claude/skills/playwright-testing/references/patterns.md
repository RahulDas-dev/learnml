# Playwright Testing Patterns

**NOTE**: Replace `$DEV_URL` with actual dev server URL (see SKILL.md for detection rules).

## Page Load Verification

```javascript
// Navigate and verify
browser_navigate("$DEV_URL")  // e.g., http://localhost:3000
browser_wait_for("h1")  // Wait for main heading
browser_console_messages()  // Check for errors
browser_take_screenshot()
```

## Authentication Flow

### Login Test
```javascript
// Navigate to login
browser_navigate("$DEV_URL/login")  // e.g., http://localhost:3000/login
browser_wait_for("#email")

// Fill credentials
browser_type("#email", "test@example.com")
browser_type("#password", "password123")

// Submit
browser_click("button[type='submit']")

// Verify redirect
browser_wait_for("Dashboard")  // Or expected page content
browser_take_screenshot()
browser_console_messages()
```

### Logout Test
```javascript
// Click user menu
browser_click("[data-testid='user-menu']")
browser_wait_for("Sign out")

// Click logout
browser_click("text=Sign out")

// Verify redirect to login
browser_wait_for("Sign in")
browser_take_screenshot()
```

## Form Validation

### Required Field Validation
```javascript
// Submit empty form
browser_click("button[type='submit']")
browser_wait_for("This field is required")
browser_take_screenshot()
```

### Invalid Input Validation
```javascript
// Enter invalid email
browser_type("#email", "invalid-email")
browser_click("button[type='submit']")
browser_wait_for("Please enter a valid email")
browser_take_screenshot()
```

### Successful Submission
```javascript
// Fill valid data
browser_type("#email", "valid@example.com")
browser_type("#name", "John Doe")
browser_click("button[type='submit']")

// Verify success
browser_wait_for("Successfully saved")
browser_take_screenshot()
```

## Responsive Testing

### Full Responsive Check
```javascript
const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 }
];

// For each viewport:
browser_resize(375, 812)
browser_take_screenshot()  // mobile

browser_resize(768, 1024)
browser_take_screenshot()  // tablet

browser_resize(1440, 900)
browser_take_screenshot()  // desktop
```

### Mobile Menu Test
```javascript
// Set mobile viewport
browser_resize(375, 812)
browser_take_screenshot()

// Open hamburger menu
browser_click("[data-testid='mobile-menu-button']")
browser_wait_for("nav")
browser_take_screenshot()

// Click menu item
browser_click("text=Settings")
browser_wait_for("Settings")
```

## Interactive Component Testing

### Dropdown Menu
```javascript
// Open dropdown
browser_click("[data-testid='dropdown-trigger']")
browser_wait_for("[data-testid='dropdown-menu']")
browser_take_screenshot()

// Select option
browser_click("text=Option 2")
browser_wait_for("hidden=[data-testid='dropdown-menu']")
```

### Modal Dialog
```javascript
// Open modal
browser_click("text=Open Modal")
browser_wait_for("[role='dialog']")
browser_take_screenshot()

// Close with X button
browser_click("[aria-label='Close']")
browser_wait_for("hidden=[role='dialog']")

// Or close with Escape
browser_press_key("Escape")
```

### Accordion/Expand
```javascript
// Expand section
browser_click("[data-testid='accordion-header-1']")
browser_wait_for("[data-testid='accordion-content-1']")
browser_take_screenshot()

// Collapse
browser_click("[data-testid='accordion-header-1']")
browser_wait_for("hidden=[data-testid='accordion-content-1']")
```

### Hover States
```javascript
// Hover to reveal tooltip
browser_hover(".info-icon")
browser_wait_for("[role='tooltip']")
browser_take_screenshot()

// Hover to show actions
browser_hover(".list-item")
browser_take_screenshot()  // Shows hover state with action buttons
```

## Table Testing

### Sort Column
```javascript
// Click header to sort
browser_click("th[data-column='name']")
browser_wait_for("[aria-sort='ascending']")
browser_take_screenshot()

// Click again for descending
browser_click("th[data-column='name']")
browser_wait_for("[aria-sort='descending']")
```

### Pagination
```javascript
// Go to next page
browser_click("[aria-label='Next page']")
browser_wait_for("Page 2")
browser_take_screenshot()
```

### Row Actions
```javascript
// Hover row to show actions
browser_hover("tr[data-id='123']")
browser_click("[data-testid='edit-button']")
browser_wait_for("[role='dialog']")
```

## Error State Testing

### API Error
```javascript
// Trigger action that may fail
browser_click("text=Save")

// Wait for error message
browser_wait_for("Something went wrong")
browser_take_screenshot()
browser_console_messages()  // Check for error details
```

### 404 Page
```javascript
browser_navigate("http://localhost:3000/non-existent-page")
browser_wait_for("Page not found")
browser_take_screenshot()
```

### Empty State
```javascript
browser_navigate("http://localhost:3000/items?filter=impossible")
browser_wait_for("No items found")
browser_take_screenshot()
```

## Loading State Testing

```javascript
// Trigger loading
browser_click("text=Load Data")

// Capture loading state (if fast, may need to observe)
browser_take_screenshot()

// Wait for completion
browser_wait_for("Data loaded")
browser_take_screenshot()
```

## Accessibility Quick Check

```javascript
// Get accessibility tree
browser_snapshot()

// Check for a11y issues:
// - All images have alt text
// - Form inputs have labels
// - Proper heading hierarchy
// - Focus indicators visible

// Test keyboard navigation
browser_press_key("Tab")
browser_take_screenshot()  // Check focus state
browser_press_key("Tab")
browser_take_screenshot()
browser_press_key("Enter")  // Activate focused element
```