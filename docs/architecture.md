# QuickNotes Architecture Document

## Overview

This document describes the system architecture for QuickNotes, designed to serve 1 million users. It covers requirements, load estimates, the architecture diagram, component explanations, request flows, and trade-offs.

---

## Functional Requirements

1. **User Authentication** — Users can register, log in, and log out securely.
2. **Create Notes** — Authenticated users can create notes with a title (required, max 100 chars) and optional body.
3. **Read Notes** — Users can list their own notes (paginated) and view individual notes.
4. **Update Notes** — Users can edit the title and body of their own notes.
5. **Delete Notes** — Users can permanently delete their own notes.
6. **Tag Management** — Users can create tags and associate them with notes (many-to-many).
7. **Search** — Users can search their notes by keyword in title or body.
8. **Data Isolation** — Users can only see and modify their own data.

## Non-Functional Requirements

1. **Availability** — 99.9% uptime (less than 8.76 hours of downtime per year).
2. **Latency** — API responses under 200ms at the 95th percentile.
3. **Throughput** — Support 1 million registered users with peak concurrent usage.
4. **Scalability** — Horizontal scaling of application servers to handle traffic growth.
5. **Security** — All data encrypted in transit (TLS) and at rest; passwords hashed with bcrypt.
6. **Durability** — No data loss; database replicated with automatic failover.
7. **Consistency** — Strong consistency for reads after writes (read-your-writes).

---

## Load Estimates (1 Million Users)

### Assumptions

- 1 million registered users
- 10% daily active users (DAU) = 100,000 users per day
- Peak hour has 3× average traffic
- Average session: 10 minutes, 20 actions per session

### Calculations

| Metric | Calculation | Value |
|--------|-------------|-------|
| **Reads per second (peak)** | 100,000 DAU × 20 actions × 70% reads ÷ (peak hours × 3600) | **~1,200 RPS** |
| **Writes per second (peak)** | 100,000 DAU × 20 actions × 30% writes ÷ (peak hours × 3600) | **~500 WPS** |
| **Storage per year** | 1M users × avg 50 notes × 1KB per note × 1.5 (indexes/overhead) | **~75 GB/year** |
| **Database size (5 years)** | 75 GB × 5 | **~375 GB** |

### Summary

- **Peak reads:** ~1,200 requests/second
- **Peak writes:** ~500 requests/second
- **Annual storage growth:** ~75 GB/year
- **Total storage (5 years):** ~375 GB (manageable on a single primary with read replicas)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │  Web Browser  │  │  Mobile App  │  │   API Client  │                      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                      │
└─────────┼──────────────────┼──────────────────┼─────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  DNS (Route 53)  ──▶  Resolves api.quicknotes.app to CDN/LB IP             │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  CDN (CloudFront)  ──▶  Serves static assets (JS, CSS, images)             │
│                         Caches GET /notes responses for anonymous users     │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LOAD BALANCER (ALB/Nginx)  ──▶  Distributes traffic across app servers    │
│                                  Health checks, SSL termination             │
└────────┬─────────────────────────────────────────────────┬──────────────────┘
         │                                                 │
         ▼                                                 ▼
┌─────────────────────┐                        ┌─────────────────────┐
│  APP SERVER 1       │                        │  APP SERVER 2       │
│  (Node.js/Express)  │                        │  (Node.js/Express)  │
│  - REST API         │                        │  - REST API         │
│  - Auth (JWT)       │                        │  - Auth (JWT)       │
│  - Validation       │                        │  - Validation       │
└────────┬────────────┘                        └────────┬────────────┘
         │                                              │
         ▼                                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  CACHE (Redis Cluster)  ──▶  Session tokens, hot note data, rate limits    │
│                              Reduces database load for repeated reads       │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                                           ▼
┌─────────────────────┐                ┌─────────────────────────┐
│  PRIMARY DATABASE   │   replication  │  READ REPLICA           │
│  (PostgreSQL)       │ ──────────────▶│  (PostgreSQL)           │
│  - Writes           │                │  - Read queries          │
│  - Transactions     │                │  - List/search notes     │
└─────────────────────┘                └─────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  MESSAGE QUEUE (RabbitMQ/SQS)  ──▶  Async job processing                   │
│                                    Decouples slow operations from API       │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  WORKER (Background Jobs)  ──▶  Email notifications, search index updates, │
│                                 analytics aggregation, cleanup tasks        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Explanations

| Component | Problem It Solves |
|-----------|-------------------|
| **Client (Browser/Mobile)** | Provides the user interface for creating, reading, and managing notes. Runs JavaScript that calls the REST API. |
| **DNS** | Translates the human-readable domain name `api.quicknotes.app` into an IP address, enabling clients to find the service. |
| **CDN** | Caches static assets (JS, CSS, images) at edge locations worldwide, reducing latency for users and offloading traffic from origin servers. |
| **Load Balancer** | Distributes incoming API requests across multiple application servers to prevent any single server from being overwhelmed and to provide failover if a server goes down. |
| **App Servers (×2+)** | Process API requests: validate input, authenticate users, query the database, and return responses. Multiple servers provide horizontal scaling and redundancy. |
| **Cache (Redis)** | Stores frequently accessed data (session tokens, popular notes) in memory to serve reads in microseconds instead of hitting the database, reducing latency and database load. |
| **Primary Database** | The single source of truth for all data. Handles all write operations with ACID guarantees. Stores users, notes, tags, and their relationships. |
| **Read Replica** | An asynchronous copy of the primary database that handles read-only queries, offloading read traffic from the primary and improving read latency. |
| **Message Queue** | Accepts tasks that don't need immediate responses (e.g., sending emails, updating search indexes) and holds them until a worker is ready to process them, preventing slow operations from blocking API responses. |
| **Worker** | Processes background jobs from the queue asynchronously, such as sending welcome emails, rebuilding search indexes, or aggregating analytics data. |

---

## Request Flows

### Flow: `GET /api/notes` (List Notes)

1. **Client** sends `GET /api/notes?page=1&limit=10` with JWT token.
2. **DNS** resolves `api.quicknotes.app` to the load balancer IP.
3. **CDN** checks if the response is cached (it isn't, since the request has an auth header). Passes through to origin.
4. **Load Balancer** routes the request to App Server 1 (round-robin).
5. **App Server 1** validates the JWT token (checking Redis cache for session validity).
6. **App Server 1** checks Redis cache for the user's recent notes list.
   - **Cache hit:** Returns cached response immediately.
   - **Cache miss:** Continues to step 7.
7. **App Server 1** queries the **Read Replica** for the user's notes (paginated).
8. **Read Replica** returns the note rows.
9. **App Server 1** queries for associated tags (or uses a JOIN).
10. **App Server 1** serializes the response, stores it in Redis cache (TTL: 60 seconds), and returns it to the client.
11. **Client** renders the notes in the UI.

### Flow: `POST /api/notes` (Create Note)

1. **Client** sends `POST /api/notes` with JSON body and JWT token.
2. **DNS** resolves the domain.
3. **CDN** passes through (POST requests are never cached).
4. **Load Balancer** routes to App Server 2.
5. **App Server 2** validates the JWT token via Redis.
6. **App Server 2** validates the request body (title required, max 100 chars).
   - **Validation fails:** Returns 400 error immediately.
   - **Validation passes:** Continues.
7. **App Server 2** begins a database transaction on the **Primary Database**.
8. **Primary Database** inserts the new note row.
9. **App Server 2** inserts tag associations into `note_tags` (if tags provided).
10. **Primary Database** commits the transaction.
11. **App Server 2** invalidates the user's notes cache in Redis.
12. **App Server 2** publishes a "note_created" event to the **Message Queue** (for search index update, notifications).
13. **App Server 2** returns 201 with the new note data.
14. **Worker** picks up the event and updates the search index asynchronously.
15. **Client** adds the note to the top of the list and shows a success message.

---

## Trade-offs

### Trade-off 1: SQL (PostgreSQL) vs NoSQL (MongoDB)

**Decision:** PostgreSQL (relational SQL database)

**Trade-off:** We sacrifice some write throughput and horizontal scaling simplicity (sharding is harder in SQL) in exchange for strong consistency, referential integrity via foreign keys, and ACID transactions. The many-to-many relationship between notes and tags is natural in SQL with a junction table, whereas in MongoDB it would require either embedding (leading to data duplication) or manual consistency management across documents.

**Mitigation:** Read replicas handle the read-heavy workload, and PostgreSQL can handle our estimated 500 WPS without difficulty. If we ever need to scale writes beyond a single primary, we can implement partitioning by `user_id`.

### Trade-off 2: Synchronous API vs Event-Driven Architecture

**Decision:** Primarily synchronous REST API with an event-driven side channel for non-critical operations.

**Trade-off:** We accept the complexity of maintaining a message queue and worker processes in exchange for keeping API response times low. Without the queue, operations like updating the search index or sending email notifications would block the API response, adding 100-500ms of latency to every write request.

**Mitigation:** The queue is lightweight (RabbitMQ or SQS) and only handles non-critical tasks. Core CRUD operations remain synchronous for simplicity and strong consistency. If the queue goes down, critical operations still work; only background tasks are delayed.

### Trade-off 3: Cache-Aside vs Write-Through Caching

**Decision:** Cache-aside pattern (read-through with lazy loading)

**Trade-off:** We accept the possibility of serving slightly stale data (up to 60 seconds) in exchange for simpler implementation and avoiding the write penalty of write-through caching. In a note-taking app, brief staleness is acceptable—users won't notice if a note they just created takes a few seconds to appear in a cached list.

**Mitigation:** We explicitly invalidate the cache on writes (step 11 in POST flow), so the staleness window is minimal. The cache TTL of 60 seconds is a safety net for cases where invalidation might be missed.

---

## Avoiding Single Points of Failure

| Component | Redundancy Strategy |
|-----------|---------------------|
| **Load Balancer** | Use a managed load balancer (AWS ALB) that is inherently highly available across multiple availability zones. |
| **App Servers** | Run at least 2 instances behind the load balancer. If one fails, health checks remove it from the pool and traffic routes to the remaining server. Auto-scaling adds new instances under load. |
| **Redis Cache** | Deploy Redis in cluster mode with replicas. If the primary Redis node fails, a replica is promoted automatically. The app falls back to database queries if cache is unavailable. |
| **Primary Database** | Use a managed PostgreSQL service (e.g., AWS RDS) with Multi-AZ deployment. Automatic failover to a standby instance within 60 seconds. |
| **Read Replica** | Deploy at least 2 read replicas. If one fails, the app server redirects queries to the remaining replica or the primary. |
| **Message Queue** | Use a managed queue service (SQS) or RabbitMQ cluster with mirrored queues. Workers are stateless and can be scaled horizontally. |
| **CDN** | CDNs are inherently distributed across hundreds of edge locations. No single point of failure. |
| **DNS** | Use a managed DNS service (Route 53) with built-in redundancy and health-based routing. |

**Key principle:** Every component in the architecture has at least one redundant instance or a graceful degradation path. The application servers are stateless (session data in Redis), so any server can handle any request. The database has automatic failover. The cache is optional—the system works without it, just slower.
