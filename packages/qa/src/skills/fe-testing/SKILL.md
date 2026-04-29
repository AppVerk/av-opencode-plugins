# Frontend Testing Patterns

## Playwright Strategy

**Priority order:**
1. **Bash `playwright` CLI** — `playwright screenshot`, `playwright open`, JS eval via node
2. **MCP Playwright** — if browser tools are available in your session
3. **None** — mark all FE scenarios as SKIP

---

## Execution Workflow

For each FE scenario from the test plan:

1. **Read the scenario** — understand steps, expected result, edge cases
2. **Execute main flow** — follow steps using available Playwright method
3. **Verify result** — check for expected elements/text
4. **Execute edge cases** — run each edge case as a sub-test
5. **Record result** — pass/fail with details

---

## Bash Playwright CLI Patterns

### Navigation & Verification

**Screenshot for visual verification:**
```bash
playwright screenshot --viewport-size=1280,720 "http://localhost:3000/page" /tmp/page-screenshot.png
```

Inspect the screenshot to verify the page loaded correctly.

**Open page in browser (for interactive debugging):**
```bash
playwright open "http://localhost:3000/page"
```

### JavaScript Evaluation via Node

Create a temporary script to evaluate JS on the page:
```bash
cat > /tmp/eval.js << 'EOF'
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/page');
  
  // Evaluate JS
  const result = await page.evaluate(() => {
    return {
      title: document.title,
      itemsCount: document.querySelectorAll('.item').length,
      hasError: !!document.querySelector('.error-message')
    };
  });
  
  console.log(JSON.stringify(result));
  await browser.close();
})();
EOF
node /tmp/eval.js
```

### Screenshot on Failure

```bash
mkdir -p docs/testing/reports/screenshots
playwright screenshot --viewport-size=1280,720 "http://localhost:3000/page" docs/testing/reports/screenshots/fe-XX-fail.png
```

---

## MCP Playwright Patterns (Optional)

If MCP Playwright tools are available in your session, use these patterns:

### Navigation
```
browser_navigate(url: "http://localhost:3000/page")
```

After navigation, take a snapshot to verify the page loaded:
```
browser_snapshot()
```

### Interaction

**Clicking elements:**
```
browser_click(element: "Submit button")
```

**Filling forms:**
```
browser_fill_form(formData: [
  { ref: "email input", value: "test@example.com" },
  { ref: "password input", value: "TestPass123!" }
])
```

**Keyboard actions:**
```
browser_press_key(key: "Enter")
browser_press_key(key: "Escape")
```

### Verification

**Primary method — snapshot and inspect:**
```
browser_snapshot()
```

After taking a snapshot, inspect the returned accessibility tree for:
- Expected text content
- Element visibility (present in tree = visible)
- Element state (disabled, checked, expanded)
- Error messages
- Success notifications

**JavaScript evaluation for complex checks:**
```
browser_evaluate(expression: "document.querySelector('.items-list').children.length")
```

### Waiting
```
browser_wait_for(text: "Success", timeout: 5000)
```

### Screenshots
```
browser_take_screenshot()
```

---

## Common Scenario Patterns

### Authentication Flow
1. Navigate to login page
2. Fill email + password
3. Click submit
4. Wait for redirect/dashboard
5. Verify user name/avatar visible
6. Edge: wrong password → error message
7. Edge: empty fields → validation errors

### Form Submission
1. Navigate to form page
2. Fill all required fields
3. Submit
4. Wait for success message or redirect
5. Verify data persisted (check list page or detail page)
6. Edge: submit with empty required fields → validation errors visible
7. Edge: submit with invalid data (bad email format) → field-level errors
8. Edge: double-click submit → no duplicate creation

### CRUD Operations
1. **Create:** Fill form → submit → verify new item in list
2. **Read:** Navigate to detail page → verify all fields displayed
3. **Update:** Open edit form → change field → submit → verify change
4. **Delete:** Click delete → confirm dialog → verify item removed from list
5. Edge: delete already deleted → graceful handling
6. Edge: edit with stale data → conflict handling

### Navigation & Routing
1. Click link → verify URL changed
2. Verify breadcrumb/nav state updated
3. Browser back → verify previous page
4. Direct URL access → verify page renders
5. Edge: access protected page without auth → redirect to login

---

## Result Format

For each scenario, return results in this format:

```
### FE-XX: <scenario name>
- **Status:** PASS / FAIL / SKIP
- **Details:** <what was verified / what went wrong>
- **Screenshot:** <path, only if FAIL>
- **Edge cases:**
  - <edge case 1>: PASS / FAIL — <details>
  - <edge case 2>: PASS / FAIL — <details>
```

---

## Error Handling

- If Playwright is unavailable: mark ALL FE scenarios as SKIP with reason "Playwright unavailable"
- If a page doesn't load (timeout): mark scenario as FAIL, take screenshot, note the URL
- If an element is not found: report what elements ARE visible, mark as FAIL
- If the application shows an error page (500, crash): take screenshot, mark as FAIL with error details
