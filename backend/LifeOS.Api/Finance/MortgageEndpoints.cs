using System.Security.Claims;

namespace LifeOS.Api.Finance;

public sealed record MortgageRequest(string Label, decimal CurrentBalance, decimal AnnualInterestRatePercent, decimal MonthlyPrincipalAndInterest, DateOnly AsOfDate);

public sealed record MortgageUpdateRequest(string Label, decimal CurrentBalance, decimal AnnualInterestRatePercent, decimal MonthlyPrincipalAndInterest, DateOnly AsOfDate, DateTimeOffset ExpectedUpdatedAt);

public sealed record MortgageResponse(string Id, string Label, decimal CurrentBalance, decimal AnnualInterestRatePercent, decimal MonthlyPrincipalAndInterest, DateOnly AsOfDate, DateTimeOffset UpdatedAt)
{
    public static MortgageResponse From(MortgageRecord record) => new(
        record.Id, record.Label, record.CurrentBalance, record.AnnualInterestRatePercent, record.MonthlyPrincipalAndInterest, record.AsOfDate, record.UpdatedAt);
}

public sealed record MortgageErrorResponse(IReadOnlyList<string> Errors);

/// <summary>
/// Authenticated, owner-scoped mortgage CRUD. Every handler resolves
/// <see cref="IMortgageRepository"/> from <see cref="IServiceProvider"/> rather than a
/// bound parameter, specifically so that an unconfigured storage backend (Program.cs
/// registers no implementation unless Firestore is configured) fails closed with a 503
/// instead of ASP.NET Core throwing a generic 500 for an unresolvable service, and
/// instead of ever falling back to mock or ephemeral data for real financial values.
///
/// State-changing requests (POST/PUT/DELETE) require the <c>X-LifeOS-Client</c> header,
/// which a cross-site HTML form cannot set. This is the explicit anti-CSRF control the
/// pre-implementation audit (docs/finance-security-audit.md) called for, rather than
/// relying on the incidental protection of an empty CORS allow-list.
/// </summary>
public static class MortgageEndpoints
{
    private const string ClientHeaderName = "X-LifeOS-Client";
    private const string ClientHeaderValue = "web";

    public static IEndpointRouteBuilder MapLifeOSMortgages(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/finance/mortgages").RequireAuthorization();

        group.MapGet("/", async (HttpContext context, CancellationToken cancellationToken) =>
        {
            var repository = Resolve(context);
            if (repository is null) return StorageUnavailable();
            var records = await repository.ListAsync(OwnerId(context), cancellationToken);
            return Results.Ok(records.Select(MortgageResponse.From));
        });

        group.MapGet("/{id}", async (string id, HttpContext context, CancellationToken cancellationToken) =>
        {
            var repository = Resolve(context);
            if (repository is null) return StorageUnavailable();
            var record = await repository.GetAsync(OwnerId(context), id, cancellationToken);
            return record is null ? Results.NotFound() : Results.Ok(MortgageResponse.From(record));
        });

        group.MapPost("/", async (MortgageRequest request, HttpContext context, TimeProvider timeProvider, CancellationToken cancellationToken) =>
        {
            if (!HasClientHeader(context)) return Forbidden();
            var repository = Resolve(context);
            if (repository is null) return StorageUnavailable();
            var ownerId = OwnerId(context);
            var record = new MortgageRecord(Guid.NewGuid().ToString("N"), ownerId, timeProvider.GetUtcNow(),
                request.Label, request.CurrentBalance, request.AnnualInterestRatePercent, request.MonthlyPrincipalAndInterest, request.AsOfDate);
            var result = await repository.UpsertAsync(ownerId, record, expectedUpdatedAt: null, cancellationToken);
            return ToResult(result);
        });

        group.MapPut("/{id}", async (string id, MortgageUpdateRequest request, HttpContext context, TimeProvider timeProvider, CancellationToken cancellationToken) =>
        {
            if (!HasClientHeader(context)) return Forbidden();
            var repository = Resolve(context);
            if (repository is null) return StorageUnavailable();
            var ownerId = OwnerId(context);
            var record = new MortgageRecord(id, ownerId, timeProvider.GetUtcNow(),
                request.Label, request.CurrentBalance, request.AnnualInterestRatePercent, request.MonthlyPrincipalAndInterest, request.AsOfDate);
            var result = await repository.UpsertAsync(ownerId, record, request.ExpectedUpdatedAt, cancellationToken);
            return ToResult(result);
        });

        group.MapDelete("/{id}", async (string id, HttpContext context, CancellationToken cancellationToken) =>
        {
            if (!HasClientHeader(context)) return Forbidden();
            var repository = Resolve(context);
            if (repository is null) return StorageUnavailable();
            var deleted = await repository.DeleteAsync(OwnerId(context), id, cancellationToken);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        return endpoints;
    }

    private static IMortgageRepository? Resolve(HttpContext context) => context.RequestServices.GetService<IMortgageRepository>();

    private static string OwnerId(HttpContext context) => context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "owner";

    private static bool HasClientHeader(HttpContext context) =>
        context.Request.Headers.TryGetValue(ClientHeaderName, out var value) && value == ClientHeaderValue;

    private static IResult ToResult(MortgageWriteResult result) => result.Status switch
    {
        MortgageWriteStatus.Created => Results.Created($"/api/finance/mortgages/{result.Record!.Id}", MortgageResponse.From(result.Record)),
        MortgageWriteStatus.Updated => Results.Ok(MortgageResponse.From(result.Record!)),
        MortgageWriteStatus.Conflict => Results.Conflict(new MortgageErrorResponse(["The mortgage was changed by another request. Reload and try again."])),
        MortgageWriteStatus.NotFound => Results.NotFound(),
        MortgageWriteStatus.Invalid => Results.BadRequest(new MortgageErrorResponse(result.Errors)),
        _ => Results.Problem(statusCode: StatusCodes.Status500InternalServerError),
    };

    private static IResult StorageUnavailable() =>
        Results.Json(new MortgageErrorResponse(["Mortgage storage is not configured."]), statusCode: StatusCodes.Status503ServiceUnavailable);

    private static IResult Forbidden() =>
        Results.Json(new MortgageErrorResponse(["This request is missing a required client header."]), statusCode: StatusCodes.Status403Forbidden);
}
