(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // UI helpers — must be defined before any module that calls them
  // ---------------------------------------------------------------------------

  var UI = {
    _storageErrorTimer: null,

    showStorageError: function (context) {
      var notice = document.getElementById('storage-error-notice');
      if (!notice) return;

      notice.textContent = context
        ? 'Storage error: ' + context + '. Changes may not be saved.'
        : 'Storage error. Changes may not be saved.';
      notice.hidden = false;

      // Clear any pending dismiss timer so a second rapid error doesn't
      // cause the notice to vanish early.
      if (UI._storageErrorTimer !== null) {
        clearTimeout(UI._storageErrorTimer);
      }

      UI._storageErrorTimer = setTimeout(function () {
        notice.hidden = true;
        UI._storageErrorTimer = null;
      }, 5000);
    }
  };

  // ---------------------------------------------------------------------------
  // Storage module — wraps every localStorage call in try/catch
  // ---------------------------------------------------------------------------

  var Storage = {
    get: function (key) {
      try {
        var raw = localStorage.getItem(key);
        if (raw === null) return null;
        return JSON.parse(raw);
      } catch (e) {
        UI.showStorageError('reading ' + key);
        return null;
      }
    },

    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        UI.showStorageError('writing ' + key);
        // no-op on failure
      }
    },

    remove: function (key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        UI.showStorageError('removing ' + key);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // resolveTheme — pure function; exported on window for property tests
  // ---------------------------------------------------------------------------

  /**
   * Determines the active theme from a stored value and OS preference.
   *
   * Priority chain (Property 13):
   *   1. storedValue === "dark"  → "dark"
   *   2. storedValue === "light" → "light"
   *   3. prefersColorScheme === "dark" → "dark"
   *   4. otherwise → "light"
   *
   * @param {string|null} storedValue       - Value read from localStorage
   * @param {string|null} prefersColorScheme - OS preference ("dark", "light", or null)
   * @returns {"light"|"dark"}
   */
  function resolveTheme(storedValue, prefersColorScheme) {
    if (storedValue === 'dark') return 'dark';
    if (storedValue === 'light') return 'light';
    if (prefersColorScheme === 'dark') return 'dark';
    return 'light';
  }

  // Expose for property-based tests (Property 13)
  if (typeof window !== 'undefined') {
    window.resolveTheme = resolveTheme;
  }

  // ---------------------------------------------------------------------------
  // Theme module
  // ---------------------------------------------------------------------------

  var Theme = {
    init: function () {
      var stored = Storage.get('todo_theme');

      var osPref = null;
      try {
        var mq = window.matchMedia('(prefers-color-scheme: dark)');
        if (mq && typeof mq.matches === 'boolean') {
          osPref = mq.matches ? 'dark' : 'light';
        }
      } catch (e) {
        // matchMedia not supported; osPref stays null
      }

      var theme = resolveTheme(stored, osPref);
      Theme.apply(theme);

      var btn = document.getElementById('theme-toggle');
      if (btn) {
        btn.addEventListener('click', function () {
          Theme.toggle();
        });
      }
    },

    apply: function (themeName) {
      document.documentElement.dataset.theme = themeName;

      var btn = document.getElementById('theme-toggle');
      if (btn) {
        btn.textContent = themeName === 'dark' ? '☀️ Light' : '🌙 Dark';
      }
    },

    toggle: function () {
      var current = document.documentElement.dataset.theme;
      var next = current === 'dark' ? 'light' : 'dark';
      Theme.apply(next);
      Storage.set('todo_theme', next);
    }
  };


  // ---------------------------------------------------------------------------
  // Greeting helpers — pure functions (no DOM access, no side effects)
  // ---------------------------------------------------------------------------

  /**
   * Formats a Date object as "HH:MM" in 24-hour format.
   * Both hours and minutes are zero-padded to 2 digits.
   * e.g., 9:05 AM → "09:05", 2:30 PM → "14:30"
   *
   * @param {Date} date
   * @returns {string}
   */
  function formatTime(date) {
    var hours = String(date.getHours()).padStart(2, '0');
    var minutes = String(date.getMinutes()).padStart(2, '0');
    return hours + ':' + minutes;
  }

  /**
   * Formats a Date object as a full date string, e.g. "Thursday, 20 November 2026".
   * Uses English day and month names.
   *
   * @param {Date} date
   * @returns {string}
   */
  function formatDate(date) {
    var days = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday'
    ];
    var months = [
      'January', 'February', 'March', 'April',
      'May', 'June', 'July', 'August',
      'September', 'October', 'November', 'December'
    ];
    var weekday = days[date.getDay()];
    var day = date.getDate();
    var month = months[date.getMonth()];
    var year = date.getFullYear();
    return weekday + ', ' + day + ' ' + month + ' ' + year;
  }

  /**
   * Returns a contextual greeting string based on the given hour (0–23).
   *
   *  05–11 → "Good Morning"
   *  12–17 → "Good Afternoon"
   *  18–20 → "Good Evening"
   *  21–23 and 00–04 → "Good Night"
   *
   * @param {number} hour - Integer in range [0, 23]
   * @returns {string}
   */
  function getGreeting(hour) {
    if (hour >= 5 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 20) return 'Good Evening';
    return 'Good Night';
  }

  // Expose Greeting helpers for property-based tests (Properties 1, 2, 3)
  if (typeof window !== 'undefined') {
    window.formatTime = formatTime;
    window.formatDate = formatDate;
    window.getGreeting = getGreeting;
  }

  // ---------------------------------------------------------------------------
  // Greeting module
  // ---------------------------------------------------------------------------

  var Greeting = {
    _storedName: null,

    init: function () {
      // Query DOM refs
      Greeting._timeEl    = document.getElementById('greeting-time');
      Greeting._dateEl    = document.getElementById('greeting-date');
      Greeting._textEl    = document.getElementById('greeting-text');
      Greeting._nameInput = document.getElementById('greeting-name-input');
      Greeting._nameBtn   = document.getElementById('greeting-name-submit');
      Greeting._nameError = document.getElementById('greeting-name-error');

      // Load stored name; discard if longer than 50 chars (Req 1.10)
      var stored = Storage.get('todo_username');
      if (typeof stored === 'string' && stored.length <= 50) {
        Greeting._storedName = stored;
      } else {
        Greeting._storedName = null;
      }

      // Attach event listeners for name input
      if (Greeting._nameInput) {
        Greeting._nameInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            Greeting.saveName(Greeting._nameInput.value);
          }
        });
      }

      if (Greeting._nameBtn) {
        Greeting._nameBtn.addEventListener('click', function () {
          Greeting.saveName(Greeting._nameInput ? Greeting._nameInput.value : '');
        });
      }

      // Start the 60-second clock update interval
      setInterval(Greeting.render, 60000);

      // Render immediately so there is no blank period on load (Req 1.11)
      Greeting.render();
    },

    render: function () {
      var now = new Date();

      if (Greeting._timeEl) {
        Greeting._timeEl.textContent = formatTime(now);
      }

      if (Greeting._dateEl) {
        Greeting._dateEl.textContent = formatDate(now);
      }

      if (Greeting._textEl) {
        var text = getGreeting(now.getHours());
        // Append stored name when present (Req 1.7)
        if (Greeting._storedName) {
          text = text + ', ' + Greeting._storedName;
        }
        Greeting._textEl.textContent = text;
      }
    },

    saveName: function (str) {
      // Clear any previous inline error
      if (Greeting._nameError) {
        Greeting._nameError.textContent = '';
      }

      var trimmed = str.trim();

      // Empty submission — remove stored name (Req 1.9)
      if (trimmed === '') {
        Storage.remove('todo_username');
        Greeting._storedName = null;
        Greeting.render();
        return;
      }

      // Name exceeds 50 characters — show inline error, do not save (Req 1.10)
      if (str.length > 50) {
        if (Greeting._nameError) {
          Greeting._nameError.textContent = 'Name must be 50 characters or fewer.';
        }
        return;
      }

      // Valid name — persist and re-render (Req 1.8)
      Storage.set('todo_username', str);
      Greeting._storedName = str;
      Greeting.render();
    }
  };

  // ---------------------------------------------------------------------------
  // Timer helpers — pure functions (no DOM access, no side effects)
  // ---------------------------------------------------------------------------

  /**
   * Formats a total number of seconds as "MM:SS" (zero-padded).
   * Named `timerFormatTime` to avoid collision with the Greeting module's `formatTime`.
   *
   * Examples:
   *   90   → "01:30"
   *   3600 → "60:00"
   *   0    → "00:00"
   *
   * @param {number} totalSeconds - Non-negative integer
   * @returns {string}
   */
  function timerFormatTime(totalSeconds) {
    var minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    var seconds = String(totalSeconds % 60).padStart(2, '0');
    return minutes + ':' + seconds;
  }

  /**
   * Returns true if n is a valid Pomodoro duration (integer in [1, 120]).
   *
   * @param {number} n
   * @returns {boolean}
   */
  function isValidDuration(n) {
    return n >= 1 && n <= 120;
  }

  // Expose Timer helpers for property-based tests (Properties 5, 6)
  if (typeof window !== 'undefined') {
    window.timerFormatTime = timerFormatTime;
    window.isValidDuration = isValidDuration;
  }

  // ---------------------------------------------------------------------------
  // Timer module — Pomodoro-style countdown state machine
  // ---------------------------------------------------------------------------

  var Timer = {
    // State
    state: 'idle',       // 'idle' | 'running' | 'paused' | 'finished'
    remaining: 0,        // seconds remaining
    intervalId: null,

    // Module-scoped privates (set in init)
    _duration: 25,       // minutes
    _originalTitle: '',

    // DOM refs (set in init)
    _display: null,
    _startBtn: null,
    _stopBtn: null,
    _resetBtn: null,
    _durationInput: null,
    _durationError: null,

    init: function () {
      // Store the original page title so we can restore it later
      Timer._originalTitle = document.title;

      // Load persisted duration; default to 25 if absent or invalid
      var stored = Storage.get('todo_pomodoro_duration');
      if (typeof stored === 'number' && isValidDuration(stored)) {
        Timer._duration = stored;
      } else {
        Timer._duration = 25;
      }

      // Query DOM refs
      Timer._display       = document.getElementById('timer-display');
      Timer._startBtn      = document.getElementById('timer-start');
      Timer._stopBtn       = document.getElementById('timer-stop');
      Timer._resetBtn      = document.getElementById('timer-reset');
      Timer._durationInput = document.getElementById('timer-duration-input');
      Timer._durationError = document.getElementById('timer-duration-error');

      // Attach button listeners
      if (Timer._startBtn) {
        Timer._startBtn.addEventListener('click', function () { Timer.start(); });
      }
      if (Timer._stopBtn) {
        Timer._stopBtn.addEventListener('click', function () { Timer.stop(); });
      }
      if (Timer._resetBtn) {
        Timer._resetBtn.addEventListener('click', function () { Timer.reset(); });
      }

      // Attach duration change listener
      if (Timer._durationInput) {
        Timer._durationInput.value = Timer._duration;
        Timer._durationInput.addEventListener('change', function () {
          Timer.setDuration(parseInt(Timer._durationInput.value, 10));
        });
      }

      // Initialise display
      Timer.reset();
    },

    start: function () {
      // No-op if already running
      if (Timer.state === 'running') return;

      // If finished, restart from full duration
      if (Timer.state === 'finished') {
        Timer.remaining = Timer._duration * 60;
        Timer.state = 'idle';
      }

      Timer.state = 'running';

      Timer.intervalId = setInterval(function () {
        Timer.remaining -= 1;

        // Update display
        if (Timer._display) {
          Timer._display.textContent = timerFormatTime(Timer.remaining);
        }

        // Update tab title
        document.title = timerFormatTime(Timer.remaining) + ' \u2014 Focus Session';

        // Check for completion
        if (Timer.remaining <= 0) {
          Timer._finish();
        }
      }, 1000);
    },

    stop: function () {
      clearInterval(Timer.intervalId);
      Timer.intervalId = null;
      Timer.state = 'paused';
      document.title = Timer._originalTitle;
    },

    reset: function () {
      clearInterval(Timer.intervalId);
      Timer.intervalId = null;
      Timer.state = 'idle';
      Timer.remaining = Timer._duration * 60;
      document.title = Timer._originalTitle;

      if (Timer._display) {
        Timer._display.textContent = timerFormatTime(Timer.remaining);
      }
    },

    setDuration: function (minutes) {
      if (!isValidDuration(minutes)) {
        // Show inline error
        if (Timer._durationError) {
          Timer._durationError.textContent = 'Duration must be between 1 and 120 minutes.';
        }
        // Restore input to last valid duration
        if (Timer._durationInput) {
          Timer._durationInput.value = Timer._duration;
        }
        return;
      }

      // Clear error
      if (Timer._durationError) {
        Timer._durationError.textContent = '';
      }

      // Persist and update
      Storage.set('todo_pomodoro_duration', minutes);
      Timer._duration = minutes;

      // Update display only when idle (not mid-session)
      if (Timer.state === 'idle') {
        Timer.remaining = Timer._duration * 60;
        if (Timer._display) {
          Timer._display.textContent = timerFormatTime(Timer.remaining);
        }
      }
    },

    // Internal finish handler
    _finish: function () {
      clearInterval(Timer.intervalId);
      Timer.intervalId = null;
      Timer.state = 'finished';
      document.title = Timer._originalTitle;

      if (Timer._display) {
        Timer._display.textContent = '00:00';
      }

      // Notify user
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Focus session complete!');
      } else {
        // On-page fallback: show a visible message in the display area
        if (Timer._display) {
          Timer._display.textContent = '00:00 \u2714 Done!';
        }
      }
    }
  };

  // ---------------------------------------------------------------------------
  // TodoList helpers — pure functions (no DOM access, no side effects)
  // ---------------------------------------------------------------------------

  /**
   * Generates a unique string ID with the given prefix.
   * Format: "${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}"
   * e.g., generateId('t') → "t_1699123456789_42"
   *
   * @param {string} prefix
   * @returns {string}
   */
  function generateId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  }

  /**
   * Returns true iff str is a valid task description:
   *   - str.trim().length >= 1 (not empty or whitespace-only)
   *   - str.length <= 500 (not too long)
   *
   * @param {string} str
   * @returns {boolean}
   */
  function isValidDescription(str) {
    return str.trim().length >= 1 && str.length <= 500;
  }

  // Expose TodoList helpers for testing (Requirements 3.1, 3.2)
  if (typeof window !== 'undefined') {
    window.generateId = generateId;
    window.isValidDescription = isValidDescription;
  }

  // ---------------------------------------------------------------------------
  // TodoList module — task CRUD, render, validation
  // ---------------------------------------------------------------------------

  var TodoList = {
    _tasks: [],
    _editingId: null,

    init: function () {
      // Load tasks from Storage
      var stored = Storage.get('todo_tasks');
      if (Array.isArray(stored)) {
        TodoList._tasks = stored;
      } else {
        TodoList._tasks = [];
        if (stored !== null) {
          // Non-null but not an array means data was malformed
          UI.showStorageError('loading tasks');
        }
      }

      // Event delegation on #todo-list for action buttons
      var listContainer = document.getElementById('todo-list');
      if (listContainer) {
        listContainer.addEventListener('click', function (e) {
          var actionEl = e.target.closest('[data-action]');
          if (!actionEl) return;

          var action = actionEl.dataset.action;
          var id = actionEl.dataset.id;

          if (action === 'toggle') {
            TodoList.toggle(id);
          } else if (action === 'delete') {
            TodoList.delete(id);
          } else if (action === 'edit') {
            TodoList.startEdit(id);
          } else if (action === 'confirm-edit') {
            var row = actionEl.closest('[data-task-id]');
            var input = row ? row.querySelector('.todo-edit-input') : null;
            var newValue = input ? input.value : '';
            TodoList.confirmEdit(id, newValue);
          } else if (action === 'cancel-edit') {
            TodoList.cancelEdit(id);
          }
        });
      }

      // Submit listener on the add-task form
      var form = document.getElementById('todo-input-form');
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var input = document.getElementById('todo-input');
          if (input) {
            TodoList.add(input.value);
          }
        });
      }

      TodoList.render();
    },

    add: function (description) {
      // Clear any existing field error first
      var existingError = document.querySelector('#todo-input-form .field-error');
      if (existingError) {
        existingError.parentNode.removeChild(existingError);
      }

      if (!isValidDescription(description)) {
        // Inject inline error adjacent to the input
        var input = document.getElementById('todo-input');
        if (input) {
          var errorSpan = document.createElement('span');
          errorSpan.className = 'field-error';
          errorSpan.setAttribute('role', 'alert');
          errorSpan.textContent = description.length > 500
            ? 'Task description must be 500 characters or fewer.'
            : 'Task description cannot be empty.';
          input.insertAdjacentElement('afterend', errorSpan);
        }
        return;
      }

      TodoList._tasks.push({
        id: generateId('t'),
        description: description.trim(),
        completed: false,
        createdAt: Date.now()
      });

      Storage.set('todo_tasks', TodoList._tasks);

      // Clear the input field
      var inputEl = document.getElementById('todo-input');
      if (inputEl) {
        inputEl.value = '';
      }

      TodoList.render();
    },

    toggle: function (id) {
      var task = null;
      for (var i = 0; i < TodoList._tasks.length; i++) {
        if (TodoList._tasks[i].id === id) {
          task = TodoList._tasks[i];
          break;
        }
      }
      if (!task) return;

      task.completed = !task.completed;
      Storage.set('todo_tasks', TodoList._tasks);
      TodoList.render();
    },

    delete: function (id) {
      TodoList._tasks = TodoList._tasks.filter(function (t) {
        return t.id !== id;
      });
      Storage.set('todo_tasks', TodoList._tasks);
      TodoList.render();
    },

    startEdit: function (id) {
      TodoList._editingId = id;
      TodoList.render();
    },

    confirmEdit: function (id, newDescription) {
      if (!isValidDescription(newDescription)) {
        // Discard edit — restore original without touching Storage
        TodoList._editingId = null;
        TodoList.render();
        return;
      }

      for (var i = 0; i < TodoList._tasks.length; i++) {
        if (TodoList._tasks[i].id === id) {
          TodoList._tasks[i].description = newDescription.trim();
          break;
        }
      }

      Storage.set('todo_tasks', TodoList._tasks);
      TodoList._editingId = null;
      TodoList.render();
    },

    cancelEdit: function (id) {
      TodoList._editingId = null;
      TodoList.render();
    },

    render: function () {
      var listContainer = document.getElementById('todo-list');
      if (!listContainer) return;

      // Clear current content
      listContainer.innerHTML = '';

      var tasks = TodoList._tasks;

      for (var i = 0; i < tasks.length; i++) {
        var task = tasks[i];
        var row = document.createElement('div');
        row.className = 'todo-task-row';
        row.dataset.taskId = task.id;

        if (task.id === TodoList._editingId) {
          // --- Edit mode ---
          var editInput = document.createElement('input');
          editInput.type = 'text';
          editInput.className = 'todo-edit-input';
          editInput.value = task.description;
          editInput.setAttribute('aria-label', 'Edit task description');
          editInput.maxLength = 500;

          var confirmBtn = document.createElement('button');
          confirmBtn.type = 'button';
          confirmBtn.className = 'todo-btn todo-btn-confirm';
          confirmBtn.textContent = '✔ Confirm';
          confirmBtn.dataset.action = 'confirm-edit';
          confirmBtn.dataset.id = task.id;

          var cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'todo-btn todo-btn-cancel';
          cancelBtn.textContent = '✖ Cancel';
          cancelBtn.dataset.action = 'cancel-edit';
          cancelBtn.dataset.id = task.id;

          // Escape key cancels edit
          editInput.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
              TodoList.cancelEdit(task.id);
            }
          });

          // Blur cancels edit (click on confirm button fires before blur, so
          // we use a short delay to let the confirm click register first)
          editInput.addEventListener('blur', function () {
            setTimeout(function () {
              if (TodoList._editingId === task.id) {
                TodoList.cancelEdit(task.id);
              }
            }, 150);
          });

          row.appendChild(editInput);
          row.appendChild(confirmBtn);
          row.appendChild(cancelBtn);
        } else {
          // --- Normal display mode ---
          var toggleBtn = document.createElement('button');
          toggleBtn.type = 'button';
          toggleBtn.className = 'todo-btn todo-btn-toggle';
          toggleBtn.dataset.action = 'toggle';
          toggleBtn.dataset.id = task.id;
          toggleBtn.dataset.completed = String(task.completed);
          toggleBtn.setAttribute('aria-label', task.completed ? 'Mark as incomplete' : 'Mark as complete');
          toggleBtn.textContent = task.completed ? '☑' : '☐';

          var descSpan = document.createElement('span');
          descSpan.className = 'todo-task-description' + (task.completed ? ' todo-task-completed' : '');
          descSpan.textContent = task.description;

          var editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'todo-btn todo-btn-edit';
          editBtn.dataset.action = 'edit';
          editBtn.dataset.id = task.id;
          editBtn.setAttribute('aria-label', 'Edit task');
          editBtn.textContent = '✏';

          var deleteBtn = document.createElement('button');
          deleteBtn.type = 'button';
          deleteBtn.className = 'todo-btn todo-btn-delete';
          deleteBtn.dataset.action = 'delete';
          deleteBtn.dataset.id = task.id;
          deleteBtn.setAttribute('aria-label', 'Delete task');
          deleteBtn.textContent = '🗑';

          row.appendChild(toggleBtn);
          row.appendChild(descSpan);
          row.appendChild(editBtn);
          row.appendChild(deleteBtn);
        }

        listContainer.appendChild(row);
      }

      // Update incomplete count badge
      var incomplete = TodoList._tasks.filter(function (t) {
        return t.completed === false;
      }).length;

      var badge = document.getElementById('todo-count-badge');
      if (badge) {
        badge.textContent = incomplete === 1
          ? '1 task remaining'
          : incomplete + ' tasks remaining';
      }
    }
  };

  // Expose countIncomplete as a pure helper for property-based tests (Property 10)
  function countIncomplete(tasks) {
    return tasks.filter(function (t) { return t.completed === false; }).length;
  }

  if (typeof window !== 'undefined') {
    window.countIncomplete = countIncomplete;
    window.TodoList = TodoList;
  }

  // ---------------------------------------------------------------------------
  // QuickLinks helpers — pure functions (no DOM access, no side effects)
  // ---------------------------------------------------------------------------

  /**
   * Prepends "https://" to a URL string if it does not already start with
   * "http://" or "https://".
   *
   * Examples:
   *   normaliseUrl("example.com")          → "https://example.com"
   *   normaliseUrl("http://example.com")   → "http://example.com"   (unchanged)
   *   normaliseUrl("https://example.com")  → "https://example.com"  (unchanged)
   *
   * @param {string} str
   * @returns {string}
   */
  function normaliseUrl(str) {
    if (str.startsWith('http://') || str.startsWith('https://')) {
      return str;
    }
    return 'https://' + str;
  }

  /**
   * Returns true iff the label and url together form a valid quick link:
   *   - label.trim() is non-empty AND label.length <= 100
   *   - normaliseUrl(url), when parsed by the URL constructor, produces a
   *     non-empty host; returns false if the URL constructor throws or if
   *     the resulting host is an empty string.
   *
   * @param {string} label
   * @param {string} url
   * @returns {boolean}
   */
  function isValidLink(label, url) {
    // Validate label
    if (label.trim().length === 0 || label.length > 100) {
      return false;
    }

    // Validate URL — parse the normalised form and check for a non-empty host
    try {
      var parsed = new URL(normaliseUrl(url));
      return parsed.host.length > 0;
    } catch (e) {
      return false;
    }
  }

  // Expose QuickLinks helpers for testing (Requirements 4.1, 4.2, 4.3)
  if (typeof window !== 'undefined') {
    window.normaliseUrl = normaliseUrl;
    window.isValidLink = isValidLink;
  }

  // ---------------------------------------------------------------------------
  // QuickLinks module — link CRUD, URL normalisation, render, validation
  // ---------------------------------------------------------------------------

  var QuickLinks = {
    _links: [],  // max 20 entries

    init: function () {
      // Load links from Storage
      var stored = Storage.get('todo_quicklinks');
      if (Array.isArray(stored)) {
        QuickLinks._links = stored;
      } else {
        QuickLinks._links = [];
        if (stored !== null) {
          // Non-null but not an array means data was malformed
          UI.showStorageError('loading quick links');
        }
      }

      // Attach submit listener on the quick links add form
      var form = document.getElementById('quicklinks-add-form');
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var labelInput = document.getElementById('quicklinks-label-input');
          var urlInput = document.getElementById('quicklinks-url-input');
          var label = labelInput ? labelInput.value : '';
          var url = urlInput ? urlInput.value : '';
          QuickLinks.add(label, url);
        });
      }

      // Attach event delegation on #quicklinks-list for delete actions
      var listContainer = document.getElementById('quicklinks-list');
      if (listContainer) {
        listContainer.addEventListener('click', function (e) {
          var actionEl = e.target.closest('[data-action="delete"]');
          if (!actionEl) return;
          QuickLinks.delete(actionEl.dataset.id);
        });
      }

      QuickLinks.render();
    },

    add: function (label, url) {
      // Clear any existing field errors
      var labelInput = document.getElementById('quicklinks-label-input');
      var urlInput = document.getElementById('quicklinks-url-input');

      var existingLabelError = document.getElementById('quicklinks-label-error');
      if (existingLabelError) existingLabelError.textContent = '';

      var existingUrlError = document.getElementById('quicklinks-url-error');
      if (existingUrlError) existingUrlError.textContent = '';

      // Check label validity separately for precise error messaging
      var labelTrimmed = label.trim();
      if (labelTrimmed.length === 0) {
        if (existingLabelError) {
          existingLabelError.textContent = 'Label cannot be empty.';
        } else if (labelInput) {
          var labelErrSpan = document.createElement('span');
          labelErrSpan.className = 'field-error';
          labelErrSpan.setAttribute('role', 'alert');
          labelErrSpan.textContent = 'Label cannot be empty.';
          labelInput.insertAdjacentElement('afterend', labelErrSpan);
        }
        return;
      }

      if (label.length > 100) {
        if (existingLabelError) {
          existingLabelError.textContent = 'Label must be 100 characters or fewer.';
        } else if (labelInput) {
          var labelErrSpan2 = document.createElement('span');
          labelErrSpan2.className = 'field-error';
          labelErrSpan2.setAttribute('role', 'alert');
          labelErrSpan2.textContent = 'Label must be 100 characters or fewer.';
          labelInput.insertAdjacentElement('afterend', labelErrSpan2);
        }
        return;
      }

      // Check URL validity
      var normalisedUrl = normaliseUrl(url);
      var urlValid = false;
      try {
        var parsed = new URL(normalisedUrl);
        urlValid = parsed.host.length > 0;
      } catch (e) {
        urlValid = false;
      }

      if (!urlValid) {
        if (existingUrlError) {
          existingUrlError.textContent = 'Please enter a valid URL.';
        } else if (urlInput) {
          var urlErrSpan = document.createElement('span');
          urlErrSpan.className = 'field-error';
          urlErrSpan.setAttribute('role', 'alert');
          urlErrSpan.textContent = 'Please enter a valid URL.';
          urlInput.insertAdjacentElement('afterend', urlErrSpan);
        }
        return;
      }

      // Enforce max 20 entries
      if (QuickLinks._links.length >= 20) return;

      QuickLinks._links.push({
        id: generateId('ql'),
        label: labelTrimmed,
        url: normalisedUrl
      });

      Storage.set('todo_quicklinks', QuickLinks._links);

      // Clear inputs
      if (labelInput) labelInput.value = '';
      if (urlInput) urlInput.value = '';

      QuickLinks.render();
    },

    delete: function (id) {
      QuickLinks._links = QuickLinks._links.filter(function (link) {
        return link.id !== id;
      });
      Storage.set('todo_quicklinks', QuickLinks._links);
      QuickLinks.render();
    },

    render: function () {
      var listContainer = document.getElementById('quicklinks-list');
      if (!listContainer) return;

      // Clear current content
      listContainer.innerHTML = '';

      var links = QuickLinks._links;

      for (var i = 0; i < links.length; i++) {
        var link = links[i];

        var item = document.createElement('div');
        item.className = 'quicklinks-item';

        var anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.className = 'quicklinks-link';
        anchor.textContent = link.label;

        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'quicklinks-delete-btn';
        deleteBtn.dataset.action = 'delete';
        deleteBtn.dataset.id = link.id;
        deleteBtn.setAttribute('aria-label', 'Delete ' + link.label);
        deleteBtn.textContent = '🗑';

        item.appendChild(anchor);
        item.appendChild(deleteBtn);
        listContainer.appendChild(item);
      }

      // Disable the add button when at the 20-link limit
      var addBtn = document.getElementById('quicklinks-add-btn');
      if (addBtn) {
        addBtn.disabled = QuickLinks._links.length >= 20;
      }
    }
  };

  // Expose QuickLinks module for testing (Requirements 4.1–4.7)
  if (typeof window !== 'undefined') {
    window.QuickLinks = QuickLinks;
  }

  // ---------------------------------------------------------------------------
  // App — top-level coordinator; must be declared after all modules
  // ---------------------------------------------------------------------------

  var App = {
    init: function () {
      Theme.init();
      Greeting.init();
      Timer.init();
      TodoList.init();
      QuickLinks.init();
    }
  };

  // ---------------------------------------------------------------------------
  // Bootstrap — single DOMContentLoaded listener that delegates to App.init
  // ---------------------------------------------------------------------------

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

})();
