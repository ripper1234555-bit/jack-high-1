const express = require("express");
const db = require("./db");
const { auth } = require("./middleware");

const router = express.Router();

router.get("/", auth, (req, res) => {
  const members = db
    .getUsers()
    .filter((u) => u.city === req.user.city)
    .map((u) => ({ name: u.name, college: u.college, plansHosted: u.plansHosted || 0 }));

  const plans = db.getPlans().filter((p) => p.city === req.user.city);
  const now = Date.now();
  const openPlans = plans.filter((p) => new Date(`${p.date}T${p.time}`).getTime() > now).length;

  res.json({
    city: req.user.city,
    totalMembers: members.length,
    totalColleges: new Set(members.map((m) => m.college)).size,
    openPlans,
    members: members.sort((a, b) => b.plansHosted - a.plansHosted),
  });
});

module.exports = router;
