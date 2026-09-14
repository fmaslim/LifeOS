# Integration credentials

LifeOS keeps integration credentials behind a server-only abstraction. The browser receives only provider name, state (`missing`, `invalid`, `expired`, or `configured`), check time, and a safe status message. It never receives, stores, logs, or exports credential values.

## Configuration

Set credentials in the deployment environment or another ASP.NET Core configuration provider. Do not add them to `appsettings*.json`, frontend `VITE_*` variables, local storage, source control, screenshots, or logs.

| Provider | Credential variable | Optional expiry variable |
| --- | --- | --- |
| GitHub | `Integrations__GitHub__Credential` | `Integrations__GitHub__Credential__EXPIRES_AT` |
| YouTube | `Integrations__YouTube__Credential` | `Integrations__YouTube__Credential__EXPIRES_AT` |
| LinLoop Reach / Jarvis | `Integrations__Jarvis__Credential` | `Integrations__Jarvis__Credential__EXPIRES_AT` |

Expiry values must be ISO 8601 timestamps. Missing, malformed, or expired configuration fails closed. The API returns metadata from `/api/integrations/credentials`; it does not return the value.

Server-side provider adapters should request access through `CredentialBroker.WithSecretAsync`. The value is supplied only to the callback in process memory. Adapters must not serialize it, include it in exceptions, or write it to telemetry.

For production, replace the registered `ISecretProvider` with a deployment-specific secret manager adapter while preserving the same broker boundary and metadata-only API contract.
