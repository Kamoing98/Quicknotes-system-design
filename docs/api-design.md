# QuickNotes API Design Document

## Overview

This document describes the RESTful API that the backend team should build for the QuickNotes application. The API enables users to create, read, update, and delete notes, manage tags, and authenticate.

---

## REST Endpoints

| # | Method | Path | Description | Success Status |
|---|--------|------|-------------|----------------|
| 1 | `GET` | `/api/notes` | List all notes for the authenticated user (paginated) | `200 OK` |
| 2 | `GET` | `/api/notes/:id` | Get a single note by ID | `200 OK` |
| 3 | `POST` | `/api/notes` | Create a new note | `201 Created` |
| 4 | `PUT` | `/api/notes/:id` | Update an existing note (full replacement) | `200 OK` |
| 5 | `PATCH` | `/api/notes/:id` | Partially update a note | `200 OK` |
| 6 | `DELETE` | `/api/notes/:id` | Delete a note permanently | `204 No Content` |
| 7 | `GET` | `/api/tags` | List all tags for the authenticated user | `200 OK` |
| 8 | `POST` | `/api/tags` | Create a new tag | `201 Created` |
| 9 | `DELETE` | `/api/tags/:id` | Delete a tag (and remove from all notes) | `204 No Content` |
| 10 | `POST` | `/api/auth/register` | Register a new user account | `201 Created` |
| 11 | `POST` | `/api/auth/login` | Authenticate and receive a JWT token | `200 OK` |
| 12 | `GET` | `/api/notes/search?q=keyword` | Search notes by title or body content | `200 OK` |

---

## Request & Response Examples

### Create a Note — `POST /api/notes`

**Request:**

```http
POST /api/notes HTTP/1.1
Host: api.quicknotes.app
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "title": "Meeting Notes - Q4 Planning",
  "body": "Discussed roadmap priorities for Q4. Key decisions:\n1. Launch mobile app by November\n2. Migrate database to PostgreSQL\n3. Hire 2 backend engineers",
  "tags": ["work", "planning"]
}
```

**Response (201 Created):**

```json
{
  "id": 42,
  "title": "Meeting Notes - Q4 Planning",
  "body": "Discussed roadmap priorities for Q4. Key decisions:\n1. Launch mobile app by November\n2. Migrate database to PostgreSQL\n3. Hire 2 backend engineers",
  "userId": 7,
  "tags": [
    { "id": 1, "name": "work" },
    { "id": 3, "name": "planning" }
  ],
  "createdAt": "2024-10-15T09:30:00Z",
  "updatedAt": "2024-10-15T09:30:00Z"
}
```

---

### List Notes — `GET /api/notes`

**Request:**

```http
GET /api/notes?page=1&limit=10&sort=updatedAt&order=desc HTTP/1.1
Host: api.quicknotes.app
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 42,
      "title": "Meeting Notes - Q4 Planning",
      "body": "Discussed roadmap priorities for Q4...",
      "userId": 7,
      "tags": [
        { "id": 1, "name": "work" },
        { "id": 3, "name": "planning" }
      ],
      "createdAt": "2024-10-15T09:30:00Z",
      "updatedAt": "2024-10-15T09:30:00Z"
    },
    {
      "id": 41,
      "title": "Grocery List",
      "body": "Milk, eggs, bread, avocados, chicken",
      "userId": 7,
      "tags": [
        { "id": 5, "name": "personal" }
      ],
      "createdAt": "2024-10-14T18:00:00Z",
      "updatedAt": "2024-10-14T18:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 2,
    "totalPages": 1
  }
}
```

---

## Error Status Codes

The API returns standard HTTP error status codes with a consistent error response body.

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The title field is required and must not exceed 100 characters.",
    "details": [
      {
        "field": "title",
        "rule": "required",
        "message": "Title is required."
      }
    ]
  }
}
```

### Error Codes

| Status Code | Name | Description | Example |
|-------------|------|-------------|---------|
| `400` | Bad Request | The request body is malformed or fails validation (e.g., missing required fields, title exceeds 100 characters, invalid JSON). | Client sends `{ "body": "..." }` without a title. |
| `401` | Unauthorized | The request lacks valid authentication credentials (missing or expired JWT token). | Request without `Authorization` header. |
| `403` | Forbidden | The authenticated user does not have permission to access or modify the requested resource. | User tries to delete another user's note. |
| `404` | Not Found | The requested resource does not exist (e.g., note ID not found, tag ID not found). | `GET /api/notes/9999` where note 9999 doesn't exist. |
| `409` | Conflict | The request conflicts with the current state (e.g., duplicate tag name). | Creating a tag with a name that already exists for the user. |
| `422` | Unprocessable Entity | The request is well-formed but contains semantic errors. | Title contains only whitespace after trimming. |
| `429` | Too Many Requests | Rate limit exceeded (e.g., more than 100 requests per minute). | Client sends too many requests in a short period. |
| `500` | Internal Server Error | An unexpected error occurred on the server. The client should retry. | Database connection failure, unhandled exception. |

### Example Error Responses

**400 Bad Request:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed.",
    "details": [
      { "field": "title", "rule": "required", "message": "Title is required." },
      { "field": "title", "rule": "maxLength", "message": "Title must be 100 characters or fewer." }
    ]
  }
}
```

**401 Unauthorized:**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication token is missing or expired. Please log in again."
  }
}
```

**403 Forbidden:**

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to modify this note."
  }
}
```

**404 Not Found:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Note with ID 9999 was not found."
  }
}
```

**500 Internal Server Error:**

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Please try again later."
  }
}
```

---

## Authentication

All endpoints except `/api/auth/register` and `/api/auth/login` require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens expire after 24 hours. Clients should implement token refresh logic.

---

## Rate Limiting

- Authenticated users: 100 requests per minute
- Unauthenticated: 20 requests per minute
- Rate limit headers are included in every response:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Unix timestamp when the window resets
