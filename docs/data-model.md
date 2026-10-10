# QuickNotes Data Model Document

## Overview

This document describes the database schema for the QuickNotes application. We use a relational database (PostgreSQL) with four core entities: `users`, `notes`, `tags`, and `note_tags`.

---

## Entities and Columns

### 1. `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-incrementing unique identifier |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | User's email address (used for login) |
| `password_hash` | `VARCHAR(255)` | NOT NULL | Bcrypt hash of the user's password |
| `display_name` | `VARCHAR(100)` | NOT NULL | User's display name |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Last update timestamp |

### 2. `notes`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-incrementing unique identifier |
| `user_id` | `INTEGER` | NOT NULL, FOREIGN KEY → users(id) | Owner of the note |
| `title` | `VARCHAR(100)` | NOT NULL | Note title (max 100 characters) |
| `body` | `TEXT` | | Note content (optional) |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Last modification timestamp |

### 3. `tags`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-incrementing unique identifier |
| `user_id` | `INTEGER` | NOT NULL, FOREIGN KEY → users(id) | Owner of the tag |
| `name` | `VARCHAR(50)` | NOT NULL | Tag name |
| `color` | `VARCHAR(7)` | DEFAULT '#6366f1' | Hex color for UI display |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Creation timestamp |

### 4. `note_tags` (junction table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `note_id` | `INTEGER` | NOT NULL, FOREIGN KEY → notes(id), ON DELETE CASCADE | Reference to the note |
| `tag_id` | `INTEGER` | NOT NULL, FOREIGN KEY → tags(id), ON DELETE CASCADE | Reference to the tag |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | When the tag was added to the note |

**Composite Primary Key:** `(note_id, tag_id)`

---

## Relationships

### One-to-Many: `users` → `notes`

A single user can have many notes, but each note belongs to exactly one user. The `user_id` column in the `notes` table is a foreign key referencing `users(id)`. This relationship is enforced with `ON DELETE CASCADE` so that when a user is deleted, all their notes are automatically removed.

### One-to-Many: `users` → `tags`

A single user can create many tags, but each tag belongs to exactly one user. The `user_id` column in the `tags` table is a foreign key referencing `users(id)`.

### Many-to-Many: `notes` ↔ `tags` (via `note_tags`)

A note can have multiple tags, and a tag can be applied to multiple notes. This many-to-many relationship is resolved through the `note_tags` junction table, which holds pairs of `(note_id, tag_id)`. When a note is deleted, all its tag associations are removed automatically via `ON DELETE CASCADE`. Similarly, when a tag is deleted, it is removed from all notes.

---

## CREATE TABLE Statements

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Notes table
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    body TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tags table
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);

-- Junction table for many-to-many relationship between notes and tags
CREATE TABLE note_tags (
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (note_id, tag_id)
);
```

---

## Example SQL Queries

### Query 1: Get all notes for a user (with pagination)

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = $1
ORDER BY updated_at DESC
LIMIT $2 OFFSET $3;
```

### Query 2: Get a note with its tags (JOIN)

```sql
SELECT
    n.id,
    n.title,
    n.body,
    n.created_at,
    n.updated_at,
    COALESCE(
        json_agg(
            json_build_object('id', t.id, 'name', t.name, 'color', t.color)
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'
    ) AS tags
FROM notes n
LEFT JOIN note_tags nt ON nt.note_id = n.id
LEFT JOIN tags t ON t.id = nt.tag_id
WHERE n.id = $1 AND n.user_id = $2
GROUP BY n.id;
```

### Query 3: Search notes by title or body content

```sql
SELECT id, title, body, created_at
FROM notes
WHERE user_id = $1
  AND (title ILIKE $2 OR body ILIKE $2)
ORDER BY updated_at DESC
LIMIT 20;
```

### Query 4: Count notes per tag for a user

```sql
SELECT t.name, t.color, COUNT(nt.note_id) AS note_count
FROM tags t
LEFT JOIN note_tags nt ON nt.tag_id = t.id
WHERE t.user_id = $1
GROUP BY t.id, t.name, t.color
ORDER BY note_count DESC;
```

### Query 5: Create a note and associate tags in one transaction

```sql
-- Step 1: Insert the note
INSERT INTO notes (user_id, title, body)
VALUES ($1, $2, $3)
RETURNING id;

-- Step 2: Insert tag associations (using the returned note_id)
INSERT INTO note_tags (note_id, tag_id)
VALUES ($1, $2), ($1, $3), ($1, $4);
```

---

## Indexes

### Index 1: `idx_notes_user_id_updated_at`

```sql
CREATE INDEX idx_notes_user_id_updated_at ON notes (user_id, updated_at DESC);
```

**Reason:** The most common query pattern is fetching a user's notes sorted by most recently updated. This composite index supports both the `WHERE user_id = ?` filter and the `ORDER BY updated_at DESC` sort in a single index scan, avoiding a full table scan and sort operation.

### Index 2: `idx_notes_user_id_title`

```sql
CREATE INDEX idx_notes_user_id_title ON notes (user_id, title);
```

**Reason:** Supports searching notes by title within a user's collection. Combined with the ILIKE query, this index helps narrow down results to a specific user before performing the text search.

### Index 3: `idx_note_tags_tag_id`

```sql
CREATE INDEX idx_note_tags_tag_id ON note_tags (tag_id);
```

**Reason:** When fetching all notes associated with a specific tag, the database needs to efficiently look up rows by `tag_id`. While the primary key covers `(note_id, tag_id)`, queries filtering by `tag_id` alone need a separate index to avoid scanning the entire junction table.

---

## SQL vs NoSQL Justification

We chose **SQL (PostgreSQL)** over NoSQL for QuickNotes because the data model has well-defined, structured relationships between users, notes, and tags that benefit from referential integrity enforced by foreign keys. The many-to-many relationship between notes and tags requires a junction table with cascading deletes, which is natural in SQL but awkward in most document databases. Additionally, we need transactional consistency when creating notes with tags (both inserts must succeed or fail together), which SQL handles natively with ACID transactions. Full-text search on note content can be achieved with PostgreSQL's built-in `tsvector` and `ILIKE` operators, eliminating the need for a separate search engine at this scale. Finally, SQL's mature ecosystem of ORMs, migration tools, and monitoring solutions reduces development time and operational risk compared to managing a NoSQL cluster.
