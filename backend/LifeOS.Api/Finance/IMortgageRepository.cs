namespace LifeOS.Api.Finance;

public enum MortgageWriteStatus { Created, Updated, Conflict, NotFound, Invalid }

/// <summary>
/// Outcome of a mortgage write. Never carries the record on failure, so a caller
/// can safely surface <see cref="Errors"/> without risking a partial/invalid echo.
/// </summary>
public sealed record MortgageWriteResult(MortgageWriteStatus Status, MortgageRecord? Record, IReadOnlyList<string> Errors)
{
    public static MortgageWriteResult Ok(MortgageWriteStatus status, MortgageRecord record) => new(status, record, []);
    public static MortgageWriteResult Invalid(IReadOnlyList<string> errors) => new(MortgageWriteStatus.Invalid, null, errors);
    public static MortgageWriteResult Conflict() => new(MortgageWriteStatus.Conflict, null, []);
    public static MortgageWriteResult NotFound() => new(MortgageWriteStatus.NotFound, null, []);
}

/// <summary>
/// Server-only repository contract for mortgage records. Every method is scoped to a
/// single <paramref name="ownerId"/> (the authenticated owner); implementations must
/// never return or mutate another owner's record, and must never be substituted with a
/// silent mock/ephemeral fallback for real financial data.
///
/// Concurrency: pass <c>expectedUpdatedAt</c> as <c>null</c> to create a brand-new record
/// (fails with <see cref="MortgageWriteStatus.Conflict"/> if the id already exists), or as
/// the last-known <see cref="MortgageRecord.UpdatedAt"/> to update it (fails with
/// <see cref="MortgageWriteStatus.Conflict"/> if another write changed it first, or
/// <see cref="MortgageWriteStatus.NotFound"/> if it no longer exists). A Firestore adapter
/// implements this with a transaction that reads the current document's <c>updatedAt</c>
/// field before writing.
/// </summary>
public interface IMortgageRepository
{
    Task<IReadOnlyList<MortgageRecord>> ListAsync(string ownerId, CancellationToken cancellationToken = default);

    Task<MortgageRecord?> GetAsync(string ownerId, string id, CancellationToken cancellationToken = default);

    Task<MortgageWriteResult> UpsertAsync(string ownerId, MortgageRecord record, DateTimeOffset? expectedUpdatedAt, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(string ownerId, string id, CancellationToken cancellationToken = default);
}
