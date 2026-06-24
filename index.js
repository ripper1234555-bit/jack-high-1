require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const { router: authRouter } = require("./auth");
const plansRouter = require("./plans");
const communityRouter = require("./community");

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

// Slows down brute-force attempts on login/signup without blocking normal use.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/plans", plansRouter);
app.use("/api/community", communityRouter);

app.use(express.static(path.join(__dirname, "..", "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nYAP is running → http://localhost:${PORT}\n`);
});
