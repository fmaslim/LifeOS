namespace LifeOS.Api.Auth;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapLifeOSAuth(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/auth/login", (LoginRequest request, HttpContext context, IAuthSessionService sessions, TimeProvider timeProvider) =>
        {
            if (!sessions.IsConfigured)
                return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Authentication unavailable");

            if (!sessions.ValidatePassword(request.Password))
                return Results.Unauthorized();

            var token = sessions.CreateSession("owner", timeProvider.GetUtcNow());
            context.Response.Cookies.Append(LifeOSAuthenticationHandler.CookieName, token, CookieOptions(context));
            return Results.Ok(new AuthState(true, "LifeOS Owner", null));
        }).AllowAnonymous();

        endpoints.MapPost("/api/auth/logout", (HttpContext context) =>
        {
            context.Response.Cookies.Delete(LifeOSAuthenticationHandler.CookieName, CookieOptions(context));
            return Results.NoContent();
        }).AllowAnonymous();

        endpoints.MapGet("/api/auth/session", (HttpContext context) =>
            Results.Ok(new AuthState(true, context.User.Identity?.Name ?? "LifeOS Owner", null)))
            .RequireAuthorization();

        return endpoints;
    }

    private static CookieOptions CookieOptions(HttpContext context)
    {
        var isLocal = context.Request.Host.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
                      context.Request.Host.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase);
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = !isLocal,
            SameSite = isLocal ? SameSiteMode.Lax : SameSiteMode.None,
            Path = "/",
            MaxAge = TimeSpan.FromDays(7),
            IsEssential = true
        };
    }

    public sealed record LoginRequest(string Password);
    public sealed record AuthState(bool IsAuthenticated, string? DisplayName, string? Reason);
}
