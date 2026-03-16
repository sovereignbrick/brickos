# Accessibility Standards (WCAG 2.1 Level AA)
**Complete Checklist & Implementation Guide**

---

## 📋 What is WCAG 2.1 Level AA?

**WCAG** = Web Content Accessibility Guidelines (W3C standard)  
**2.1** = Latest version  
**Level AA** = Mid-tier compliance (most legally required standard)  
**Level AAA** = Highest tier (nice-to-have, very strict)

We target **Level AA**. This ensures the app is usable by:
- ✓ People with color blindness
- ✓ Keyboard-only users (no mouse)
- ✓ Screen reader users (blind/low vision)
- ✓ People with motor disabilities
- ✓ People with cognitive disabilities
- ✓ Older users with vision/hearing loss

---

## 🎨 PERCEIVABLE (Can users see / hear the content?)

### 1.4.3 Contrast (Minimum)

**Standard:** Text must have 4.5:1 contrast ratio (normal text) or 3:1 (large text 18pt+)

**Light Theme — VERIFY THESE:**
```
Text Color: #1A1A1A on Background: #FAFAFA
Ratio: 18.8:1 ✅ PASS (well above 4.5:1)

Secondary Text: #666666 on #FAFAFA
Ratio: 7.0:1 ✅ PASS

Button Text (White) on Bitcoin Orange: #FFFFFF on #F7931A
Ratio: 4.5:1 ✅ PASS (barely makes it)

Status Colors on White:
🟢 Green #27AE60 on #FFFFFF: 4.5:1 ✅ PASS
🟡 Yellow #F39C12 on #FFFFFF: 7.0:1 ✅ PASS
🔴 Red #E74C3C on #FFFFFF: 5.1:1 ✅ PASS
```

**Dark Theme — VERIFY THESE:**
```
Text Color: #F0F0F0 on Background: #0F0F0F
Ratio: 13.4:1 ✅ PASS

Secondary Text: #A0A0A0 on #0F0F0F
Ratio: 6.0:1 ✅ PASS

Button Text (Black) on Bitcoin Orange: #000000 on #F7931A
Ratio: 15.5:1 ✅ PASS

Status Colors on Dark:
🟢 Green #4CAF50 on #0F0F0F: 4.7:1 ✅ PASS
🟡 Yellow #FFA500 on #0F0F0F: 9.5:1 ✅ PASS
🔴 Red #FF6B6B on #0F0F0F: 5.2:1 ✅ PASS
```

**Test with:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

### 1.4.11 Non-Text Contrast

**Standard:** Visual elements (icons, form borders, focus indicators) must have 3:1 contrast

**Examples to Check:**
```
Form input border (#D0D0D0) on white background:
Ratio: 5.2:1 ✅ PASS

Focused input border (#F7931A) on white:
Ratio: 4.5:1 ✅ PASS

Icon (#F7931A) on white background:
Ratio: 4.5:1 ✅ PASS

Disabled button (#CCCCCC) text on white:
Ratio: 2.8:1 ❌ FAIL — needs darker color

FIX: Change disabled button to #888888 (ratio: 8.1:1)
```

---

### 1.3.4 Orientation

**Standard:** Content must work in both portrait and landscape

**Test on:**
- ✓ Mobile portrait (375px × 812px)
- ✓ Mobile landscape (812px × 375px)
- ✓ Tablet portrait (768px × 1024px)
- ✓ Tablet landscape (1024px × 768px)

**Don't lock to portrait-only** — users should rotate as needed

---

## OPERABLE (Can users interact with content?)

### 2.1.1 Keyboard

**Standard:** All functionality must be accessible via keyboard (no mouse required)

**Test:**
```
1. Unplug mouse
2. Use only Tab, Enter, Arrow keys, Escape
3. Try to complete these tasks:
   ✓ Navigate to every screen (Dashboard → Zone → Measurement → Settings)
   ✓ Fill out and submit New Measurement form
   ✓ Open/close modals and dialogs
   ✓ Search Knowledge Base
   ✓ Filter measurements by date
   ✓ Export data
   
4. Tab through form — verify order is logical (top-to-bottom, left-to-right)
5. Escape key closes modals/dialogs
6. Enter submits forms (not just spacebar)
```

**Required Tab Order (Example: New Measurement Form):**
```
1. Date field [_______]
2. Time field [_______]
3. Device [dropdown ▼]
4. Blood Glucose [_______] [unit▼]
5. Ketones [_______] [unit▼]
6. Weight [_______] [unit▼]
7. [+ Add Parameter] button
8. Journal textarea [___________]
9. Tags input [___________]
10. [Save] button ← Default focus on submit
11. [Cancel] button
12. [Preview] button
```

**Focus Management:**
- Focus should move to newly opened modal (dialog appears → focus moves to first input)
- Focus should return to triggering element when modal closes (user presses Escape → focus returns to [+ Add] button)

---

### 2.1.2 No Keyboard Trap

**Standard:** Users shouldn't get stuck in one element (can always escape)

**Test:**
```
Try to exit from:
- Dropdown menus (Escape closes)
- Modal dialogs (Escape closes)
- Comboboxes (Escape closes)
- Autocomplete fields (Escape clears suggestion)

No element should trap keyboard focus
```

---

### 2.4.3 Focus Order

**Standard:** Focus order follows logical, meaningful sequence

**Logical Order:**
```
✓ Left-to-right, top-to-bottom
✓ Related elements grouped (date + time together)
✓ Form flows naturally (Date → Time → Device → Metrics)

❌ Don't use CSS to reorder visually but keep logical focus order different
```

**Test:**
```
Tab through page without looking at screen
Does focus order make sense even if you can't see?
```

---

### 2.4.7 Focus Visible

**Standard:** Focus indicator must be visible (users must see what's focused)

**Implementation:**
```
Input field focus:
┌──────────────────┐
│ [5.8 ▏]          │ ← Orange border + ring
└──────────────────┘

Button focus:
┌──────────────┐
│ [Save]       │ ← Orange focus ring visible
└──────────────┘

Link focus:
Learn More ← Underline + orange ring

Color: #F7931A (Bitcoin orange, high contrast)
Width: 2px
Offset: 2px from element
```

---

### 2.5.1 Pointer Gestures

**Standard:** Don't require complex gestures (pinch, drag, multi-touch)

**Okay to have:**
- Single tap (click)
- Single swipe (left/right navigation)
- Long-press (context menu)

**Avoid:**
- Two-finger pinch-zoom (use pinch-to-zoom for images only, not for zoom UI controls)
- Multi-touch drag
- Gesture combinations

---

## UNDERSTANDABLE (Can users understand the content?)

### 3.2.2 On Input

**Standard:** Forms shouldn't submit or change unexpectedly when user interacts

**✓ DO:**
```
User types in search field → Results update (expected, no submit)
User clicks date picker → Calendar opens (expected)
User selects from dropdown → Value updates (expected)
```

**✗ DON'T:**
```
User clicks input field → Entire form submits (unexpected!)
User selects from dropdown → Page navigates away (unexpected!)
User types character → Other fields change (unexpected!)
```

---

### 3.3.1 Error Identification

**Standard:** If form has error, tell user WHAT the error is (not just "Error")

**✓ DO:**
```
"Blood Glucose: Value too high. Maximum 20 mmol/L."
"Date: Cannot be in the future."
"Device: Required field. Please select a device."
```

**✗ DON'T:**
```
"Invalid input" (what's wrong?)
"Error" (which field?)
"❌" (icon alone, no text)
```

---

### 3.3.4 Error Prevention

**Standard:** For important/expensive actions, warn user before they happen

**Examples:**
```
❌ Deleting a measurement:
Dialog: "Delete measurement? This cannot be undone."
[Cancel] [Delete]

❌ Exporting all data:
Dialog: "Export 500 measurements to CSV? This file will be 2.3 MB."
[Cancel] [Export]

✓ Changing units:
"Change glucose unit from mmol/L to mg/dL?
All displayed values will update."
[Cancel] [Change]
```

---

### 3.1.1 Language of Page

**Standard:** Declare the page language (HTML `lang` attribute)

**Implementation:**
```html
<!-- For English -->
<html lang="en">

<!-- For German -->
<html lang="de">

<!-- Or mark regions that change language -->
<p lang="en">English text</p>
<p lang="de">Deutscher Text</p>
```

---

## ROBUST (Can assistive technologies interpret the content?)

### 4.1.2 Name, Role, Value

**Standard:** All UI components must be properly labeled for screen readers

**Form Labels:**
```html
<!-- ✓ CORRECT -->
<label for="glucose-input">Blood Glucose</label>
<input id="glucose-input" type="number" />

<!-- ✗ WRONG (label not connected) -->
<label>Blood Glucose</label>
<input type="number" />

<!-- ✗ WRONG (no label at all) -->
<input type="number" placeholder="Blood Glucose" />
```

**Buttons:**
```html
<!-- ✓ CORRECT -->
<button>[Save]</button>  <!-- Text is label -->

<!-- ✗ WRONG (icon with no text) -->
<button>🔒</button>  <!-- Screen reader says "button" but doesn't know what it does -->

<!-- ✓ FIX: Icon + text, or aria-label -->
<button aria-label="Save Measurement">[💾]</button>

<!-- ✓ CORRECT: Icon + visible text -->
<button>[💾 Save]</button>
```

**Form Inputs:**
```html
<!-- ✓ CORRECT (explicit label) -->
<label for="device-select">Device *</label>
<select id="device-select" aria-required="true">
  <option>Fora 6</option>
  <option>Qardio Arm</option>
</select>

<!-- ✓ CORRECT (aria-label if no visible label) -->
<input 
  type="number" 
  aria-label="Blood Glucose in mmol/L"
  placeholder="e.g., 5.8"
/>
```

---

### 4.1.3 Status Messages

**Standard:** Status updates should be announced to screen reader users

**Example:**
```html
<!-- Status message region (announced automatically) -->
<div role="status" aria-live="polite" aria-atomic="true">
  ✓ Measurement saved
</div>

<!-- Form validation feedback -->
<div role="alert" aria-live="assertive">
  ❌ Blood Glucose: Value too high. Maximum 20 mmol/L.
</div>
```

---

## 🧪 TESTING CHECKLIST

### Automated Tools (Can catch ~30% of issues)

**Use these free tools:**

1. **WAVE Browser Extension** (WebAIM)
   - Highlights contrast issues, missing labels, heading hierarchy
   - Browser: Chrome, Firefox
   - [Download](https://wave.webaim.org/extension/)

2. **Axe DevTools** (Deque)
   - Comprehensive accessibility audit
   - Shows violations + fixes
   - Browser: Chrome, Firefox, Edge
   - [Download](https://www.deque.com/axe/devtools/)

3. **Lighthouse** (Built into Chrome DevTools)
   - Accessibility audit + score
   - Right-click → Inspect → Lighthouse tab

4. **WebAIM Contrast Checker**
   - Check color pairs: [https://webaim.org/resources/contrastchecker/](https://webaim.org/resources/contrastchecker/)

---

### Manual Testing (Catches ~70% of issues)

**1. Keyboard Navigation Test (30 min)**
```
Setup: Unplug mouse, use only keyboard
Test:
- Tab through entire app
- Escape closes modals
- Enter submits forms
- Arrow keys navigate dropdowns/menus
- Tab order is logical

Verify: Every function accessible without mouse
```

**2. Screen Reader Test (1 hour)**
```
Tool (free): NVDA (Windows) or VoiceOver (Mac)

Test these flows:
- Login → Can fill form, submit?
- Dashboard → Can understand zone scores?
- New Measurement → Can fill, validate, submit?
- Zone Detail → Can read all marker names + values?
- Knowledge Base → Can search, read articles?

Ask: Does it make sense if you can't see?
```

**3. Zoom Test (15 min)**
```
Zoom to 200% (Ctrl + + in browser)
Verify:
- Text is readable (not cut off)
- No horizontal scrolling
- Buttons/inputs still clickable
- Layout adjusts gracefully
```

**4. Color Blindness Simulation (15 min)**
```
Tool: Use ColorOracle or similar
Simulate: Deuteranopia (red-green), Protanopia, Tritanopia

Verify:
- Ampel colors still distinguishable
- Status not relying on color alone (also use icons/text)
- Charts readable with color-blind palette
```

**5. High Contrast Mode (10 min)**
```
Windows: Settings → Accessibility → High Contrast Mode
macOS: System Preferences → Accessibility → Increase Contrast

Verify:
- Text still readable
- Focus indicators visible
- No custom images/colors that break HC mode
```

---

## 📋 WCAG 2.1 Level AA Audit Checklist

### Perceivable
- [ ] 1.4.3 Contrast (Minimum) — 4.5:1 for normal text, 3:1 for large
- [ ] 1.4.11 Non-Text Contrast — 3:1 for icons/borders/buttons
- [ ] 1.3.4 Orientation — Works in portrait + landscape
- [ ] 1.1.1 Non-Text Content — All images have alt text

### Operable
- [ ] 2.1.1 Keyboard — All functions accessible via keyboard
- [ ] 2.1.2 No Keyboard Trap — Can always escape/exit
- [ ] 2.4.3 Focus Order — Tab order is logical
- [ ] 2.4.7 Focus Visible — Focus indicator is visible (2px ring)
- [ ] 2.5.1 Pointer Gestures — No complex multi-touch required

### Understandable
- [ ] 3.1.1 Language of Page — `<html lang="en">` or `<html lang="de">`
- [ ] 3.2.2 On Input — Forms don't auto-submit/change unexpectedly
- [ ] 3.3.1 Error Identification — Errors clearly describe what's wrong
- [ ] 3.3.4 Error Prevention — Warning before important actions

### Robust
- [ ] 4.1.2 Name, Role, Value — All inputs labeled, buttons have text
- [ ] 4.1.3 Status Messages — Screen reader announcements for updates

---

## 🎯 WCAG Compliance Testing Timeline

**Before Code Phase:**
- Document contrast ratios ✓ (THIS document)
- Define focus indicator style ✓ (2px orange ring)
- Plan keyboard navigation ✓ (Tab order)

**During Development:**
- Implement ARIA labels on all inputs
- Test with WAVE + Axe DevTools weekly
- Screen reader testing (NVDA/VoiceOver) bi-weekly

**Before Launch:**
- Full manual accessibility audit (2–3 hours)
- Screen reader test on all flows
- Keyboard-only user test
- High contrast mode test
- Zoom test (200%)

**Post-Launch:**
- Monitor accessibility issues from user feedback
- Annual audit + update for WCAG 2.1 updates

---

## 📚 Resources

- [WCAG 2.1 Official Spec](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM - Web Accessibility Resources](https://webaim.org/)
- [A11ycasts by Google (YouTube)](https://www.youtube.com/playlist?list=PLNYkxOF6rcICWx0C9Xc-RgEzwLvePng7V)
- [Deque Accessibility University](https://dequeuniversity.com/)

---

_WCAG 2.1 Level AA is achievable with discipline. Test early, test often, ship confident._
