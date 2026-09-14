using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace LifeOS.Api.Integrations;

public sealed record FinanceAccountDto(string Id, string Name, string Type, decimal Balance, string Currency = "USD");
public sealed record FinanceBillDto(string Id, string Name, string Category, DateOnly DueDate, decimal Amount);
public sealed record FinanceSpendingDto(string Category, decimal Amount, DateOnly PeriodStart, DateOnly PeriodEnd);
public sealed record FinanceCashFlowDto(string Month, decimal Income, decimal Expenses);
public sealed record FinanceDebtDto(string Id, string Name, decimal Balance, decimal? MinimumPayment, DateOnly? DueDate);
public sealed record FinanceInvestmentDto(string Id, string Name, decimal Value, string? AssetClass);
public sealed record FinanceSignalDto(string Id, string Title, string Detail, string Severity, DateTimeOffset Timestamp);
public sealed record FinanceProviderSnapshot(
    string Status,
    DateTimeOffset CheckedAt,
    IReadOnlyList<FinanceAccountDto> Accounts,
    IReadOnlyList<FinanceBillDto> RecurringBills,
    IReadOnlyList<FinanceSpendingDto> Spending,
    IReadOnlyList<FinanceCashFlowDto> CashFlow,
    IReadOnlyList<FinanceDebtDto> Debts,
    IReadOnlyList<FinanceInvestmentDto> Investments,
    IReadOnlyList<FinanceSignalDto> Signals,
    string? Message);

internal sealed class FinanceProvider(HttpClient httpClient, CredentialBroker credentials, IConfiguration configuration, TimeProvider timeProvider)
{
    private const string CredentialKey = "Integrations:Finance:Credential";

    public async Task<FinanceProviderSnapshot> GetSnapshotAsync(CancellationToken cancellationToken = default)
    {
        var baseUrl = configuration["Integrations:Finance:BaseUrl"]?.TrimEnd('/');
        if (string.IsNullOrWhiteSpace(baseUrl)) return Empty("disconnected", "Finance integration is not configured.");
        try
        {
            var token = await credentials.WithSecretAsync(CredentialKey, value => value, cancellationToken);
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/api/lifeos/finance-summary");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            using var response = await httpClient.SendAsync(request, cancellationToken);
            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                return Empty("unauthorized", "Finance authorization needs attention.");
            if ((int)response.StatusCode == 429)
                return Empty("rate-limited", "Finance provider is temporarily rate limited.");
            if (!response.IsSuccessStatusCode)
                return Empty("unavailable", "Finance provider is temporarily unavailable.");

            var payload = await response.Content.ReadFromJsonAsync<FinanceSummaryResponse>(cancellationToken: cancellationToken);
            if (payload is null) return Empty("unavailable", "Finance provider returned an invalid response.");
            return new FinanceProviderSnapshot("connected", timeProvider.GetUtcNow(), payload.Accounts ?? [], payload.RecurringBills ?? [], payload.Spending ?? [], payload.CashFlow ?? [], payload.Debts ?? [], payload.Investments ?? [], payload.Signals ?? [], null);
        }
        catch (InvalidOperationException) { return Empty("disconnected", "Finance credential is not configured."); }
        catch { return Empty("unavailable", "Finance provider is temporarily unavailable."); }
    }

    private FinanceProviderSnapshot Empty(string status, string message) => new(status, timeProvider.GetUtcNow(), [], [], [], [], [], [], [], message);

    private sealed record FinanceSummaryResponse(
        IReadOnlyList<FinanceAccountDto>? Accounts,
        IReadOnlyList<FinanceBillDto>? RecurringBills,
        IReadOnlyList<FinanceSpendingDto>? Spending,
        IReadOnlyList<FinanceCashFlowDto>? CashFlow,
        IReadOnlyList<FinanceDebtDto>? Debts,
        IReadOnlyList<FinanceInvestmentDto>? Investments,
        IReadOnlyList<FinanceSignalDto>? Signals);
}

public static class FinanceEndpoints
{
    public static IEndpointRouteBuilder MapLifeOSFinance(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/finance/summary", async (FinanceProvider provider, CancellationToken cancellationToken) =>
            Results.Ok(await provider.GetSnapshotAsync(cancellationToken)))
            .RequireAuthorization();
        return endpoints;
    }
}
