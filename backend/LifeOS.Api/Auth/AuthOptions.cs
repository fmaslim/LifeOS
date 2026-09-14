namespace LifeOS.Api.Auth;

public sealed class AuthOptions
{
    public const string SectionName = "Auth";
    public string OwnerPassword { get; init; } = string.Empty;
    public string SigningKey { get; init; } = string.Empty;
    public int SessionHours { get; init; } = 12;
}
