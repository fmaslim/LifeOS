using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace LifeOS.Api.Integrations;

public sealed record WebhookEventEnvelope(string Id, string Type, DateTimeOffset Timestamp, string? CorrelationId, Dictionary<string, JsonElement>? Metadata, JsonElement Payload);
public sealed record StoredWebhookEvent(string Id, string Type, string Source, DateTimeOffset Timestamp, DateTimeOffset ReceivedAt, string? CorrelationId, Dictionary<string, JsonElement>? Metadata, JsonElement Payload);

public sealed class WebhookEventInbox
{
    private readonly ConcurrentDictionary<string, StoredWebhookEvent> _events = new(StringComparer.Ordinal);
    public bool TryAdd(StoredWebhookEvent item) => _events.TryAdd($"{item.Source}:{item.Id}", item);
    public IReadOnlyList<StoredWebhookEvent> List() => _events.Values.OrderByDescending(item => item.ReceivedAt).Take(250).ToArray();
}

public static class EventWebhookEndpoints
{
    public static IEndpointRouteBuilder MapLifeOSEvents(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/events/webhook/{source}", async (string source, HttpRequest request, CredentialBroker broker, WebhookEventInbox inbox, TimeProvider timeProvider, CancellationToken cancellationToken) =>
        {
            if (!ValidSource(source) || !request.Headers.TryGetValue("X-LifeOS-Webhook-Token", out var supplied) || string.IsNullOrWhiteSpace(supplied))
                return Results.Unauthorized();

            bool authorized;
            try
            {
                authorized = await broker.WithSecretAsync("Integrations:Webhook:Credential", secret => FixedEquals(secret, supplied.ToString()), cancellationToken);
            }
            catch
            {
                return Results.Unauthorized();
            }
            if (!authorized) return Results.Unauthorized();

            WebhookEventEnvelope? envelope;
            try { envelope = await request.ReadFromJsonAsync<WebhookEventEnvelope>(cancellationToken); }
            catch { return Results.BadRequest(new { error = "Invalid event payload." }); }

            var now = timeProvider.GetUtcNow();
            if (envelope is null || string.IsNullOrWhiteSpace(envelope.Id) || string.IsNullOrWhiteSpace(envelope.Type) || envelope.Timestamp == default || envelope.Payload.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
                return Results.BadRequest(new { error = "Event id, type, timestamp, and payload are required." });
            if (envelope.Timestamp > now.AddMinutes(5) || envelope.Timestamp < now.AddDays(-1))
                return Results.BadRequest(new { error = "Event timestamp is outside the accepted replay window." });

            var stored = new StoredWebhookEvent(envelope.Id.Trim(), envelope.Type.Trim(), source.Trim(), envelope.Timestamp, now, envelope.CorrelationId, envelope.Metadata, envelope.Payload.Clone());
            if (!inbox.TryAdd(stored)) return Results.Ok(new { status = "duplicate", eventId = stored.Id, correlationId = stored.CorrelationId });
            return Results.Accepted($"/api/events/inbox", new { status = "accepted", eventId = stored.Id, correlationId = stored.CorrelationId });
        }).AllowAnonymous();

        app.MapGet("/api/events/inbox", (WebhookEventInbox inbox) => Results.Ok(inbox.List())).RequireAuthorization();
        return app;
    }

    private static bool ValidSource(string source) => source.Length is > 0 and <= 64 && source.All(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or '.');
    private static bool FixedEquals(string expected, string actual) => CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(actual));
}
