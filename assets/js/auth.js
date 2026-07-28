// STUDYTRACK — AUTHENTICATION


// ---------- Element references ----------
const authView = document.getElementById("authView");
const appView = document.getElementById("appView");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const showSignupBtn = document.getElementById("showSignup");
const showLoginBtn = document.getElementById("showLogin");

const logoutButton = document.getElementById("logoutButton");

const authMessage = document.getElementById("authMessage");

// ---------- View helpers ----------

// Show the dashboard, hide the auth screen
function showApp() {
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
}

// Show the auth screen, hide the dashboard
function showAuth() {
  appView.classList.add("hidden");
  authView.classList.remove("hidden");
}

// Display a message in a given message area element
function showMessage(text, type, targetEl = authMessage) {
  targetEl.textContent = text;
  targetEl.className = "message-area " + type; // "success" | "error" | "loading"
}

function clearMessage(targetEl = authMessage) {
  targetEl.textContent = "";
  targetEl.className = "message-area";
}

// ---------- Toggle between login / signup forms ----------
showSignupBtn.addEventListener("click", () => {
  loginForm.classList.add("hidden");
  signupForm.classList.remove("hidden");
  clearMessage();
});

showLoginBtn.addEventListener("click", () => {
  signupForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  clearMessage();
});

// ---------- Sign up ----------
async function signUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) {
    showMessage(error.message, "error");
    return;
  }

  showMessage("Account created. Check your email if confirmation is enabled.", "success");
}

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;

  const submitBtn = signupForm.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  showMessage("Creating account...", "loading");

  await signUp(email, password);

  submitBtn.disabled = false;
});

// ---------- Log in ----------
async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    showMessage(error.message, "error");
    return;
  }

  showApp();
  await loadTasks();
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const submitBtn = loginForm.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  showMessage("Signing in...", "loading");

  await signIn(email, password);

  submitBtn.disabled = false;
});

// ---------- Log out ----------
async function signOut() {
  await supabaseClient.auth.signOut();
  showAuth();
}

logoutButton.addEventListener("click", signOut);

// ---------- Restore session on page load ----------
async function restoreSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session) {
    showApp();
    await loadTasks();
  } else {
    showAuth();
  }
}

// Run once the DOM is ready
document.addEventListener("DOMContentLoaded", restoreSession);