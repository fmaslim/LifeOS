using System.Text.Json;

namespace LifeOS.Api.Integrations;

public static class CalendarEndpoints
{
    public static IEndpointRouteBuilder MapLifeOSCalendar(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/calendar/events", async (GoogleCalendarProvider provider, CancellationToken cancellationToken) =>
            Results.Ok(await provider.GetUpcomingAsync(cancellationToken))).RequireAuthorization();

        endpoints.MapPost("/api/calendar/events", async (JsonElement payload, HttpRequest request, GoogleCalendarProvider provider, CancellationToken cancellationToken) =>
            await provider.WriteAsync(HttpMethod.Post, null, payload, request.Headers["X-LifeOS-Approval-Id"].FirstOrDefault(), cancellationToken)).RequireAuthorization();

        endpoints.MapPut("/api/calendar/events/{eventId}", async (string eventId, JsonElement payload, HttpRequest request, GoogleCalendarProvider provider, CancellationToken cancellationToken) =>
            await provider.WriteAsync(HttpMethod.Put, eventId, payload, request.Headers["X-LifeOS-Approval-Id"].FirstOrDefault(), cancellationToken)).RequireAuthorization();

        endpoints.MapDelete("/api/calendar/events/{eventId}", async (string eventId, HttpRequest request, GoogleCalendarProvider provider, CancellationToken cancellationToken) =>
            await provider.WriteAsync(HttpMethod.Delete, eventId, default, request.Headers["X-LifeOS-Approval-Id"].FirstOrDefault(), cancellationToken)).RequireAuthorization();

        return endpoints;
    }
}
