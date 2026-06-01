---
layout: page
title: Algorithms and Data Structures
description: "Five enhancements to the Travlr Getaways application that move work off the database and into the right data shapes: server-side pagination, an indexed single-document lookup, a price-field type migration from string to number, a BehaviorSubject-backed cache in the Angular admin, and a hardened JWT decode path."
img: assets/img/algorithms-thumb.jpg
importance: 3
category: work
github: https://github.com/Brian-Zavala/CS-465/tree/cs499-module4
---

This is the second of three ePortfolio category pages built around the same artifact, Travlr Getaways, a MEAN-stack travel booking application. The enhancements below address the algorithms and data structures category and are all on the [`cs499-module4`](https://github.com/Brian-Zavala/CS-465/tree/cs499-module4) branch as a single squashed commit (`c7bef1d`); the [compare view](https://github.com/Brian-Zavala/CS-465/compare/cs499-module3...cs499-module4) shows every change against the Module 3 baseline.

## What changed

The Module 4 pass made five targeted changes, each chosen because the original code was doing more work than it needed to or storing data in the wrong shape for the queries that ran against it:

1. **Server-side pagination on `GET /api/trips`**, replacing an unconditional full-collection scan that returned every trip on every list call.
2. **`findOne` instead of `find` for code lookups**, replacing a multi-document query that pulled an array, indexed at index zero, and checked the array length.
3. **`perPerson` price field migrated from `String` to `Number`** across the Mongoose schema, the seed JSON, the Angular model, the form inputs, and the trip card display, so the field can sort, range-query, and arithmetic-compare correctly.
4. **`TripStore` Angular service** wrapping the trip data with an RxJS `BehaviorSubject`, so the trip listing reads from a cached observable and only hits the network on first load or after a mutation.
5. **JWT decode path hardened** in the Angular `AuthenticationService` via a private helper that validates the three-segment shape and catches both the `atob` and `JSON.parse` failures that a malformed token would throw.

## Selected before and after

### Server-side pagination

The starting code returned every trip in the collection on every list request. For the seed dataset of half a dozen trips that ran instantly; for any production-scale collection it would not. The replacement clamps `page` and `limit`, runs the count and the page query in parallel, and returns a structured envelope the client can use to render pagination controls.

**Before** (`app_api/controllers/trips.js`):

```js
const tripsList = async (req, res) => {
    try {
        const trips = await Trip.find({}).exec();
        return res.status(200).json(trips);
    } catch (err) {
        return res.status(500).json(err);
    }
};
```

**After**:

```js
const tripsList = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;

        const [trips, total] = await Promise.all([
            Trip.find({}).sort({ start: 1 }).skip(skip).limit(limit).exec(),
            Trip.countDocuments({})
        ]);

        return res.status(200).json({ trips, total, page, limit });
    } catch (err) {
        return res.status(500).json(err);
    }
};
```

The clamps matter: without `Math.max(1, ...)` on `page`, a negative value would produce a negative `skip` and crash the query, and without the upper bound on `limit`, a single request asking for ten thousand documents could exhaust memory.

### Index-friendly single-document lookup

The starting code looked up a trip by its short code using `find`, which always returns an array. The handler then had to index into position zero and check for emptiness. `findOne` returns the document directly and ends the query as soon as the first match is found, which lets the engine stop after a single index hit on the `code` field that the schema already declared as indexed.

**Before**:

```js
const trip = await Trip.find({ 'code': req.params.tripCode }).exec();
if (!trip || trip.length === 0) {
    return res.status(404).json({ "message": "trip not found" });
}
return res.status(200).json(trip);
```

**After**:

```js
const trip = await Trip.findOne({ 'code': req.params.tripCode }).exec();
if (!trip) {
    return res.status(404).json({ "message": "trip not found" });
}
return res.status(200).json(trip);
```

The user-facing behavior is identical; the difference is in how the database can plan the query.

### Type-correct numeric field

The starting schema stored `perPerson` as a `String`. That looked harmless on the seed data (`"$799.00"`), but it meant the database could not sort, range-filter, or aggregate on price. The migration touched five layers of the application so that the field is a real number from the database up through the form input and the display.

```js
// app_api/models/trips.js
perPerson: { type: Number, required: true, min: 0 }
```

```json
// data/trips.json
"perPerson": 799.00,
```

```html
<!-- add-trip.html / edit-trip.html -->
<input type="number" step="0.01" min="0" formControlName="perPerson" />
```

```html
<!-- trip-card.html -->
{% raw %}{{ trip.perPerson | currency }}{% endraw %}
```

The `min: 0` validator on the schema, the matching `Validators.min(0)` on the reactive form, and the `currency` pipe on display all line up because the underlying field is now the right type.

### Client-side cache with `BehaviorSubject`

The original trip listing called the API every time the user navigated to it, even if the data had not changed. The `TripStore` service holds the latest paginated page in a `BehaviorSubject`, returns immediately on re-entry, and re-fetches only on first load or after the user adds, edits, or deletes a trip.

```ts
@Injectable({ providedIn: 'root' })
export class TripStore {

  private state$ = new BehaviorSubject<TripsPage>(initialState);
  private loading$ = new BehaviorSubject<boolean>(false);

  constructor(private tripData: TripDataService) { }

  public async loadPage(page: number, limit: number): Promise<void> {
    const cur = this.state$.getValue();
    if (cur.page === page && cur.limit === limit && cur.trips.length > 0) {
      return;
    }
    await this.fetch(page, limit);
  }

  public async refresh(): Promise<void> {
    const cur = this.state$.getValue();
    await this.fetch(cur.page, cur.limit);
  }
}
```

The trip listing component subscribes to `state()` and renders directly from the observable. The add, edit, and delete components call `refresh()` after a successful mutation. The mental model is simple: the server is the source of truth, the store is the cached view, and the cache invalidates exactly when something changed.

### Hardened token decode

The original `isLoggedIn` and `getCurrentUser` methods called `atob` and `JSON.parse` on the token directly and trusted that a value existed at `token.split('.')[1]`. A malformed token (the wrong number of segments, non-base64 content, or invalid JSON) would crash the entire admin SPA. The replacement extracts the decode into a private helper that returns `null` on any failure mode.

**After** (`app_admin/src/app/services/authentication.ts`):

```ts
private decodePayload(token: string | null): any | null {
  if (!token) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}
```

`isLoggedIn` and `getCurrentUser` now both go through this helper. A bad token logs the user out cleanly instead of crashing the page.

## Outcomes addressed

- **Algorithms and data structures outcome.** Pagination changes the asymptotic shape of the list endpoint from O(n) per request to O(page size). `findOne` against an indexed field is the textbook example of using the right query for the right access pattern. The `perPerson` type migration is the unglamorous half of the same skill: the right data structure does the work the algorithm shouldn't have to.
- **Implementation outcome.** The `TripStore` is a concrete RxJS pattern that a working Angular developer would reach for; the JWT hardening is a small but real example of defensive coding at a system boundary.

## Reflection

What stuck with me here is that the original code was not wrong on the data it actually had. Six trips load instantly whether you paginate or not, and a string price displays fine right up until you try to sort by it. The problems only appear when you picture the collection growing, which is the one situation a class assignment with seed data never forces you to confront.

The `perPerson` migration was the messiest part. Changing the type in the schema is a single line, but the same change has to reach the seed JSON, the Angular model, two forms, and the trip card, and if you miss one the app breaks in a way that does not point back at the type. That is the change I would write tests around if I did it again. I am comfortable saying this work meets the algorithms and data structures outcome. The piece I would not overclaim is formal Big-O analysis: I reasoned about these changes in practical terms rather than writing the complexity out, so that part of the outcome is only partial.

## Source

The enhanced artifact lives on the [`cs499-module4` branch](https://github.com/Brian-Zavala/CS-465/tree/cs499-module4) of the CS-465 repository. The squashed commit `c7bef1d` contains every change described above.
