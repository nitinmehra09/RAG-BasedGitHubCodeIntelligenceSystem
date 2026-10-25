# 🤖 RAG-Based GitHub Code Intelligence System — DevPilot

> **Ask any question about your codebase. Get precise answers with exact file and line citations — in real time.**

DevPilot is a full-stack, production-grade **Retrieval-Augmented Generation (RAG)** system that connects to your GitHub repositories and lets you chat with your own code using AI. Instead of generic answers that hallucinate non-existent functions, DevPilot retrieves the *actual code* from your repository and shows you exactly where the answer comes from.

---

## 📖 Table of Contents

1. [What is This Project?](#1-what-is-this-project)
2. [The Big Picture — How It Works in Plain English](#2-the-big-picture--how-it-works-in-plain-english)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [The Three Services](#5-the-three-services-microservices-explained)
6. [The Embedder — Why We Built Our Own](#6-the-embedder--why-we-built-our-own)
7. [How Data is Stored — Database Deep Dive](#7-how-data-is-stored--database-deep-dive)
8. [The Indexing Pipeline — Step by Step](#8-the-indexing-pipeline--step-by-step)
9. [The RAG Query Pipeline — Step by Step](#9-the-rag-query-pipeline--step-by-step)
10. [Authentication and Security](#10-authentication-and-security)
11. [Real-Time Streaming with SSE](#11-real-time-streaming-with-sse)
12. [Data Transfer and API Reference](#12-data-transfer-and-api-reference)
13. [Repository Lifecycle and Expiry System](#13-repository-lifecycle-and-expiry-system)
14. [Frontend — Next.js Client](#14-frontend--nextjs-client)
15. [Local Development Setup](#15-local-development-setup)
16. [Deployment on Railway](#16-deployment-on-railway)
17. [Environment Variables Reference](#17-environment-variables-reference)
18. [Project File Structure](#18-project-file-structure)
19. [Key Design Decisions and Trade-offs](#19-key-design-decisions-and-trade-offs)

---

## 1. What is This Project?

Imagine you join a new team and inherit a massive, undocumented codebase. You want to know:

- *"How does the authentication work?"*
- *"Where is the payment logic handled?"*
- *"What does the processOrder function do?"*

Normally, you would spend hours grepping through files. **DevPilot solves this** — it reads your entire GitHub repository, understands it at a semantic level, and lets you have a conversation with it. Every answer comes with **citations** (file name + line numbers) so you can jump directly to the relevant source code.

### What makes DevPilot different from just asking ChatGPT?

| Regular LLM (ChatGPT) | DevPilot |
|---|---|
| Answers from general training data | Answers from *your actual code* |
| Cannot read private repos | Reads both public and private repos via OAuth |
| Hallucinates function names and files | Shows exact file paths and line numbers |
| No citations | Every answer is cited with source |
| Gives generic advice | Specific to your codebase architecture |

---

## 2. The Big Picture — How It Works in Plain English

Think of DevPilot as a **very smart librarian** for your code.

### Phase 1: Building the Library (Indexing)

When you click "Index Repository":

1. DevPilot fetches every code file from your GitHub repository (using your OAuth token).
2. It reads each file and splits it into small, meaningful pieces called **chunks** — like cutting a book into chapters.
3. Each chunk is sent to an AI model that converts it into a **vector** (a long list of numbers, like GPS coordinates) that captures the *meaning* of that code. This is called an **embedding**.
4. These vectors are stored in a special database that can measure how "mathematically close" two pieces of code are. Close = similar meaning.

### Phase 2: Answering Questions (Retrieval + Generation)

When you ask a question:

1. Your question is *also* converted into a vector using the same embedding model.
2. The system looks for the code chunks whose vectors are closest to your question's vector — like finding the nearest GPS locations.
3. The top 5 most relevant code chunks are retrieved.
4. These chunks + your question are sent to an LLM with a prompt that says: "Answer this question using ONLY this code context."
5. The answer streams back to you in real-time, with citations to the exact files.

This approach is called **RAG — Retrieval-Augmented Generation** because we *augment* the LLM's generation ability with *retrieved* context from your actual repository.

---

## 3. System Architecture

DevPilot is a **3-service microservices system**:

```
+-----------------------------------------------------------------------------+
|                           USER'S BROWSER                                     |
|                     Next.js 16 Frontend (React 19)                          |
|              Dashboard · Chat Interface · Indexing Progress                  |
+----------------------------+--------------------------+----------------------+
                             |  REST + SSE              |  REST
                             v                          |
+----------------------------------------+             |
|         Spring Boot 4.1 Backend        |             |
|            (Java 21 · Port 8080)       |             |
|                                        |             |
|  +--------------+  +-----------------+ |             |
|  |  Auth Module |  | Indexing Engine | |             |
|  |   (OAuth2)   |  | (Async Pipeline)| |             |
|  +--------------+  +--------+--------+ |             |
|  +--------------+           |          |             |
|  |  RAG Module  |           | Embed    |             |
|  |  (Chat/SSE)  |           | Chunks   |             |
|  +------+-------+           |          |             |
+---------+-------------------+----------+             |
          |                   |                        |
          | Vector Search     | POST /v1/embeddings    | OAuth + API Calls
          v                   v                        v
+--------------------------------------+  +----------------------------+
|   PostgreSQL 16 + PgVector Extension |  |       GitHub API           |
|                                      |  |   api.github.com           |
|  +--------------+  +---------------+ |  |                            |
|  |  Relational  |  |  Vector Store | |  |  /user/repos               |
|  |    Tables    |  | (vector_store)| |  |  /git/trees/{branch}       |
|  |              |  |  384-dim vecs | |  |  /contents/{path}          |
|  |  users       |  |  cosine sim   | |  +----------------------------+
|  |  repositories|  |  metadata     | |
|  |  chat_session|  |  filters      | |  +----------------------------+
|  |  chat_message|  +---------------+ |  |  Python Embedder Service   |
|  +--------------+                    |  |  FastAPI · Port 8000        |
+--------------------------------------+  |                            |
                                          |  all-MiniLM-L6-v2 model   |
                                          |  384-dimensional output    |
                                          |  OpenAI-compatible API     |
                                          +----------------------------+
```

### How the Services Communicate

- **Frontend → Backend**: Standard HTTPS REST calls + Server-Sent Events (SSE) for chat streaming.
- **Backend → Embedder**: HTTP POST to `/v1/embeddings` in **OpenAI-compatible format** — the backend thinks it's talking to OpenAI, but it's actually talking to our custom Python service.
- **Backend → GitHub**: REST API calls to `api.github.com` using the user's decrypted OAuth token.
- **Backend → PostgreSQL**: JDBC connection through Spring Data JPA for relational tables, plus Spring AI's `VectorStore` abstraction for PgVector.

---

## 4. Technology Stack

### Backend (Spring Boot)

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Core Framework | Spring Boot | 4.1.0 | REST API, Dependency Injection |
| Language | Java | 21 | Backend logic |
| AI Framework | Spring AI | 2.0.0 | Vector stores, embeddings, chat models |
| LLM Provider | Groq Cloud API (OpenAI-compatible) | — | LLM for chat intelligence |
| Embedding Model | Custom Python Embedder | — | 384-dim vector embeddings |
| Database | PostgreSQL 16 | — | Relational data storage |
| Vector Extension | PgVector | — | Similarity search on vectors |
| ORM | Spring Data JPA / Hibernate | — | Entity management |
| Security | Spring Security + OAuth2 | — | GitHub login, session management |
| HTTP Client | Spring RestClient | — | GitHub API and Embedder communication |
| Boilerplate | Project Lombok | — | Auto-generated getters, setters, builders |
| Containerization | Docker | — | Development database |

### Frontend (Next.js)

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 16.2.12 | React Server Components + Routing |
| Language | TypeScript | 5+ | Type safety |
| UI Components | shadcn/ui | Latest | Pre-built accessible UI |
| State Management | TanStack Query | 5.x | Server state + caching |
| Styling | Tailwind CSS | 4.x | Utility-first styling |
| Streaming Markdown | streamdown | 2.x | Real-time markdown rendering |
| Icons | Lucide + React Icons | Latest | Icon library |

### Embedder (Python FastAPI)

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Framework | FastAPI | 0.110+ | HTTP API server |
| ASGI Server | Uvicorn | 0.28+ | Production-grade ASGI server |
| Embedding Library | sentence-transformers | 3.0+ | Loading and running the ML model |
| ML Model | all-MiniLM-L6-v2 | — | Generates 384-dimensional embeddings |
| Validation | Pydantic | 2.x | Request/response validation |

---

## 5. The Three Services (Microservices Explained)

### Service 1: The Frontend (Next.js Client)

**What it does:** The face of DevPilot. Everything the user sees and clicks.

**Key pages:**
- `/login` — GitHub OAuth sign-in page.
- `/dashboard` — Lists all your GitHub repositories with their index status: Pending, Indexing, Ready, Failed, or Expired.
- `/chat/[repoId]` — The main chat interface where you ask questions and get AI answers with code citations.

**How it talks to the backend:**
Uses standard `fetch()` calls for REST. For chat streaming, it uses the browser's native `EventSource` API (SSE), which opens a persistent connection and receives answer tokens one by one as they stream from the LLM.

---

### Service 2: The Backend (Spring Boot API)

**What it does:** The brain of the system. Orchestrates everything.

**Responsibilities:**
1. Authenticates users via GitHub OAuth2.
2. Fetches and stores repository metadata from GitHub.
3. Runs the asynchronous indexing pipeline.
4. Performs RAG retrieval and streams LLM responses.
5. Persists all chat history with citations.

**Port:** `8080` (configurable via `PORT` env var)

---

### Service 3: The Embedder (Python FastAPI)

**What it does:** A dedicated microservice whose only job is to convert text into vector embeddings.

**Port:** `8000` (configurable via `PORT` env var)

**Endpoints:**
- `GET  /`               → Health check (returns model name and dimensions)
- `POST /v1/embeddings`  → OpenAI-compatible embedding endpoint
- `POST /embeddings`     → Same (alternate path)
- `POST /embed`          → Simple native endpoint

---

## 6. The Embedder — Why We Built Our Own

This is one of the most important architectural decisions in DevPilot.

### The Problem with Using OpenAI for Embeddings

When you call OpenAI's embedding API:
- Every chunk of code goes to OpenAI's servers **over the internet**.
- You pay **per token** — indexing a large repository can cost real money.
- There is **network latency** on every single request (50–200ms per call).
- You are **rate-limited** by OpenAI's API quotas.
- Your **code is sent to a third party** — a privacy concern for proprietary codebases.

### Why `all-MiniLM-L6-v2`?

We chose `sentence-transformers/all-MiniLM-L6-v2` specifically because:

| Property | Value | Why it matters |
|---|---|---|
| Model size | ~90 MB | Can run on a basic server or free-tier cloud (Railway) |
| Output dimensions | 384 | Small enough that PgVector is fast; large enough to be accurate |
| Speed | ~1000 sentences/second on CPU | No GPU required |
| Quality | MTEB benchmark competitive | Good semantic understanding of code |
| License | Apache 2.0 | Free for commercial use |

The model understands **meaning**, not just keywords. If you ask "how does login work?", it will find code containing `authenticate()`, `verifyCredentials()`, or `OAuth handler` — even if none contain the word "login" literally.

### How the Embedder Mimics OpenAI's API

Spring AI is designed to talk to OpenAI. Instead of writing a completely custom embedding client, we make the Python FastAPI service **pretend to be OpenAI**:

```
Spring AI (OpenAI Client)                  Python FastAPI
       |                                         |
       |  POST /v1/embeddings                    |
       |  {                                      |
       |    "input": ["def authenticate():"],    |
       |    "model": "all-MiniLM-L6-v2"         |-------------------->|
       |  }                                      |                     |
       |                                         |  model.encode()     |
       |                                         |  -> [0.12, -0.34,   |
       |  <------------------------------------------  0.87, ...]     |
       |  {                                      |<--------------------+
       |    "object": "list",                    |
       |    "data": [{"embedding": [...384]}]    |
       |  }                                      |
```

The backend configuration points Spring AI's OpenAI embedding client to `http://embedder-service:8000` instead of `https://api.openai.com`. Spring AI sends the same JSON it would normally send to OpenAI, and our Python service responds with the same JSON format.

**Configuration in `application.yml`:**
```yaml
spring:
  ai:
    openai:
      embedding:
        base-url: ${EMBEDDER_URL:https://embedder-production-f633.up.railway.app}
        api-key: dummy-key   # Not needed since it is our own service
        options:
          model: all-MiniLM-L6-v2
          dimensions: 384
```

### Self-Hosted Benefits Summary

| Benefit | Detail |
|---|---|
| Zero cost | No API fees for embeddings, ever |
| No rate limits | Can embed as fast as the CPU allows |
| Privacy | Code never leaves your infrastructure |
| Deterministic | Same input always gives the same output |
| Fast | Local network call (~1–5ms) vs internet API call (~50–200ms) |

---

## 7. How Data is Stored — Database Deep Dive

DevPilot uses a **single PostgreSQL 16 database** with the **PgVector extension** installed. This one database serves two fundamentally different purposes in different tables.

### Why PostgreSQL with PgVector?

Instead of using a separate vector database (like Pinecone, Weaviate, or Qdrant), we chose to extend PostgreSQL with the `pgvector` extension. This means:

- **One database to manage** — simpler infrastructure.
- **Transactional consistency** — vectors and relational data are in the same ACID-compliant store.
- **SQL familiarity** — standard tools work (pgAdmin, psql, etc.).
- **Cost efficiency** — one PostgreSQL instance on Railway vs two separate managed services.

The tradeoff is that PgVector is slower than a purpose-built vector DB at very large scales (millions of vectors), but perfectly adequate for repository-sized codebases.

### Database Initialization

When PostgreSQL starts via Docker, the file `docker/postgres/init-extensions.sql` is automatically run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;        -- PgVector: enables the vector type
CREATE EXTENSION IF NOT EXISTS hstore;        -- Key-value metadata storage
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID generation functions
```

Spring Boot's Hibernate with `ddl-auto: update` then automatically creates or updates the relational tables on startup.

---

### Table 1: `users`

Stores one row per GitHub user who has logged in.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Internal user identifier |
| `github_id` | BIGINT (unique) | GitHub's numeric user ID (never changes) |
| `github_username` | VARCHAR(100) | GitHub login handle (e.g., `octocat`) |
| `display_name` | VARCHAR(200) | Full display name from GitHub |
| `avatar_url` | VARCHAR(500) | Profile picture URL |
| `access_token` | TEXT | **AES-encrypted** GitHub OAuth access token |
| `token_scopes` | VARCHAR(500) | OAuth scopes granted |
| `created_at` | TIMESTAMPTZ | Account creation time |

> **Security Note:** The `access_token` column stores the GitHub token in **AES-encrypted form** using Spring Security's `TextEncryptor`. It is decrypted in-memory only when a GitHub API call is needed and immediately garbage collected afterward. It is **never** stored or returned as plaintext.

---

### Table 2: `repositories`

One row per GitHub repository that a user has added to DevPilot.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Internal repository identifier |
| `user_id` | UUID | Owning user |
| `github_repo_id` | BIGINT | GitHub's numeric repo ID |
| `owner` | VARCHAR(100) | Repository owner (username or org) |
| `name` | VARCHAR(200) | Repository name |
| `full_name` | VARCHAR(300) | `owner/name` combined (e.g., `octocat/hello-world`) |
| `is_private` | BOOLEAN | Whether the repo is private on GitHub |
| `default_branch` | VARCHAR(100) | Usually `main` or `master` |
| `language` | VARCHAR(100) | Primary language reported by GitHub |
| `html_url` | VARCHAR(500) | GitHub web URL |
| `description` | TEXT | Repository description |
| `index_status` | VARCHAR(20) | Enum: `PENDING`, `INDEXING`, `READY`, `FAILED`, `EXPIRED` |
| `indexed_at` | TIMESTAMPTZ | When indexing last completed successfully |
| `chunk_count` | INTEGER | Total number of vector chunks stored |
| `files_total` | INTEGER | Total files discovered during indexing |
| `files_processed` | INTEGER | Files successfully processed |
| `error_message` | TEXT | Error details if status is FAILED |
| `created_at` | TIMESTAMPTZ | When user first added this repo |
| `updated_at` | TIMESTAMPTZ | Last status update time |

**Unique constraint:** `(user_id, github_repo_id)` — the same GitHub repo can exist for multiple users but only once per user.

**`index_status` lifecycle:**
```
PENDING ---> INDEXING ---> READY
                 |              |
                 +---> FAILED   +---> EXPIRED (after 5 days by default)
                                           |
                                           +--> INDEXING (on re-index request)
```

---

### Table 3: `chat_sessions`

Each conversation thread belongs to one user and one repository.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Session identifier |
| `user_id` | UUID | Owning user |
| `repository_id` | UUID | Which repo this chat is about |
| `title` | VARCHAR(200) | Chat session title (defaults to "New chat") |
| `created_at` | TIMESTAMPTZ | When the session was started |

---

### Table 4: `chat_messages`

Every individual message (user or AI) in a chat session.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Message identifier |
| `session_id` | UUID | Parent session |
| `role` | VARCHAR(20) | Enum: `USER` or `ASSISTANT` |
| `content` | TEXT | Full message text |
| `citations` | TEXT | JSON array of code citations (file paths + line ranges) |
| `created_at` | TIMESTAMPTZ | Message timestamp |

The `citations` column stores JSON like:
```json
[
  {
    "filePath": "src/main/java/security/AuthFilter.java",
    "startLine": 28,
    "endLine": 64,
    "language": "java"
  }
]
```

---

### Table 5: `vector_store` (PgVector — managed by Spring AI)

This table is **automatically created and managed by Spring AI** when it connects to PostgreSQL with PgVector. You do not write migrations for it.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Vector document identifier |
| `content` | TEXT | The actual code chunk text |
| `metadata` | JSONB | Repository ID, file path, language, chunk index |
| `embedding` | vector(384) | The 384-dimensional float vector |

**The metadata JSON for each vector looks like:**
```json
{
  "repositoryId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  "filePath": "src/services/AuthService.java",
  "language": "java",
  "chunkIndex": 3
}
```

**Multi-tenant isolation:** When searching, the system always adds a filter:
```java
FilterExpressionBuilder().eq("repositoryId", repoId.toString())
```
This means users can only find vectors from their own repositories — other users' code is never returned, even if they somehow knew the UUID.

**Vector similarity search uses cosine distance** — the angle between two vectors in 384-dimensional space. Vectors close in angle = semantically similar content.

---

## 8. The Indexing Pipeline — Step by Step

When a user clicks "Index Repository", here is exactly what happens in the system:

```
User clicks "Index"
        |
        v
POST /api/repos/{id}/index
        |
        v
RepoController.triggerIndexing()
  - Validates user owns this repo
  - Sets status = INDEXING in the database
  - Returns 202 Accepted immediately (non-blocking)
        |
        +-----------------------------------+
        |                                   |
        | HTTP Response returned to user    |
        |                                   |
        v                                   v
IndexingService.indexAsync()        Frontend polls:
(@Async background thread)          GET /api/repos/{id}/status
                                    every 2 seconds
        |
        v
Step 1: Delete existing vectors
  vectorStore.delete(filter: repositoryId = X)
  Ensures a clean re-index (idempotent operation)
        |
        v
Step 2: Fetch repository file tree
  GithubApiClient.getRepoTree(token, owner, repo, branch)
  Calls: GET https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1
  Returns: flat list of ALL files in the repository
        |
        v
Step 3: Filter eligible files (CodeFileFilter.isEligible)

  SKIP directories:  node_modules, .git, dist, build, target, .next, vendor, __pycache__,
                     .idea, .vscode, coverage, out
  SKIP lockfiles:    package-lock.json, yarn.lock, pnpm-lock.yaml, poetry.lock, cargo.lock
  SKIP hidden files: any file starting with '.'
  SKIP large files:  files > 100KB (configurable via app.indexing.max-file-bytes)

  KEEP extensions:   .java .kt .ts .tsx .js .jsx .py .go .rs .rb .php .c .h .cpp
                     .cs .swift .md .yml .yaml .json .toml .xml .properties .gradle
                     .sql .sh .bash .html .css .scss .vue .svelte .dockerfile .makefile
        |
        v
Step 4: For each eligible file...

  a) Fetch raw file content:
     GithubApiClient.getFileContent(token, owner, repo, path)
     GitHub returns Base64-encoded content → decoded to UTF-8 string

  b) Detect language:
     CodeFileFilter.detectLanguage(path) maps extension → language tag
     e.g., ".java" → "java", ".tsx" → "tsx"

  c) Split into chunks (CodeChunker):
     - Prepends header: "// File: {path}\n" to each chunk
     - Uses Spring AI's TokenTextSplitter (~200 tokens = ~800 chars per chunk)
     - Each chunk gets metadata: { repositoryId, filePath, language, chunkIndex }

  d) Add chunks to a rolling batch (VECTOR_BATCH_SIZE = 32)

  e) When batch reaches 32 chunks → vectorStore.add(batch)
     Spring AI calls: POST /v1/embeddings on the Python Embedder
     Embedder returns 384-dim float vectors for each chunk
     Spring AI inserts rows into PostgreSQL vector_store table

  f) Update progress in DB (filesProcessed++, chunkCount += chunks.size())
     Updated every PROGRESS_EVERY_N_FILES = 5 files

  g) GitHubRateLimiter.pause() — small delay between files
     Prevents hitting GitHub's secondary rate limits
        |
        v
Step 5: Flush remaining batch
  vectorStore.add(remaining chunks from the last partial batch)
        |
        v
Step 6: Mark repository as READY
  repo.setIndexStatus(IndexStatus.READY)
  repo.setIndexedAt(Instant.now())
  repo.setChunkCount(totalChunks)
  repo.setFilesProcessed(processedFiles)
  Saved to PostgreSQL
        |
        v
Indexing Complete!
Frontend sees status = READY → shows "Start Chatting" button
```

### Crash Recovery (IndexingRecoveryRunner)

If the server crashes mid-indexing, repositories get stuck in `INDEXING` status. On every server startup, `IndexingRecoveryRunner` (a `CommandLineRunner`) scans for stuck repos and resets them to `FAILED` with the message: *"Indexing was interrupted by server restart. Click Retry to re-index."* — so users always know they need to retry.

---

## 9. The RAG Query Pipeline — Step by Step

When a user sends a chat message, here is the complete flow:

```
User types: "How does token encryption work?"
        |
        v
POST /api/chat/sessions/{sessionId}/messages
  Headers: Accept: text/event-stream
  Body: { "content": "How does token encryption work?" }
        |
        v
ChatController.sendMessage()
  - Validates session belongs to the authenticated user
  - Saves user message to chat_messages table
        |
        v
Step 1: RETRIEVE — CodeContextRetriever.retrieve(repositoryId, question)

  a) Embed the question:
     vectorStore.similaritySearch(SearchRequest) internally calls
     POST /v1/embeddings on the Embedder service
     "How does token encryption work?" → [0.23, -0.41, ...] (384 floats)

  b) Similarity search in PgVector:
     SELECT content, metadata, 1 - (embedding <=> $query_vector) AS similarity
     FROM vector_store
     WHERE metadata->>'repositoryId' = '{repoId}'
     ORDER BY similarity DESC
     LIMIT 5    (configurable via RagSettings.TOP_K_CHUNKS)

  c) Returns top-5 most semantically similar code chunks

  d) CitationMapper extracts filePath, language, chunkIndex from each chunk's metadata
        |
        v
Step 2: BUILD PROMPT — ChatPromptBuilder

  System prompt:
    "You are DevPilot, an expert assistant for the {repo} codebase.
     Answer using ONLY the provided code context.
     If the context is insufficient, say you are unsure.
     Cite file paths and line ranges when relevant.
     Be concise and technical."

  User prompt:
    "Code context:
     {chunk 1 text}

     ---

     {chunk 2 text}

     ---

     ... (up to 5 chunks) ...

     User question:
     How does token encryption work?"
        |
        v
Step 3: GENERATE AND STREAM — ChatStreamHandler.stream()

  An SseEmitter is created (long-lived HTTP connection to browser)

  First SSE event sent immediately:
    event: user_message
    data: {"id":"...","role":"USER","content":"How does token encryption work?"}

  Spring AI ChatClient calls Groq API and streams the response:
    ChatClient.builder(chatModel).build()
      .prompt().system(systemPrompt).user(userPrompt)
      .stream().content()
      .doOnNext(token -> emitter.send(event("token").data(token)))
      .doOnComplete(...)
      .subscribe()

  For each token received from the LLM:
    event: token
    data: "Token"

    event: token
    data: " encryption"

    ... (hundreds of tokens, streaming word by word) ...
        |
        v
Step 4: COMPLETE — Save and finalize

  Full reply assembled from all token strings
  ChatMessage saved to chat_messages table:
    { role: ASSISTANT, content: "...", citations: "[{...}]" }

  Final SSE events sent:
    event: assistant_message
    data: {"id":"...","role":"ASSISTANT","content":"...","citations":[...]}

    event: done
    data: [DONE]

  SseEmitter.complete() — connection closed gracefully
        |
        v
Browser renders streaming answer with file citation links!
```

---

## 10. Authentication and Security

DevPilot uses **GitHub OAuth 2.0** for authentication. No passwords are stored anywhere in the system.

### Login Flow (Detailed)

```
1. User visits /login page on frontend

2. User clicks "Sign in with GitHub"
   Frontend calls GET /api/auth/login-url
   Backend returns: { "url": "/oauth2/authorization/github" }

3. Frontend redirects browser to /oauth2/authorization/github
   Spring Security builds and redirects to GitHub:
   https://github.com/login/oauth/authorize
     ?client_id={GITHUB_CLIENT_ID}
     &redirect_uri=http://backend/login/oauth2/code/github
     &scope=read:user,user:email

4. User sees GitHub's authorization page and clicks "Authorize DevPilot"

5. GitHub redirects back to:
   http://backend/login/oauth2/code/github?code={authorization_code}

6. Spring Security exchanges the authorization code for an access token:
   POST https://github.com/login/oauth/access_token

7. Spring Security fetches user profile:
   GET https://api.github.com/user  (using the access token)

8. GithubOAuth2UserService runs:
   - Looks up user by github_id in the database
   - If not found: creates new User row
   - Encrypts the GitHub access token with AES (TextEncryptor)
   - Saves encrypted token to users.access_token
   - Creates an HTTP session (JSESSIONID cookie)

9. Spring Security redirects to:
   http://frontend/auth/callback

10. Frontend reads session via GET /api/auth/me
    User is now authenticated!
```

### Token Encryption in Detail

GitHub OAuth tokens give full read access to the user's repositories. Storing them in plaintext in a database is a critical security risk. DevPilot uses **Spring Security's `TextEncryptor`** (AES-256-CBC):

```java
// Before storing to database:
String encryptedToken = encryptor.encrypt(rawGithubToken);
user.setAccessToken(encryptedToken);
userRepository.save(user);

// Before making a GitHub API call:
String rawToken = encryptor.decrypt(user.getAccessToken());
// rawToken used for one API call, then garbage collected
```

The encryption master password is provided via the `APP_ENCRYPTION_PASSWORD` environment variable. It never appears in source code or version control.

### Session Cookie Properties

After login, Spring issues a `JSESSIONID` cookie with these security properties:

| Property | Value | Reason |
|---|---|---|
| `SameSite` | `None` | Required for cross-origin frontend/backend setup |
| `Secure` | `true` | Only sent over HTTPS (prevents interception) |
| `HttpOnly` | `true` | Not accessible by JavaScript (prevents XSS theft) |

All `/api/**` endpoints require a valid session cookie. Unauthenticated requests receive `401 Unauthorized`.

### Multi-Tenant Vector Search Security

Every vector document stored in PgVector is tagged with its `repositoryId`. During retrieval, the filter:
```java
var filter = new FilterExpressionBuilder()
    .eq(RagSettings.METADATA_REPO_ID, repositoryId.toString())
    .build();
```
ensures that vector similarity search is **always scoped to a single repository**. Even if a user somehow obtained another user's repository UUID, they would still only see their own repository's vectors because the backend validates repository ownership at the controller level before any search.

---

## 11. Real-Time Streaming with SSE

When the LLM generates an answer, tokens arrive one by one over several seconds. Instead of making the user wait for the full response, DevPilot streams them to the browser instantly as they are generated.

### Why Server-Sent Events (SSE) over WebSockets?

| Feature | SSE | WebSocket |
|---|---|---|
| Communication direction | Server → Client only | Bidirectional |
| HTTP compatibility | Standard HTTP/1.1 and HTTP/2 | Requires HTTP upgrade handshake |
| Spring MVC support | Built-in `SseEmitter` | Requires separate `@ServerEndpoint` |
| Browser auto-reconnect | Built-in behavior | Manual implementation required |
| Per-message overhead | Minimal text framing | Binary framing |
| Best fit | LLM token streaming | Real-time games, collaborative editing |

For LLM responses, we only need **one-way** streaming (server → client). SSE is the simpler, more appropriate choice.

### SSE Event Sequence

The complete sequence of events the browser receives for one chat message:

```
event: user_message
data: {"id":"msg-001","role":"USER","content":"How does auth work?","citations":[],"createdAt":"..."}

event: token
data: "GitHub"

event: token
data: " OAuth"

event: token
data: " is"

event: token
data: " used"

... (hundreds of tokens streamed one by one) ...

event: assistant_message
data: {
  "id": "msg-002",
  "role": "ASSISTANT",
  "content": "GitHub OAuth is used for authentication...",
  "citations": [{"filePath": "config/SecurityConfig.java", "startLine": 30, "endLine": 68, "language": "java"}],
  "createdAt": "..."
}

event: done
data: [DONE]
```

The frontend accumulates tokens into a string in real time, rendering markdown progressively using the `streamdown` library.

---

## 12. Data Transfer and API Reference

### Authentication Endpoints

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/auth/login-url` | No | Returns the GitHub OAuth redirect URL |
| `GET` | `/api/auth/me` | Yes | Returns current user's profile |
| `POST` | `/api/auth/logout` | Yes | Invalidates the session (204 No Content) |

### Repository Endpoints

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/repos?refresh=true` | Yes | List all repositories (optionally sync from GitHub) |
| `GET` | `/api/repos/{id}` | Yes | Get single repository details |
| `POST` | `/api/repos/{id}/index` | Yes | Trigger indexing (returns 202 Accepted immediately) |
| `GET` | `/api/repos/{id}/status` | Yes | Get real-time indexing progress |

### Chat Endpoints

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/chat/sessions` | Yes | Create new chat session |
| `GET` | `/api/chat/sessions?repositoryId={id}` | Yes | List all sessions for a repository |
| `GET` | `/api/chat/sessions/{id}` | Yes | Get all messages in a session |
| `POST` | `/api/chat/sessions/{id}/messages` | Yes | Send message and stream AI reply via SSE |

### Embedder Endpoints (Internal — called by Backend)

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check — returns model name and dimensions |
| `POST` | `/v1/embeddings` | OpenAI-compatible endpoint — accepts text, returns 384-dim vectors |
| `POST` | `/embed` | Native endpoint for direct batch embedding |

### Example: Indexing Status Response

```json
{
  "repositoryId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  "status": "INDEXING",
  "filesTotal": 87,
  "filesProcessed": 42,
  "chunkCount": 315,
  "errorMessage": null,
  "updatedAt": "2026-09-06T12:05:00Z"
}
```

### Example: Repository List Response

```json
[
  {
    "id": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    "githubRepoId": 87654321,
    "owner": "octocat",
    "name": "Hello-World",
    "fullName": "octocat/Hello-World",
    "isPrivate": false,
    "defaultBranch": "main",
    "language": "Java",
    "htmlUrl": "https://github.com/octocat/Hello-World",
    "description": "My first repository",
    "indexStatus": "READY",
    "indexedAt": "2026-09-06T12:00:00Z",
    "chunkCount": 420,
    "filesTotal": 87,
    "filesProcessed": 87,
    "errorMessage": null
  }
]
```

### Example: Chat Message with Citation

```json
{
  "id": "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55",
  "role": "ASSISTANT",
  "content": "The security filter is configured in SecurityConfig.java. The HttpSecurity chain sets up OAuth2 login with a custom success handler that redirects to the frontend callback URL...",
  "citations": [
    {
      "filePath": "src/main/java/DevPilot/Backend/config/SecurityConfig.java",
      "startLine": 30,
      "endLine": 68,
      "language": "java"
    }
  ],
  "createdAt": "2026-09-06T12:11:05Z"
}
```

---

## 13. Repository Lifecycle and Expiry System

### Why Vectors Expire

Vector embeddings take up disk space in PostgreSQL (384 floats × 4 bytes = 1.5KB per vector; 1000 vectors = 1.5MB). For repositories that are not actively being used, keeping their vectors forever wastes storage. DevPilot implements an automatic **TTL (Time To Live)** system.

### Default TTL: 5 Days

After a repository is indexed (`status = READY`) and 5 days pass since the last indexing (`indexed_at` column), the nightly expiry job automatically:

1. Deletes all vectors from the `vector_store` table for that repository (`repositoryId` filter).
2. Resets: `index_status = EXPIRED`, `chunk_count = 0`, `files_processed = 0`, `indexed_at = null`.

The user sees the repo as "Expired" on their dashboard and can click "Re-index" at any time to rebuild it.

### The Nightly Scheduler

`RepoExpiryScheduler` runs every day at **2:00 AM server time**:

```java
@Scheduled(cron = "0 0 2 * * *")
public void expireStaleRepos() {
    Instant cutoff = Instant.now().minus(Duration.ofDays(expiryDays)); // default: 5 days
    List<Repository> stale = repositoryRepository
        .findByIndexStatusAndIndexedAtBefore(IndexStatus.READY, cutoff);

    for (Repository repo : stale) {
        indexingService.expireRepo(repo.getId());
        // Deletes vectors + resets status to EXPIRED
    }
}
```

### Configuring the TTL

In `application.yml` or via environment variable:

```yaml
app:
  indexing:
    expiry-days: 5   # Change to any number of days you prefer
```

This keeps the `vector_store` table lean, prevents unbounded storage growth, and ensures the system scales gracefully as more users add repositories.

---

## 14. Frontend — Next.js Client

The frontend is a **Next.js 16** application using the App Router pattern with **React 19**.

### Application Pages

| Route | Purpose |
|---|---|
| `/` | Landing page — redirects to `/dashboard` if logged in, else `/login` |
| `/login` | GitHub OAuth sign-in page |
| `/auth/callback` | OAuth callback handler — establishes session |
| `/dashboard` | Repository list with status badges and index/chat buttons |
| `/chat/[repoId]` | Full chat interface for a specific repository |

### Key Frontend Features

**Real-time indexing progress:**  
The dashboard polls `GET /api/repos/{id}/status` every 2 seconds during active indexing and shows a progress bar: "42 / 87 files processed — 315 chunks created."

**Streaming chat interface:**  
Uses the browser's `EventSource` API to receive SSE tokens. The `streamdown` library renders markdown progressively — code blocks, headers, and bullet points appear as the LLM generates them rather than all at once.

**Citation display:**  
AI answers show clickable file path references. Each citation shows the file name and line range (e.g., `SecurityConfig.java:30-68`). Users can immediately jump to the relevant code.

**Theme support:**  
Dark and light mode managed via `next-themes`.

### State Management

Uses **TanStack Query** (`@tanstack/react-query`) for:
- Fetching and caching repository lists.
- Polling repository indexing status.
- Loading chat session history.

No Redux or Zustand is needed — TanStack Query handles server state beautifully.

---

## 15. Local Development Setup

### Prerequisites

- Java 21 JDK (download from https://adoptium.net)
- Node.js 20+ (download from https://nodejs.org)
- Docker Desktop (download from https://www.docker.com/products/docker-desktop)
- Python 3.11+ (download from https://python.org)
- A GitHub OAuth App — create at https://github.com/settings/developers
- A Groq API key — get for free at https://console.groq.com

### Step 1: Clone and Start the Database

```bash
git clone https://github.com/your-username/RAG-Based-GitHub-Code-Intelligence-System.git
cd RAG-Based-GitHub-Code-Intelligence-System

# Start PostgreSQL with PgVector
docker compose up -d
```

This starts PostgreSQL 16 on port `5433` with the `vector`, `hstore`, and `uuid-ossp` extensions pre-installed via the init SQL script.

### Step 2: Start the Embedder Service

```bash
cd embedder
pip install -r requirements.txt
python main.py
# Service starts on http://localhost:8000
```

On first run, `sentence-transformers` automatically downloads the `all-MiniLM-L6-v2` model (~90 MB from Hugging Face). Subsequent starts are instant because the model is cached locally.

Verify it is running:
```bash
curl http://localhost:8000
# Expected: {"status":"UP","service":"DevPilot Python Embedder","model":"...","dimensions":384}
```

### Step 3: Configure the Backend

```bash
cd Backend
cp .env.example .env
```

Edit `.env`:
```env
# Database
DB_URL=jdbc:postgresql://localhost:5433/devpilot
DB_USERNAME=postgres
DB_PASSWORD=postgres

# LLM (Groq)
GROQ_API_KEY=gsk_your_groq_api_key_here

# GitHub OAuth (create app at https://github.com/settings/developers)
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret

# Service URLs
APP_FRONTEND_URL=http://localhost:3000
EMBEDDER_URL=http://localhost:8000

# Security (generate random values)
APP_ENCRYPTION_PASSWORD=any_random_string_at_least_32_characters_long
APP_ENCRYPTION_SALT=1234567890abcdef
```

### Step 4: Start the Backend

```bash
cd Backend

# Linux / macOS
./mvnw spring-boot:run

# Windows PowerShell
.\mvnw.cmd spring-boot:run
```

On first start, Hibernate reads all `@Entity` classes and creates the database tables automatically (`ddl-auto: update`). You will see logs like:
```
Hibernate: create table users (...)
Hibernate: create table repositories (...)
Hibernate: create table chat_sessions (...)
Hibernate: create table chat_messages (...)
```

Spring AI also creates the `vector_store` table with the 384-dimensional `vector` column.

Backend health check:
```bash
curl http://localhost:8080/actuator/health
# Expected: {"status":"UP"}
```

### Step 5: Start the Frontend

```bash
cd client
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local

npm run dev
# Frontend starts on http://localhost:3000
```

### Step 6: Configure GitHub OAuth App

In your GitHub OAuth App settings (https://github.com/settings/developers):
- **Homepage URL:** `http://localhost:3000`
- **Authorization callback URL:** `http://localhost:8080/login/oauth2/code/github`

Open `http://localhost:3000` in your browser, sign in with GitHub, and you're ready to index your first repository!

---

## 16. Deployment on Railway

All three services are deployed independently on [Railway](https://railway.app), which provides automatic Docker-based deployment from a GitHub repository.

### Backend Deployment

The `Backend/Dockerfile` is a **multi-stage build** for a lean production image:

```dockerfile
# Stage 1: Build the fat JAR
FROM maven:3.9-eclipse-temurin-21 AS build
COPY . .
RUN ./mvnw package -DskipTests

# Stage 2: Minimal JRE image to run the JAR
FROM eclipse-temurin:21-jre
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

`Backend/railway.toml` sets the health check:
```toml
[deploy]
healthcheckPath = "/actuator/health"
healthcheckTimeout = 30
```

### Embedder Deployment

The `embedder/Dockerfile` downloads the model at build time:
```dockerfile
FROM python:3.11-slim
COPY requirements.txt .
RUN pip install -r requirements.txt

# Pre-download model at build time (not runtime) for fast startup
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

COPY main.py .
CMD ["python", "main.py"]
```

### PostgreSQL on Railway

Railway provides a managed PostgreSQL service. You need to:
1. Add a PostgreSQL plugin to your Railway project.
2. Railway automatically injects `DATABASE_URL` into the backend service.
3. Manually install the PgVector extension by running in Railway's PostgreSQL console:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Environment Variables to Set on Railway (Backend Service)

```
GROQ_API_KEY=gsk_...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
APP_FRONTEND_URL=https://your-frontend.railway.app
APP_CORS_ALLOWED_ORIGINS=https://your-frontend.railway.app
EMBEDDER_URL=https://your-embedder.railway.app
APP_ENCRYPTION_PASSWORD=your_very_secret_random_password_here
APP_ENCRYPTION_SALT=16hexcharactershere
```

### GitHub OAuth App for Production

Update your GitHub OAuth App:
- **Homepage URL:** `https://your-frontend.railway.app`
- **Authorization callback URL:** `https://your-backend.railway.app/login/oauth2/code/github`

---

## 17. Environment Variables Reference

### Backend Environment Variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `8080` | No | HTTP server port |
| `DATABASE_URL` or `DB_URL` | `jdbc:postgresql://localhost:5433/devpilot` | Yes | PostgreSQL JDBC connection URL |
| `DB_USERNAME` | `postgres` | Yes | Database username |
| `DB_PASSWORD` | `postgres` | Yes | Database password |
| `GROQ_API_KEY` | — | Yes | Groq Cloud API key for the LLM chat model |
| `GROQ_CHAT_MODEL` | `openai/gpt-oss-120b` | No | LLM model name to use for chat |
| `GITHUB_CLIENT_ID` | — | Yes | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | — | Yes | GitHub OAuth App client secret |
| `APP_FRONTEND_URL` | `http://localhost:3000` | Yes | Frontend URL (used for CORS and OAuth redirects) |
| `APP_CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | No | Comma-separated CORS origins |
| `EMBEDDER_URL` | `https://embedder-production-f633.up.railway.app` | Yes | Base URL of the Python embedder service |
| `APP_ENCRYPTION_PASSWORD` | `devpilot_secret_master_key_12345` | Yes | AES encryption key for GitHub access tokens |
| `APP_ENCRYPTION_SALT` | `5c0744940b5c369b` | Yes | Encryption salt (16-character hex string) |

### Embedder Environment Variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `8000` | No | HTTP server port |
| `MODEL_NAME` | `sentence-transformers/all-MiniLM-L6-v2` | No | Hugging Face model identifier |

### Frontend Environment Variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Yes | Backend API base URL |

---

## 18. Project File Structure

```
RAG-Based-GitHub-Code-Intelligence-System/
|
+-- docker-compose.yml                    # PostgreSQL 16 + PgVector for local dev
+-- docker/
|   +-- postgres/
|       +-- init-extensions.sql           # Installs: vector, hstore, uuid-ossp
|
+-- embedder/                             # Python FastAPI Embedding Microservice
|   +-- main.py                          # FastAPI app + SentenceTransformer logic
|   +-- requirements.txt                 # fastapi, uvicorn, pydantic, sentence-transformers
|   +-- Dockerfile                       # Docker image (model pre-downloaded at build)
|   +-- railway.toml                     # Railway deployment configuration
|
+-- Backend/                              # Spring Boot Java Backend
|   +-- pom.xml                          # Maven build file and dependencies
|   +-- Dockerfile                       # Multi-stage Docker build
|   +-- .env.example                     # Template for environment variables
|   +-- application.yml                  # Spring Boot configuration
|   +-- src/main/java/devPilot/backend/
|       +-- BackendApplication.java      # Spring Boot entry point
|       |
|       +-- config/
|       |   +-- SecurityConfig.java      # Spring Security: OAuth2, CORS, session policy
|       |
|       +-- controllers/
|       |   +-- AuthController.java      # GET /api/auth/login-url, /me, POST /logout
|       |   +-- RepoController.java      # GET/POST /api/repos, /index, /status
|       |   +-- ChatController.java      # POST/GET /api/chat/sessions and messages
|       |   +-- DebugController.java     # Debug and diagnostic endpoints
|       |
|       +-- entity/
|       |   +-- User.java               # users table entity
|       |   +-- Repository.java         # repositories table entity
|       |   +-- ChatSession.java        # chat_sessions table entity
|       |   +-- ChatMessage.java        # chat_messages table entity
|       |   +-- IndexStatus.java        # Enum: PENDING, INDEXING, READY, FAILED, EXPIRED
|       |   +-- MessageRole.java        # Enum: USER, ASSISTANT
|       |
|       +-- services/
|       |   +-- UserService.java        # User CRUD, token encryption/decryption
|       |   +-- RepoService.java        # GitHub repo sync, repository management
|       |   +-- ChatService.java        # Chat session and message management
|       |   |
|       |   +-- ai/
|       |   |   +-- CodeContextRetriever.java   # Vector similarity search (RAG retrieve step)
|       |   |   +-- ChatPromptBuilder.java       # Builds system + user prompts for LLM
|       |   |   +-- ChatStreamHandler.java       # SSE streaming + save assistant reply to DB
|       |   |   +-- CitationMapper.java          # Document metadata -> CitationDto converter
|       |   |   +-- RagSettings.java             # Constants: TOP_K=5, stream timeout
|       |   |   +-- RetrievedContext.java        # Record(citations, contextText) return type
|       |   |
|       |   +-- github/
|       |   |   +-- GithubApiClient.java         # GitHub REST API calls (repos, tree, content)
|       |   |   +-- GitHubRateLimiter.java       # Pause between GitHub API calls
|       |   |
|       |   +-- indexing/
|       |       +-- IndexingService.java          # Main indexing pipeline orchestrator
|       |       +-- CodeChunker.java              # Spring AI TokenTextSplitter wrapper
|       |       +-- CodeFileFilter.java           # File eligibility check + language detection
|       |       +-- IndexingRecoveryRunner.java   # On startup: reset stuck INDEXING repos
|       |       +-- RepoExpiryScheduler.java      # Nightly cron: expire old vector data
|       |
|       +-- security/
|       |   +-- GithubOAuth2UserService.java     # OAuth2 user creation + AES token encryption
|       |
|       +-- repository/                           # Spring Data JPA repository interfaces
|       +-- dto/                                  # Request and Response DTOs (data transfer objects)
|       +-- exceptions/                           # Custom exception classes
|
+-- client/                               # Next.js Frontend Application
    +-- package.json                      # Dependencies: Next.js, React, TanStack Query, shadcn
    +-- next.config.ts                    # Next.js configuration
    +-- tsconfig.json                     # TypeScript configuration
    |
    +-- app/                              # App Router pages
    |   +-- page.tsx                      # Landing page
    |   +-- layout.tsx                    # Root layout with providers
    |   +-- login/                        # GitHub OAuth sign-in page
    |   +-- auth/                         # OAuth callback handler
    |   +-- dashboard/                    # Repository list and management
    |   +-- chat/                         # Chat interface with SSE streaming
    |
    +-- components/
    |   +-- chat/                         # Chat UI, message feed, citations display
    |   +-- dashboard/                    # Repository cards, status badges, index buttons
    |   +-- layout/                       # Shared header and navigation
    |   +-- ui/                           # Base shadcn/ui components
    |
    +-- hooks/                            # Custom React hooks
    +-- lib/                              # API client utilities, helpers
    +-- types/                            # TypeScript type definitions
```

---

## 19. Key Design Decisions and Trade-offs

### Why Groq Instead of OpenAI for the LLM?

Groq provides extremely fast inference — their LPU hardware generates tokens significantly faster than standard GPU-based providers, resulting in noticeably lower latency for the streaming chat interface. Because Spring AI uses OpenAI's API format, switching between Groq, OpenAI, or any compatible provider requires only a URL and model name change in `application.yml`. No code changes are required.

### Why Not Use a Separate Vector Database?

Using PgVector inside PostgreSQL means:
- One less service to deploy, monitor, and maintain.
- ACID transactions span both relational and vector data.
- Standard PostgreSQL tooling works (pgAdmin, psql, pg_dump).
- One hosting bill instead of two.

The tradeoff: PgVector is slower than purpose-built vector databases at massive scale (tens of millions of vectors). For the scale of individual GitHub repositories (typically a few hundred to a few thousand chunks), PgVector performs excellently.

### Why Chunk Size of ~800 Characters / ~200 Tokens?

This balances several competing needs:
- **Too small (< 100 chars):** A chunk loses all surrounding context. A single line of code without its function signature is meaningless.
- **Too large (> 2000 chars):** Fewer distinct chunks in the database means lower search precision. Also risks exceeding the LLM's context window when 5 chunks are combined.
- **~800 chars:** Captures roughly one complete function or one logical block of code — a natural semantic unit that the embedding model can represent meaningfully.

### Why `@Async` for Indexing?

Indexing even a medium-sized repository can take several minutes. Blocking the HTTP request thread for that duration would cause the frontend to time out, show an error, and leave the user confused. The `@Async` pattern allows:
- Immediate `202 Accepted` response to the frontend.
- Background indexing on a dedicated thread pool (`indexingExecutor`).
- Progress updates polled separately by the frontend.
- Clean separation of concerns.

### Why Batch Size 32 for Vector Inserts?

Vector insertions go to the Embedder (one HTTP round-trip) and then to PostgreSQL (one INSERT batch). The batch size of 32 is chosen to:
- Keep each batch's memory footprint small (~32 × 800 chars = ~25KB of text).
- Reduce the number of HTTP calls to the embedder (1 call per 32 chunks vs 1 call per chunk).
- Balance throughput with memory usage on small cloud instances.

### Why AES Encrypt GitHub Tokens Instead of Hashing?

Hashing is a one-way operation — you can verify a stored hash against an input but you cannot recover the original value. Since DevPilot needs to actually **use** the GitHub access token (send it in `Authorization: Bearer` headers to GitHub's API), the token must be recoverable. AES encryption is a reversible operation: encrypt before storing, decrypt before using. The decrypted token exists in memory for the duration of one API call and is then garbage collected.

### Why `all-MiniLM-L6-v2` Over Larger Embedding Models?

Larger embedding models (e.g., OpenAI's `text-embedding-3-large` with 3072 dimensions) offer marginally better semantic quality but require:
- **8× more disk storage** per vector (3072 floats vs 384 floats).
- **8× more computation** per similarity search.
- **8× more RAM** on the embedder server.
- **API costs** (if using a commercial provider).

For code search quality at the repository scale, the improvement of larger models is marginal and not worth the infrastructure cost. The `all-MiniLM-L6-v2` model at 384 dimensions hits the ideal cost-quality sweet spot for this use case.

---

## Summary

DevPilot is a production-ready RAG system built on three pillars:

1. **Self-hosted embedding** via a Python FastAPI service using `all-MiniLM-L6-v2` — zero cost, full code privacy, no rate limits.
2. **PgVector-powered semantic search** inside PostgreSQL — one database, SQL simplicity, ACID transactions, vector power.
3. **Real-time SSE streaming** — users see answers appear word by word as the LLM generates them, not after a long loading wait.

The system is designed to be:
- **Simple to understand** — 3 services, one database, clear separation of concerns.
- **Secure by default** — AES-encrypted OAuth tokens, HttpOnly session cookies, per-repository vector isolation.
- **Resilient** — crash recovery for stuck indexing jobs, daily expiry cleanup, async non-blocking pipeline.
- **Cost-efficient** — self-hosted embeddings eliminate per-token API costs; PgVector eliminates the need for a separate vector database subscription.

---

*Built with Spring Boot 4, Next.js 16, Python FastAPI, and PostgreSQL + PgVector.*
