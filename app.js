const state = {
  token: localStorage.getItem("yap_token") || null,
  user: JSON.parse(localStorage.getItem("yap_user") || "null"),
  colleges: {},
  plans: [],
  pendingEmail: null,
  openRequests: {},
};

// ---------- helpers ----------
function $(id) { return document.getElementById(id); }

function showToast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add("hidden"), 3000);
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $("screen-" + name).classList.add("active");
}

async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && state.token) headers.Authorization = "Bearer " + state.token;
  const res = await fetch("/api" + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("yap_token", token);
  localStorage.setItem("yap_user", JSON.stringify(user));
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("yap_token");
  localStorage.removeItem("yap_user");
}

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
function isPast(date, time) {
  return new Date(`${date}T${time || "23:59"}`).getTime() < Date.now();
}

// ---------- landing ----------
function renderLanding() {
  const wrap = $("landing-buttons");
  wrap.innerHTML = "";
  if (state.token && state.user) {
    const cont = document.createElement("button");
    cont.className = "btn-primary";
    cont.textContent = `Continue as ${state.user.name.split(" ")[0]} →`;
    cont.onclick = enterFeed;
    const fresh = document.createElement("button");
    fresh.className = "btn-ghost";
    fresh.textContent = "Not you? Switch account";
    fresh.onclick = () => { clearSession(); showScreen("login"); };
    wrap.append(cont, fresh);
  } else {
    const su = document.createElement("button");
    su.className = "btn-primary";
    su.textContent = "Get on the list →";
    su.onclick = () => showScreen("signup");
    const li = document.createElement("button");
    li.className = "btn-ghost";
    li.textContent = "I already have a pass";
    li.onclick = () => showScreen("login");
    wrap.append(su, li);
  }
}

async function enterFeed() {
  showScreen("feed");
  $("feed-whoami").textContent = `Signed in as ${state.user.name} · ${state.user.college} · ${state.user.city}`;
  try {
    await loadPlans();
  } catch (e) {
    showToast(e.message);
    clearSession();
    showScreen("login");
  }
}

// ---------- colleges dropdown ----------
async function loadColleges() {
  state.colleges = await api("/auth/colleges");
  const citySelect = $("su-city");
  citySelect.innerHTML = '<option value="">Select your city</option>';
  Object.keys(state.colleges).forEach((city) => {
    const opt = document.createElement("option");
    opt.value = city;
    opt.textContent = city;
    citySelect.appendChild(opt);
  });
}

function onCityChange() {
  const city = $("su-city").value;
  const collegeSelect = $("su-college");
  collegeSelect.innerHTML = "";
  if (!city) {
    collegeSelect.innerHTML = '<option value="">Select a city first</option>';
    return;
  }
  collegeSelect.innerHTML = '<option value="">Select your college</option>';
  (state.colleges[city] || []).forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = `${c.name} (@${c.domain})`;
    collegeSelect.appendChild(opt);
  });
}

// ---------- signup / verify / login ----------
async function handleSignup(e) {
  e.preventDefault();
  const errEl = $("su-error");
  errEl.textContent = "";

  const payload = {
    name: $("su-name").value.trim(),
    city: $("su-city").value,
    college: $("su-college").value,
    age: $("su-age").value,
    email: $("su-email").value.trim(),
    password: $("su-password").value,
  };
  const confirm = $("su-confirm").value;

  if (!payload.name || !payload.city || !payload.college || !payload.age || !payload.email || !payload.password) {
    errEl.textContent = "Please fill in every field.";
    return;
  }
  if (payload.password !== confirm) {
    errEl.textContent = "Passwords don't match.";
    return;
  }

  try {
    await api("/auth/signup", { method: "POST", body: payload });
    state.pendingEmail = payload.email;
    $("verify-subtitle").textContent = `We sent a 6-digit code to ${payload.email}`;
    showScreen("verify");
  } catch (err) {
    errEl.textContent = err.message;
  }
}

async function handleVerify(e) {
  e.preventDefault();
  const errEl = $("vf-error");
  errEl.textContent = "";
  const code = $("vf-code").value.trim();
  try {
    const data = await api("/auth/verify", { method: "POST", body: { email: state.pendingEmail, code } });
    setSession(data.token, data.user);
    showToast(`You're on the list, ${data.user.name.split(" ")[0]}.`);
    enterFeed();
  } catch (err) {
    errEl.textContent = err.message;
  }
}

async function handleResend() {
  // Re-runs signup with the same details isn't available client-side without
  // storing the password again, so we just ask the user to start over if needed.
  showToast("If the code expired, go back and sign up again to get a fresh one.");
}

async function handleLogin(e) {
  e.preventDefault();
  const errEl = $("li-error");
  errEl.textContent = "";
  const email = $("li-email").value.trim();
  const password = $("li-password").value;
  try {
    const data = await api("/auth/login", { method: "POST", body: { email, password } });
    setSession(data.token, data.user);
    enterFeed();
  } catch (err) {
    errEl.textContent = err.message;
  }
}

function handleLogout() {
  clearSession();
  showScreen("landing");
  renderLanding();
}

// ---------- plans / feed ----------
async function loadPlans() {
  const collegeOnly = $("chk-college-only").checked;
  state.plans = await api(`/plans?collegeOnly=${collegeOnly}`, { auth: true });
  renderPlans();
}

function renderPlans() {
  const list = $("plans-list");
  list.innerHTML = "";

  if (state.plans.length === 0) {
    list.innerHTML = `
      <div class="card empty-state">
        <div class="display">No plans yet on this board</div>
        <div class="muted small" style="margin-bottom:16px;">Be the first to drop a ticket for tonight.</div>
        <button class="btn-primary slim" style="margin:0 auto;" onclick="document.getElementById('btn-newplan').click()">+ Start a plan</button>
      </div>`;
    return;
  }

  state.plans.forEach((plan) => list.appendChild(renderTicket(plan)));
}

function renderTicket(plan) {
  const isOwner = plan.authorId === state.user.id;
  const myRequest = plan.requests.find((r) => r.requesterId === state.user.id);
  const acceptedCount = plan.requests.filter((r) => r.status === "accepted").length;
  const pendingCount = plan.requests.filter((r) => r.status === "pending").length;
  const full = acceptedCount >= plan.spotsNeeded;
  const past = isPast(plan.date, plan.time);
  const expanded = !!state.openRequests[plan.id];

  const el = document.createElement("div");
  el.className = "ticket";

  const main = document.createElement("div");
  main.className = "ticket-main";
  main.innerHTML = `
    <div class="ticket-status">
      <span>${past ? "past" : "open"}</span>
      ${isOwner ? '<span class="badge-host">your plan</span>' : ""}
    </div>
    <div class="ticket-place">📍 ${escapeHtml(plan.place)}</div>
    <div class="ticket-meta">
      <span>📅 ${fmtDate(plan.date)}</span>
      <span>🕒 ${fmtTime(plan.time)}</span>
      <span>👥 ${acceptedCount}/${plan.spotsNeeded} joining</span>
    </div>
    ${plan.note ? `<div class="ticket-note">"${escapeHtml(plan.note)}"</div>` : ""}
    <div class="ticket-host">Hosted by ${escapeHtml(plan.authorName)} · ${escapeHtml(plan.college)}</div>
  `;

  if (isOwner) {
    const toggle = document.createElement("button");
    toggle.className = "link-btn";
    toggle.innerHTML = `${expanded ? "Hide" : "View"} requests ${pendingCount > 0 ? `<span class="badge-count">${pendingCount}</span>` : ""}`;
    toggle.onclick = () => {
      state.openRequests[plan.id] = !state.openRequests[plan.id];
      renderPlans();
    };
    main.appendChild(toggle);

    if (expanded) {
      if (plan.requests.length === 0) {
        const empty = document.createElement("div");
        empty.className = "small muted";
        empty.style.marginTop = "8px";
        empty.textContent = "No requests yet.";
        main.appendChild(empty);
      }
      plan.requests.forEach((r) => {
        const row = document.createElement("div");
        row.className = "request-row";
        const left = document.createElement("div");
        left.innerHTML = `<div>${escapeHtml(r.requesterName)}</div><div class="small muted">${escapeHtml(r.requesterCollege)}</div>`;
        row.appendChild(left);

        if (r.status === "pending") {
          const actions = document.createElement("div");
          actions.style.display = "flex";
          actions.style.gap = "6px";
          const accept = document.createElement("button");
          accept.className = "icon-btn-sm accept";
          accept.textContent = "✓";
          accept.onclick = () => respondRequest(plan.id, r.id, "accepted");
          const decline = document.createElement("button");
          decline.className = "icon-btn-sm decline";
          decline.textContent = "✕";
          decline.onclick = () => respondRequest(plan.id, r.id, "declined");
          actions.append(accept, decline);
          row.appendChild(actions);
        } else {
          const chip = document.createElement("span");
          chip.className = `status-chip ${r.status}`;
          chip.textContent = r.status;
          row.appendChild(chip);
        }
        main.appendChild(row);
      });
    }
  }

  const divider = document.createElement("div");
  divider.className = "ticket-divider";

  const side = document.createElement("div");
  side.className = "ticket-side";
  if (isOwner) {
    side.innerHTML = "🎫";
  } else if (past) {
    side.innerHTML = '<span class="status-chip declined">closed</span>';
  } else if (myRequest) {
    side.innerHTML = `<span class="status-chip ${myRequest.status}">${myRequest.status}</span>`;
  } else if (full) {
    side.innerHTML = '<span class="status-chip declined">full</span>';
  } else {
    const btn = document.createElement("button");
    btn.className = "btn-ask";
    btn.textContent = "Ask to join";
    btn.onclick = () => requestJoin(plan.id);
    side.appendChild(btn);
  }

  el.append(main, divider, side);
  return el;
}

async function requestJoin(planId) {
  try {
    await api(`/plans/${planId}/request`, { method: "POST", auth: true });
    showToast("Request sent — the host will review it.");
    await loadPlans();
  } catch (err) {
    showToast(err.message);
  }
}

async function respondRequest(planId, reqId, status) {
  try {
    await api(`/plans/${planId}/requests/${reqId}`, { method: "PATCH", auth: true, body: { status } });
    showToast(status === "accepted" ? "Request accepted." : "Request declined.");
    await loadPlans();
  } catch (err) {
    showToast(err.message);
  }
}

async function handleNewPlan(e) {
  e.preventDefault();
  const errEl = $("np-error");
  errEl.textContent = "";
  const payload = {
    place: $("np-place").value.trim(),
    date: $("np-date").value,
    time: $("np-time").value,
    spotsNeeded: $("np-spots").value,
    note: $("np-note").value.trim(),
  };
  if (!payload.place || !payload.date || !payload.time) {
    errEl.textContent = "Place, date and time are required.";
    return;
  }
  try {
    await api("/plans", { method: "POST", auth: true, body: payload });
    showToast("Your plan is live on the board.");
    $("form-newplan").reset();
    $("np-spots").value = 1;
    showScreen("feed");
    await loadPlans();
  } catch (err) {
    errEl.textContent = err.message;
  }
}

// ---------- community ----------
async function loadCommunity() {
  const data = await api("/community", { auth: true });
  $("community-stats").innerHTML = `
    <div><div class="stat-num">${data.totalMembers}</div><div class="stat-label">Members</div></div>
    <div><div class="stat-num">${data.totalColleges}</div><div class="stat-label">Colleges</div></div>
    <div><div class="stat-num">${data.openPlans}</div><div class="stat-label">Open plans</div></div>
  `;
  const list = $("community-members");
  list.innerHTML = "";
  data.members.forEach((m) => {
    const row = document.createElement("div");
    row.className = "member-row";
    row.innerHTML = `
      <div><div class="name">${escapeHtml(m.name)}</div><div class="college">${escapeHtml(m.college)}</div></div>
      <div class="hosted">${m.plansHosted} hosted</div>
    `;
    list.appendChild(row);
  });
}

// ---------- utils ----------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// ---------- wire up events ----------
document.addEventListener("DOMContentLoaded", async () => {
  await loadColleges();
  renderLanding();

  $("su-city").addEventListener("change", onCityChange);
  $("form-signup").addEventListener("submit", handleSignup);
  $("form-verify").addEventListener("submit", handleVerify);
  $("vf-resend").addEventListener("click", handleResend);
  $("form-login").addEventListener("submit", handleLogin);
  $("form-newplan").addEventListener("submit", handleNewPlan);

  $("btn-logout").addEventListener("click", handleLogout);
  $("btn-refresh").addEventListener("click", loadPlans);
  $("btn-newplan").addEventListener("click", () => {
    $("np-date").min = new Date().toISOString().slice(0, 10);
    showScreen("newplan");
  });
  $("chk-college-only").addEventListener("change", loadPlans);

  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => showScreen(btn.dataset.back));
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", async () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.tab;
      $("tab-board").classList.toggle("hidden", target !== "board");
      $("tab-community").classList.toggle("hidden", target !== "community");
      if (target === "community") await loadCommunity();
    });
  });
});
