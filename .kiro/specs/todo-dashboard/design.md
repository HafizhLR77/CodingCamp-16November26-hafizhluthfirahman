# Design Document

## Overview

The To-Do Lists Dashboard is a fully client-side, single-page application composed of exactly three files: `index.html`, `css/style.css`, and `js/app.js`. There is no build toolchain, no bundler, and no backend — the entire application runs in the browser and stores state in `localStorage`.

The application presents four interactive widgets side-by-side (or stacked on narrow viewports):

1. **Greeting Widget** — live clock, date, contextual greeting, and optional user name
2. **Focus Timer** — Pomodoro-style countdown with start, stop, and reset controls
3. **To-Do List** — persistent task management with add, complete, edit, and delete
4. **Quick Links** — user-defined URL shortcuts that open in new tabs

A persistent theme toggle (light/dark) sits in the page header and applies CSS custom properties globally. All widget data is serialised to `localStorage` on every mutation and deserialised on page load, so the application survives page reloads without a server.

---

## Architecture

### File and Folder Structure

```
index.html          ← single HTML entry point; all widget markup
css/
  style.css         ← all styling; CSS custom properties for theming
js/
  app.js            ← all application logic; self-contained IIFE
```

No additional files are referenced by the HTML. `app.js` and `style.css` are loaded via `<script src="js/app.js" defer>` and `<link rel="stylesheet" href="css/style.css">` respectively.

### Module Decomposition Inside `app.js`

`app.js` is wrapped in a single IIFE to avoid global-scope pollution. Inside it, logic is split into namespaced plain-object modules:

```
App (IIFE)
├── Storage      — localStorage read / write / clear helpers; error wrapper
├── Greeting     — clock interval, date formatter, greeting text, name persistence
├── Timer        — countdown state machine, setInterval, tab-title sync
├── TodoList     — task CRUD, ID generation, render, validation
├── QuickLinks   — link CRUD, URL normalisation, render, validation
├── Theme        — toggle, media-query detection, CSS data-attribute application
└── App.init()   — wires up all modules, restores state from Storage, starts Greeting clock
```

Each module exposes an `init()` function called once by `App.init()` on `DOMContentLoaded`. Modules communicate only through direct calls or by writing to `localStorage` — there is no shared mutable state between modules other than what Storage provides.

### Rendering Strategy

All widget HTML is static in `index.html`. JavaScript manipulates the DOM in-place (no virtual DOM, no templating library). Lists (tasks, quick links) are re-rendered from scratch each time their data model changes by clearing the list container's `innerHTML` and appending freshly created elements. This keeps rendering logic simple and avoids stale-reference bugs.

### Event Handling

All event listeners are attached once in each module's `init()` using event delegation on the nearest stable container where appropriate (e.g., the task list container handles click events for complete, edit, delete, and confirm buttons via `event.target.closest('[data-action]')`). Input fields use `keydown` to intercept the Enter key and `blur` to cancel in-progress edits.

---

## Components and Interfaces

### Greeting Widget

**Responsibilities:**
- Display current time (HH:MM, 24-hour) updated on a 60-second `setInterval`
- Display current date (e.g., "Thursday, 20 November 2026")
- Derive and display a contextual greeting based on the current hour
- Append the stored `User_Name` to the greeting when present
- Provide a name-input field that saves to Storage and re-renders the greeting without reload
- Validate that names from Storage do not exceed 50 characters; discard them silently if they do

**Public interface:**
```js
Greeting.init()          // attach DOM refs, start clock interval, render once
Greeting.render()        // update time, date, greeting text in the DOM
Greeting.saveName(str)   // validate, persist to Storage, call render()
```

**Clock interval:** A single `setInterval(Greeting.render, 60_000)` is started in `init()`. `render()` also runs immediately on init to avoid a 60-second blank period.

### Focus Timer

**Responsibilities:**
- Load `Pomodoro_Duration` from Storage (default 25)
- Manage a countdown state machine: `idle | running | paused | finished`
- Drive the countdown with `setInterval` at 1-second resolution
- Display remaining time in MM:SS
- Update the browser tab title while running
- Play a browser notification or on-page alert on completion
- Accept a custom duration (1–120 min), validate it, persist it, apply it on the next Reset

**State:**
```js
{ state: 'idle', remaining: number, intervalId: number|null }
```

**Public interface:**
```js
Timer.init()
Timer.start()
Timer.stop()
Timer.reset()
Timer.setDuration(minutes)
```

**Tab title:** While `state === 'running'`, each tick sets `document.title = \`${mm}:${ss} — Focus Session\``. When the timer stops or is reset, `document.title` is restored to the original page title stored in a module-scoped constant.

### To-Do List

**Responsibilities:**
- Load tasks from Storage on init; render them in saved order
- Add tasks with validation (non-empty after trim, ≤ 500 chars), unique ID, `completed: false`
- Toggle completion state; persist immediately
- Delete tasks; persist immediately
- In-place edit: replace task text with an `<input>`, validate on confirm, discard on cancel or empty confirm
- Display count of incomplete tasks
- Handle Storage parse errors gracefully (render empty list, show error notice)

**Public interface:**
```js
TodoList.init()
TodoList.add(description)
TodoList.toggle(id)
TodoList.delete(id)
TodoList.startEdit(id)
TodoList.confirmEdit(id, newDescription)
TodoList.cancelEdit(id)
TodoList.render()
```

### Quick Links

**Responsibilities:**
- Load links from Storage on init; render in insertion order (max 20)
- Add links with validation (label ≤ 100 chars, URL resolves to non-empty host after https:// normalisation)
- Prepend `https://` to URLs that lack an `http://` or `https://` scheme before saving
- Open links in `target="_blank"` with `rel="noopener noreferrer"`
- Delete links; persist immediately
- Handle Storage parse errors gracefully

**Public interface:**
```js
QuickLinks.init()
QuickLinks.add(label, url)
QuickLinks.delete(id)
QuickLinks.render()
```

### Theme

**Responsibilities:**
- Read saved theme from Storage on init; fall back to `prefers-color-scheme`; default to `light`
- Apply theme by setting `data-theme="light"|"dark"` on `<html>`
- Save the selected theme to Storage on every toggle
- Update the toggle button's label/icon to reflect the current theme

**Public interface:**
```js
Theme.init()
Theme.toggle()
Theme.apply(themeName)   // 'light' | 'dark'
```

### Storage Module

**Responsibilities:**
- Wrap all `localStorage` calls in try/catch
- Emit `Storage.error(context)` (which calls `UI.showStorageError`) when any read or write fails
- Provide typed helpers: `Storage.get(key)`, `Storage.set(key, value)`, `Storage.remove(key)`

**Public interface:**
```js
Storage.get(key)           // returns parsed JSON or null; calls showStorageError on failure
Storage.set(key, value)    // serialises to JSON and writes; calls showStorageError on failure
Storage.remove(key)        // removes key; calls showStorageError on failure
```

---

## Data Models

### localStorage Key Schema

| Key | Type | Description |
|-----|------|-------------|
| `todo_username` | `string` | User's display name, stored raw (not JSON-wrapped) |
| `todo_theme` | `"light" \| "dark"` | Active theme |
| `todo_pomodoro_duration` | `number` | Pomodoro session length in whole minutes (1–120) |
| `todo_tasks` | `Task[]` | JSON array of task objects |
| `todo_quicklinks` | `QuickLink[]` | JSON array of quick link objects |

All keys are prefixed with `todo_` to avoid collisions with other apps on the same origin.

### Task Object

```ts
interface Task {
  id: string;          // UUID-style unique identifier, e.g. "t_1699123456789_0"
  description: string; // 1–500 non-whitespace-containing chars after trim
  completed: boolean;  // false = pending, true = done
  createdAt: number;   // Date.now() at creation; used for stable ordering
}
```

Tasks are stored as a JSON array in insertion order. The array order is the render order.

### QuickLink Object

```ts
interface QuickLink {
  id: string;    // UUID-style unique identifier, e.g. "ql_1699123456789_0"
  label: string; // 1–100 character display name
  url: string;   // fully normalised absolute URL (always starts with http:// or https://)
}
```

The array is capped at 20 entries; the add action is disabled when the count reaches 20.

### ID Generation

IDs are generated with a lightweight function (no external library required):

```js
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}
```

Collisions within a single session are practically impossible given the timestamp+random suffix.

### Theme Value

Stored as the literal string `"light"` or `"dark"`. Any other stored value is treated as absent.

### Pomodoro Duration

Stored as a plain JSON number (integer minutes). Values outside 1–120 are rejected at the input layer and never written to Storage.

---

## UI Layout and Widget Arrangement

### HTML Structure

```html
<html data-theme="light">
  <head>…</head>
  <body>
    <header>
      <h1>Dashboard</h1>
      <button id="theme-toggle">🌙 Dark</button>
    </header>
    <main class="dashboard-grid">
      <section id="greeting-widget">…</section>
      <section id="timer-widget">…</section>
      <section id="todo-widget">…</section>
      <section id="quicklinks-widget">…</section>
    </main>
    <div id="storage-error-notice" aria-live="polite" hidden>…</div>
  </body>
</html>
```

### Responsive Grid

The `.dashboard-grid` uses CSS Grid with `auto-fit` columns:

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  padding: 1rem;
}
```

- **320px–599px**: single-column stack (all widgets full-width)
- **600px–1023px**: two-column layout
- **1024px+**: four-column layout (all four widgets in one row)

All widgets use `box-sizing: border-box` and no fixed widths, so they resize fluidly between 320px and 2560px without horizontal scrolling.

### Theme via CSS Custom Properties

```css
:root[data-theme="light"] {
  --bg: #ffffff;
  --surface: #f5f5f5;
  --text: #1a1a1a;
  --accent: #4a6fa5;
  --border: #d0d0d0;
}

:root[data-theme="dark"] {
  --bg: #1a1a1a;
  --surface: #2c2c2c;
  --text: #f0f0f0;
  --accent: #7eacd4;
  --border: #444;
}
```

All colours in `style.css` reference these variables. Switching the `data-theme` attribute on `<html>` immediately repaint all elements. The transition is CSS-driven (`transition: background-color 80ms, color 80ms`) so it completes well within the 100ms requirement.

---

## Error Handling

### Storage Failure Strategy

When any `localStorage` call throws (e.g., private-browsing quota exceeded, SecurityError), `Storage.get` returns `null` and `Storage.set`/`Storage.remove` are no-ops. Both call `UI.showStorageError(context)`, which:

1. Makes the `#storage-error-notice` element visible with a contextual message.
2. Schedules `setTimeout(() => notice.hidden = true, 5000)` to auto-dismiss.
3. Clears any pending dismiss timer before scheduling a new one (prevents notice disappearing early if two errors fire in quick succession).

The notice sits outside `<main>` in a fixed banner at the top of the viewport so it never overlays widget content.

The in-memory state (the JS arrays/objects held by each module) continues to be the source of truth for rendering during the failed-storage session. The user can still interact with all widgets; they just lose persistence.

### Validation Error Strategy

Each module enforces validation at the point of user input before any state mutation:

| Scenario | Response |
|----------|----------|
| Empty/whitespace task description | Inline error adjacent to task input; no mutation |
| Task > 500 chars | Inline error; no mutation |
| Empty quick link label or URL | Inline error on the offending field; no mutation |
| Quick link label > 100 chars | Inline error; no mutation |
| Pomodoro duration out of 1–120 range | Inline error below duration input; previous value retained |
| User_Name > 50 chars from Storage | Silently discarded; treated as absent |

Inline errors are injected as `<span class="field-error" role="alert">` elements immediately after the offending input, then cleared when the user next modifies that field.

### Storage Parse Errors

If `JSON.parse` throws when loading tasks or quick links, the module renders an empty list and calls `UI.showStorageError` with a message indicating saved data could not be loaded. The malformed key is not cleared automatically (to avoid accidental data loss on transient bugs); the user is informed.

---

## Testing Strategy

This feature is a client-side application composed of DOM interaction, `localStorage` persistence, and time-dependent logic. Property-based testing applies to the pure logic layer — the validation functions, data transformations, ID generation, URL normalisation, and greeting derivation. It does not apply to DOM rendering or `localStorage` I/O, which are tested with example-based unit tests and end-to-end examples.

**Property-based testing library:** [fast-check](https://github.com/dubzzz/fast-check) (JavaScript, runs in Node via Jest or Vitest).

**Unit testing framework:** Vitest (single-execution via `vitest --run`).

**Unit tests cover:**
- Specific examples of each validation rule (empty string, boundary lengths, whitespace-only strings)
- Storage module fallback when `localStorage` throws
- Timer state transitions (idle → running → paused → finished)
- Theme fallback chain (stored value → `prefers-color-scheme` → default light)
- Quick link URL normalisation for specific schemes

**Property tests cover:**
- Greeting derivation for all 24 hours
- Task description validation for the full range of string inputs
- Task add/persist/load round-trip
- Quick link URL normalisation for arbitrary inputs
- Quick link label validation for arbitrary-length strings
- Task list incomplete-count consistency

Each property test is configured to run a minimum of 100 iterations. Test tags use the format:
> `// Feature: todo-dashboard, Property N: <property_text>`


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Time formatting produces valid HH:MM strings

*For any* `Date` object, the time-formatting function shall return a string that matches `/^\d{2}:\d{2}$/` where the hours component is in the range 0–23 and the minutes component is in the range 0–59.

**Validates: Requirements 1.1**

---

### Property 2: Date formatting includes all required components

*For any* `Date` object, the date-formatting function shall return a string that contains the correct full weekday name, the correct numeric day, the correct full month name, and the correct 4-digit year corresponding to that `Date`.

**Validates: Requirements 1.2**

---

### Property 3: Greeting derivation covers all 24 hours correctly

*For any* integer hour in [0, 23], `getGreeting(hour)` shall return exactly `"Good Morning"` for hours 5–11, `"Good Afternoon"` for hours 12–17, `"Good Evening"` for hours 18–20, and `"Good Night"` for hours 21–23 and 0–4.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 4: User_Name over 50 characters is treated as absent

*For any* string whose length exceeds 50 characters, the name-loading function shall return `null` and the greeting shall be rendered without a name suffix.

**Validates: Requirements 1.10**

---

### Property 5: MM:SS time formatting is correct for all second counts

*For any* integer number of seconds in [0, 7200], `formatTime(seconds)` shall return a string matching `/^\d{2}:\d{2}$/` where the minutes component equals `Math.floor(seconds / 60)` (zero-padded to 2 digits) and the seconds component equals `seconds % 60` (zero-padded to 2 digits).

**Validates: Requirements 2.2**

---

### Property 6: Pomodoro duration validation accepts exactly 1–120 and rejects all others

*For any* integer `n`, `isValidDuration(n)` shall return `true` if and only if `n >= 1 && n <= 120`.

**Validates: Requirements 2.7, 2.8**

---

### Property 7: Whitespace-only task descriptions are always rejected

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), the task-add function shall leave the task list unchanged and return a validation error.

**Validates: Requirements 3.2**

---

### Property 8: Task completion toggle is an involution

*For any* task, toggling the `completed` field twice returns the task to its original `completed` state.

**Validates: Requirements 3.3**

---

### Property 9: Deleting a task removes exactly that task from the list

*For any* task list and any task `t` present in that list, after calling `deleteTask(list, t.id)`, the returned list shall not contain any task with id `t.id` and shall have a length of `list.length - 1`.

**Validates: Requirements 3.4**

---

### Property 10: Incomplete task count equals the number of tasks where completed is false

*For any* array of tasks, `countIncomplete(tasks)` shall equal `tasks.filter(t => !t.completed).length`.

**Validates: Requirements 3.11**

---

### Property 11: Task and Quick Link data survives a serialisation round-trip

*For any* array of `Task` objects, serialising the array to JSON and deserialising it back shall produce an array equal in length, order, `id`, `description`, and `completed` state to the original. The same property holds for arrays of `QuickLink` objects with `id`, `label`, and `url` fields.

**Validates: Requirements 3.9, 4.6**

---

### Property 12: URL normalisation always produces an absolute https URL for bare inputs

*For any* string `s` that does not begin with `"http://"` or `"https://"`, `normaliseUrl(s)` shall return `"https://" + s`.

**Validates: Requirements 4.3**

---

### Property 13: Theme resolution follows the correct priority chain

*For any* combination of `storedValue` (a string or `null`) and `prefersColorScheme` (a string or `null`), `resolveTheme(storedValue, prefersColorScheme)` shall return `"dark"` if `storedValue === "dark"`, otherwise `"light"` if `storedValue === "light"`, otherwise `"dark"` if `prefersColorScheme === "dark"`, otherwise `"light"`. The result is always either `"light"` or `"dark"`.

**Validates: Requirements 5.3**
