using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace LifeOS.Api.Auth;

public sealed class LifeOSAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string Scheme = "LifeOS";
    public const string CookieName = "lifeos_session";

    private readonly IAuthSessionService _sessions;
    private readonly TimeProvider _timeProvider;

    public LifeOSAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IAuthSessionService sessions,
        TimeProvider timeProvider)
        : base(options, logger, encoder)
    {
        _sessions = sessions;
        _timeProvider = timeProvider;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!_sessions.IsConfigured)
            return Task.FromResult(AuthenticateResult.Fail("Authentication is not configured."));

        if (!Request.Cookies.TryGetValue(CookieName, out var token))
            return Task.FromResult(AuthenticateResult.NoResult());

        var session = _sessions.ValidateSession(token, _timeProvider.GetUtcNow());
        if (session is null)
            return Task.FromResult(AuthenticateResult.Fail("Session is invalid or expired."));

        var identity = new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, session.Subject), new Claim(ClaimTypes.Name, "LifeOS Owner") },
            Scheme);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
