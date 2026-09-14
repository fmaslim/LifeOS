using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace LifeOS.Api.Integrations;

public sealed record DocIQMetricDto(string Name, double Value, string? Unit = null, string? Detail = null);
public sealed record DocIQActivityDto(string Id, string Type, string Title, string? Detail, DateTimeOffset Timestamp, string? DeepLink, string Severity = "normal");
public sealed record DocIQProviderSnapshot(
    string Status,
    DateTimeOffset CheckedAt,
    IReadOnlyList<DocIQMetricDto> Metrics,
    IReadOnlyList<DocIQActivityDto> Activity,
    string? ServiceHealth,
    string? DeepLinkBase,
    string? Message);

internal sealed class DocIQProvider(HttpClient httpClient, CredentialBroker credentials, IConfiguration configuration, TimeProvider timeProvider)
{
    private const string CredentialKey = "Integrations:DocIQ:Credential";

    public async Task<DocIQProviderSnapshot> GetSnapshotAsync(CancellationToken cancellationToken = default)
    {
        var baseUrl = configuration["Integrations:DocIQ:BaseUrl"]?.TrimEnd('/');
        if (string.IsNullOrWhiteSpace(baseUrl))
            return Empty("disconnected", "DocIQ integration is not configured.");

        try
        {
            var token = await credentials.WithSecretAsync(CredentialKey, value => value, cancellationToken);
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/api/lifeos/summary");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            using var response = await httpClient.SendAsync(request, cancellationToken);

            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                return Empty("unauthorized", "DocIQ authorization needs attention.");
            if ((int)response.StatusCode == 429)
                return Empty("rate-limited", "DocIQ is temporarily rate limited.");
            if (!response.IsSuccessStatusCode)
                return Empty("unavailable", "DocIQ is temporarily unavailable.");

            var payload = await response.Content.ReadFromJsonAsync<DocIQSummaryResponse>(cancellationToken: cancellationToken);
            if (payload is null) return Empty("unavailable", "DocIQ returned an invalid response.");

            return new DocIQProviderSnapshot(
                "connected",
                timeProvider.GetUtcNow(),
                payload.Metrics ?? [],
                payload.Activity ?? [],
                payload.ServiceHealth,
                baseUrl,
                null);
        }
        catch (InvalidOperationException)
        {
            return Empty("disconnected", "DocIQ credential is not configured.");
        }
        catch
        {
            return Empty("unavailable", "DocIQ is temporarily unavailable.");
        }
    }

    private DocIQProviderSnapshot Empty(string status, string message) =>
        new(status, timeProvider.GetUtcNow(), [], [], null, null, message);

    private sealed record DocIQSummaryResponse(
        IReadOnlyList<DocIQMetricDto>? Metrics,
        IReadOnlyList<DocIQActivityDto>? Activity,
        string? ServiceHealth);
}

public static class DocIQEndpoints
{
    public static IEndpointRouteBuilder MapLifeOSDocIQ(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/dociq/summary", async (DocIQProvider provider, CancellationToken cancellationToken) =>
            Results.Ok(await provider.GetSnapshotAsync(cancellationToken)))
            .RequireAuthorization();

        endpoints.MapPost("/api/dociq/actions/{action}", (string action, HttpContext context) =>
        {
            if (!context.Request.Headers.TryGetValue("X-LifeOS-Approved", out var approved) || approved != "true")
                return Results.Json(new { status = "approval-required", action = $"dociq.{action}" }, statusCode: StatusCodes.Status428PreconditionRequired);
            return Results.Accepted(value: new { status = "queued", action = $"dociq.{action}" });
        }).RequireAuthorization();

        return endpoints;
    }
}
