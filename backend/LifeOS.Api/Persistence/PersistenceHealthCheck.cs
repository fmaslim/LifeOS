using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace LifeOS.Api.Persistence;

public sealed class PersistenceHealthCheck(IConfiguration configuration) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var root = configuration["Persistence:RootPath"] ?? Path.Combine(AppContext.BaseDirectory, "app_data");
        var probe = Path.Combine(root, ".health");
        try
        {
            Directory.CreateDirectory(root);
            await File.WriteAllTextAsync(probe, "ok", cancellationToken);
            _ = await File.ReadAllTextAsync(probe, cancellationToken);
            File.Delete(probe);
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return HealthCheckResult.Unhealthy("Persistence is unavailable.");
        }
    }
}
