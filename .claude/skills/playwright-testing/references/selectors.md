# Playwright Selectors Guide

## Selector Strategies (Priority Order)

1. **Test ID** (Most reliable)
2. **Role** (Accessibility-based)
3. **Text content**
4. **CSS selector**
5. **XPath** (Last resort)

## Test ID Selectors (Recommended)

Add `data-testid` attributes to your components:

```html
<button data-testid="submit-button">Submit</button>
```

```javascript
browser_click("[data-testid='submit-button']")
```

### Benefits
- Stable across refactoring
- Not affected by text/style changes
- Clear intent for testing

## Role Selectors (Accessibility)

Based on ARIA roles:

```javascript
// Button
browser_click("role=button[name='Submit']")

// Link
browser_click("role=link[name='Home']")

// Textbox
browser_type("role=textbox[name='Email']", "test@example.com")

// Checkbox
browser_click("role=checkbox[name='Remember me']")

// Dialog
browser_wait_for("role=dialog")

// Alert
browser_wait_for("role=alert")

// Navigation
browser_click("role=navigation >> text=Home")
```

### Common Roles
| Role | Elements |
|------|----------|
| `button` | `<button>`, `<input type="button">` |
| `link` | `<a href>` |
| `textbox` | `<input type="text">`, `<textarea>` |
| `checkbox` | `<input type="checkbox">` |
| `radio` | `<input type="radio">` |
| `combobox` | `<select>` |
| `dialog` | `<dialog>`, `[role="dialog"]` |
| `navigation` | `<nav>` |
| `main` | `<main>` |

## Text Selectors

Match by visible text content:

```javascript
// Exact match
browser_click("text=Sign In")

// Case-insensitive
browser_click("text=sign in")

// Partial match with regex
browser_click("text=/sign/i")

// Contains
browser_click("text=Sign")  // Matches "Sign In", "Sign Up", etc.
```

## CSS Selectors

Standard CSS selectors:

```javascript
// By ID
browser_click("#submit-button")

// By class
browser_click(".primary-button")
browser_click(".btn.btn-primary")

// By attribute
browser_click("[type='submit']")
browser_click("[name='email']")
browser_click("[aria-label='Close']")

// By tag
browser_click("button")

// Descendant
browser_click("form button")
browser_click(".modal .close-button")

// Direct child
browser_click("form > button")

// Nth child
browser_click("li:nth-child(2)")
browser_click("tr:first-child")
browser_click("tr:last-child")

// Attribute contains
browser_click("[class*='primary']")

// Attribute starts with
browser_click("[id^='user-']")

// Attribute ends with
browser_click("[id$='-button']")
```

## Chaining Selectors

Combine selectors for precision:

```javascript
// CSS >> text
browser_click(".card >> text=View Details")

// Role >> text
browser_click("role=listitem >> text=Item 1")

// Multiple levels
browser_click("form >> .field-group >> input")
```

## Filtering

### has: Filter by child content
```javascript
// Card that contains "Premium"
browser_click(".card:has(text='Premium')")

// List item with specific badge
browser_click("li:has(.badge-new)")
```

### has-text: Filter by text
```javascript
// Row containing specific text
browser_click("tr:has-text('John Doe')")
```

### nth: Select by index
```javascript
// Third item
browser_click(".item >> nth=2")  // 0-indexed

// First item
browser_click(".item >> nth=0")

// Last item
browser_click(".item >> nth=-1")
```

## Waiting Selectors

### visible
```javascript
// Wait for visible element
browser_wait_for(".modal >> visible=true")
```

### hidden
```javascript
// Wait for element to disappear
browser_wait_for("hidden=.loading-spinner")
```

## Form Field Selectors

### Input by label
```javascript
// Finds input associated with label
browser_type("label:has-text('Email') >> input", "test@example.com")
```

### Input by placeholder
```javascript
browser_type("[placeholder='Enter email']", "test@example.com")
```

### Input by name
```javascript
browser_type("[name='email']", "test@example.com")
```

## Troubleshooting Selectors

### Selector not found?

1. **Check element is visible**
   ```javascript
   browser_snapshot()  // See DOM tree
   ```

2. **Check element is in viewport**
   ```javascript
   browser_evaluate("document.querySelector('#element').scrollIntoView()")
   ```

3. **Wait for element**
   ```javascript
   browser_wait_for("#element")
   browser_click("#element")
   ```

4. **Check for iframes**
   ```javascript
   // May need to handle frame context
   ```

### Multiple matches?

1. **Be more specific**
   ```javascript
   // Instead of
   browser_click("button")
   
   // Use
   browser_click("form#login button[type='submit']")
   ```

2. **Use nth**
   ```javascript
   browser_click("button >> nth=0")  // First button
   ```

3. **Use has-text**
   ```javascript
   browser_click("button:has-text('Submit')")
   ```