---
name: release
description: "Run the full release checklist for proto-navigation: build, test, version bump, CHANGELOG, README, and public/index.html (footer + releases accordion). Trigger with /release."
---

# Release Checklist

Execute every step below in order whenever changes are ready to ship.

---

## 1. Build & Test

```bash
npm run compile
npm run test
```

Fix any errors before continuing. Do not proceed if tests fail.

---

## 2. Determine Version Bump

| Change type | Bump |
|---|---|
| Bug fix / dependency / metadata | patch (0.0.**x**) |
| New feature, backwards-compatible | minor (0.**x**.0) |
| Breaking change | major (**x**.0.0) |

---

## 3. Update `package.json`

Bump `"version"` to the new version string.

---

## 4. Update `CHANGELOG.md`

Insert a new section **above** the previous latest release:

```markdown
## [X.Y.Z] – YYYY-MM-DD

### Added / Changed / Fixed / Security
- <concise description of what changed and why>
```

Use Keep a Changelog conventions (`Added`, `Changed`, `Fixed`, `Security`, `Deprecated`, `Removed`).

---

## 5. Update `README.md`

In the **📦 Release Notes** section, prepend one bullet for the new version:

```markdown
- **vX.Y.Z** — <one-line summary of the change>.
```

---

## 6. Update `public/index.html` — Footer

Update the version string in the footer (search for `Proto Navigation v`):

```html
<div>Proto Navigation vX.Y.Z &middot; MIT License</div>
```

---

## 7. Update `public/index.html` — Releases Accordion

In the `<!-- Release History -->` section, insert a new accordion entry **at the top** (above the previous latest version). Use this template:

```html
<!-- vX.Y.Z -->
<div class="bg-card border border-accent rounded-xl overflow-hidden">
  <button class="cl-toggle w-full flex items-center justify-between px-5 py-4 text-left" aria-expanded="true">
    <div class="flex items-center gap-3 flex-wrap">
      <span class="text-xs font-mono bg-brand/20 text-brand px-2 py-0.5 rounded">vX.Y.Z</span>
      <span class="text-sm font-medium text-text-primary"><ONE-LINE SUMMARY></span>
      <span class="text-xs text-text-secondary">YYYY-MM-DD</span>
    </div>
    <svg class="cl-chevron w-4 h-4 text-text-secondary transition-transform duration-200 rotate-180 shrink-0 ml-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
  </button>
  <div class="cl-body px-5 pb-4 text-sm text-text-secondary">
    <p class="text-xs font-semibold uppercase tracking-wider <LABEL-COLOR> mb-1"><LABEL></p>
    <ul class="list-disc list-inside space-y-1">
      <li>...</li>
    </ul>
  </div>
</div>
```

Label color classes:
- `Added` → `text-brand-green`
- `Changed` → `text-brand`
- `Fixed` → `text-purple-400`
- `Security` → `text-yellow-400`

After inserting the new entry, change the **previous latest entry's** badge from the latest style to the older style:
- Remove `bg-brand/20 text-brand` → replace with `bg-accent/60 text-text-secondary`
- Change `aria-expanded="true"` → `aria-expanded="false"`
- Remove `rotate-180` from the chevron
- Add `hidden` class to its `cl-body` div

---

## Checklist Summary

- [ ] `npm run compile` passes
- [ ] `npm run test` passes
- [ ] `package.json` version bumped
- [ ] `CHANGELOG.md` new section added
- [ ] `README.md` Release Notes updated
- [ ] `public/index.html` footer version updated
- [ ] `public/index.html` Releases accordion updated (new entry at top, previous entry collapsed)
