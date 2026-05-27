---
layout: page
title: Code Review
description: A walkthrough of the existing Travlr Getaways codebase and the planned enhancements across software design, algorithms and data structures, and databases.
importance: 1
category: work
github: https://github.com/Brian-Zavala/CS-465
---

This is the informal code review I recorded for the CS-499 capstone, walking through the Travlr Getaways application as it existed before any enhancement work. The review covers what is there, what needs improvement, and what I plan to change in each of the three enhancement categories.

{% include video.liquid path="https://www.youtube.com/embed/YlUQSxbgVao" class="img-fluid rounded z-depth-1" width="100%" height="450" %}

## What the review covers

The video walks through the codebase in roughly the order someone would read it for the first time:

1. **Existing structure and functionality.** The MEAN-stack layout (Node and Express API, Mongoose models, Handlebars-rendered public site, separate Angular admin SPA, JWT authentication) and how the pieces talk to each other.
2. **Existing data handling and security.** How trips and users are stored, how authentication works, where access control is enforced, and the obvious gaps I would tighten before this code shipped to anything resembling production.
3. **Existing error handling and efficiency.** What happens (or does not happen) when the API is unreachable, when a token is malformed, or when the trip list grows. Where the code is doing too much work, and where it is doing too little.
4. **Existing documentation and style.** How well the code explains itself, what assumes the reader already knows, and where the naming and structure could be tighter.
5. **Planned enhancements.** The three categories I will use to demonstrate growth across the program, and the specific changes planned in each.

## The three planned enhancement categories

The code review concludes with the enhancement roadmap that drives the rest of the capstone:

- **Software Design and Engineering.** Replace the deprecated `request` package with native `fetch`, restrict CORS to a configured origin, introduce environment-based Angular configuration, add a functional `HttpInterceptor` for auth headers, remove a redundant auth wrapper, and add real user-facing error feedback in the admin SPA.
- **Algorithms and Data Structures.** Add server-side pagination to the trips API, refactor the trip lookup to use `findOne` against the indexed `code` field, migrate the price field from string to a true numeric type so it sorts and queries correctly, introduce a `BehaviorSubject`-backed cache in the Angular admin so repeat list visits skip the network, and harden the JWT decode path against malformed tokens.
- **Databases.** Redesign the user schema, verify and document the bcrypt configuration, add refresh-token support, validate required environment variables at startup, add server-side input validation on the trip endpoints, and document the API contract for the next developer.

Each category is documented in its own project page elsewhere in this portfolio as the enhancement work lands.

## Source

The artifact reviewed in this video is the unmodified Travlr Getaways project from CS-465 Full Stack Development I. The repository linked above contains the original baseline plus the enhancement branches (`cs499-module3`, `cs499-module4`, and so on) that follow the plan laid out at the end of the review.
