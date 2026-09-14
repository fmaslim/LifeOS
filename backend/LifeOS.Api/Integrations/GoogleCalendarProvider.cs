using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace LifeOS.Api.Integrations;

public sealed record CalendarProviderEvent(string Id, string Title, DateTimeOffset? Start, DateTimeOffset? End, string? StartDate, string? EndDate, string? Description, string? HtmlLink);
public sealed record CalendarProviderSnapshot(string Status, DateTimeOffset CheckedAt, IReadOnlyList<CalendarProviderEvent> Events, string? Message);

public sealed class GoogleCalendarProvider(HttpClient httpClient, CredentialBroker credentials, TimeProvider timeProvider)
{
    private const string CredentialKey = "Integrations:Calendar:Credential";

    public async Task<CalendarProviderSnapshot> GetUpcomingAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var token = await credentials.WithSecretAsync(CredentialKey, value => value, cancellationToken);
            using var request = new HttpRequestMessage(HttpMethod.Get, BuildEventsUrl());
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            using var response = await httpClient.SendAsync(request, cancellationToken);
            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                return new("unauthorized", timeProvider.GetUtcNow(), [], "Calendar authorization needs attention.");
            if ((int)response.StatusCode == 429)
                return new("rate-limited", timeProvider.GetUtcNow(), [], "Calendar provider is rate limited.");
            if (!response.IsSuccessStatusCode)
                return new("unavailable", timeProvider.GetUtcNow(), [], "Calendar provider is unavailable.");

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var events = new List<CalendarProviderEvent>();
            if (document.RootElement.TryGetProperty("items", out var items))
            {
                foreach (var item in items.EnumerateArray())
                {
                    var id = item.TryGetProperty("id", out var idValue) ? idValue.GetString() : null;
                    if (string.IsNullOrWhiteSpace(id)) continue;
                    var start = ReadBoundary(item, "start");
                    var end = ReadBoundary(item, "end");
                    events.Add(new CalendarProviderEvent(
                        id,
                        item.TryGetProperty("summary", out var summary) ? summary.GetString() ?? "Untitled event" : "Untitled event",
                        start.DateTime,
                        end.DateTime,
                        start.Date,
                        end.Date,
                        item.TryGetProperty("description", out var description) ? description.GetString() : null,
                        item.TryGetProperty("htmlLink", out var link) ? link.GetString() : null));
                }
            }
            return new("connected", timeProvider.GetUtcNow(), events, null);
        }
        catch (InvalidOperationException)
        {
            return new("disconnected", timeProvider.GetUtcNow(), [], "Calendar provider is not configured.");
        }
        catch (HttpRequestException)
        {
            return new("unavailable", timeProvider.GetUtcNow(), [], "Calendar provider is unavailable.");
        }
    }

    public async Task<IResult> WriteAsync(HttpMethod method, string? eventId, JsonElement payload, string? approvalId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(approvalId)) return Results.Json(new { status = "approval-required" }, statusCode: StatusCodes.Status428PreconditionRequired);
        try
        {
            var token = await credentials.WithSecretAsync(CredentialKey, value => value, cancellationToken);
            var url = eventId is null ? "https://www.googleapis.com/calendar/v3/calendars/primary/events" : $"https://www.googleapis.com/calendar/v3/calendars/primary/events/{Uri.EscapeDataString(eventId)}";
            using var request = new HttpRequestMessage(method, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            request.Headers.Add("X-LifeOS-Correlation-Id", approvalId);
            if (method != HttpMethod.Delete) request.Content = JsonContent.Create(payload);
            using var response = await httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode) return Results.Json(new { status = "provider-error" }, statusCode: StatusCodes.Status502BadGateway);
            return Results.Ok(new { status = "executed", approvalId });
        }
        catch (InvalidOperationException)
        {
            return Results.Json(new { status = "disconnected" }, statusCode: StatusCodes.Status503ServiceUnavailable);
        }
    }

    private string BuildEventsUrl()
    {
        var start = Uri.EscapeDataString(timeProvider.GetUtcNow().ToString("O"));
        return $"https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=50&timeMin={start}";
    }

    private static (DateTimeOffset? DateTime, string? Date) ReadBoundary(JsonElement item, string name)
    {
        if (!item.TryGetProperty(name, out var boundary)) return (null, null);
        if (boundary.TryGetProperty("dateTime", out var dateTime) && DateTimeOffset.TryParse(dateTime.GetString(), out var parsed)) return (parsed, null);
        return (null, boundary.TryGetProperty("date", out var date) ? date.GetString() : null);
    }
}
