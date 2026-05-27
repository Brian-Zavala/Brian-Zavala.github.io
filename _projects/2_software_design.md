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

The lesson from this enhancement pass was that "software design" in a real codebase is less about exotic patterns and more about removing the small accumulations that make a project hard to reason about. The pre-enhancement code was not broken, but every authenticated request manually rebuilt its header, the public site depended on a package that had been dead for five years, and the API trusted any origin. None of those would block a feature from working, and that is exactly why they are easy to leave alone. Walking through them in the code review and then fixing them in one focused branch left the application both smaller and easier to extend, which is what the category is supposed to demonstrate.

## Source

The enhanced artifact lives on the [`cs499-module3` branch](https://github.com/Brian-Zavala/CS-465/tree/cs499-module3) of the CS-465 repository. The squashed commit on that branch (`205eb52`) contains every change described above. The original starter code is preserved on the [`module1` branch](https://github.com/Brian-Zavala/CS-465/tree/module1) for comparison.
