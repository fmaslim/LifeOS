# LifeOS authentication

LifeOS uses a server-issued, HMAC-signed HttpOnly session cookie. The frontend never stores session tokens in browser storage and protected API endpoints enforce authorization independently of the UI.

## Production configuration

Provide these values through the deployment environment/secret manager, never source control:

- `Auth__OwnerPassword`: owner sign-in password.
- `Auth__SigningKey`: stable signing key with at least 32 UTF-8 bytes.
- `Auth__AllowedOrigins__0`: deployed web origin, for example `https://getlifeos.co` when the web and API are on different origins.

Rotate the signing key to invalidate all existing sessions. Missing/invalid authentication configuration fails closed.

## Local development

Run the API with local environment variables and point Vite at it with `VITE_LIFEOS_API_BASE_URL`. For UI-only development, `VITE_LIFEOS_DEV_AUTH=true` is accepted only by Vite development builds; it does not bypass backend authorization.
