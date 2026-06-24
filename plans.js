const express = require("express");
const crypto = require("crypto");
const db = require("./db");
const { auth } = require("./middleware");

const router = express.Router();

// List plans in the current user's city (optionally narrowed to their own college).
router.get("/", auth, (req, res) => {
  const { collegeOnly } = req.query;
  let plans = db.getPlans().filter((p) => p.city === req.user.city);
  if (collegeOnly === "true") plans = plans.filter((p) => p.college === req.user.college);
  plans.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  res.json(plans);
});

router.post("/", auth, (req, res) => {
  const { place, date, time, spotsNeeded, note } = req.body || {};
  if (!place || !date || !time || !spotsNeeded) {
    return res.status(400).json({ error: "Place, date, time and spots are required." });
  }
  const n = Number(spotsNeeded);
  if (!n || n < 1 || n > 10) {
    return res.status(400).json({ error: "Spots needed must be between 1 and 10." });
  }

  const plans = db.getPlans();
  const plan = {
    id: crypto.randomUUID(),
    authorId: req.user.id,
    authorName: req.user.name,
    college: req.user.college,
    city: req.user.city,
    place: String(place).slice(0, 120),
    date,
    time,
    spotsNeeded: n,
    note: String(note || "").slice(0, 300),
    createdAt: Date.now(),
    requests: [],
  };
  plans.unshift(plan);
  db.savePlans(plans);
  res.json(plan);
});

router.post("/:id/request", auth, (req, res) => {
  const plans = db.getPlans();
  const plan = plans.find((p) => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: "Plan not found." });
  if (plan.authorId === req.user.id) {
    return res.status(400).json({ error: "You can't request to join your own plan." });
  }
  if (plan.requests.some((r) => r.requesterId === req.user.id)) {
    return res.status(409).json({ error: "You already requested to join this plan." });
  }
  const acceptedCount = plan.requests.filter((r) => r.status === "accepted").length;
  if (acceptedCount >= plan.spotsNeeded) {
    return res.status(409).json({ error: "This plan is already full." });
  }

  plan.requests.push({
    id: crypto.randomUUID(),
    requesterId: req.user.id,
    requesterName: req.user.name,
    requesterCollege: req.user.college,
    status: "pending",
    requestedAt: Date.now(),
  });
  db.savePlans(plans);
  res.json(plan);
});

router.patch("/:id/requests/:reqId", auth, (req, res) => {
  const { status } = req.body || {};
  if (!["accepted", "declined"].includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const plans = db.getPlans();
  const plan = plans.find((p) => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: "Plan not found." });
  if (plan.authorId !== req.user.id) {
    return res.status(403).json({ error: "Only the host can respond to requests." });
  }

  const request = plan.requests.find((r) => r.id === req.params.reqId);
  if (!request) return res.status(404).json({ error: "Request not found." });

  request.status = status;
  db.savePlans(plans);

  if (status === "accepted") {
    const users = db.getUsers();
    const host = users.find((u) => u.id === plan.authorId);
    if (host) {
      host.plansHosted = (host.plansHosted || 0) + 1;
      db.saveUsers(users);
    }
  }

  res.json(plan);
});

module.exports = router;
