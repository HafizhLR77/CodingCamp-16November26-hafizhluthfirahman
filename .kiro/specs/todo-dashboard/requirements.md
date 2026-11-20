# Requirements Document

## Introduction

The To-Do Lists Dashboard is a standalone, client-side web application built with HTML, CSS, and Vanilla JavaScript. It provides a personal productivity hub featuring a live greeting with time and date, a Pomodoro-style focus timer, a persistent to-do list, and a customizable quick links panel. All data is stored in the browser's Local Storage — no backend server is required. The app is deployable as a static site via GitHub Pages and is compatible with all modern browsers.

## Glossary

- **Dashboard**: The single-page application displaying all four feature panels.
- **Storage**: The browser's `localStorage` API used to persist all user data client-side.
- **Task**: A to-do item with a text description and a completion state.
- **Focus_Timer**: The countdown timer widget based on the Pomodoro technique.
- **Quick_Link**: A user-defined shortcut consisting of a label and a URL.
- **Greeting_Widget**: The panel that displays the current time, date, and a personalized greeting.
- **Theme**: The visual color scheme of the Dashboard, either light or dark.
- **User_Name**: An optional custom name entered by the user, stored in Storage and displayed in the Greeting_Widget.
- **Pomodoro_Duration**: The configurable length (in minutes) of a Focus_Timer session, stored in Storage.

---

## Requirements

### Requirement 1: Live Greeting Widget

**User Story:** As a user, I want to see the current time, date, and a contextual greeting when I open the Dashboard, so that I have a quick time-and-context anchor at a glance.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM (24-hour) format, updating every 60 seconds, where the displayed time never deviates from the device's local clock by more than 60 seconds.
2. THE Greeting_Widget SHALL display the current date including the day of the week, day number, month name, and year (e.g., "Thursday, 20 November 2026").
3. WHEN the current local hour is between 05:00 and 11:59, THE Greeting_Widget SHALL display the greeting "Good Morning".
4. WHEN the current local hour is between 12:00 and 17:59, THE Greeting_Widget SHALL display the greeting "Good Afternoon".
5. WHEN the current local hour is between 18:00 and 20:59, THE Greeting_Widget SHALL display the greeting "Good Evening".
6. WHEN the current local hour is between 21:00 and 23:59 or between 00:00 and 04:59, THE Greeting_Widget SHALL display the greeting "Good Night".
7. WHERE a User_Name has been saved in Storage, THE Greeting_Widget SHALL append the User_Name to the greeting (e.g., "Good Morning, Alex").
8. WHEN the user submits a non-empty name via the name input field, THE Dashboard SHALL save the User_Name to Storage and update the Greeting_Widget immediately without requiring a page reload.
9. IF the user submits an empty string as the User_Name, THEN THE Dashboard SHALL remove the User_Name from Storage and display the greeting without a name.
10. IF the User_Name retrieved from Storage exceeds 50 characters, THEN THE Dashboard SHALL treat it as absent and display the greeting without a name.
11. WHEN the Dashboard is opened, THE Greeting_Widget SHALL display the correct time, date, and greeting reflecting the device's current local time within 1 second of render.

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a countdown timer I can start, stop, and reset, so that I can structure focused work sessions without leaving the Dashboard.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialize with the Pomodoro_Duration loaded from Storage, defaulting to 25 minutes when no value is stored.
2. WHEN the user activates the Start button, THE Focus_Timer SHALL begin counting down in one-second intervals, displaying the remaining time in MM:SS format.
3. WHEN the user activates the Stop button, THE Focus_Timer SHALL pause the countdown while preserving the remaining time.
4. WHEN the user activates the Reset button, THE Focus_Timer SHALL stop any active countdown and restore the display to the current Pomodoro_Duration.
5. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and display a browser notification if notification permission has been granted, or a visible on-page alert if permission has not been granted, indicating the session is complete.
6. WHILE the Focus_Timer is counting down, THE Dashboard SHALL update the browser tab title to display the remaining time in MM:SS format followed by a session label.
7. WHEN the user enters a custom Pomodoro_Duration between 1 and 120 minutes, THE Dashboard SHALL save that value to Storage and apply it as the new timer default on the next Reset and on the next page load.
8. IF the user enters a Pomodoro_Duration outside the range of 1 to 120 minutes, THEN THE Dashboard SHALL display an inline validation error and retain the previous valid Pomodoro_Duration.
9. WHEN the user activates the Start button after the countdown has reached 00:00, THE Focus_Timer SHALL restart the countdown from the current Pomodoro_Duration.

---

### Requirement 3: To-Do List

**User Story:** As a user, I want to add, edit, complete, and delete tasks that persist across browser sessions, so that I can track my work without losing progress on page reload.

#### Acceptance Criteria

1. WHEN the user submits a task description containing at least 1 non-whitespace character via the task input field, THE Dashboard SHALL add a new Task to the list, assign it a unique ID, and save the updated task array to Storage, provided the description does not exceed 500 characters.
2. IF the user submits a task description that is empty or contains only whitespace characters, THEN THE Dashboard SHALL not add a Task and SHALL display an inline validation message adjacent to the task input field.
3. WHEN the user activates the complete toggle on a Task, THE Dashboard SHALL toggle the Task's completion state and save the updated state to Storage.
4. WHEN the user activates the delete action on a Task, THE Dashboard SHALL remove that Task from the list and from Storage.
5. WHEN the user activates the edit action on a Task, THE Dashboard SHALL render the Task description in an editable input field pre-filled with the current description.
6. WHEN the user confirms an edit with a description containing at least 1 non-whitespace character and not exceeding 500 characters, THE Dashboard SHALL update the Task's description in the list and in Storage.
7. IF the user confirms an edit with a description that is empty or contains only whitespace characters, THEN THE Dashboard SHALL discard the edit and restore the original Task description without modifying Storage.
8. WHEN the user cancels an edit, THE Dashboard SHALL discard any changes to the Task description, restore the original description in the list, and return the Task to its non-editing display state without modifying Storage.
9. WHEN the Dashboard loads, THE Dashboard SHALL read all Tasks from Storage and render them in the same order and completion state as they were last saved.
10. IF Storage is unavailable or its contents cannot be parsed as a valid task array when the Dashboard loads, THEN THE Dashboard SHALL render an empty task list and display an error message indicating that saved tasks could not be loaded.
11. THE Dashboard SHALL display the count of incomplete Tasks as a numeric badge or label (e.g., "3 tasks remaining").

---

### Requirement 4: Quick Links

**User Story:** As a user, I want to save and launch favorite website shortcuts from the Dashboard, so that I can reach frequently visited pages in one click.

#### Acceptance Criteria

1. WHEN the user submits a non-empty label of at most 100 characters and a URL that, after scheme normalisation, contains a non-empty host, THE Dashboard SHALL add the Quick_Link to the panel and save it to Storage.
2. IF the user submits a Quick_Link with an empty label, a label exceeding 100 characters, an empty URL field, or a URL that after scheme normalisation does not contain a non-empty host, THEN THE Dashboard SHALL display an inline validation error message indicating the invalid field and not add the Quick_Link.
3. IF the user submits a URL that does not begin with "http://" or "https://", THEN THE Dashboard SHALL prepend "https://" to the URL before saving.
4. WHEN the user activates a Quick_Link button, THE Dashboard SHALL open the associated URL in a new browser tab.
5. WHEN the user activates the delete action on a Quick_Link, THE Dashboard SHALL remove that Quick_Link from the panel and from Storage.
6. WHEN the Dashboard loads, THE Dashboard SHALL read all Quick_Links from Storage and render them in the same insertion order they were saved, up to a maximum of 20 Quick_Links.
7. IF Storage is unavailable when the Dashboard loads, THEN THE Dashboard SHALL display an error message indicating that Quick_Links could not be loaded and render an empty Quick_Links panel.

---

### Requirement 5: Light / Dark Mode Toggle

**User Story:** As a user, I want to switch between a light and a dark color scheme, so that I can use the Dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle control that is visible within the viewport on every page, displays a label or icon identifying the current Theme (light or dark), and changes its label or icon to reflect the newly active Theme when toggled.
2. WHEN the user activates the Theme toggle, THE Dashboard SHALL apply the selected Theme to all visible elements within 100 milliseconds without a page reload.
3. WHEN the Dashboard loads, THE Dashboard SHALL read the last-saved Theme from `localStorage` and apply it; IF no Theme value is stored in `localStorage`, THEN THE Dashboard SHALL apply the Theme that matches the browser's `prefers-color-scheme` media query value; IF `prefers-color-scheme` is not supported or returns a value other than `light` or `dark`, THEN THE Dashboard SHALL apply the light Theme by default.
4. WHEN the user changes the Theme, THE Dashboard SHALL save the selected Theme value as either `"light"` or `"dark"` to `localStorage`.

---

### Requirement 6: Single-File Architecture and Performance

**User Story:** As a user, I want the Dashboard to load instantly from a single HTML file with one CSS file and one JavaScript file, so that there is no complex setup and the app works offline or via GitHub Pages.

#### Acceptance Criteria

1. THE Dashboard SHALL be delivered as exactly one HTML file at the root level, one CSS file located inside a `css/` directory, and one JavaScript file located inside a `js/` directory, with no additional CSS or JavaScript files referenced.
2. THE Dashboard SHALL complete initial render of all widgets, with all widget content visible and interactive, within 2 seconds of the HTML file being opened from a local filesystem or GitHub Pages, measured from navigation start to the point all widgets are visible in the viewport.
3. THE Dashboard SHALL operate with all features available and no broken or missing UI elements when opened directly in a browser without a backend server, build tool, or package manager.
4. THE Dashboard SHALL render all widgets without horizontal scrolling, content clipping, or overlapping elements, and all interactive controls SHALL remain reachable, on viewport widths from 320px to 2560px.
5. WHEN any Storage read or write operation fails, THE Dashboard SHALL display an error notice outside the main content area that does not block interaction with any widget, automatically dismiss the notice after 5 seconds, and continue operating with the last successfully read in-memory state for the remainder of the session.
