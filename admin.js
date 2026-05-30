import {
  AuthError,
  getUser,
  handleAuthCallback,
  login,
  logout,
  signup,
} from "https://esm.sh/@netlify/identity@1.2.0";

const authPanel = document.getElementById("authPanel");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const authStatus = document.getElementById("authStatus");
const editorStatus = document.getElementById("editorStatus");
const logoutButton = document.getElementById("logoutButton");
const profileForm = document.getElementById("profileForm");
const articleList = document.getElementById("articleList");
const articleForm = document.getElementById("articleForm");
const articleFormTitle = document.getElementById("articleFormTitle");
const newArticleButton = document.getElementById("newArticleButton");
const deleteArticleButton = document.getElementById("deleteArticleButton");

let articles = [];
let currentImageUrl = "";

const setStatus = (target, message, isError = false) => {
  target.textContent = message;
  target.style.color = isError ? "#a43535" : "#1b6f88";
};

async function readFileAsDataUrl(file) {
  if (!file) return "";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function fillProfile(settings) {
  if (!settings) return;
  for (const [key, value] of Object.entries(settings)) {
    if (profileForm.elements[key]) profileForm.elements[key].value = value || "";
  }
  currentImageUrl = settings.profileImageUrl || "";
}

function renderArticles() {
  articleList.innerHTML = articles.length
    ? articles.map((article) => `
      <button type="button" class="article-card" data-id="${article.id}">
        <strong>${article.title}</strong>
        <span>${article.status} · ${article.excerpt || "No excerpt yet"}</span>
      </button>
    `).join("")
    : "<p>No articles yet.</p>";

  articleList.querySelectorAll("button[data-id]").forEach((button) => {
    button.addEventListener("click", () => editArticle(Number(button.dataset.id)));
  });
}

function editArticle(id) {
  const article = articles.find((item) => item.id === id);
  if (!article) return;
  articleFormTitle.textContent = "Edit Article";
  articleForm.elements.id.value = article.id;
  articleForm.elements.title.value = article.title || "";
  articleForm.elements.excerpt.value = article.excerpt || "";
  articleForm.elements.body.value = article.body || "";
  articleForm.elements.status.value = article.status || "published";
  articleForm.dataset.imageUrl = article.imageUrl || "";
  deleteArticleButton.classList.remove("hidden");
}

function resetArticleForm() {
  articleForm.reset();
  articleForm.elements.id.value = "";
  articleForm.dataset.imageUrl = "";
  articleFormTitle.textContent = "New Article";
  deleteArticleButton.classList.add("hidden");
}

async function loadAdmin() {
  try {
    const data = await api("/api/admin/content");
    articles = data.articles || [];
    fillProfile(data.settings);
    renderArticles();
    authPanel.classList.add("hidden");
    dashboard.classList.remove("hidden");
    resetArticleForm();
  } catch (error) {
    authPanel.classList.remove("hidden");
    dashboard.classList.add("hidden");
    setStatus(authStatus, error.message, true);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(authStatus, "Signing in...");
  const form = new FormData(loginForm);
  try {
    await login(form.get("email"), form.get("password"));
    await loadAdmin();
  } catch (error) {
    setStatus(authStatus, error instanceof AuthError ? error.message : "Sign in failed.", true);
  }
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(authStatus, "Creating account...");
  const form = new FormData(signupForm);
  try {
    const user = await signup(form.get("email"), form.get("password"), { full_name: form.get("name") });
    setStatus(authStatus, user.emailVerified ? "Account created. Ask the site owner to add the admin role." : "Check email to confirm the account, then ask the site owner to add the admin role.");
    signupForm.reset();
  } catch (error) {
    setStatus(authStatus, error instanceof AuthError ? error.message : "Signup failed.", true);
  }
});

logoutButton.addEventListener("click", async () => {
  await logout();
  dashboard.classList.add("hidden");
  authPanel.classList.remove("hidden");
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(editorStatus, "Saving profile...");
  const form = new FormData(profileForm);
  try {
    const profileImageDataUrl = await readFileAsDataUrl(profileForm.elements.profileImage.files[0]);
    const data = Object.fromEntries(form.entries());
    delete data.profileImage;
    data.profileImageUrl = currentImageUrl;
    if (profileImageDataUrl) data.profileImageDataUrl = profileImageDataUrl;
    const response = await api("/api/content", { method: "PUT", body: JSON.stringify(data) });
    fillProfile(response.settings);
    profileForm.elements.profileImage.value = "";
    setStatus(editorStatus, "Profile saved.");
  } catch (error) {
    setStatus(editorStatus, error.message, true);
  }
});

articleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(editorStatus, "Saving article...");
  const form = new FormData(articleForm);
  try {
    const imageDataUrl = await readFileAsDataUrl(articleForm.elements.image.files[0]);
    const data = Object.fromEntries(form.entries());
    delete data.image;
    data.imageUrl = articleForm.dataset.imageUrl || "";
    if (imageDataUrl) data.imageDataUrl = imageDataUrl;
    await api("/api/content", { method: "POST", body: JSON.stringify(data) });
    const refreshed = await api("/api/admin/content");
    articles = refreshed.articles || [];
    renderArticles();
    resetArticleForm();
    setStatus(editorStatus, "Article saved.");
  } catch (error) {
    setStatus(editorStatus, error.message, true);
  }
});

deleteArticleButton.addEventListener("click", async () => {
  const id = articleForm.elements.id.value;
  if (!id || !confirm("Delete this article?")) return;
  try {
    await api("/api/content", { method: "DELETE", body: JSON.stringify({ id }) });
    articles = articles.filter((article) => String(article.id) !== String(id));
    renderArticles();
    resetArticleForm();
    setStatus(editorStatus, "Article deleted.");
  } catch (error) {
    setStatus(editorStatus, error.message, true);
  }
});

newArticleButton.addEventListener("click", resetArticleForm);

await handleAuthCallback().catch(() => null);
if (await getUser()) {
  await loadAdmin();
}
