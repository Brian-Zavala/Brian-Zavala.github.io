---
layout: page
title: Databases
description: "Six enhancements to the Travlr Getaways data and authentication layer: a redesigned user schema, a migration from PBKDF2 to bcrypt, refresh tokens on a separate signing secret, a startup configuration validator, server-side input validation, and an API specification a new developer can actually read."
img: assets/img/database.thumb.jpg
importance: 4
category: work
github: https://github.com/Brian-Zavala/CS-465/tree/cs499-module5
---

This is the third of three ePortfolio category pages built around the same artifact, Travlr Getaways, a MEAN-stack travel booking application. The enhancements below address the databases category and are all on the [`cs499-module5`](https://github.com/Brian-Zavala/CS-465/tree/cs499-module5) branch as a single squashed commit (`4c6046a`); the [compare view](https://github.com/Brian-Zavala/CS-465/compare/cs499-module4...cs499-module5) shows every change against the Module 4 baseline.

## What changed

The Module 5 pass made six changes to how the application stores users and guards the contract between the database and the rest of the system:

1. **User schema redesign** with `timestamps`, a `toJSON` transform that strips the password hash from every serialized response, and `select: false` on the hash so it never leaves the database by accident.
2. **Bcrypt password hashing** replacing the starter code's PBKDF2 at one thousand iterations, which sat roughly two orders of magnitude below current guidance.
3. **Refresh tokens** on a separate signing secret, with the access token shortened to fifteen minutes and a `POST /api/refresh` endpoint that mints a new access token from a valid refresh token.
4. **Startup configuration validation** that refuses to boot the server if a required secret is missing, too short, left as a placeholder, or reused across both token secrets.
5. **Server-side input validation** on the trip create and update endpoints, returning a structured `400` instead of letting bad data reach the database.
6. **An API specification** (`API.md`) documenting every endpoint, the token model, the bcrypt cost factor, and the required environment variables.

## Selected before and after

### Password hashing: PBKDF2 to bcrypt

The starter code hashed passwords with `crypto.pbkdf2Sync` at one thousand iterations. That count was a reasonable default fifteen years ago and is far below current guidance today. It also stored a separate `salt` field, computed hashes synchronously on the event loop, and serialized both `hash` and `salt` to the client on any document that included the user. The replacement uses bcrypt at cost factor twelve, which embeds its own salt, runs asynchronously, and keeps the work factor tunable as hardware gets faster.

**Before** (`app_api/models/users.js`):

```js
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  hash: String,
  salt: String
});

userSchema.methods.setPassword = function(password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto
    .pbkdf2Sync(password, this.salt, 1000, 64, 'sha512')
    .toString('hex');
};

userSchema.methods.validPassword = function(password) {
  const hash = crypto
    .pbkdf2Sync(password, this.salt, 1000, 64, 'sha512')
    .toString('hex');
  return this.hash === hash;
};
```

**After**:

```js
const bcrypt = require('bcrypt');
const BCRYPT_COST = 12;

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  hash: { type: String, required: true, select: false }
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.hash;
      delete ret.__v;
      return ret;
    }
  }
});

userSchema.methods.setPassword = async function(password) {
  this.hash = await bcrypt.hash(password, BCRYPT_COST);
};

userSchema.methods.validPassword = function(password) {
  return bcrypt.compare(password, this.hash);
};
```

Three things changed at the schema level beyond the algorithm. The `salt` field is gone because bcrypt embeds the salt in its own output. The `hash` field is now `select: false`, so a plain `User.findById()` does not load it unless a query asks for it explicitly. And the `toJSON` transform deletes the hash from every serialized response as a second line of defense, so even a query that does select the hash cannot leak it to the client. The trade-off, documented in the milestone narrative, is that existing PBKDF2 hashes will not validate against the new code, so the seed user has to be re-run.

### Refresh tokens on a separate secret

The starter code issued a single JWT that lived for seven days and was signed with one secret. A seven-day access token is a long window for a stolen token to stay valid. The replacement shortens the access token to fifteen minutes and adds a refresh token, signed with a different secret, that the client exchanges for a new access token when the short one expires.

```js
const ACCESS_TOKEN_MINUTES = 15;
const REFRESH_TOKEN_DAYS = 7;

userSchema.methods.generateJwt = function() {
  const exp = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_MINUTES * 60;
  return jwt.sign(
    { _id: this._id, email: this.email, name: this.name, exp },
    process.env.JWT_SECRET
  );
};

userSchema.methods.generateRefreshToken = function() {
  const exp = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_DAYS * 24 * 60 * 60;
  return jwt.sign(
    { _id: this._id, type: 'refresh', exp },
    process.env.JWT_REFRESH_SECRET
  );
};
```

The refresh endpoint verifies the incoming token against the refresh secret, confirms the `type` claim is actually `refresh` so an access token cannot be replayed as a refresh token, and only then issues a new access token:

```js
const refresh = async (req, res) => {
  const incoming = req.body && req.body.refreshToken;
  if (!incoming) return res.status(400).json({ message: 'refreshToken required' });
  try {
    const payload = jwt.verify(incoming, process.env.JWT_REFRESH_SECRET);
    if (payload.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type' });
    }
    const user = await User.findById(payload._id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    return res.status(200).json({ token: user.generateJwt() });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};
```

On the Angular side, the HTTP interceptor catches a `401` on a protected request, calls the refresh endpoint once, and retries the original request with the new token, so the short access-token lifetime is invisible to the user during a normal session.

### A server that refuses to boot misconfigured

A common way to leak credentials is to ship with a placeholder secret that nobody remembered to change, or to start the server with a missing variable and only discover it when authentication silently misbehaves. The startup validator turns that class of mistake into a loud failure at boot instead of a quiet one at runtime.

```js
const REQUIRED = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_HOST', 'CLIENT_ORIGIN'];
const PLACEHOLDER_HINTS = ['changeme', 'replace-me', 'your-secret-here'];

const validateEnv = () => {
  const missing = REQUIRED.filter(key => !process.env[key] || !process.env[key].trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}.`);
  }
  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = process.env[key];
    if (value.length < 32) {
      throw new Error(`${key} must be at least 32 characters long.`);
    }
    if (PLACEHOLDER_HINTS.some(hint => value.toLowerCase().includes(hint))) {
      throw new Error(`${key} still contains a placeholder value.`);
    }
  }
  if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different values.');
  }
};
```

It is called once at the top of `app.js`, right after `dotenv` loads. The point of the separate-secrets check is that the entire reason for a refresh token is undermined if both tokens are signed with the same key.

### Validation at the database boundary

The starter code wrote whatever the request body contained straight into a new trip document. The replacement runs every trip create and update through express-validator, with length caps that match the schema and a numeric check on the price field, and returns a structured error envelope the Angular admin can render field by field.

```js
const { body, validationResult } = require('express-validator');

const tripValidators = [
  body('code').isString().trim().isLength({ min: 1, max: 10 }),
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('start').isISO8601().withMessage('start must be an ISO 8601 date'),
  body('perPerson').isFloat({ min: 0 }).withMessage('perPerson must be non-negative'),
  body('description').isString().isLength({ min: 1, max: 2000 })
];

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, msg: e.msg }))
    });
  }
  next();
};
```

Validating on the server matters because the Angular form validators can be bypassed entirely by anyone calling the API directly. The server is the only place the rules can actually be enforced.

## Outcomes addressed

- **Databases outcome.** The schema redesign, the `select: false` hash, and the `toJSON` transform are all about controlling how data is stored and what leaves the database. The validation middleware guards what is allowed in.
- **Security mindset.** Bcrypt at cost twelve, short-lived access tokens with separate-secret refresh tokens, a server that will not boot with a placeholder secret, and server-side validation are each a direct response to a way the starter code trusted something it should not have.
- **Collaborative environments.** The `API.md` specification documents the endpoints, the token model, the cost factor, and the required environment variables in the shape a developer joining the project would want to read first.

## Reflection

The bcrypt migration taught me the most, and not because bcrypt is hard to call. It was realizing that swapping the hashing algorithm silently invalidates every password already in the database. The old PBKDF2 hashes will never validate against the new code, so I had to re-run the seed user and note in the narrative that any real account would need a password reset. The trade-off is obvious in hindsight, but I did not see it until a login failed and I had to work out why.

Writing `API.md` at the end was useful in a way I did not expect. Putting the token rules and the validation envelope into plain English made me notice small inconsistencies in my own error responses, which I then went back and fixed. On outcomes, I am confident in the security and database coverage here. The one I would not overclaim is collaboration. The API document is a real start, but one person documenting their own project is not the same as the back-and-forth of an actual team, and that is the part of the outcome I have had the least chance to practice in coursework.

## Source

The enhanced artifact lives on the [`cs499-module5` branch](https://github.com/Brian-Zavala/CS-465/tree/cs499-module5) of the CS-465 repository. The squashed commit `4c6046a` contains every change described above.
