# Implementation Plan: To-Do Lists Dashboard

## Overview

Implement a fully client-side, single-page productivity dashboard delivered as three files (`index.html`, `css/style.css`, `js/app.js`). All state is persisted to `localStorage`. The implementation is incremental: each task produces working, integrated code before the next task builds on it.

## Tasks

- [x] 1. Scaffold project structure and base HTML
  - Create `css/` and `js/` directories at the workspace root
  - Write `index.html` with the semantic shell: `<html data-theme="light">`, `<header>` containing the page title and `#theme-toggle` button, `<main class="dashboard-grid">` with the four `<section>` widgets (`#greeting-widget`, `#timer-widget`, `#todo-widget`, `#quicklinks-widget`), and `#storage-error-notice` (hidden, `aria-live="polite"`) outside `<main>`
  - Add `<link rel="stylesheet" href="css/style.css">` and `<script src="js/app.js" defer>` — no other CSS or JS files
  - Create `css/style.css` with a reset (`box-sizing: border-box`, margin/padding zeroing) and `js/app.js` as an empty IIFE stub (`(function() { 'use strict'; })();`)
  - _Requirements: 6.1, 6.3_

- [x] 2. Implement Storage module
  - [x] 2.1 Write the `Storage` module inside the IIFE with `get(key)`, `set(key, value)`, and `remove(key)` helpers that wrap every `localStorage` call in try/catch
    - `get` returns parsed JSON or `null` on any failure; `set` serialises to JSON; both call `UI.showStorageError(context)` on failure
    - Define `UI.showStorageError(context)`: makes `#storage-error-notice` visible with a contextual message, schedules a 5-second auto-dismiss via `setTimeout`, and clears any pending timer before scheduling a new one
    - _Requirements: 6.5_

  - [ ]* 2.2 Write unit tests for the Storage module
    - Test `Storage.get` returns `null` and calls `showStorageError` when `localStorage.getItem` throws
    - Test `Storage.set` is a no-op and calls `showStorageError` when `localStorage.setItem` throws
    - Test that a second storage error before the 5-second timeout resets the dismiss timer
    - Use Vitest; run with `vitest --run`
    - _Requirements: 6.5_

- [x] 3. Implement Theme module and CSS custom properties
  - [x] 3.1 Add CSS custom properties to `style.css` for `[data-theme="light"]` and `[data-theme="dark"]` on `:root`, covering `--bg`, `--surface`, `--text`, `--accent`, `--border`; add `transition: background-color 80ms, color 80ms` to `body`; apply all colour declarations in the stylesheet via these variables
    - _Requirements: 5.2_

  - [x] 3.2 Write the `Theme` module in `app.js` with `init()`, `toggle()`, and `apply(themeName)`
    - `init`: reads `todo_theme` from `Storage`; if absent, reads `window.matchMedia('(prefers-color-scheme: dark)')` result; defaults to `"light"`; calls `apply()`
    - `apply`: sets `document.documentElement.dataset.theme`; updates the `#theme-toggle` button label/icon
    - `toggle`: flips the theme, calls `apply`, writes new value to `Storage` via `Storage.set('todo_theme', value)`
    - Attach click listener to `#theme-toggle` in `init`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 3.3 Write property test for Theme resolution (Property 13)
    - **Property 13: Theme resolution follows the correct priority chain**
    - **Validates: Requirements 5.3**
    - Extract `resolveTheme(storedValue, prefersColorScheme)` as a pure function; use fast-check to test all string × string combinations; assert it always returns `"light"` or `"dark"` following the documented priority chain
    - _Requirements: 5.3_

- [x] 4. Checkpoint — Storage and Theme
  - Ensure all tests pass. Open `index.html` in a browser and confirm: theme toggle switches colours, 80 ms transition is visible, theme persists on reload, and the storage-error notice appears when `localStorage` is blocked. Ask the user if any questions arise.

- [x] 5. Implement Greeting Widget
  - [x] 5.1 Write pure helper functions for the Greeting module: `formatTime(date)` → `"HH:MM"` (24-hour), `formatDate(date)` → full weekday+day+month+year string, `getGreeting(hour)` → one of the four greeting strings
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 5.2 Write property tests for time formatting, date formatting, and greeting derivation (Properties 1, 2, 3)
    - **Property 1: Time formatting produces valid HH:MM strings**
    - **Property 2: Date formatting includes all required components**
    - **Property 3: Greeting derivation covers all 24 hours correctly**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
    - Use fast-check `fc.date()` arbitraries for Properties 1 and 2; use `fc.integer({ min: 0, max: 23 })` for Property 3
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 5.3 Write the `Greeting` module with `init()`, `render()`, and `saveName(str)`
    - `init`: query DOM refs, attach name-input listener (submit on Enter or button click), start `setInterval(Greeting.render, 60_000)`, call `render()` immediately
    - `render`: call helpers to update time, date, and greeting text in the DOM; append stored name when present
    - `saveName`: if `str.trim()` is empty call `Storage.remove('todo_username')`; else if `str.length > 50` show inline error and return; else call `Storage.set('todo_username', str)` then `render()`
    - On `init`, load `todo_username` from `Storage` and discard if length > 50
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11_

  - [ ]* 5.4 Write property test for User_Name length cap (Property 4)
    - **Property 4: User_Name over 50 characters is treated as absent**
    - **Validates: Requirements 1.10**
    - Use fast-check `fc.string({ minLength: 51 })` to verify that any string longer than 50 chars is discarded and the greeting renders without a name suffix
    - _Requirements: 1.10_

- [x] 6. Implement Focus Timer
  - [x] 6.1 Write pure helper functions for the Timer module: `formatTime(totalSeconds)` → `"MM:SS"` (zero-padded), `isValidDuration(n)` → `boolean` (true iff `n >= 1 && n <= 120`)
    - _Requirements: 2.2, 2.7, 2.8_

  - [ ]* 6.2 Write property tests for timer formatting and duration validation (Properties 5, 6)
    - **Property 5: MM:SS time formatting is correct for all second counts**
    - **Property 6: Pomodoro duration validation accepts exactly 1–120 and rejects all others**
    - **Validates: Requirements 2.2, 2.7, 2.8**
    - Use fast-check `fc.integer({ min: 0, max: 7200 })` for Property 5; use `fc.integer()` for Property 6
    - _Requirements: 2.2, 2.7, 2.8_

  - [x] 6.3 Write the `Timer` module with `init()`, `start()`, `stop()`, `reset()`, and `setDuration(minutes)`
    - State object: `{ state: 'idle', remaining: number, intervalId: null }`; store the original page title in a module constant on `init`
    - `start`: no-op if already running; if `state === 'finished'` reset to current duration first; set `state = 'running'`, start `setInterval` at 1-second resolution; each tick decrements `remaining`, updates the MM:SS display, and sets `document.title`; at zero call the finish handler
    - Finish handler: clear interval, set `state = 'finished'`, restore `document.title`, update display, show `Notification` if permission granted else show on-page alert
    - `stop`: clear interval, set `state = 'paused'`, restore `document.title`
    - `reset`: clear interval, set `state = 'idle'`, set `remaining` from stored duration, restore `document.title`, update display
    - `setDuration`: validate with `isValidDuration`; on failure show inline error; on success persist via `Storage.set('todo_pomodoro_duration', n)` and update display if idle
    - `init`: load duration from `Storage` (default 25), attach click listeners for Start/Stop/Reset and duration-input change, call `reset()` to initialise display
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ]* 6.4 Write unit tests for Timer state transitions
    - Test `idle → running → paused → running → finished` transitions
    - Test that `start` after `finished` resets to current duration before counting
    - Test that `reset` during `running` returns to `idle` with full duration
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.9_

- [x] 7. Checkpoint — Greeting and Timer
  - Ensure all tests pass. Open `index.html` and confirm: greeting updates every 60 seconds, name persists on reload, timer counts down in MM:SS, tab title updates while running, completion alert appears at 00:00, and custom duration persists on reload. Ask the user if any questions arise.

- [x] 8. Implement To-Do List
  - [x] 8.1 Write pure helper functions for the TodoList module: `generateId(prefix)` using `Date.now()` + random suffix, `isValidDescription(str)` returning `true` iff `str.trim().length >= 1 && str.length <= 500`
    - _Requirements: 3.1, 3.2_

  - [x] 8.2 Write the `TodoList` module with `init()`, `add(description)`, `toggle(id)`, `delete(id)`, `startEdit(id)`, `confirmEdit(id, newDescription)`, `cancelEdit(id)`, and `render()`
    - Internal state: `let tasks = []` (array of `Task` objects loaded from `Storage` on `init`)
    - `add`: validate with `isValidDescription`; on failure inject `<span class="field-error" role="alert">` adjacent to input and return; on success push `{ id, description, completed: false, createdAt: Date.now() }`, persist, call `render()`
    - `toggle`: find task by id, flip `completed`, persist, call `render()`
    - `delete`: filter out the task by id, persist, call `render()`
    - `startEdit`: re-render that task row with an `<input>` pre-filled with current description; attach confirm (Enter / confirm button) and cancel (Escape / cancel button / blur) handlers
    - `confirmEdit`: validate new description; on failure discard edit and restore original; on success update task, persist, call `render()`
    - `cancelEdit`: restore original row without touching Storage
    - `render`: clear the task list container's `innerHTML`; create and append elements for each task; update the incomplete-count badge
    - On `init`, if `Storage.get('todo_tasks')` throws or returns non-array, render empty list and call `UI.showStorageError`; use event delegation on the list container for `[data-action]` clicks
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

  - [ ]* 8.3 Write property tests for task description validation, completion toggle, delete, and incomplete count (Properties 7, 8, 9, 10)
    - **Property 7: Whitespace-only task descriptions are always rejected**
    - **Property 8: Task completion toggle is an involution**
    - **Property 9: Deleting a task removes exactly that task from the list**
    - **Property 10: Incomplete task count equals the number of tasks where completed is false**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.11**
    - Use fast-check `fc.string()` filtered to whitespace-only for Property 7; `fc.array(fc.record(...))` for Properties 8–10
    - _Requirements: 3.2, 3.3, 3.4, 3.11_

  - [ ]* 8.4 Write property test for task serialisation round-trip (Property 11, task half)
    - **Property 11: Task data survives a serialisation round-trip**
    - **Validates: Requirements 3.9**
    - Use fast-check to generate arbitrary `Task[]` arrays; serialise with `JSON.stringify` and deserialise with `JSON.parse`; assert length, order, `id`, `description`, and `completed` match
    - _Requirements: 3.9_

- [x] 9. Implement Quick Links
  - [x] 9.1 Write pure helper functions for the QuickLinks module: `normaliseUrl(str)` prepending `"https://"` when no `http://` or `https://` scheme is present, `isValidLink(label, url)` checking non-empty label ≤ 100 chars and that the normalised URL has a non-empty host
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 9.2 Write property tests for URL normalisation and label validation (Property 12)
    - **Property 12: URL normalisation always produces an absolute https URL for bare inputs**
    - **Validates: Requirements 4.3**
    - Use fast-check `fc.string()` to generate arbitrary strings that do not begin with `"http://"` or `"https://"`; assert `normaliseUrl(s) === "https://" + s`
    - _Requirements: 4.3_

  - [x] 9.3 Write the `QuickLinks` module with `init()`, `add(label, url)`, `delete(id)`, and `render()`
    - Internal state: `let links = []` (max 20, loaded from `Storage` on `init`)
    - `add`: validate with `isValidLink`; on failure inject inline `<span class="field-error" role="alert">` on the offending field; normalise URL; push `{ id, label, url }`, persist, call `render()`
    - `delete`: filter by id, persist, call `render()`
    - `render`: clear container `innerHTML`; create `<a>` elements with `target="_blank" rel="noopener noreferrer"`; disable the add button when `links.length >= 20`
    - On `init`, if Storage fails, render empty panel and call `UI.showStorageError`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 9.4 Write property test for Quick Link serialisation round-trip (Property 11, quick-link half)
    - **Property 11: QuickLink data survives a serialisation round-trip**
    - **Validates: Requirements 4.6**
    - Use fast-check to generate arbitrary `QuickLink[]` arrays; assert round-trip preserves `id`, `label`, and `url`
    - _Requirements: 4.6_

- [x] 10. Implement responsive CSS layout
  - Add `.dashboard-grid` CSS Grid rule to `style.css`: `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`, `gap: 1rem`, `padding: 1rem`
  - Style the `<header>` (title + toggle), all four `<section>` widgets (card surface, padding, border-radius using CSS variables), form inputs, buttons, task rows (checked state via `[data-completed="true"]`), inline error `<span class="field-error">`, and `#storage-error-notice` fixed banner
  - Verify the grid is single-column at 320 px, two-column at 600 px, and four-column at 1024 px using CSS `@media` or `auto-fit` behaviour
  - _Requirements: 6.2, 6.4_

- [x] 11. Wire up App.init and integrate all modules
  - [x] 11.1 Write `App.init()` at the bottom of the IIFE; call it on `DOMContentLoaded`
    - Call modules in order: `Theme.init()`, `Storage` (already initialised inline), `Greeting.init()`, `Timer.init()`, `TodoList.init()`, `QuickLinks.init()`
    - Ensure `UI.showStorageError` is defined before all modules that call it
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 11.2 Write integration tests for App.init bootstrap
    - Test that all four widgets render non-empty content after `App.init()` runs in a jsdom environment
    - Test that the theme applied on load matches the value stored in a mocked `localStorage`
    - Test that a corrupted `todo_tasks` value in `localStorage` renders an empty task list without throwing
    - _Requirements: 6.2, 6.3, 3.10, 4.7_

- [x] 12. Final checkpoint — full integration
  - Ensure all tests pass (`vitest --run`). Open `index.html` from a local filesystem in Chrome, Firefox, and Safari (or the available browsers). Confirm: all four widgets render without horizontal scrolling at 320 px, 768 px, and 1280 px viewport widths; theme toggle works; all CRUD operations persist across reload; timer tab-title updates; storage-error notice appears and auto-dismisses. Ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Pure helper functions (formatTime, getGreeting, normaliseUrl, etc.) are extracted from modules deliberately so they can be tested without DOM setup
- Property tests use fast-check with a minimum of 100 iterations per property; tag each test with `// Feature: todo-dashboard, Property N: <text>`
- Unit tests and property tests use Vitest; run with `vitest --run` for single-execution mode

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["3.3"] },
    { "id": 5, "tasks": ["4"] },
    { "id": 6, "tasks": ["5.1"] },
    { "id": 7, "tasks": ["5.2", "5.3"] },
    { "id": 8, "tasks": ["5.4", "6.1"] },
    { "id": 9, "tasks": ["6.2", "6.3"] },
    { "id": 10, "tasks": ["6.4"] },
    { "id": 11, "tasks": ["7"] },
    { "id": 12, "tasks": ["8.1"] },
    { "id": 13, "tasks": ["8.2"] },
    { "id": 14, "tasks": ["8.3", "8.4", "9.1"] },
    { "id": 15, "tasks": ["9.2", "9.3"] },
    { "id": 16, "tasks": ["9.4", "10"] },
    { "id": 17, "tasks": ["11.1"] },
    { "id": 18, "tasks": ["11.2"] },
    { "id": 19, "tasks": ["12"] }
  ]
}
```
