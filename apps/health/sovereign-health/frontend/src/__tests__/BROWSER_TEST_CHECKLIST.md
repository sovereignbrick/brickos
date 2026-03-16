# Browser Test Checklist

Test all pages on these browsers:

## Mobile
- [ ] Safari iOS (primary)
- [ ] Chrome iOS
- [ ] Firefox iOS (WebKit engine — may behave differently)
- [ ] Chrome Android
- [ ] Samsung Internet

## Desktop
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari macOS (latest)
- [ ] Edge (latest)

## Pages to test
- [ ] Dashboard (demo profiles, layout)
- [ ] Doctor Chat (input, upload, quota display)
- [ ] Health Zones (marker cards, device tags)
- [ ] Marker Detail (charts, foods, swipe)
- [ ] Trends (charts, legend, axis labels)
- [ ] Measurements (new entry form, history)
- [ ] Settings (all tabs: profile, thresholds, privacy, security, billing)
- [ ] Login / Signup flow

## Mobile-specific checks
- [ ] Header shows "Sovereign Health" (not just "SH")
- [ ] Navigation is top hamburger menu (not bottom tab)
- [ ] Hamburger menu opens/closes with smooth slide animation
- [ ] Hamburger menu has focus trap and closes on Escape
- [ ] Hamburger menu backdrop closes menu on tap
- [ ] Horizontal card rows are swipeable (InfoCarousel)
- [ ] Thresholds table: first column frozen, horizontally scrollable
- [ ] All form inputs have 44px minimum touch target
- [ ] No horizontal page overflow (no accidental horizontal scroll on any page)
- [ ] Charts are readable and don't overflow container
- [ ] Tooltips work on tap (not just hover)
- [ ] No iOS auto-zoom on input focus (inputs are 16px+ font)
- [ ] Safe area insets respected on notched phones
- [ ] Welcome toast appears below navbar (not overlapping profile icon)

## Dark mode checks
- [ ] Sticky threshold column background matches dark theme
- [ ] Hamburger menu has correct dark styling
- [ ] All text is readable against dark backgrounds
- [ ] Chart gridlines are subtle (not heavy white)
