namespace LifeOS.Api.Integrations;

public enum CredentialState { Missing, Invalid, Expired, Configured }

/// UI-safe metadata. Secret values never enter this contract.
public sealed record CredentialStatus(string Provider, CredentialState State, DateTimeOffset CheckedAt, string Message);

internal sealed record SecretResolution(CredentialState State, string? Value);

internal interface ISecretProvider
{
    ValueTask<SecretResolution> ResolveAsync(string configurationKey, CancellationToken cancellationToken = default);
}

internal sealed class EnvironmentSecretProvider(IConfiguration configuration, TimeProvider timeProvider) : ISecretProvider
{
    public ValueTask<SecretResolution> ResolveAsync(string configurationKey, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var value = configuration[configurationKey];
        if (string.IsNullOrWhiteSpace(value)) return ValueTask.FromResult(new SecretResolution(CredentialState.Missing, null));
        var expiryText = configuration[$"{configurationKey}__EXPIRES_AT"];
        if (expiryText is not null && !DateTimeOffset.TryParse(expiryText, out _)) return ValueTask.FromResult(new SecretResolution(CredentialState.Invalid, null));
        if (DateTimeOffset.TryParse(expiryText, out var expiry) && expiry <= timeProvider.GetUtcNow()) return ValueTask.FromResult(new SecretResolution(CredentialState.Expired, null));
        return ValueTask.FromResult(new SecretResolution(CredentialState.Configured, value));
    }
}

internal sealed class CredentialBroker(ISecretProvider secrets, TimeProvider timeProvider)
{
    public async ValueTask<CredentialStatus> GetStatusAsync(string provider, string key, CancellationToken cancellationToken = default)
    {
        var resolution = await secrets.ResolveAsync(key, cancellationToken);
        var message = resolution.State switch { CredentialState.Configured => "Credential configured", CredentialState.Expired => "Credential expired", CredentialState.Invalid => "Credential metadata is invalid", _ => "Credential not configured" };
        return new CredentialStatus(provider, resolution.State, timeProvider.GetUtcNow(), message);
    }

    /// Provider adapters receive a value only inside server process memory; callers must never log or serialize it.
    public async ValueTask<T> WithSecretAsync<T>(string key, Func<string, T> action, CancellationToken cancellationToken = default)
    {
        var resolution = await secrets.ResolveAsync(key, cancellationToken);
        if (resolution.State is not CredentialState.Configured || resolution.Value is null) throw new InvalidOperationException("Integration credential is unavailable.");
        return action(resolution.Value);
    }
}
