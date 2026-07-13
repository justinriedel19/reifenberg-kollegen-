import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getDatabase,
  get,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const ADMIN_EMAIL = "tobias@reifenberg.de";

const TEAM = [
  { name: "Tobias Reifenberg", email: ADMIN_EMAIL, role: "admin" },
  { name: "Justin Riedel", email: "justin@riedel.de", role: "employee" },
  { name: "Elias Diel", email: "elias@diel.de", role: "employee" },
  { name: "Dominik Gronewaldt", email: "dominik@gronewaldt.de", role: "employee" },
  { name: "Katrin vom Bruch", email: "katrin@vombruch.de", role: "employee" }
];

const TEAM_BY_EMAIL = TEAM.reduce((lookup, member) => {
  lookup[member.email] = member;
  return lookup;
}, {});

const PRODUCT_CATEGORIES = [
  "Kfz",
  "Hausrat",
  "Wohngebäude",
  "Unfall",
  "Rechtsschutz",
  "Zahnzusatz",
  "Krankenzusatz",
  "Pflege",
  "Leben / Vorsorge",
  "Haftpflicht",
  "Gewerbe",
  "Sonstiges"
];

const APPOINTMENT_STATUSES = [
  { value: "planned", label: "geplant" },
  { value: "done", label: "erledigt" },
  { value: "canceled", label: "storniert" },
  { value: "postponed", label: "verschoben" },
  { value: "no_show", label: "Kunde nicht erschienen" }
];

const APPLICATION_STATUSES = [
  { value: "application_created", label: "Antrag aufgenommen" },
  { value: "submitted", label: "Antrag eingereicht" },
  { value: "closed", label: "policiert / abgeschlossen" },
  { value: "canceled", label: "storniert" },
  { value: "rejected", label: "abgelehnt" }
];

const STATUS_TONES = {
  planned: "blue",
  done: "green",
  canceled: "red",
  postponed: "gray",
  no_show: "gray",
  application_created: "yellow",
  submitted: "yellow",
  closed: "green",
  rejected: "red",
  open: "yellow"
};

const TASK_STATUS_LABELS = {
  open: "offen",
  done: "erledigt"
};

const CATEGORY_LABELS = {
  A: "A - sehr wichtig",
  B: "B - wichtig",
  C: "C - später"
};

const state = {
  app: null,
  auth: null,
  db: null,
  user: null,
  profile: null,
  tasks: [],
  salesEntries: [],
  unsubscribers: [],
  premiumSyncLock: false
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  populateStaticOptions();
  bindEvents();
  updateSalesTypeFields();

  if (!isFirebaseConfigured(firebaseConfig)) {
    showMissingConfig();
    return;
  }

  try {
    state.app = initializeApp(firebaseConfig);
    state.auth = getAuth(state.app);
    state.db = getDatabase(state.app);
    onAuthStateChanged(state.auth, handleAuthStateChanged);
    registerServiceWorker();
  } catch (error) {
    showBanner(`Firebase konnte nicht initialisiert werden: ${friendlyError(error)}`);
    els.loginButton.disabled = true;
  }
});

function cacheElements() {
  const $ = (selector) => document.querySelector(selector);

  els.configBanner = $("#configBanner");
  els.loginView = $("#loginView");
  els.loginForm = $("#loginForm");
  els.loginEmail = $("#loginEmail");
  els.loginPassword = $("#loginPassword");
  els.loginButton = $("#loginButton");
  els.loginError = $("#loginError");
  els.appView = $("#appView");
  els.currentUserName = $("#currentUserName");
  els.currentUserEmail = $("#currentUserEmail");
  els.currentUserRole = $("#currentUserRole");
  els.logoutButton = $("#logoutButton");
  els.loadingState = $("#loadingState");

  els.taskForm = $("#taskForm");
  els.taskFormTitle = $("#taskFormTitle");
  els.taskCustomer = $("#taskCustomer");
  els.taskDescription = $("#taskDescription");
  els.taskCategory = $("#taskCategory");
  els.taskDuration = $("#taskDuration");
  els.taskDueDate = $("#taskDueDate");
  els.taskStatus = $("#taskStatus");
  els.taskFormMessage = $("#taskFormMessage");
  els.saveTaskButton = $("#saveTaskButton");
  els.cancelTaskEdit = $("#cancelTaskEdit");
  els.taskFilters = $("#taskFilters");
  els.taskSearch = $("#taskSearch");
  els.taskStatusFilter = $("#taskStatusFilter");
  els.taskCategoryFilter = $("#taskCategoryFilter");
  els.taskEmployeeFilter = $("#taskEmployeeFilter");
  els.resetTaskFilters = $("#resetTaskFilters");
  els.abcKpis = $("#abcKpis");
  els.taskList = $("#taskList");
  els.taskCount = $("#taskCount");

  els.salesForm = $("#salesForm");
  els.salesFormTitle = $("#salesFormTitle");
  els.salesType = $("#salesType");
  els.salesCustomer = $("#salesCustomer");
  els.salesCategory = $("#salesCategory");
  els.salesDate = $("#salesDate");
  els.salesDueDate = $("#salesDueDate");
  els.salesStatus = $("#salesStatus");
  els.salesNote = $("#salesNote");
  els.appointmentFields = $("#appointmentFields");
  els.appointmentType = $("#appointmentType");
  els.applicationFields = $("#applicationFields");
  els.monthlyPremium = $("#monthlyPremium");
  els.yearlyPremium = $("#yearlyPremium");
  els.expectedCommission = $("#expectedCommission");
  els.bonus = $("#bonus");
  els.closingDate = $("#closingDate");
  els.policyDate = $("#policyDate");
  els.salesFormMessage = $("#salesFormMessage");
  els.saveSalesButton = $("#saveSalesButton");
  els.cancelSalesEdit = $("#cancelSalesEdit");
  els.salesFilters = $("#salesFilters");
  els.salesSearch = $("#salesSearch");
  els.salesEmployeeFilter = $("#salesEmployeeFilter");
  els.salesCategoryFilter = $("#salesCategoryFilter");
  els.salesTypeFilter = $("#salesTypeFilter");
  els.salesStatusFilter = $("#salesStatusFilter");
  els.salesDateFrom = $("#salesDateFrom");
  els.salesDateTo = $("#salesDateTo");
  els.salesDueDateFilter = $("#salesDueDateFilter");
  els.resetSalesFilters = $("#resetSalesFilters");
  els.salesKpis = $("#salesKpis");
  els.employeeEvaluationPanel = $("#employeeEvaluationPanel");
  els.employeeEvaluation = $("#employeeEvaluation");
  els.appointmentsTable = $("#appointmentsTable");
  els.applicationsTable = $("#applicationsTable");
  els.appointmentsCount = $("#appointmentsCount");
  els.applicationsCount = $("#applicationsCount");
}

function bindEvents() {
  els.loginForm.addEventListener("submit", handleLoginSubmit);
  els.logoutButton.addEventListener("click", () => signOut(state.auth));

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => switchPage(button.dataset.page));
  });

  els.taskForm.addEventListener("submit", handleTaskSubmit);
  els.taskForm.addEventListener("reset", resetTaskEditState);
  els.cancelTaskEdit.addEventListener("click", () => els.taskForm.reset());
  els.taskFilters.addEventListener("input", renderABC);
  els.taskFilters.addEventListener("change", renderABC);
  els.resetTaskFilters.addEventListener("click", resetTaskFilters);

  els.salesForm.addEventListener("submit", handleSalesSubmit);
  els.salesForm.addEventListener("reset", resetSalesEditState);
  els.cancelSalesEdit.addEventListener("click", () => els.salesForm.reset());
  els.salesType.addEventListener("change", () => updateSalesTypeFields());
  els.monthlyPremium.addEventListener("input", syncYearlyFromMonthly);
  els.yearlyPremium.addEventListener("input", syncMonthlyFromYearly);
  els.salesFilters.addEventListener("input", renderSales);
  els.salesFilters.addEventListener("change", renderSales);
  els.resetSalesFilters.addEventListener("click", resetSalesFilters);

  document.addEventListener("click", handleActionClick);
}

function populateStaticOptions() {
  const memberOptions = TEAM.map(
    (member) => `<option value="${escapeAttribute(member.email)}">${escapeHtml(member.name)}</option>`
  ).join("");
  els.taskEmployeeFilter.insertAdjacentHTML("beforeend", memberOptions);
  els.salesEmployeeFilter.insertAdjacentHTML("beforeend", memberOptions);

  const categoryOptions = PRODUCT_CATEGORIES.map(
    (category) => `<option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>`
  ).join("");
  els.salesCategoryFilter.insertAdjacentHTML("beforeend", categoryOptions);

  const allStatuses = uniqueByValue([...APPOINTMENT_STATUSES, ...APPLICATION_STATUSES]);
  els.salesStatusFilter.insertAdjacentHTML(
    "beforeend",
    allStatuses.map((status) => `<option value="${status.value}">${escapeHtml(status.label)}</option>`).join("")
  );
}

function isFirebaseConfigured(config) {
  const required = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"];
  return required.every((key) => {
    const value = String(config?.[key] || "");
    return value && !value.includes("HIER_") && !value.includes("DEIN_PROJEKT");
  });
}

function showMissingConfig() {
  showBanner("Firebase ist noch nicht konfiguriert. Trage deine Projektwerte in firebase-config.js ein.");
  els.loginButton.disabled = true;
  setLoginError("Firebase-Konfiguration fehlt. Danach ist der Login aktiv.");
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  setLoginError("");
  els.loginButton.disabled = true;
  els.loginButton.textContent = "Anmeldung läuft...";

  try {
    await signInWithEmailAndPassword(
      state.auth,
      els.loginEmail.value.trim().toLowerCase(),
      els.loginPassword.value
    );
  } catch (error) {
    setLoginError(friendlyAuthError(error));
    els.loginButton.disabled = false;
    els.loginButton.textContent = "Anmelden";
  }
}

async function handleAuthStateChanged(user) {
  clearSubscriptions();

  if (!user) {
    state.user = null;
    state.profile = null;
    state.tasks = [];
    state.salesEntries = [];
    showLogin();
    return;
  }

  const email = String(user.email || "").toLowerCase();
  const member = TEAM_BY_EMAIL[email];

  if (!member) {
    await signOut(state.auth);
    setLoginError("Diese E-Mail ist fuer diese interne Plattform nicht freigegeben.");
    return;
  }

  state.user = user;
  state.profile = {
    uid: user.uid,
    email,
    name: member.name,
    role: member.role
  };

  try {
    await ensureUserProfile();
    showApp();
    subscribeToData();
  } catch (error) {
    showLogin();
    setLoginError(`Profil konnte nicht geladen werden: ${friendlyError(error)}`);
  }
}

async function ensureUserProfile() {
  const profileRef = ref(state.db, `users/${state.user.uid}`);
  const snapshot = await get(profileRef);
  const payload = {
    uid: state.user.uid,
    name: state.profile.name,
    email: state.profile.email,
    role: state.profile.role,
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  };

  if (!snapshot.exists()) {
    payload.createdAt = serverTimestamp();
  }

  await update(profileRef, payload);
}

function showLogin() {
  els.appView.classList.add("hidden");
  els.loginView.classList.remove("hidden");
  els.loginButton.disabled = !isFirebaseConfigured(firebaseConfig);
  els.loginButton.textContent = "Anmelden";
  setLoading(false);
}

function showApp() {
  els.loginView.classList.add("hidden");
  els.appView.classList.remove("hidden");
  els.currentUserName.textContent = state.profile.name;
  els.currentUserEmail.textContent = state.profile.email;
  els.currentUserRole.textContent = isAdmin() ? "Admin" : "Mitarbeiter";
  setLoginError("");
  applyRoleVisibility();
  renderABC();
  renderSales();
}

function subscribeToData() {
  setLoading(true);
  let tasksLoaded = false;
  let salesLoaded = false;
  const markLoaded = (type) => {
    if (type === "tasks") tasksLoaded = true;
    if (type === "sales") salesLoaded = true;
    if (tasksLoaded && salesLoaded) setLoading(false);
  };

  const taskPath = isAdmin() ? "tasks" : `tasks/${state.user.uid}`;
  const salesPath = isAdmin() ? "salesEntries" : `salesEntries/${state.user.uid}`;

  const unsubscribeTasks = onValue(
    ref(state.db, taskPath),
    (snapshot) => {
      state.tasks = normalizeSnapshot(snapshot, isAdmin(), state.user.uid);
      renderABC();
      markLoaded("tasks");
    },
    handleRealtimeError
  );

  const unsubscribeSales = onValue(
    ref(state.db, salesPath),
    (snapshot) => {
      state.salesEntries = normalizeSnapshot(snapshot, isAdmin(), state.user.uid);
      renderSales();
      markLoaded("sales");
    },
    handleRealtimeError
  );

  state.unsubscribers = [unsubscribeTasks, unsubscribeSales];
}

function clearSubscriptions() {
  state.unsubscribers.forEach((unsubscribe) => unsubscribe());
  state.unsubscribers = [];
}

function normalizeSnapshot(snapshot, nestedByUser, fallbackOwnerUid) {
  if (!snapshot.exists()) return [];
  const value = snapshot.val() || {};

  if (!nestedByUser) {
    return Object.entries(value)
      .filter(([, record]) => record && typeof record === "object")
      .map(([id, record]) => ({
        ...record,
        id: record.id || id,
        ownerUid: record.creatorUid || fallbackOwnerUid
      }));
  }

  return Object.entries(value).flatMap(([ownerUid, records]) => {
    if (!records || typeof records !== "object") return [];
    return Object.entries(records)
      .filter(([, record]) => record && typeof record === "object")
      .map(([id, record]) => ({
        ...record,
        id: record.id || id,
        ownerUid
      }));
  });
}

function switchPage(page) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.page === page);
  });
  document.querySelectorAll(".page").forEach((section) => {
    section.classList.toggle("is-active", section.id === `${page}Page`);
  });
}

function applyRoleVisibility() {
  document.querySelectorAll(".admin-only").forEach((element) => {
    element.classList.toggle("hidden", !isAdmin());
  });
}

function isAdmin() {
  return state.profile?.role === "admin" || state.profile?.email === ADMIN_EMAIL;
}

function setLoading(isLoading) {
  els.loadingState.classList.toggle("hidden", !isLoading);
}

function renderABC() {
  if (!els.abcKpis) return;
  renderTaskKpis();
  renderTaskTable();
}

function renderTaskKpis() {
  const tasks = state.tasks;
  const open = tasks.filter((task) => task.status === "open").length;
  const done = tasks.filter((task) => task.status === "done").length;
  const cards = [
    { label: isAdmin() ? "Aufgaben gesamt" : "eigene Aufgaben gesamt", value: tasks.length },
    { label: isAdmin() ? "offene Aufgaben gesamt" : "eigene offene Aufgaben", value: open },
    { label: isAdmin() ? "erledigte Aufgaben gesamt" : "eigene erledigte Aufgaben", value: done },
    { label: isAdmin() ? "Kategorie A gesamt" : "eigene Kategorie A", value: countTasksByCategory("A") },
    { label: isAdmin() ? "Kategorie B gesamt" : "eigene Kategorie B", value: countTasksByCategory("B") },
    { label: isAdmin() ? "Kategorie C gesamt" : "eigene Kategorie C", value: countTasksByCategory("C") }
  ];

  if (isAdmin()) {
    cards.push({
      label: "Aufgaben je Mitarbeiter",
      value: "",
      wide: true,
      detailHtml: renderTaskBreakdown()
    });
  }

  renderKpis(els.abcKpis, cards);
}

function countTasksByCategory(category) {
  return state.tasks.filter((task) => task.category === category).length;
}

function renderTaskBreakdown() {
  const lines = TEAM.map((member) => {
    const count = state.tasks.filter((task) => task.creatorEmail === member.email).length;
    return `<span><span>${escapeHtml(member.name)}</span><strong>${count}</strong></span>`;
  }).join("");
  return `<div class="employee-breakdown">${lines}</div>`;
}

function getFilteredTasks() {
  const query = els.taskSearch.value.trim().toLowerCase();
  const status = els.taskStatusFilter.value;
  const category = els.taskCategoryFilter.value;
  const employee = els.taskEmployeeFilter.value;

  return state.tasks
    .filter((task) => {
      const haystack = `${task.customerName || ""} ${task.title || ""} ${task.description || ""}`.toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (status !== "all" && task.status !== status) return false;
      if (category !== "all" && task.category !== category) return false;
      if (isAdmin() && employee !== "all" && task.creatorEmail !== employee) return false;
      return true;
    })
    .sort(sortTasks);
}

function sortTasks(a, b) {
  const statusRank = { open: 0, done: 1 };
  const categoryRank = { A: 0, B: 1, C: 2 };
  return (
    (statusRank[a.status] ?? 2) - (statusRank[b.status] ?? 2) ||
    (categoryRank[a.category] ?? 3) - (categoryRank[b.category] ?? 3) ||
    String(a.dueDate || "").localeCompare(String(b.dueDate || "")) ||
    Number(b.createdAt || 0) - Number(a.createdAt || 0)
  );
}

function renderTaskTable() {
  const tasks = getFilteredTasks();
  els.taskCount.textContent = `${tasks.length} ${tasks.length === 1 ? "Eintrag" : "Einträge"}`;

  if (!tasks.length) {
    els.taskList.innerHTML = `<div class="empty-state">Keine Einträge vorhanden</div>`;
    return;
  }

  els.taskList.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Kunde / Aufgabe</th>
          <th>Kategorie</th>
          <th>Aufwand</th>
          <th>Fälligkeit</th>
          <th>Status</th>
          <th>Ersteller</th>
          <th>Historie</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
        ${tasks.map(renderTaskRow).join("")}
      </tbody>
    </table>
  `;
}

function renderTaskRow(task) {
  const doneClass = task.status === "done" ? "is-done" : "";
  const ownerUid = task.ownerUid || task.creatorUid;
  const nextStatus = task.status === "done" ? "open" : "done";
  const toggleLabel = task.status === "done" ? "Wieder öffnen" : "Erledigt markieren";

  return `
    <tr class="${doneClass}">
      <td>
        <span class="primary-text">${escapeHtml(task.customerName || task.title || "-")}</span>
        <span class="secondary-text">${escapeHtml(task.description || "-")}</span>
      </td>
      <td>${categoryBadge(task.category)}</td>
      <td>${escapeHtml(task.estimatedDuration || "-")}</td>
      <td>${formatDate(task.dueDate)}</td>
      <td>${statusBadge(TASK_STATUS_LABELS[task.status] || task.status, STATUS_TONES[task.status] || "gray")}</td>
      <td>
        <span class="primary-text">${escapeHtml(task.creatorName || "-")}</span>
        <span class="meta-text">${escapeHtml(task.creatorEmail || "")}</span>
      </td>
      <td>
        <span class="meta-text">erstellt: ${formatTimestamp(task.createdAt)}</span>
        <span class="meta-text">geändert: ${formatTimestamp(task.updatedAt)}</span>
      </td>
      <td>
        <div class="actions">
          <button class="action-button" type="button" data-action="edit-task" data-id="${escapeAttribute(task.id)}" data-owner="${escapeAttribute(ownerUid)}">Bearbeiten</button>
          <button class="action-button success" type="button" data-action="toggle-task" data-id="${escapeAttribute(task.id)}" data-owner="${escapeAttribute(ownerUid)}" data-status="${nextStatus}">${toggleLabel}</button>
          <button class="action-button danger" type="button" data-action="delete-task" data-id="${escapeAttribute(task.id)}" data-owner="${escapeAttribute(ownerUid)}">Löschen</button>
        </div>
      </td>
    </tr>
  `;
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  setTaskMessage("");

  const values = {
    customerName: els.taskCustomer.value.trim(),
    description: els.taskDescription.value.trim(),
    category: els.taskCategory.value,
    estimatedDuration: els.taskDuration.value.trim(),
    dueDate: els.taskDueDate.value,
    status: els.taskStatus.value
  };

  if (!values.customerName || !values.description || !values.estimatedDuration || !values.dueDate) {
    setTaskMessage("Bitte alle Pflichtfelder ausfüllen.", true);
    return;
  }

  els.saveTaskButton.disabled = true;

  try {
    const editId = els.taskForm.dataset.editId;
    const ownerUid = els.taskForm.dataset.ownerUid || state.user.uid;
    const payload = {
      ...values,
      title: values.customerName,
      updatedAt: serverTimestamp(),
      updatedByUid: state.user.uid,
      updatedByName: state.profile.name
    };

    if (editId) {
      await update(ref(state.db, `tasks/${ownerUid}/${editId}`), payload);
    } else {
      const taskRef = push(ref(state.db, `tasks/${state.user.uid}`));
      await set(taskRef, {
        id: taskRef.key,
        ...payload,
        creatorUid: state.user.uid,
        creatorName: state.profile.name,
        creatorEmail: state.profile.email,
        createdAt: serverTimestamp()
      });
    }

    els.taskForm.reset();
    setTaskMessage("Aufgabe gespeichert.");
  } catch (error) {
    setTaskMessage(friendlyError(error), true);
  } finally {
    els.saveTaskButton.disabled = false;
  }
}

function editTask(id, ownerUid) {
  const task = findTask(id, ownerUid);
  if (!task) return;

  els.taskForm.dataset.editId = id;
  els.taskForm.dataset.ownerUid = ownerUid;
  els.taskFormTitle.textContent = "Aufgabe bearbeiten";
  els.saveTaskButton.textContent = "Änderungen speichern";
  els.cancelTaskEdit.classList.remove("hidden");
  els.taskCustomer.value = task.customerName || task.title || "";
  els.taskDescription.value = task.description || "";
  els.taskCategory.value = task.category || "A";
  els.taskDuration.value = task.estimatedDuration || "";
  els.taskDueDate.value = task.dueDate || "";
  els.taskStatus.value = task.status || "open";
  setTaskMessage("");
  els.taskForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function toggleTaskStatus(id, ownerUid, status) {
  await update(ref(state.db, `tasks/${ownerUid}/${id}`), {
    status,
    updatedAt: serverTimestamp(),
    updatedByUid: state.user.uid,
    updatedByName: state.profile.name
  });
}

async function deleteTask(id, ownerUid) {
  if (!window.confirm("Diese Aufgabe wirklich löschen?")) return;
  await remove(ref(state.db, `tasks/${ownerUid}/${id}`));
}

function findTask(id, ownerUid) {
  return state.tasks.find((task) => task.id === id && (task.ownerUid || task.creatorUid) === ownerUid);
}

function resetTaskEditState() {
  delete els.taskForm.dataset.editId;
  delete els.taskForm.dataset.ownerUid;
  els.taskFormTitle.textContent = "Aufgabe anlegen";
  els.saveTaskButton.textContent = "Aufgabe speichern";
  els.cancelTaskEdit.classList.add("hidden");
  setTaskMessage("");
}

function resetTaskFilters() {
  els.taskSearch.value = "";
  els.taskStatusFilter.value = "all";
  els.taskCategoryFilter.value = "all";
  els.taskEmployeeFilter.value = "all";
  renderABC();
}

function setTaskMessage(message, isError = false) {
  els.taskFormMessage.textContent = message;
  els.taskFormMessage.classList.toggle("error", isError);
}

function updateSalesTypeFields(preferredStatus) {
  const type = els.salesType.value;
  const isApplication = type === "application";
  els.appointmentFields.classList.toggle("hidden", isApplication);
  els.applicationFields.classList.toggle("hidden", !isApplication);
  els.appointmentType.disabled = isApplication;
  [els.monthlyPremium, els.yearlyPremium, els.expectedCommission, els.bonus, els.closingDate, els.policyDate].forEach(
    (input) => {
      input.disabled = !isApplication;
    }
  );

  const statusOptions = isApplication ? APPLICATION_STATUSES : APPOINTMENT_STATUSES;
  const selected = preferredStatus || els.salesStatus.value;
  els.salesStatus.innerHTML = statusOptions
    .map((status) => `<option value="${status.value}">${escapeHtml(status.label)}</option>`)
    .join("");
  els.salesStatus.value = statusOptions.some((status) => status.value === selected)
    ? selected
    : statusOptions[0].value;
  applyRoleVisibility();
}

function syncYearlyFromMonthly() {
  if (state.premiumSyncLock) return;
  state.premiumSyncLock = true;
  const monthly = parseMoney(els.monthlyPremium.value);
  els.yearlyPremium.value = monthly === null ? "" : formatInputNumber(monthly * 12);
  state.premiumSyncLock = false;
}

function syncMonthlyFromYearly() {
  if (state.premiumSyncLock) return;
  state.premiumSyncLock = true;
  const yearly = parseMoney(els.yearlyPremium.value);
  els.monthlyPremium.value = yearly === null ? "" : formatInputNumber(yearly / 12);
  state.premiumSyncLock = false;
}

async function handleSalesSubmit(event) {
  event.preventDefault();
  setSalesMessage("");

  const type = els.salesType.value;
  const values = {
    type,
    customerName: els.salesCustomer.value.trim(),
    productCategory: els.salesCategory.value,
    note: els.salesNote.value.trim(),
    date: els.salesDate.value,
    dueDate: els.salesDueDate.value,
    status: els.salesStatus.value
  };

  if (!values.customerName || !values.productCategory || !values.date || !values.dueDate || !values.status) {
    setSalesMessage("Bitte alle Pflichtfelder ausfüllen.", true);
    return;
  }

  const payload = {
    ...values,
    appointmentType: type === "appointment" ? els.appointmentType.value : null,
    monthlyPremium: type === "application" ? parseMoney(els.monthlyPremium.value) : null,
    yearlyPremium: type === "application" ? parseMoney(els.yearlyPremium.value) : null,
    expectedCommission: type === "application" ? parseMoney(els.expectedCommission.value) : null,
    closingDate: type === "application" ? els.closingDate.value || null : null,
    policyDate: type === "application" ? els.policyDate.value || null : null,
    updatedAt: serverTimestamp(),
    updatedByUid: state.user.uid,
    updatedByName: state.profile.name
  };

  if (isAdmin()) {
    payload.bonus = type === "application" ? parseMoney(els.bonus.value) ?? 0 : null;
  }

  els.saveSalesButton.disabled = true;

  try {
    const editId = els.salesForm.dataset.editId;
    const ownerUid = els.salesForm.dataset.ownerUid || state.user.uid;

    if (editId) {
      await update(ref(state.db, `salesEntries/${ownerUid}/${editId}`), payload);
    } else {
      const entryRef = push(ref(state.db, `salesEntries/${state.user.uid}`));
      await set(entryRef, {
        id: entryRef.key,
        ...payload,
        creatorUid: state.user.uid,
        creatorName: state.profile.name,
        creatorEmail: state.profile.email,
        createdAt: serverTimestamp()
      });
    }

    els.salesForm.reset();
    updateSalesTypeFields();
    setSalesMessage("Eintrag gespeichert.");
  } catch (error) {
    setSalesMessage(friendlyError(error), true);
  } finally {
    els.saveSalesButton.disabled = false;
  }
}

function renderSales() {
  if (!els.salesKpis) return;
  renderSalesKpis();
  renderEmployeeEvaluation();
  renderSalesTables();
}

function renderSalesKpis() {
  const entries = state.salesEntries;
  const appointments = entries.filter((entry) => entry.type === "appointment");
  const applications = entries.filter((entry) => entry.type === "application");
  const closedApplications = applications.filter((entry) => entry.status === "closed").length;
  const canceledApplications = applications.filter((entry) => isCanceledApplication(entry)).length;
  const yearlyTotal = sumBy(applications, "yearlyPremium");
  const commissionTotal = sumBy(applications, "expectedCommission");
  const bonusTotal = sumBy(applications, "bonus");

  const cards = [
    { label: isAdmin() ? "Termine gesamt" : "eigene Termine gesamt", value: appointments.length },
    {
      label: isAdmin() ? "erledigte Termine gesamt" : "eigene erledigte Termine",
      value: appointments.filter((entry) => entry.status === "done").length
    },
    {
      label: isAdmin() ? "stornierte Termine gesamt" : "eigene stornierte Termine",
      value: appointments.filter((entry) => entry.status === "canceled").length
    },
    { label: isAdmin() ? "Anträge gesamt" : "eigene Anträge gesamt", value: applications.length },
    {
      label: isAdmin() ? "abgeschlossene Anträge gesamt" : "eigene abgeschlossene Anträge",
      value: closedApplications
    },
    {
      label: isAdmin() ? "stornierte Anträge gesamt" : "eigene stornierte Anträge",
      value: canceledApplications
    },
    {
      label: isAdmin() ? "Jahresbeitrag gesamt" : "eigener Jahresbeitrag gesamt",
      value: formatCurrency(yearlyTotal)
    },
    {
      label: isAdmin() ? "erwartete Provision gesamt" : "eigene erwartete Provision gesamt",
      value: formatCurrency(commissionTotal)
    },
    {
      label: isAdmin() ? "Bonuszahlungen gesamt" : "eigener Bonus gesamt",
      value: formatCurrency(bonusTotal)
    }
  ];

  if (isAdmin()) {
    cards.push(
      {
        label: "bester Mitarbeiter Jahresbeitrag",
        value: bestEmployeeBy("yearlyPremium").name,
        detail: formatCurrency(bestEmployeeBy("yearlyPremium").value)
      },
      {
        label: "bester Mitarbeiter Provision",
        value: bestEmployeeBy("expectedCommission").name,
        detail: formatCurrency(bestEmployeeBy("expectedCommission").value)
      }
    );
  }

  renderKpis(els.salesKpis, cards);
}

function renderEmployeeEvaluation() {
  if (!isAdmin()) {
    els.employeeEvaluation.innerHTML = "";
    return;
  }

  const rows = TEAM.map((member) => {
    const entries = state.salesEntries.filter((entry) => entry.creatorEmail === member.email);
    const appointments = entries.filter((entry) => entry.type === "appointment");
    const applications = entries.filter((entry) => entry.type === "application");
    return {
      member,
      appointmentsTotal: appointments.length,
      appointmentsDone: appointments.filter((entry) => entry.status === "done").length,
      appointmentsCanceled: appointments.filter((entry) => entry.status === "canceled").length,
      applicationsTotal: applications.length,
      applicationsClosed: applications.filter((entry) => entry.status === "closed").length,
      applicationsCanceled: applications.filter((entry) => isCanceledApplication(entry)).length,
      yearlyPremium: sumBy(applications, "yearlyPremium"),
      expectedCommission: sumBy(applications, "expectedCommission"),
      bonus: sumBy(applications, "bonus")
    };
  });

  els.employeeEvaluation.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Mitarbeiter</th>
          <th>Termine gesamt</th>
          <th>erledigte Termine</th>
          <th>stornierte Termine</th>
          <th>Anträge gesamt</th>
          <th>abgeschlossene Anträge</th>
          <th>stornierte Anträge</th>
          <th>Jahresbeitrag gesamt</th>
          <th>erwartete Provision gesamt</th>
          <th>Bonus gesamt</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(renderEmployeeEvaluationRow).join("")}
      </tbody>
    </table>
  `;
}

function renderEmployeeEvaluationRow(row) {
  return `
    <tr>
      <td>
        <span class="primary-text">${escapeHtml(row.member.name)}</span>
        <span class="meta-text">${escapeHtml(row.member.email)}</span>
      </td>
      <td>${row.appointmentsTotal}</td>
      <td>${row.appointmentsDone}</td>
      <td>${row.appointmentsCanceled}</td>
      <td>${row.applicationsTotal}</td>
      <td>${row.applicationsClosed}</td>
      <td>${row.applicationsCanceled}</td>
      <td>${formatCurrency(row.yearlyPremium)}</td>
      <td>${formatCurrency(row.expectedCommission)}</td>
      <td>${formatCurrency(row.bonus)}</td>
    </tr>
  `;
}

function renderSalesTables() {
  const entries = getFilteredSalesEntries().sort(sortSalesEntries);
  const appointments = entries.filter((entry) => entry.type === "appointment");
  const applications = entries.filter((entry) => entry.type === "application");

  els.appointmentsCount.textContent = `${appointments.length} ${appointments.length === 1 ? "Eintrag" : "Einträge"}`;
  els.applicationsCount.textContent = `${applications.length} ${applications.length === 1 ? "Eintrag" : "Einträge"}`;
  renderAppointmentsTable(appointments);
  renderApplicationsTable(applications);
}

function getFilteredSalesEntries() {
  const query = els.salesSearch.value.trim().toLowerCase();
  const employee = els.salesEmployeeFilter.value;
  const category = els.salesCategoryFilter.value;
  const type = els.salesTypeFilter.value;
  const status = els.salesStatusFilter.value;
  const dateFrom = els.salesDateFrom.value;
  const dateTo = els.salesDateTo.value;
  const dueDate = els.salesDueDateFilter.value;

  return state.salesEntries.filter((entry) => {
    const haystack = `${entry.customerName || ""} ${entry.note || ""}`.toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (isAdmin() && employee !== "all" && entry.creatorEmail !== employee) return false;
    if (category !== "all" && entry.productCategory !== category) return false;
    if (type !== "all" && entry.type !== type) return false;
    if (status !== "all" && entry.status !== status) return false;
    if (dateFrom && String(entry.date || "") < dateFrom) return false;
    if (dateTo && String(entry.date || "") > dateTo) return false;
    if (dueDate && entry.dueDate !== dueDate) return false;
    return true;
  });
}

function sortSalesEntries(a, b) {
  return (
    String(b.date || "").localeCompare(String(a.date || "")) ||
    Number(b.createdAt || 0) - Number(a.createdAt || 0)
  );
}

function renderAppointmentsTable(appointments) {
  if (!appointments.length) {
    els.appointmentsTable.innerHTML = `<div class="empty-state">Keine Einträge vorhanden</div>`;
    return;
  }

  els.appointmentsTable.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Kunde</th>
          <th>Sparte</th>
          <th>Terminart</th>
          <th>Datum</th>
          <th>Fällig bis</th>
          <th>Status</th>
          <th>Notiz</th>
          <th>erstellt von</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
        ${appointments.map(renderAppointmentRow).join("")}
      </tbody>
    </table>
  `;
}

function renderAppointmentRow(entry) {
  const ownerUid = entry.ownerUid || entry.creatorUid;
  return `
    <tr class="${entry.status === "done" ? "is-done" : ""}">
      <td><span class="primary-text">${escapeHtml(entry.customerName || "-")}</span></td>
      <td>${escapeHtml(entry.productCategory || "-")}</td>
      <td>${escapeHtml(entry.appointmentType || "-")}</td>
      <td>${formatDate(entry.date)}</td>
      <td>${formatDate(entry.dueDate)}</td>
      <td>${salesStatusBadge(entry.status)}</td>
      <td><span class="secondary-text">${escapeHtml(entry.note || "-")}</span></td>
      <td>
        <span class="primary-text">${escapeHtml(entry.creatorName || "-")}</span>
        <span class="meta-text">${escapeHtml(entry.creatorEmail || "")}</span>
        <span class="meta-text">geändert: ${formatTimestamp(entry.updatedAt)}</span>
      </td>
      <td>${salesActions(entry, ownerUid, "appointment")}</td>
    </tr>
  `;
}

function renderApplicationsTable(applications) {
  if (!applications.length) {
    els.applicationsTable.innerHTML = `<div class="empty-state">Keine Einträge vorhanden</div>`;
    return;
  }

  els.applicationsTable.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Kunde</th>
          <th>Sparte</th>
          <th>monatlicher Beitrag</th>
          <th>jährlicher Beitrag</th>
          <th>erwartete Provision</th>
          <th>Bonus</th>
          <th>Status</th>
          <th>Datum</th>
          <th>Fällig bis</th>
          <th>erstellt von</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
        ${applications.map(renderApplicationRow).join("")}
      </tbody>
    </table>
  `;
}

function renderApplicationRow(entry) {
  const ownerUid = entry.ownerUid || entry.creatorUid;
  return `
    <tr class="${entry.status === "closed" ? "is-done" : ""}">
      <td>
        <span class="primary-text">${escapeHtml(entry.customerName || "-")}</span>
        <span class="secondary-text">${escapeHtml(entry.note || "-")}</span>
      </td>
      <td>${escapeHtml(entry.productCategory || "-")}</td>
      <td>${formatCurrency(entry.monthlyPremium)}</td>
      <td>${formatCurrency(entry.yearlyPremium)}</td>
      <td>${formatCurrency(entry.expectedCommission)}</td>
      <td>${formatCurrency(entry.bonus)}</td>
      <td>${salesStatusBadge(entry.status)}</td>
      <td>${formatDate(entry.date)}</td>
      <td>${formatDate(entry.dueDate)}</td>
      <td>
        <span class="primary-text">${escapeHtml(entry.creatorName || "-")}</span>
        <span class="meta-text">${escapeHtml(entry.creatorEmail || "")}</span>
        <span class="meta-text">geändert: ${formatTimestamp(entry.updatedAt)}</span>
      </td>
      <td>${salesActions(entry, ownerUid, "application")}</td>
    </tr>
  `;
}

function salesActions(entry, ownerUid, type) {
  const doneLabel = type === "appointment" ? "Erledigt markieren" : "Policiert markieren";
  const doneStatus = type === "appointment" ? "done" : "closed";

  return `
    <div class="actions">
      <button class="action-button success" type="button" data-action="set-sales-status" data-id="${escapeAttribute(entry.id)}" data-owner="${escapeAttribute(ownerUid)}" data-status="${doneStatus}">${doneLabel}</button>
      <button class="action-button danger" type="button" data-action="set-sales-status" data-id="${escapeAttribute(entry.id)}" data-owner="${escapeAttribute(ownerUid)}" data-status="canceled">Storno markieren</button>
      <button class="action-button" type="button" data-action="edit-sales" data-id="${escapeAttribute(entry.id)}" data-owner="${escapeAttribute(ownerUid)}">Bearbeiten</button>
      <button class="action-button danger" type="button" data-action="delete-sales" data-id="${escapeAttribute(entry.id)}" data-owner="${escapeAttribute(ownerUid)}">Löschen</button>
    </div>
  `;
}

function editSalesEntry(id, ownerUid) {
  const entry = findSalesEntry(id, ownerUid);
  if (!entry) return;

  els.salesForm.dataset.editId = id;
  els.salesForm.dataset.ownerUid = ownerUid;
  els.salesFormTitle.textContent = "Termin / Antrag bearbeiten";
  els.saveSalesButton.textContent = "Änderungen speichern";
  els.cancelSalesEdit.classList.remove("hidden");
  els.salesType.value = entry.type || "appointment";
  updateSalesTypeFields(entry.status);
  els.salesCustomer.value = entry.customerName || "";
  els.salesCategory.value = entry.productCategory || "Kfz";
  els.salesDate.value = entry.date || "";
  els.salesDueDate.value = entry.dueDate || "";
  els.salesNote.value = entry.note || "";
  els.appointmentType.value = entry.appointmentType || "Beratungstermin";
  els.monthlyPremium.value = valueForInput(entry.monthlyPremium);
  els.yearlyPremium.value = valueForInput(entry.yearlyPremium);
  els.expectedCommission.value = valueForInput(entry.expectedCommission);
  els.bonus.value = isAdmin() ? valueForInput(entry.bonus) : "";
  els.closingDate.value = entry.closingDate || "";
  els.policyDate.value = entry.policyDate || "";
  setSalesMessage("");
  els.salesForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function setSalesStatus(id, ownerUid, status) {
  await update(ref(state.db, `salesEntries/${ownerUid}/${id}`), {
    status,
    updatedAt: serverTimestamp(),
    updatedByUid: state.user.uid,
    updatedByName: state.profile.name
  });
}

async function deleteSalesEntry(id, ownerUid) {
  if (!window.confirm("Diesen Eintrag wirklich löschen?")) return;
  await remove(ref(state.db, `salesEntries/${ownerUid}/${id}`));
}

function findSalesEntry(id, ownerUid) {
  return state.salesEntries.find((entry) => entry.id === id && (entry.ownerUid || entry.creatorUid) === ownerUid);
}

function resetSalesEditState() {
  delete els.salesForm.dataset.editId;
  delete els.salesForm.dataset.ownerUid;
  els.salesFormTitle.textContent = "Termin / Antrag anlegen";
  els.saveSalesButton.textContent = "Eintrag speichern";
  els.cancelSalesEdit.classList.add("hidden");
  setSalesMessage("");
  window.setTimeout(() => updateSalesTypeFields(), 0);
}

function resetSalesFilters() {
  els.salesSearch.value = "";
  els.salesEmployeeFilter.value = "all";
  els.salesCategoryFilter.value = "all";
  els.salesTypeFilter.value = "all";
  els.salesStatusFilter.value = "all";
  els.salesDateFrom.value = "";
  els.salesDateTo.value = "";
  els.salesDueDateFilter.value = "";
  renderSales();
}

function setSalesMessage(message, isError = false) {
  els.salesFormMessage.textContent = message;
  els.salesFormMessage.classList.toggle("error", isError);
}

async function handleActionClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id, owner, status } = button.dataset;
  button.disabled = true;

  try {
    if (action === "edit-task") editTask(id, owner);
    if (action === "toggle-task") await toggleTaskStatus(id, owner, status);
    if (action === "delete-task") await deleteTask(id, owner);
    if (action === "edit-sales") editSalesEntry(id, owner);
    if (action === "set-sales-status") await setSalesStatus(id, owner, status);
    if (action === "delete-sales") await deleteSalesEntry(id, owner);
  } catch (error) {
    showBanner(friendlyError(error));
  } finally {
    button.disabled = false;
  }
}

function renderKpis(container, cards) {
  container.innerHTML = cards
    .map((card) => {
      const detail = card.detailHtml
        ? card.detailHtml
        : card.detail
          ? `<small>${escapeHtml(card.detail)}</small>`
          : "";
      return `
        <article class="kpi-card ${card.wide ? "wide" : ""}">
          <span>${escapeHtml(card.label)}</span>
          ${card.value === "" ? "" : `<strong>${escapeHtml(card.value)}</strong>`}
          ${detail}
        </article>
      `;
    })
    .join("");
}

function categoryBadge(category) {
  const normalized = category || "C";
  return `<span class="badge category-${normalized.toLowerCase()}">${escapeHtml(CATEGORY_LABELS[normalized] || normalized)}</span>`;
}

function statusBadge(label, tone) {
  return `<span class="badge status-${tone}">${escapeHtml(label)}</span>`;
}

function salesStatusBadge(status) {
  return statusBadge(salesStatusLabel(status), STATUS_TONES[status] || "gray");
}

function salesStatusLabel(status) {
  return [...APPOINTMENT_STATUSES, ...APPLICATION_STATUSES].find((item) => item.value === status)?.label || status || "-";
}

function isCanceledApplication(entry) {
  return entry.status === "canceled" || entry.status === "rejected";
}

function bestEmployeeBy(metric) {
  const totals = TEAM.map((member) => {
    const value = state.salesEntries
      .filter((entry) => entry.type === "application" && entry.creatorEmail === member.email)
      .reduce((sum, entry) => sum + toNumber(entry[metric]), 0);
    return { name: member.name, value };
  }).sort((a, b) => b.value - a.value);

  return totals[0]?.value > 0 ? totals[0] : { name: "-", value: 0 };
}

function sumBy(entries, key) {
  return entries.reduce((sum, entry) => sum + toNumber(entry[key]), 0);
}

function toNumber(value) {
  const number = typeof value === "number" ? value : Number(String(value || "").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function parseMoney(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(String(value).replace(",", "."));
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number * 100) / 100;
}

function formatInputNumber(value) {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 100) / 100);
}

function valueForInput(value) {
  return value === null || value === undefined || value === "" ? "" : String(value);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(toNumber(value));
}

function formatDate(value) {
  if (!value) return "-";
  const parts = String(value).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return "-";
  return new Intl.DateTimeFormat("de-DE").format(new Date(parts[0], parts[1] - 1, parts[2]));
}

function formatTimestamp(value) {
  if (!value || typeof value === "object") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function uniqueByValue(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.value)) return false;
    seen.add(item.value);
    return true;
  });
}

function escapeHtml(value) {
  const replacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  };
  return String(value ?? "").replace(/[&<>"']/g, (char) => replacements[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function showBanner(message) {
  els.configBanner.textContent = message;
  els.configBanner.classList.remove("hidden");
}

function setLoginError(message) {
  els.loginError.textContent = message;
}

function friendlyAuthError(error) {
  const code = error?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "E-Mail oder Passwort ist nicht korrekt.";
  }
  if (code.includes("too-many-requests")) {
    return "Zu viele Login-Versuche. Bitte spaeter erneut versuchen.";
  }
  if (code.includes("network-request-failed")) {
    return "Netzwerkfehler. Bitte Verbindung pruefen.";
  }
  return friendlyError(error);
}

function friendlyError(error) {
  const code = error?.code || "";
  if (code.includes("permission-denied")) {
    return "Keine Berechtigung fuer diese Aktion. Bitte Rolle und Datenbankregeln pruefen.";
  }
  return error?.message || "Es ist ein unerwarteter Fehler aufgetreten.";
}

function handleRealtimeError(error) {
  setLoading(false);
  showBanner(friendlyError(error));
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || window.location.protocol === "file:") {
    return;
  }

  navigator.serviceWorker.register("./service-worker.js").catch(() => {
    // PWA-Fallback: Die App funktioniert auch ohne Service Worker weiter.
  });
}

// Datenschutz: Freitextfelder sind fuer notwendige Kunden- und Vorgangsinformationen gedacht.
// Es sollten keine sensiblen Gesundheitsdaten oder Passwoerter gespeichert werden.
