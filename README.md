# Documind

Documind is a document ingestion backend built with Fastify, Prisma, PostgreSQL, Redis, BullMQ, and S3. It accepts document uploads, stores the original file in S3, creates a processing task, and hands the work off to a background worker.

The current implementation supports `.pdf` and `.txt` files up to 10 MB.

## Project Status

This repository currently contains the backend API in [`api/`](/Users/meghashukla/Study/documind/api). The upload and worker pipeline is implemented. Chunking and vector-related code exists in the codebase, but it is not yet wired into the worker flow end to end.

## Architecture

1. A client uploads a document to `POST /documents`.
2. The API stores the file in S3.
3. A `Document` row and a `Task` row are created in PostgreSQL.
4. A BullMQ job is pushed to Redis.
5. The worker downloads the file from S3, extracts text, and marks the task as completed or failed.

Core components:

- Fastify API server on port `3001`
- PostgreSQL for application data
- Redis for BullMQ job transport
- S3 bucket for uploaded files
- BullMQ worker for asynchronous processing

## Repository Layout

```text
documind/
├── api/
│   ├── prisma/                 # Prisma schema and migrations
│   ├── scripts/setup-db.ts     # Creates the local PostgreSQL database
│   └── src/
│       ├── modules/document/   # Upload and task endpoints
│       ├── shared/aws/         # S3 integration
│       ├── shared/db/          # Prisma client setup
│       ├── shared/queue/       # BullMQ queue
│       └── worker/             # Background document processor
└── README.md
```

## Prerequisites

Install and run these services locally before starting the app:

- Node.js 20+
- npm
- PostgreSQL 16+ with `pgvector` available
- Redis on `127.0.0.1:6379`
- An S3 bucket and AWS credentials with read/write access

## Environment Variables

Create `api/.env` with the following values:

```env
DATABASE_URL="postgresql://YOUR_USER@localhost:5432/documind"
DATABASE_USER="YOUR_USER"

AWS_ACCESS_KEY="YOUR_ACCESS_KEY"
AWS_SECRET_KEY="YOUR_SECRET_KEY"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-bucket-name"
```

Optional:

```env
DEBUG=1
OPENAI_API_KEY=""
```

Notes:

- `DATABASE_USER` is used by `scripts/setup-db.ts` when creating the local `documind` database.
- Redis is currently hardcoded to `127.0.0.1:6379`.
- The checked-in [`api/.env`](/Users/meghashukla/Study/documind/api/.env) contains real-looking credentials and should not be reused. Rotate them if they are valid.

## Installation

```bash
cd api
npm install
```

## Database Setup

Create the database and apply migrations:

```bash
cd api
npm run db:init
```

What this does:

- `npm run db:setup` creates a local PostgreSQL database named `documind` if it does not already exist
- `npm run db:migrate` applies Prisma migrations, including the `pgvector` extension/table migration

To inspect the database:

```bash
cd api
npm run prisma:studio
```

## Running Locally

Start the API:

```bash
cd api
npm run dev
```

Start the worker in a second terminal:

```bash
cd api
npm run dev:worker
```

Once the API is running:

- Base URL: `http://localhost:3001`
- Swagger UI: `http://localhost:3001/swagger`

## API Endpoints

### `GET /`

Health-style test endpoint.

Example response:

```json
{
  "data": "Hello World 2"
}
```

### `POST /documents`

Uploads a document using multipart form data.

Behavior:

- Requires a file field
- Rejects files larger than 10 MB
- Currently accepts `.pdf` and `.txt` in the worker
- Returns the created `documentId` and async `taskId`

Example:

```bash
curl -X POST http://localhost:3001/documents \
  -F "file=@/absolute/path/to/file.pdf"
```

Example response:

```json
{
  "documentId": "4b5f2b2b-7df0-44b2-92f7-9d9ca4f1c0f0",
  "taskId": "f5f4a2fe-3d1c-45de-bf8e-1a1b965f4a76",
  "status": "PENDING"
}
```

### `GET /task/:id`

Returns the current task state.

Example:

```bash
curl http://localhost:3001/task/<task-id>
```

Example response:

```json
{
  "id": "f5f4a2fe-3d1c-45de-bf8e-1a1b965f4a76",
  "status": "COMPLETED",
  "progress": 100,
  "errorMessage": null,
  "documentId": "4b5f2b2b-7df0-44b2-92f7-9d9ca4f1c0f0"
}
```

### `PUT /task/:id`

Debug endpoint that re-enqueues an existing task. This is useful for manual testing, but it should not be exposed as-is in production.

## Data Model

Main Prisma models:

- `User`
- `Document`
- `Task`

Document lifecycle:

- `UPLOADED`
- `PROCESSING`
- `READY`
- `FAILED`

Task lifecycle:

- `PENDING`
- `PROCESSING`
- `COMPLETED`
- `FAILED`

## Current Limitations

- `DocumentService` currently hardcodes `userId` to `'1'`
- Redis host/port is hardcoded
- Worker processing updates the task state, but not the document state
- Worker text extraction is implemented, but parsed content is not yet persisted
- Chunking and embedding code is experimental and not connected to the document worker flow
- Only `.pdf` and `.txt` are supported by the worker

## Useful Commands

```bash
cd api
npm run dev
npm run dev:worker
npm run db:init
npm run db:migrate
npm run prisma:studio
npm run format
npm run format:check
```
