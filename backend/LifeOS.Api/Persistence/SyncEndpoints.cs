using System.Security.Claims;
using System.Text.Json;

namespace LifeOS.Api.Persistence;

public static class SyncEndpoints
{
    private static readonly HashSet<string> SupportedKeys = new(StringComparer.Ordinal)
    {
        "tasks", "goals", "kpis", "notes", "calendar", "habits", "projects", "notifications", "schedules", "dashboard-widgets"
    };

    public static IEndpointRouteBuilder MapLifeOSSync(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/sync/snapshots", async (
            IReadOnlyList<SyncSnapshotRequest> requests,
            ClaimsPrincipal principal,
            IApplicationRepository repository,
            TimeProvider timeProvider,
            CancellationToken cancellationToken) =>
        {
            var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();
            if (requests.Count > 50 || requests.Any(request => !SupportedKeys.Contains(request.Key))) return Results.BadRequest();

            var existingResult = await repository.ListAsync<PreferenceRecord>(userId, cancellationToken);
            if (!existingResult.Success) return Results.Json(new { status = "unavailable" }, statusCode: StatusCodes.Status503ServiceUnavailable);
            var existing = existingResult.Value!.Where(item => item.Key.StartsWith("sync:", StringComparison.Ordinal)).ToDictionary(item => item.Key[5..], StringComparer.Ordinal);
            var responses = new List<SyncSnapshotResponse>(requests.Count);

            foreach (var request in requests)
            {
                existing.TryGetValue(request.Key, out var server);
                if (server is null || request.ModifiedAt >= server.UpdatedAt)
                {
                    var record = new PreferenceRecord($"sync-{request.Key}", userId, request.ModifiedAt, $"sync:{request.Key}", request.Value.GetRawText());
                    var saved = await repository.UpsertAsync(userId, record, cancellationToken);
                    if (!saved.Success) return Results.Json(new { status = "unavailable" }, statusCode: StatusCodes.Status503ServiceUnavailable);
                    responses.Add(new SyncSnapshotResponse(request.Key, request.ModifiedAt, request.Value, server is null ? "migrated" : "client-won"));
                }
                else
                {
                    try
                    {
                        using var document = JsonDocument.Parse(server.JsonValue);
                        responses.Add(new SyncSnapshotResponse(request.Key, server.UpdatedAt, document.RootElement.Clone(), "server-won"));
                    }
                    catch (JsonException)
                    {
                        return Results.Json(new { status = "unavailable" }, statusCode: StatusCodes.Status503ServiceUnavailable);
                    }
                }
            }

            return Results.Ok(new SyncBatchResponse(timeProvider.GetUtcNow(), responses));
        }).RequireAuthorization();

        return endpoints;
    }

    public sealed record SyncSnapshotRequest(string Key, DateTimeOffset ModifiedAt, JsonElement Value, string MigrationId);
    public sealed record SyncSnapshotResponse(string Key, DateTimeOffset ModifiedAt, JsonElement Value, string Resolution);
    public sealed record SyncBatchResponse(DateTimeOffset SyncedAt, IReadOnlyList<SyncSnapshotResponse> Snapshots);
}
