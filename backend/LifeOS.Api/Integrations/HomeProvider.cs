using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace LifeOS.Api.Integrations;

public sealed record HomeDeviceDto(string Id, string Name, string Category, string Status, string Detail, DateTimeOffset UpdatedAt);
public sealed record HomeUtilityDto(string Id, string Name, decimal? Usage, string? Unit, decimal? Cost, DateTimeOffset UpdatedAt);
public sealed record HomeAlertDto(string Id, string Source, string Title, string Detail, string Severity, DateTimeOffset Timestamp);
public sealed record HomeSourceSnapshot(string Source, string Status, DateTimeOffset CheckedAt, IReadOnlyList<HomeDeviceDto> Devices, IReadOnlyList<HomeUtilityDto> Utilities, IReadOnlyList<HomeAlertDto> Alerts, string? Message);
public sealed record HomeProviderSnapshot(DateTimeOffset CheckedAt, IReadOnlyList<HomeSourceSnapshot> Sources);

internal sealed class HomeProvider(HttpClient httpClient, CredentialBroker credentials, IConfiguration configuration, TimeProvider timeProvider)
{
    private static readonly string[] Sources = ["SmartHome", "Security", "Network", "Utilities"];

    public async Task<HomeProviderSnapshot> GetSnapshotAsync(CancellationToken cancellationToken = default)
    {
        var tasks = Sources.Select(source => ReadSourceAsync(source, cancellationToken));
        var snapshots = await Task.WhenAll(tasks);
        return new(timeProvider.GetUtcNow(), snapshots);
    }

    private async Task<HomeSourceSnapshot> ReadSourceAsync(string source, CancellationToken cancellationToken)
    {
        var baseUrl = configuration[$"Integrations:Home:{source}:BaseUrl"]?.TrimEnd('/');
        if (string.IsNullOrWhiteSpace(baseUrl)) return Empty(source, "unsupported", "Provider is not configured or supported.");
        try
        {
            var value = await credentials.WithSecretAsync($"Integrations:Home:{source}:Credential", secret => secret, cancellationToken);
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/api/lifeos/home-summary");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", value);
            using var response = await httpClient.SendAsync(request, cancellationToken);
            if ((int)response.StatusCode is 401 or 403) return Empty(source, "unauthorized", "Provider authorization needs attention.");
            if ((int)response.StatusCode == 429) return Empty(source, "rate-limited", "Provider is temporarily rate limited.");
            if (!response.IsSuccessStatusCode) return Empty(source, "unavailable", "Provider is temporarily unavailable.");
            var payload = await response.Content.ReadFromJsonAsync<HomeSourceResponse>(cancellationToken: cancellationToken);
            return payload is null
                ? Empty(source, "unavailable", "Provider returned an invalid response.")
                : new(source, "connected", timeProvider.GetUtcNow(), payload.Devices ?? [], payload.Utilities ?? [], payload.Alerts ?? [], null);
        }
        catch (InvalidOperationException) { return Empty(source, "disconnected", "Provider credential is not configured."); }
        catch { return Empty(source, "unavailable", "Provider is temporarily unavailable."); }
    }

    private HomeSourceSnapshot Empty(string source, string status, string message) => new(source, status, timeProvider.GetUtcNow(), [], [], [], message);
    private sealed record HomeSourceResponse(IReadOnlyList<HomeDeviceDto>? Devices, IReadOnlyList<HomeUtilityDto>? Utilities, IReadOnlyList<HomeAlertDto>? Alerts);
}

public static class HomeEndpoints
{
    public static IEndpointRouteBuilder MapLifeOSHome(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/home/summary", async (HomeProvider provider, CancellationToken cancellationToken) =>
            Results.Ok(await provider.GetSnapshotAsync(cancellationToken)))
            .RequireAuthorization();
        return endpoints;
    }
}
