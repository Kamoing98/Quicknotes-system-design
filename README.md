# QuickNotes — System Design

A full-stack system design project for QuickNotes, a note-taking application scaled to serve 1 million users. This repository includes a working API client (using JSONPlaceholder as a practice API) and comprehensive design documents for the backend team.

## Description

QuickNotes is a note-taking web application that allows users to create, read, update, and delete notes. This project consists of two parts:

1. **API Client** — A vanilla HTML/CSS/JavaScript application that communicates with a REST API to load, create, and delete notes. Uses the JSONPlaceholder API for demonstration.
2. **System Design Documents** — Three detailed documents that the backend team will use to build the production API, database schema, and infrastructure.

## How to Run the API Client

### Option 1: Open directly in a browser

Simply open `index.html` in a web browser. The app will load and you can interact with it immediately.

### Option 2: Using a local server

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

### Option 3: Build with Vite (for production)

```bash
# Install dependencies
npm install

# Build for production
npm run build

# The built files will be in the dist/ folder
```

### Files

- `index.html` — HTML5 page with the form, notes list, and status area
- `api.js` — JavaScript API client with GET, POST, and DELETE operations
- `style.css` — CSS styles with distinct success/error/loading/empty states

### Features

- ✅ **GET** — Load 10 notes from the server
- ✅ **POST** — Create a new note with validation (title required, max 100 characters)
- ✅ **DELETE** — Remove a note from the list
- ✅ Loading, success, error, and empty states shown on the page
- ✅ Buttons disabled during requests
- ✅ Input validation with user-friendly error messages
- ✅ User text inserted with `textContent` only (prevents XSS)
- ✅ Reusable `request()` function with `response.ok` check

## Design Documents

| Document | Description |
|----------|-------------|
| [📡 API Design](docs/api-design.md) | 12 REST endpoints, request/response JSON examples, error codes (400, 401, 403, 404, 500) |
| [🗄️ Data Model](docs/data-model.md) | 4 entities, relationships, CREATE TABLE statements, 5 SQL queries (including JOIN), 3 indexes, SQL vs NoSQL justification |
| [🏗️ Architecture](docs/architecture.md) | Functional/non-functional requirements, load estimates for 1M users, architecture diagram, component explanations, request flows, trade-offs, SPOF avoidance |

## Project Structure

```
quicknotes-system-design/
├── index.html              # HTML5 skeleton with form and notes list
├── api.js                  # API client (GET, POST, DELETE with error handling)
├── style.css               # Styles with distinct success/error states
├── docs/
│   ├── api-design.md       # REST API specification
│   ├── data-model.md       # Database schema and queries
│   └── architecture.md     # System architecture design
└── README.md               # This file
```

## API Client Implementation Details

### `api.js` Structure

- **`API_URL`** — Constant set to `https://jsonplaceholder.typicode.com/posts`
- **`request(url, options)`** — Reusable async function that calls `fetch`, checks `response.ok`, and throws on errors
- **`loadNotes()`** — GET request to load 10 notes
- **`createNote(title, body)`** — POST request to create a note
- **`deleteNote(id)`** — DELETE request to remove a note
- All functions wrapped in `try/catch/finally` blocks
- Buttons disabled while requests are running
- All user text inserted with `textContent` only (no `innerHTML`)

### Important Note About JSONPlaceholder

JSONPlaceholder does not persist data. DELETE requests return 200 but don't actually remove data on the server. The app handles this by optimistically removing notes from the local DOM state. POST requests return a new note with an `id`, but refreshing the page will reset to server data. This is documented in code comments.

## What I Learned

1. **RESTful API design** — I learned how to design a complete REST API with proper HTTP methods (GET, POST, PUT, PATCH, DELETE), status codes (200, 201, 204, 400, 401, 403, 404, 500), request/response formats, pagination, authentication with JWT, and structured error handling with consistent error bodies.

2. **Database modeling and SQL** — I learned how to model entities with proper relationships (one-to-many between users and notes, many-to-many between notes and tags via a junction table), write CREATE TABLE statements with foreign keys, ON DELETE CASCADE constraints, and UNIQUE constraints. I also learned to design composite indexes for common query patterns and justify the choice of SQL (PostgreSQL) over NoSQL based on the need for referential integrity, ACID transactions, and structured relationships.

3. **System architecture at scale** — I learned how to estimate load for 1 million users (calculating DAU, peak-hour traffic, reads/writes per second, and annual storage growth), design a multi-tier architecture with redundant components (load balancer, multiple app servers, Redis cache, primary database with read replica, message queue with workers), and make informed trade-off decisions (SQL vs NoSQL, synchronous vs event-driven, cache-aside vs write-through) with clear reasoning. I also learned how to avoid single points of failure at every layer.

4. **Front-end API integration** — I learned how to properly handle async operations in vanilla JavaScript, including managing loading/success/error/empty states, disabling buttons during requests, validating user input before sending requests, and safely rendering user-provided text with `textContent` to prevent XSS attacks.

5. **Technical documentation** — I learned how to write clear, structured technical documents that a backend team can use as a specification, including ASCII architecture diagrams, JSON request/response examples, SQL queries with explanations, and justifications for design decisions.
