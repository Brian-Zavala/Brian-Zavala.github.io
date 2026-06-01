---
layout: page
title: Software Design and Engineering
description: "Six enhancements to the Travlr Getaways MEAN-stack application that tighten the boundary between the public site, the admin SPA, and the API: a functional HttpInterceptor, environment-based Angular configuration, real user-facing error feedback, hardened CORS, and the removal of a deprecated HTTP client."
img: assets/img/software-design-thumb.jpg
importance: 2
category: work
github: https://github.com/Brian-Zavala/CS-465/tree/cs499-module3
---

This is the first of three ePortfolio category pages built around a single artifact, Travlr Getaways, the MEAN-stack travel booking application I originally built in CS-465 Full Stack Development I. The enhancements below address the software design and engineering category and are all on the [`cs499-module3`](https://github.com/Brian-Zavala/CS-465/tree/cs499-module3) branch as a single squashed commit; a side-by-side diff against the starting point is available at the [compare view](https://github.com/Brian-Zavala/CS-465/compare/module1...cs499-module3).

## What changed

The Module 3 pass made six targeted changes to the application without altering its feature set, each chosen because it closed a real gap in the starter code:

1. **Functional `HttpInterceptor` for auth headers** in the Angular admin, replacing a hand-rolled token-attaching wrapper that lived inside the data service.
2. **Removed a redundant `authController.getUser()` wrapper** from the Express trip controllers, which had been re-fetching the authenticated user from the database on every trip mutation purely to log a username.
3. **Angular environment files plus `fileReplacements`** in `angular.json`, so the admin SPA reads its API base URL from a single configuration source instead of hard-coding `http://localhost:3000` in the service layer.
4. **Bootstrap `alert-danger` error feedback** on the trip listing, add-trip, and edit-trip components, so a failed API call surfaces to the user instead of disappearing into the console.
5. **CORS restricted to a configured origin** via `process.env.CLIENT_ORIGIN`, replacing the original wide-open `app.use(cors())`.
6. **Replaced the deprecated `request` package** with the platform-native `fetch` API in the Handlebars server controllers, removing an unmaintained dependency and a callback-style code path.

## Selected before and after

### Auth header attachment

The starting code attached the bearer token by reaching into a wrapper inside the data service for every authenticated call. The replacement is a functional Angular interceptor that runs for every outgoing HTTP request, has no other concerns, and is registered once in the application config.

**Before** (excerpt from the admin data service):

```ts
const httpOptions = {
  headers: new HttpHeaders({
    'Authorization': `Bearer ${this.authentication.getToken()}`
  })
};
return this.http.post(url, formData, httpOptions);
```

**After** (`app_admin/src/app/interceptors/auth.interceptor.ts`):

```ts
import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthenticationService } from '../services/authentication';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthenticationService);
  const token = auth.getToken();
  if (token) {
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(authReq);
  }
  return next(req);
};
```

The interceptor is wired into `provideHttpClient(withInterceptors([authInterceptor]))` in `app.config.ts`, which removed the per-call header construction from every service method that talked to a protected endpoint.

### Deprecated HTTP client

The original public site used the `request` package, which was officially deprecated in 2020 and unmaintained ever since. The replacement uses `fetch`, which is built into the Node runtime and removes a dependency entirely.

**Before** (`app_server/controllers/travel.js`):

```js
const request = require('request');
const apiOptions = { server: 'http://localhost:3000' };

const travelList = (req, res) => {
  const requestOptions = {
    url: `${apiOptions.server}/api/trips`,
    method: 'GET',
    json: {},
  };
  request(requestOptions, (err, { statusCode }, body) => {
    if (err) { console.error(err); }
    _renderTravelList(req, res, body);
  });
};
```

**After**:

```js
const apiServer = process.env.API_SERVER || 'http://localhost:3000';

const travelList = async (req, res) => {
  try {
    const response = await fetch(`${apiServer}/api/trips`);
    const body = await response.json();
    _renderTravelList(req, res, body);
  } catch (err) {
    console.error('Error fetching trips from API:', err);
    _renderTravelList(req, res, []);
  }
};
```

The new version also reads the API host from `process.env.API_SERVER`, which is consumed by the same configuration pattern used elsewhere in the application.

### CORS

The starting code allowed every origin to call the API. The replacement reads an allowed origin from configuration and falls back only to the local development client.

**Before** (`app.js`):

```js
app.use(cors());
```

**After**:

```js
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:4200' }));
```

A small change in size, but it is the difference between an API that any page on the internet can call from a logged-in user's browser and an API that only the admin SPA can call.

## Outcomes addressed

The Module 3 work was planned against two of the program outcomes:

- **Implementation outcome (software design and engineering).** Every change in the list above replaces a starter-code pattern with the version that the framework's own documentation recommends today: standalone components with functional interceptors instead of class-based providers, environment files instead of hard-coded URLs, the platform `fetch` instead of a third-party HTTP client.
- **Security mindset.** The CORS change and the configuration-driven API base URL together close the most obvious surface that a casual security review would flag in the starter code.

## Reflection

Going in, I expected "software design" to mean adding something clever. Most of this pass was the opposite. I deleted a dead dependency, moved a hard-coded URL into a config file, and closed a CORS line that had been wide open. None of it changes what the app does for a user, which is probably why all of it had survived untouched since CS-465. The interceptor was the one piece that took real trial and error: the current Angular docs show the functional style and a lot of the older tutorials still show the class style, and mixing the two quietly breaks the auth header.

The code review I recorded earlier in the capstone is what kept this focused. I had already called out the deprecated `request` package and the open CORS on camera, so by the time I sat down to enhance I was working from a short list instead of re-reading the whole project. If there is an outcome I only partly met here, it is the collaboration one. I added clearer error feedback and configuration, but the real documentation work did not land until the database pass.

## Source

The enhanced artifact lives on the [`cs499-module3` branch](https://github.com/Brian-Zavala/CS-465/tree/cs499-module3) of the CS-465 repository. The squashed commit on that branch (`205eb52`) contains every change described above. The original starter code is preserved on the [`module1` branch](https://github.com/Brian-Zavala/CS-465/tree/module1) for comparison.
