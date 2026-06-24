// A tiny file-based data layer. Good enough for a prototype or small community —
// swap this out for a real database (Postgres, etc.) before you have serious traffic.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const USERS_FILE = path.join(DATA_DIR, "users.json");
const PLANS_FILE = path.join(DATA_DIR, "plans.json");
const PENDING_FILE = path.join(DATA_DIR, "pending_signups.json");

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = {
  getUsers: () => readJSON(USERS_FILE, []),
  saveUsers: (users) => writeJSON(USERS_FILE, users),
  getPlans: () => readJSON(PLANS_FILE, []),
  savePlans: (plans) => writeJSON(PLANS_FILE, plans),
  getPending: () => readJSON(PENDING_FILE, {}),
  savePending: (pending) => writeJSON(PENDING_FILE, pending),
};
