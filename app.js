(function initializeApp() {
  const STORAGE_KEY = 'vanilla_todo_items_v1';

  /**
   * Application state
   */
  /** @type {{ id: string; title: string; completed: boolean; createdAt: number; updatedAt: number; }[]} */
  let todos = [];
  /** @type {'all'|'active'|'completed'} */
  let currentFilter = 'all';
  let isBulkToggleState = false;

  /** DOM references */
  const form = document.getElementById('new-todo-form');
  const input = document.getElementById('new-todo-input');
  const list = document.getElementById('todo-list');
  const toggleAllButton = document.getElementById('toggle-all');
  const filterButtons = Array.from(document.querySelectorAll('.filter'));
  const itemsLeft = document.getElementById('items-left');
  const clearCompletedButton = document.getElementById('clear-completed');
  const announcer = document.getElementById('sr-announcer');

  if (!form || !input || !list || !toggleAllButton || !itemsLeft || !clearCompletedButton || !announcer) {
    return;
  }

  function announce(message) {
    if (!announcer) return;
    announcer.textContent = '';
    window.requestAnimationFrame(() => {
      announcer.textContent = message;
    });
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((t) => ({
        id: String(t.id),
        title: String(t.title || ''),
        completed: Boolean(t.completed),
        createdAt: Number(t.createdAt || Date.now()),
        updatedAt: Number(t.updatedAt || Date.now()),
      }));
    } catch (_) {
      return [];
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (_) {
      // ignore quota errors
    }
  }

  function generateId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function getFilteredTodos() {
    if (currentFilter === 'active') return todos.filter((t) => !t.completed);
    if (currentFilter === 'completed') return todos.filter((t) => t.completed);
    return todos.slice();
  }

  function updateItemsLeft() {
    const remaining = todos.filter((t) => !t.completed).length;
    itemsLeft.textContent = `${remaining} item${remaining === 1 ? '' : 's'} left`;
  }

  function setFilter(filter) {
    currentFilter = filter;
    for (const btn of filterButtons) {
      const isActive = btn.getAttribute('data-filter') === filter;
      btn.setAttribute('aria-pressed', String(isActive));
    }
    renderList();
  }

  function handleAdd(event) {
    event.preventDefault();
    const title = input.value.trim();
    if (!title) return;
    const now = Date.now();
    const todo = { id: generateId(), title, completed: false, createdAt: now, updatedAt: now };
    todos.unshift(todo);
    input.value = '';
    saveToStorage();
    renderList();
    updateItemsLeft();
    announce('Task added');
  }

  function handleToggle(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    todo.completed = !todo.completed;
    todo.updatedAt = Date.now();
    saveToStorage();
    renderList();
    updateItemsLeft();
  }

  function handleEdit(id, newTitle) {
    const title = newTitle.trim();
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    if (!title) {
      handleDelete(id);
      return;
    }
    todo.title = title;
    todo.updatedAt = Date.now();
    saveToStorage();
    renderList();
  }

  function handleDelete(id) {
    const beforeLength = todos.length;
    todos = todos.filter((t) => t.id !== id);
    if (todos.length !== beforeLength) {
      saveToStorage();
      renderList();
      updateItemsLeft();
      announce('Task deleted');
    }
  }

  function handleClearCompleted() {
    const before = todos.length;
    todos = todos.filter((t) => !t.completed);
    if (todos.length !== before) {
      saveToStorage();
      renderList();
      updateItemsLeft();
      announce('Completed tasks cleared');
    }
  }

  function handleToggleAll() {
    const hasActive = todos.some((t) => !t.completed);
    const targetState = isBulkToggleState ? false : hasActive;
    todos = todos.map((t) => ({ ...t, completed: targetState, updatedAt: Date.now() }));
    isBulkToggleState = targetState;
    saveToStorage();
    renderList();
    updateItemsLeft();
  }

  function createTodoItemElement(todo) {
    const li = document.createElement('li');
    li.dataset.id = todo.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', 'Toggle completed');
    checkbox.addEventListener('change', () => handleToggle(todo.id));

    const title = document.createElement('div');
    title.className = `todo-title${todo.completed ? ' completed' : ''}`;
    title.contentEditable = 'true';
    title.spellcheck = true;
    title.textContent = todo.title;
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        title.blur();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        title.textContent = todo.title;
        title.blur();
      }
    });
    title.addEventListener('blur', () => handleEdit(todo.id, title.textContent || ''));

    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.setAttribute('aria-label', 'Delete task');
    del.addEventListener('click', () => handleDelete(todo.id));

    li.appendChild(checkbox);
    li.appendChild(title);
    li.appendChild(del);
    return li;
  }

  function renderList() {
    const filtered = getFilteredTodos();
    list.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (const todo of filtered) {
      fragment.appendChild(createTodoItemElement(todo));
    }
    list.appendChild(fragment);
  }

  // Event bindings
  form.addEventListener('submit', handleAdd);
  toggleAllButton.addEventListener('click', handleToggleAll);
  clearCompletedButton.addEventListener('click', handleClearCompleted);
  for (const btn of filterButtons) {
    btn.addEventListener('click', () => setFilter(/** @type any */ (btn.getAttribute('data-filter'))));
  }

  // Init
  todos = loadFromStorage();
  updateItemsLeft();
  setFilter('all');
  renderList();
})();

