const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");

const blockAll = document.getElementById("block-all");
const blockSolved = document.getElementById("block-solved");
const allContainer = document.getElementById("all");
const solvedContainer = document.getElementById("solved");

let TASKS = [];

loginBtn.onclick = async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    alert("Введите логин и пароль");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Загрузка...";

  try {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    TASKS = data.tasks;
    showAll();

  } catch (err) {
    alert(err.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Показать задания";
  }
};

function showAll() {
  blockSolved.classList.remove("active");
  blockAll.classList.add("active");
  render(allContainer, TASKS);
}

function showSolved() {
  blockAll.classList.remove("active");
  blockSolved.classList.add("active");
  render(solvedContainer, TASKS.filter(t => t.solved));
}

function render(container, list) {
  container.innerHTML = "";

  if (!list.length) {
    container.innerHTML = "<div>Нет заданий</div>";
    return;
  }

  list.forEach(t => {
    const a = document.createElement("a");
    a.href = t.url;
    a.target = "_blank";
    a.className = "task" + (t.solved ? " solved" : "");
    a.textContent = t.title;
    container.appendChild(a);
  });
}

window.showAll = showAll;
window.showSolved = showSolved;