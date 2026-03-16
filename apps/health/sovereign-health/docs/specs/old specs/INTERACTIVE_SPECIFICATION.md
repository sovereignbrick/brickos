# Interactive Specification
**Forms, Validation, Errors, Loading States, Transitions, Mobile Gestures**

---

## 🎯 Overview

This document specifies **how** users interact with the app, not just what they see. Covers form validation, error handling, loading states, transitions, and mobile-specific gestures.

---

## 📝 FORM VALIDATION & FEEDBACK

### Real-Time Status Updates (As User Types)

**Example: New Measurement Form**

```
Blood Glucose Field:
User types: "5"      → No status (incomplete)
User types: "5.8"    → 🟢 "Normal (5.2–6.2)" (green badge, live)
User types: "6.5"    → 🟡 "Slightly High (target <6.2)" (yellow badge, live)
User types: "7"      → 🔴 "Out of Range (target 5.2–6.2)" (red badge, live)
User types: "999"    → 🔴 "Invalid input (max 20 mmol/L)" (error, red)

Validation Rules (Real-Time):
- Min/max bounds check
- Unit conversion hint (mmol/L ↔ mg/dL calculator)
- Ampel status badge updates instantly
- No "submit to see if valid" experience
```

### Form Field Requirements

```
Required Fields (marked with *):
- Date * (default: today)
- Time * (default: 06:00)
- Device * (default: last used)
- At least 1 metric * (BG, or Ketones, or Weight, etc.)

Optional Fields:
- All additional metrics (Cholesterin, UA, BP, etc.)
- Journal entry
- Tags

Validation Feedback:
- Green checkmark ✓ on valid field (turns green)
- Red X on invalid field (turns red, error message below)
- Disabled submit button until all required fields valid
- Toast message on submit: "✓ Measurement saved" (1 second)
```

### Unit Conversion Helper

```
User clicks on unit selector:
[mmol/L ▼]  →  Shows dropdown:
               • mmol/L (selected, shows: 5.8)
               • mg/dL (shows: 5.8 × 18 = 104.4)
               
User selects mg/dL:
- Form auto-converts existing value
- Input field shows: [104.4]
- Checkbox: "✓ Auto-convert on toggle" (remember preference)
- Tooltip: "1 mmol/L = 18 mg/dL"
```

---

## ⚠️ ERROR STATE HANDLING

### Form Submission Errors

```
Scenario: User submits form with invalid data

Before Submit:
[Blood Glucose: 999]  → Red field, error below field
[BP Systolic: abc]   → Red field, error below field
[Submit Button]      → DISABLED (greyed out)

User clicks submit anyway (button disabled, so won't happen)

If Network Error (after submit):
Overlay appears:
┌────────────────────────────────┐
│ ⚠️  Network Error              │
│                                │
│ Could not save measurement.    │
│ Check your connection and      │
│ try again.                     │
│                                │
│ [Retry]  [Cancel]              │
└────────────────────────────────┘

If Server Error (500):
┌────────────────────────────────┐
│ 🔴 Something Went Wrong        │
│                                │
│ The server encountered an      │
│ error. Your data was NOT saved.│
│ Please try again in a moment.  │
│                                │
│ [Retry]  [Report Issue]        │
└────────────────────────────────┘
```

### Validation Error Messages

```
Clear, actionable error messages:

❌ "Blood Glucose value too high (max 20 mmol/L)"
   ✓ Tells user what's wrong + limit

❌ "Date cannot be in the future"
   ✓ Specific, explains why

❌ "At least one metric required (e.g., Blood Glucose, Weight, etc.)"
   ✓ Tells user what's needed + gives examples

❌ "Invalid time format. Use HH:MM (e.g., 06:30)"
   ✓ Shows expected format + example
```

### Conflict Resolution

```
Scenario: User submits measurement with same date/time as existing one

Dialog appears:
┌────────────────────────────────────┐
│ ⚠️  Duplicate Measurement Time      │
│                                    │
│ You already have a measurement     │
│ on March 1, 2026 @ 06:00:          │
│                                    │
│ • BG: 5.2 mmol/L                  │
│ • Weight: 73 kg                    │
│                                    │
│ Do you want to:                    │
│ [Replace] [Add as separate] [Cancel]
└────────────────────────────────────┘
```

---

## ⏳ LOADING STATES

### Skeleton Screens (Data Loading)

```
Dashboard Loading (no data yet):

┌─────────────────────┐
│ ████████  Loading   │
└─────────────────────┘

┌──────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓ (Skeleton)             │ ← Zone card placeholder
│ ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓ (Skeleton)     │ ← Metric placeholders
└──────────────────────────────────┘

[Then, when data arrives, skeleton fades and real data appears]
```

### Spinners for Long Operations

```
Uploading a large CSV file:

Dialog:
┌────────────────────────────────┐
│ 🔄 Importing measurements...   │
│                                │
│ [████████░░░░░░░░░░] 40%       │
│ Processed: 40 / 100 records    │
│                                │
│ [Cancel]                        │
└────────────────────────────────┘

Duration: 
- < 1 sec: No spinner needed (instant feedback)
- 1–3 sec: Show spinner + progress bar
- > 3 sec: Show estimated time remaining
```

### Search/Filter Loading

```
User searches Knowledge Base:
[Search: "magnesium"]  →  Search spinning
Loading results...
[Result 1] [Result 2] [Result 3]  ← Appear with fade-in animation
```

---

## 🎬 TRANSITIONS & ANIMATIONS

### Page Transitions

```
Dashboard → Zone Detail:
1. Click on zone card
2. Card expands (subtle scale animation, 200ms)
3. New content fades in (200ms)
4. Smooth scroll to top of zone detail

Zone Detail → Dashboard:
1. Click back button
2. Content fades out (150ms)
3. Smooth scroll to zone card location
4. Dashboard cards return to view

Animation timing: 150–300ms (feel snappy, not slow)
```

### Zone Expansion Animation

```
Collapsed Zone:
┌──────────────────────┐
│ ⚡ Energy & Power   │
│ 🟢 6 / 7 In Range   │
│ [Expand]            │
└──────────────────────┘

User clicks [Expand]:
1. Card grows vertically (expand animation, 250ms)
2. Additional metrics fade in (150ms)
3. Expand button becomes [Collapse]

Collapsed again:
1. Metrics fade out (150ms)
2. Card shrinks (250ms)
3. Button becomes [Expand]
```

### Modal Transitions

```
New Measurement Form:
1. [+ Add Measurement] button clicked
2. Screen darkens (overlay appears, 200ms)
3. Modal slides up from bottom (300ms, mobile) or fades in (200ms, desktop)
4. Focus automatically moves to first input field

Closing Modal:
1. User clicks [Cancel] or outside modal
2. Modal slides down / fades out (200ms)
3. Overlay disappears
4. Focus returns to previous element
```

### Status Badge Animations

```
When measurement status changes (typing in form):
Old badge: 🟡 Yellow
User changes value
Old badge fades out (100ms)
New badge fades in: 🟢 Green (100ms)

Looks smooth, not jarring
```

---

## 📱 MOBILE-SPECIFIC GESTURES

### Swipe Navigation

```
Dashboard (Mobile):

Swipe Right → Previous Zone/Week
Swipe Left  → Next Zone/Week

Zone Detail (Mobile):
Swipe Down → Collapse Zone, return to Dashboard
Swipe Up   → Scroll within zone

Visual feedback: Swipe shows drag progress in real-time
```

### Pull-to-Refresh

```
Dashboard (Mobile):
User pulls down from top:
1. Spinner appears (pull progress)
2. Release: "Release to refresh"
3. Data refreshes (spinner spins, 1–2 sec)
4. ✓ "Refreshed" message appears, fades away

Timeline: "Latest measurement: 2 minutes ago"
```

### Bottom Sheet for Mobile Forms

```
[+ Add Measurement] on mobile:
1. Click button
2. Bottom sheet slides up (300ms)
3. Form appears inside sheet (draggable by handle)
4. User can swipe down to close OR click [Cancel]
5. When submitted, sheet closes automatically

Advantages:
- Doesn't cover important dashboard info
- Natural mobile paradigm
- Easy to dismiss
```

### Long-Press Context Menu

```
Mobile Measurement History:
User long-presses on measurement card:

Context menu appears:
[View] [Edit] [Delete] [Share] [Copy]

User can:
- Tap [Edit] → Edit form slides in
- Tap [Delete] → Confirmation dialog
- Tap [Share] → Share options
- Tap [Copy] → Copies to clipboard, "Copied!" toast appears
```

---

## 🎯 INTERACTIVE FEEDBACK PATTERNS

### Confirmation Dialogs (Destructive Actions)

```
User deletes measurement:

Dialog:
┌────────────────────────────────┐
│ Delete Measurement?             │
│                                │
│ This action cannot be undone.  │
│                                │
│ Measurement: Mar 1 @ 06:00     │
│ BG: 5.8 mmol/L                │
│                                │
│ [Cancel]  [Delete] (red)       │
└────────────────────────────────┘

Default action: [Cancel] (safer)
Destructive action: [Delete] (red button)
```

### Success Messages (Toasts)

```
✓ Measurement saved (green toast, bottom right)
  Auto-dismiss after 2–3 seconds

✓ Data exported to CSV (green toast)
  Link to download appears

⚠️ No network connection (yellow toast)
  "Data will sync when online" (stays until dismissed or online)

🔴 Error saving (red toast)
  "Failed to save. Retry?" with [Retry] button
```

### Disabled States

```
[Submit] button disabled when:
- Form has validation errors (greyed out, cursor: not-allowed)
- Data is saving (shows spinner, button still greyed)
- User is offline (greyed, tooltip: "Offline — will save when online")

Visual: Opacity 50%, cursor changes, obvious the button won't work
```

---

## 🔄 FORM STATE PRESERVATION

### Auto-Save Draft

```
User fills out New Measurement form:
- Fills 5 fields
- Browser closes by accident
- User reopens app

Next time:
Form auto-restores with previous values (from localStorage)
User can:
[Continue] → Restore draft
[Clear]    → Start fresh

Timeout: Auto-save every 10 seconds while user is typing
Cleanup: Auto-saved draft deleted 7 days after last edit
```

### Unsaved Changes Warning

```
User fills form, then tries to leave:

Dialog:
┌────────────────────────────────┐
│ Unsaved Changes               │
│                                │
│ You have unsaved data.         │
│ Leave without saving?          │
│                                │
│ [Cancel]  [Discard]            │
└────────────────────────────────┘

Prevents accidental data loss
```

---

## ⌨️ KEYBOARD NAVIGATION

### Tab Order (New Measurement Form)

```
Tab through form in logical order:
1. Date field
2. Time field
3. Device dropdown
4. Blood Glucose input
5. Glucose unit selector
6. [+ Add Parameter] button
7. [Next Parameter] fields...
8. Journal textarea
9. Tags input
10. [Save] button
11. [Cancel] button
12. [Preview] button

Shift+Tab goes backward

Enter on input → Focus next input
Enter on [Save] → Submit form
Escape → Close form (if in modal)
```

### Keyboard Shortcuts (Optional, Advanced Users)

```
Ctrl+S → Save measurement (if form open)
Ctrl+N → New measurement
Ctrl+F → Search knowledge base
Escape → Close dialog/modal
/ → Focus search box
```

---

## 📊 INTERACTIVE DATA VISUALIZATION

### Hover States on Charts

```
Trend Chart (30-day glucose):
User hovers over data point:
- Point enlarges (7px → 10px)
- Tooltip appears: "Mar 5, 06:00 — 5.8 mmol/L 🟢"
- Line darkens slightly
- Grid line highlights (vertical)

Cursor changes to pointer
Click point → Navigate to that measurement
```

### Interactive Legend

```
Multi-Metric Chart (Glucose + Insulin):
Legend shows:
[✓] Glucose (blue line)
[✓] Insulin (orange line)

User clicks on legend item:
- Uncheck → That line disappears
- Check → Line reappears
- State persists (localStorage)

Tooltip: "Click to show/hide"
```

---

## 🎨 ACCESSIBILITY FEEDBACK

### Focus Indicators

```
All interactive elements have visible focus ring:

Button focus:
[Save]  ← Focus ring visible (2px, brand orange)

Input focus:
[5.8 ▏]  ← Border highlights, background subtle tint

Link focus:
Learn More ← Underline + focus ring visible

Color: Brand orange (#F7931A) for high visibility
Thickness: 2px
Offset: 2px from element
```

### Screen Reader Announcements

```
Form validation feedback read aloud:
"Blood Glucose: Invalid. Value too high. Maximum 20 mmol/L."

Navigation feedback:
"Zone Details: Energy & Metabolic Power. 6 of 7 markers in range."

Status updates:
"Measurement saved. Zone updated. Glucose now shows green."

Loading states:
"Loading zone details. Please wait."
```

---

## 📋 INTERACTIVE SPEC CHECKLIST

- [ ] Form validation with real-time feedback (Ampel updates as user types)
- [ ] Error messages clear and actionable
- [ ] Loading states with spinners or skeleton screens
- [ ] Page transitions smooth (150–300ms animations)
- [ ] Modal animations (slide up on mobile, fade on desktop)
- [ ] Swipe gestures on mobile (swipe left/right for navigation)
- [ ] Pull-to-refresh on mobile
- [ ] Long-press context menus on mobile
- [ ] Confirmation dialogs for destructive actions
- [ ] Toast messages for feedback (success, error, info)
- [ ] Auto-save drafts (every 10 seconds)
- [ ] Unsaved changes warning
- [ ] Tab order logical and complete
- [ ] Keyboard shortcuts for power users
- [ ] Hover states on interactive elements
- [ ] Chart tooltips and interactive legends
- [ ] Focus indicators visible (2px orange ring)
- [ ] Screen reader announcements clear
- [ ] Button disabled states obvious
- [ ] Cursor changes appropriately (pointer on clickable, not-allowed on disabled)

---

_This specification bridges the gap between "what the app looks like" and "how users interact with it."_
_Implement these patterns and the app will feel polished, not half-baked._
