using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace LifeOS.Api.Auth;

public interface IAuthSessionService
{
    bool IsConfigured { get; }
    bool ValidatePassword(string password);
    string CreateSession(string subject, DateTimeOffset now);
    AuthSession? ValidateSession(string token, DateTimeOffset now);
}

public sealed record AuthSession(string Subject, DateTimeOffset ExpiresAt);

public sealed class HmacAuthSessionService : IAuthSessionService
{
    private readonly AuthOptions _options;
    private readonly byte[] _signingKey;

    public HmacAuthSessionService(IOptions<AuthOptions> options)
    {
        _options = options.Value;
        _signingKey = Encoding.UTF8.GetBytes(_options.SigningKey);
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_options.OwnerPassword) &&
        _signingKey.Length >= 32;

    public bool ValidatePassword(string password)
    {
        if (!IsConfigured || string.IsNullOrEmpty(password)) return false;
        var expected = SHA256.HashData(Encoding.UTF8.GetBytes(_options.OwnerPassword));
        var actual = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    public string CreateSession(string subject, DateTimeOffset now)
    {
        if (!IsConfigured) throw new InvalidOperationException("Authentication is not configured.");
        var payload = new SessionPayload(subject, now.AddHours(Math.Clamp(_options.SessionHours, 1, 168)).ToUnixTimeSeconds());
        var payloadBytes = JsonSerializer.SerializeToUtf8Bytes(payload);
        var payloadPart = Base64UrlEncode(payloadBytes);
        var signaturePart = Base64UrlEncode(HMACSHA256.HashData(_signingKey, Encoding.UTF8.GetBytes(payloadPart)));
        return $"{payloadPart}.{signaturePart}";
    }

    public AuthSession? ValidateSession(string token, DateTimeOffset now)
    {
        if (!IsConfigured || string.IsNullOrWhiteSpace(token)) return null;
        var parts = token.Split('.', 2);
        if (parts.Length != 2) return null;

        byte[] suppliedSignature;
        try { suppliedSignature = Base64UrlDecode(parts[1]); }
        catch (FormatException) { return null; }

        var expectedSignature = HMACSHA256.HashData(_signingKey, Encoding.UTF8.GetBytes(parts[0]));
        if (!CryptographicOperations.FixedTimeEquals(expectedSignature, suppliedSignature)) return null;

        try
        {
            var payload = JsonSerializer.Deserialize<SessionPayload>(Base64UrlDecode(parts[0]));
            if (payload is null || string.IsNullOrWhiteSpace(payload.Subject)) return null;
            var expiresAt = DateTimeOffset.FromUnixTimeSeconds(payload.ExpiresAtUnixSeconds);
            return expiresAt > now ? new AuthSession(payload.Subject, expiresAt) : null;
        }
        catch (Exception ex) when (ex is JsonException or FormatException or ArgumentOutOfRangeException)
        {
            return null;
        }
    }

    private static string Base64UrlEncode(ReadOnlySpan<byte> value) =>
        Convert.ToBase64String(value).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded = padded.PadRight(padded.Length + ((4 - padded.Length % 4) % 4), '=');
        return Convert.FromBase64String(padded);
    }

    private sealed record SessionPayload(string Subject, long ExpiresAtUnixSeconds);
}
