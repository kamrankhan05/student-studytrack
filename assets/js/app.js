// ===========================================
// STUDYTRACK — APP LOGIC (CRUD, RENDER, FILTERS, STATS)
// ===========================================

// ---------- Element references ----------
const taskForm = document.getElementById("taskForm");
const taskListEl = document.getElementById("taskList");
const statsGridEl = document.getElementById("statsGrid");
const filterBarEl = document.getElementById("filterBar");
const appMessage = document.getElementById("appMessage");

// In-memory copy of the signed-in user's tasks, loaded from Supabase
let tasks = [];

// Tracks whether the form is in "add" or "edit" mode
let editingTaskId = null;

// ---------- Build the task form fields (title, subject, description, due_date, priority, status) ----------
taskForm.innerHTML = `
  <span class="form-eyebrow" id="taskFormEyebrow">New Entry</span>
  <h2 id="taskFormTitle">Add Task</h2>

  <label for="taskTitle">Title</label>
  <input type="text" id="taskTitle" placeholder="e.g. Chapter 4 problem set" required />

  <div class="field-row">
    <div>
      <label for="taskSubject">Subject</label>
      <input type="text" id="taskSubject" placeholder="e.g. Calculus II" required />
    </div>
    <div>
      <label for="taskDueDate">Due Date</label>
      <input type="date" id="taskDueDate" />
    </div>
  </div>

  <label for="taskDescription">Notes</label>
  <textarea id="taskDescription" rows="3" placeholder="Optional details..."></textarea>

  <div class="field-row">
    <div>
      <label for="taskPriority">Priority</label>
      <select id="taskPriority">
        <option value="low">Low</option>
        <option value="medium" selected>Medium</option>
        <option value="high">High</option>
      </select>
    </div>
    <div>
      <label for="taskStatus">Status</label>
      <select id="taskStatus">
        <option value="pending" selected>Pending</option>
        <option value="completed">Completed</option>
      </select>
    </div>
  </div>

  <div class="form-actions">
    <button type="button" id="cancelEditBtn" class="secondary-button hidden">Cancel</button>
    <button type="submit" id="taskSubmitBtn" class="primary-button">
      <span class="btn-icon" id="taskSubmitIcon">+</span> Add Task
    </button>
  </div>
`;

const taskFormTitle = document.getElementById("taskFormTitle");
const taskFormEyebrow = document.getElementById("taskFormEyebrow");
const taskSubmitIcon = document.getElementById("taskSubmitIcon");
const taskTitleInput = document.getElementById("taskTitle");
const taskSubjectInput = document.getElementById("taskSubject");
const taskDescriptionInput = document.getElementById("taskDescription");
const taskDueDateInput = document.getElementById("taskDueDate");
const taskPriorityInput = document.getElementById("taskPriority");
const taskStatusInput = document.getElementById("taskStatus");
const taskSubmitBtn = document.getElementById("taskSubmitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

// ---------- Build the filter bar (search, status filter, priority filter) ----------
filterBarEl.innerHTML = `
  <input type="text" id="searchInput" placeholder="Search by title or subject..." />
  <select id="statusFilter">
    <option value="all">All statuses</option>
    <option value="pending">Pending</option>
    <option value="completed">Completed</option>
  </select>
  <select id="priorityFilter">
    <option value="all">All priorities</option>
    <option value="low">Low</option>
    <option value="medium">Medium</option>
    <option value="high">High</option>
  </select>
`;

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const priorityFilter = document.getElementById("priorityFilter");

searchInput.addEventListener("input", applyFilters);
statusFilter.addEventListener("change", applyFilters);
priorityFilter.addEventListener("change", applyFilters);

// ---------- Helpers ----------
function setAppMessage(text, type) {
  appMessage.textContent = text;
  appMessage.className = "message-area " + type;
}

function clearAppMessage() {
  appMessage.textContent = "";
  appMessage.className = "message-area";
}

function setLoading(isLoading) {
  if (isLoading) {
    setAppMessage("Loading tasks...", "loading");
  } else {
    clearAppMessage();
  }
}

// Compare a due_date (YYYY-MM-DD string) against today, ignoring time-of-day
function isOverdue(task) {
  if (!task.due_date || task.status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date + "T00:00:00");
  return due < today;
}

// ---------- CREATE ----------
async function addTask(taskData) {
  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    setAppMessage("Please sign in again.", "error");
    return;
  }

  const { error } = await supabaseClient
    .from("tasks")
    .insert({
      user_id: user.id,
      ...taskData,
    });

  if (error) {
    setAppMessage(error.message, "error");
    return;
  }

  taskForm.reset();
  taskPriorityInput.value = "medium";
  taskStatusInput.value = "pending";
  setAppMessage("Task added.", "success");
  await loadTasks();
}

// ---------- UPDATE ----------
async function updateTask(id, taskData) {
  const { error } = await supabaseClient
    .from("tasks")
    .update(taskData)
    .eq("id", id);

  if (error) {
    setAppMessage(error.message, "error");
    return;
  }

  exitEditMode();
  setAppMessage("Task updated.", "success");
  await loadTasks();
}

async function toggleTaskStatus(task) {
  const nextStatus = task.status === "completed" ? "pending" : "completed";

  const { error } = await supabaseClient
    .from("tasks")
    .update({ status: nextStatus })
    .eq("id", task.id);

  if (error) {
    setAppMessage(error.message, "error");
    return;
  }

  await loadTasks();
}

// ---------- DELETE ----------
async function deleteTask(id) {
  const approved = window.confirm("Delete this task?");
  if (!approved) return;

  const { error } = await supabaseClient
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) {
    setAppMessage(error.message, "error");
    return;
  }

  setAppMessage("Task deleted.", "success");
  await loadTasks();
}

// ---------- READ ----------
async function loadTasks() {
  setLoading(true);

  const { data, error } = await supabaseClient
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  setLoading(false);

  if (error) {
    setAppMessage(error.message, "error");
    return;
  }

  tasks = data;
  applyFilters();
  updateStats(tasks);
}

// ---------- Edit mode ----------
function enterEditMode(task) {
  editingTaskId = task.id;

  taskTitleInput.value = task.title;
  taskSubjectInput.value = task.subject;
  taskDescriptionInput.value = task.description || "";
  taskDueDateInput.value = task.due_date || "";
  taskPriorityInput.value = task.priority;
  taskStatusInput.value = task.status;

  taskFormEyebrow.textContent = "Editing";
  taskFormTitle.textContent = "Edit Task";
  taskSubmitIcon.textContent = "✓";
  taskSubmitBtn.lastChild.textContent = " Save Changes";
  cancelEditBtn.classList.remove("hidden");

  taskForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function exitEditMode() {
  editingTaskId = null;
  taskForm.reset();
  taskPriorityInput.value = "medium";
  taskStatusInput.value = "pending";
  taskFormEyebrow.textContent = "New Entry";
  taskFormTitle.textContent = "Add Task";
  taskSubmitIcon.textContent = "+";
  taskSubmitBtn.lastChild.textContent = " Add Task";
  cancelEditBtn.classList.add("hidden");
}

cancelEditBtn.addEventListener("click", exitEditMode);

// ---------- Form submit (handles both add and edit) ----------
taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = taskTitleInput.value.trim();
  const subject = taskSubjectInput.value.trim();

  if (!title || !subject) {
    setAppMessage("Title and subject are required.", "error");
    return;
  }

  const taskData = {
    title,
    subject,
    description: taskDescriptionInput.value.trim(),
    due_date: taskDueDateInput.value || null,
    priority: taskPriorityInput.value,
    status: taskStatusInput.value,
  };

  taskSubmitBtn.disabled = true;

  if (editingTaskId) {
    await updateTask(editingTaskId, taskData);
  } else {
    await addTask(taskData);
  }

  taskSubmitBtn.disabled = false;
});

// ---------- Filtering ----------
function applyFilters() {
  const term = searchInput.value.trim().toLowerCase();
  const statusValue = statusFilter.value;
  const priorityValue = priorityFilter.value;

  const filtered = tasks.filter((task) => {
    const matchesText =
      task.title.toLowerCase().includes(term) ||
      task.subject.toLowerCase().includes(term);
    const matchesStatus =
      statusValue === "all" || task.status === statusValue;
    const matchesPriority =
      priorityValue === "all" || task.priority === priorityValue;
    return matchesText && matchesStatus && matchesPriority;
  });

  renderTasks(filtered);
}

// ---------- Rendering ----------
function renderTasks(taskArray) {
  taskListEl.innerHTML = "";

  if (taskArray.length === 0) {
    const emptyText = tasks.length === 0
      ? "No tasks yet. Add your first task above."
      : "No tasks match your search or filters.";
    taskListEl.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }

  taskArray.forEach((task) => {
    const card = document.createElement("div");
    card.className = "task-card priority-" + task.priority;

    const overdue = isOverdue(task);

    // Build safely with textContent where possible; only static markup uses innerHTML
    card.innerHTML = `
      <div class="task-card-header">
        <div>
          <h3></h3>
          <div class="task-subject"></div>
        </div>
        <div class="task-meta">
          <span class="badge badge-priority-${task.priority}"></span>
          <span class="badge badge-status-${task.status}"></span>
          ${overdue ? '<span class="badge badge-overdue">Overdue</span>' : ""}
        </div>
      </div>
      <div class="task-description"></div>
      <div class="task-due"></div>
      <div class="task-card-actions">
        <button type="button" class="toggle-button">${task.status === "completed" ? "Mark Pending" : "Mark Complete"}</button>
        <button type="button" class="edit-button">Edit</button>
        <button type="button" class="delete-button">Delete</button>
      </div>
    `;

    card.querySelector("h3").textContent = task.title;
    card.querySelector(".task-subject").textContent = task.subject;
    card.querySelector(`.badge-priority-${task.priority}`).textContent = task.priority;
    card.querySelector(`.badge-status-${task.status}`).textContent = task.status;
    card.querySelector(".task-description").textContent = task.description || "";
    card.querySelector(".task-due").textContent = task.due_date
      ? "Due: " + task.due_date
      : "No due date";

    card.querySelector(".toggle-button").addEventListener("click", () => toggleTaskStatus(task));
    card.querySelector(".edit-button").addEventListener("click", () => enterEditMode(task));
    card.querySelector(".delete-button").addEventListener("click", () => deleteTask(task.id));

    taskListEl.appendChild(card);
  });
}

// ---------- Stats ----------
function updateStats(taskArray) {
  const total = taskArray.length;
  const pending = taskArray.filter((t) => t.status === "pending").length;
  const completed = taskArray.filter((t) => t.status === "completed").length;
  const overdue = taskArray.filter((t) => isOverdue(t)).length;

  statsGridEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${total}</div>
      <div class="stat-label">Total</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${pending}</div>
      <div class="stat-label">Pending</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${completed}</div>
      <div class="stat-label">Completed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${overdue}</div>
      <div class="stat-label">Overdue</div>
    </div>
  `;
}