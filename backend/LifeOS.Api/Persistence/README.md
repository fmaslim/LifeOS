# LifeOS persistence foundation

Core user-created LifeOS records are stored behind `IApplicationRepository`; UI components and external integration secrets do not depend on this storage implementation.

The initial durable adapter writes one versioned, atomic JSON database document per authenticated user. Configure `Persistence__RootPath` to a durable server volume in production. The default `app_data` path is intended for local development only and Cloud Run's ephemeral filesystem must not be treated as durable storage.

The document carries a schema version and passes through `PersistenceMigrator` on every read. Upserts are keyed by record id, so retries replace the same record instead of duplicating it. User ids are hashed for filenames and cross-user entity writes are rejected.

A future SQL/Cloud SQL adapter can replace `JsonFileApplicationRepository` without changing page models or service contracts. Integration credentials remain under the separate server-only credential broker and must never be added to normal application records.
