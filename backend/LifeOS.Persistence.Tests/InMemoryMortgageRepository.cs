using LifeOS.Api.Finance;

namespace LifeOS.Persistence.Tests;

/// <summary>
/// Deterministic in-memory fake of <see cref="IMortgageRepository"/> for tests only.
/// This type intentionally lives in the test project, not LifeOS.Api, so it can never
/// be wired in as a silent production fallback for real financial data.
/// </summary>
public sealed class InMemoryMortgageRepository(TimeProvider timeProvider) : IMortgageRepository
{
    private readonly object _gate = new();
    private readonly Dictionary<(string OwnerId, string Id), MortgageRecord> _records = [];

    public Task<IReadOnlyList<MortgageRecord>> ListAsync(string ownerId, CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            IReadOnlyList<MortgageRecord> results = _records
                .Where(entry => entry.Key.OwnerId == ownerId)
                .Select(entry => entry.Value)
                .OrderBy(record => record.Label, StringComparer.Ordinal)
                .ToArray();
            return Task.FromResult(results);
        }
    }

    public Task<MortgageRecord?> GetAsync(string ownerId, string id, CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            return Task.FromResult(_records.TryGetValue((ownerId, id), out var record) ? record : null);
        }
    }

    public Task<MortgageWriteResult> UpsertAsync(string ownerId, MortgageRecord record, DateTimeOffset? expectedUpdatedAt, CancellationToken cancellationToken = default)
    {
        if (!string.Equals(ownerId, record.UserId, StringComparison.Ordinal))
            return Task.FromResult(MortgageWriteResult.Invalid(["The record's owner id does not match the authenticated owner."]));

        var errors = MortgageValidator.Validate(record, timeProvider.GetUtcNow());
        if (errors.Count > 0) return Task.FromResult(MortgageWriteResult.Invalid(errors));

        lock (_gate)
        {
            var key = (ownerId, record.Id);
            var exists = _records.TryGetValue(key, out var current);

            if (expectedUpdatedAt is null)
            {
                if (exists) return Task.FromResult(MortgageWriteResult.Conflict());
                _records[key] = record;
                return Task.FromResult(MortgageWriteResult.Ok(MortgageWriteStatus.Created, record));
            }

            if (!exists) return Task.FromResult(MortgageWriteResult.NotFound());
            if (current!.UpdatedAt != expectedUpdatedAt) return Task.FromResult(MortgageWriteResult.Conflict());

            _records[key] = record;
            return Task.FromResult(MortgageWriteResult.Ok(MortgageWriteStatus.Updated, record));
        }
    }

    public Task<bool> DeleteAsync(string ownerId, string id, CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            return Task.FromResult(_records.Remove((ownerId, id)));
        }
    }
}
