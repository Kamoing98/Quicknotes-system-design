# QuickNotes — System Design

A full-stack system design project for QuickNotes, a note-taking application scaled to serve 1 million users. This repository demonstrates both a working API client (using JSONPlaceholder as a practice API) and comprehensive design documents for the backend team.

## Description

QuickNotes is a note-taking web application that allows users to create, read, update, and delete notes with tag support. This project consists of two parts:

1. **API Client** — A front-end application that communicates with a REST API to load, create, and delete notes. Uses the JSONPlaceholder API for demonstration purposes.
2. **System Design Documents** — Three detailed documents that the backend team will use to build the production API, database schema, and infrastructure.

## How to Run the API Client

### Prerequisites

- Node.js 18+ and npm

### Steps

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build
```

The application will open in your browser. Click "Load Notes" to fetch 10 notes from the JSONPlaceholder API. Use the form to create new notes, and click "Delete" on any note to remove it.

### Features

- ✅ **GET** — Load 10 notes from the server
- ✅ **POST** — Create a new note with validation (title required, max 100 characters)
- ✅ **DELETE** — Remove a note from the list
- ✅ Loading, success, error, and empty states
- ✅ Buttons disabled during requests
- ✅ Input validation with user-friendly error messages
- ✅ User text safely rendered (no XSS)

## Design Documents

| Document | Description |
|----------|-------------|
| [📡 API Design](docs/api-design.md) | REST endpoints, request/response examples, error codes, authentication |
| [🗄️ Data Model](docs/data-model.md) | Entity relationships, SQL schema, queries, indexes, SQL vs NoSQL justification |
| [🏗️ Architecture](docs/architecture.md) | System diagram, load estimates, component explanations, request flows, trade-offs |

## Project Structure

```
quicknotes-system-design/
├── index.html              # HTML5 skeleton with form and notes list
├── src/
│   ├── App.tsx             # Main application component (API client)
│   ├── main.tsx            # React entry point
│   └── index.css           # Styles with distinct success/error states
├── docs/
│   ├── api-design.md       # REST API specification
│   ├── data-model.md       # Database schema and queries
│   └── architecture.md     # System architecture design
└── README.md               # This file
```

## What I Learned

1. **RESTful API design** — I learned how to design a complete REST API with proper HTTP methods, status codes, request/response formats, pagination, authentication, and error handling. Understanding the difference between 400, 401, 403, 404, and 500 errors and when to use each one was particularly valuable.

2. **Database modeling and SQL** — I learned how to model entities with proper relationships (one-to-many and many-to-many), write CREATE TABLE statements with foreign keys and constraints, design indexes for common query patterns, and justify the choice of SQL over NoSQL based on the application's needs.

3. **System architecture at scale** — I learned how to estimate load (reads/writes per second, storage per year) for 1 million users, design an architecture with redundant components to avoid single points of failure, and make trade-off decisions (e.g., SQL vs NoSQL, synchronous vs event-driven, cache-aside vs write-through) with clear reasoning.

4. **Front-end API integration** — I learned how to properly handle async operations in the browser, including loading states, error handling, input validation, disabling buttons during requests, and safely rendering user-provided text to prevent XSS attacks.

5. **Technical documentation** — I learned how to write clear, structured technical documents that a backend team can use as a specification to build a system, including diagrams, examples, and justifications for design decisions.

## API Client Notes

- The app uses [JSONPlaceholder](https://jsonplaceholder.typicode.com) as a practice API.
- **Important:** JSONPlaceholder does not persist data. DELETE requests return 200 but don't actually remove data on the server. The app handles this by optimistically removing notes from the local state.
- POST requests return a new note with an `id`, but refreshing the page will reset to server data.

## License

This project was created as a system design exercise.
