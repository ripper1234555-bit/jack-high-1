# YAP — a city-wide plans board for verified college students

YAP lets verified students from different colleges in the same city find a plus-one
for a night out: post a plan (place, date, time, how many spots you need), browse
what's happening across town, and request to join someone else's plan. The host
reviews every request before anyone's confirmed.

This is a working starter project, not a production-ready app — read the
"Before you launch this for real" section before putting it in front of real users.

## What's inside

```
yap-app/
  server/          Express API (auth, plans, community stats)
  public/          Plain HTML/CSS/JS frontend (no build step needed)
  config/colleges.json   Editable list of cities + partner colleges
  data/            Created automatically — stores users & plans as JSON files
```

- **Backend:** Node.js + Express, JSON-file storage (no database server to install)
- **Auth:** college-email verification code + bcrypt-hashed passwords + JWT sessions
- **Frontend:** plain HTML/CSS/JS, talks to the backend over `fetch`

## Getting it running

1. Install [Node.js](https://nodejs.org) 18 or newer.
2. In this folder, install dependencies:
   ```
   npm install
   ```
3. Copy the environment file and edit it:
   ```
   cp .env.example .env
   ```
   At minimum, change `JWT_SECRET` to a random string. Leave `EMAIL_USER`/`EMAIL_PASS`
   blank for now — see "Verification codes" below.
4. Start the server:
   ```
   npm start
   ```
5. Open **http://localhost:3000**.

## Verification codes (email)

Real email sending needs real email credentials — a static frontend can't send mail
on its own. Two options:

- **Dev mode (default):** leave `EMAIL_USER`/`EMAIL_PASS` blank in `.env`. Codes are
  printed to the terminal where `npm start` is running, so you can copy them into the
  verify screen while testing.
- **Real emails:** fill in `EMAIL_USER`/`EMAIL_PASS` with a Gmail address and an
  [app password](https://myaccount.google.com/apppasswords) (requires 2-Step
  Verification on that account). Instructions are in `.env.example`. For anything
  beyond personal testing, a transactional email service (Postmark, SES, Resend, etc.)
  will be more reliable than a personal Gmail account.

## Adding your real cities & colleges

Edit `config/colleges.json`. Each city is a list of colleges with the email domain
students must sign up with:

```json
"Pune": [
  { "name": "Your College Name", "domain": "yourcollege.edu" }
]
```

The sample cities/colleges already in the file are placeholders — swap them for the
real ones you want to allow.

## Design choices worth knowing about

- **Age range is 18–24, not younger.** Arranging in-person nightlife meetups between
  adults and minors isn't something this template supports, and most clubbing venues
  exclude under-18s anyway. If you only want, say, 18–21, change `MIN_AGE`/`MAX_AGE`
  in `server/auth.js`.
- **Every join request needs host approval** — nobody is added to a plan automatically.
- **City + college are shown on every request and plan** so people can see who they'd
  actually be meeting before they say yes.
- **No photos, DMs, or location tracking** in this starter — those add real safety
  surface area (catfishing, harassment, stalking) that's worth designing carefully
  rather than bolting on by default.

## Before you launch this for real

This is a solid base, not a finished product. Before real students use it:

- **Move off JSON files** to a real database (Postgres, etc.) — the current storage
  isn't built for concurrent writes at scale and has no backups.
- **Verify college affiliation more strongly than just the email domain** — domains
  can be spoofed; consider a real magic-link/SSO flow with each college if you want
  stronger guarantees.
- **Add content moderation and a reporting/blocking flow** for plans and members.
- **Add HTTPS** (this runs on plain HTTP locally; use a reverse proxy like Caddy or
  Nginx, or a host that terminates TLS for you, in production).
- **Get a real privacy policy and terms of service reviewed** — you're handling
  emails, ages, and real-world meetup data.
- **Decide on a moderation/safety contact** so users can report a bad actor or a plan
  that doesn't feel right.

## Safety note for anyone testing this

If you're building this for an actual community: encourage meeting new people in
public spots for the first time, and consider building in a lightweight "let a friend
know your plans" reminder somewhere in the flow.
