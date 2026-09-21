using System.Globalization;
using Google.Cloud.Firestore;

namespace LifeOS.Api.Finance;

/// <summary>
/// Firestore-backed <see cref="IMortgageRepository"/>, storing documents at
/// <c>users/{ownerId}/mortgages/{id}</c> (see docs/finance-mortgage-firestore.md).
/// Only constructed when Firestore is explicitly configured (see Program.cs); there is
/// no fallback path in this type — every failure surfaces to the caller rather than
/// silently degrading to mock or ephemeral data.
///
/// Monetary and rate fields are stored as invariant-culture decimal strings rather than
/// Firestore's native double, because Firestore has no fixed-point numeric type and a
/// binary float must never represent money.
/// </summary>
internal sealed class FirestoreMortgageRepository : IMortgageRepository
{
    private readonly FirestoreDb _db;
    private readonly TimeProvider _timeProvider;

    public FirestoreMortgageRepository(FirestoreDb db, TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    private CollectionReference Collection(string ownerId) => _db.Collection("users").Document(ownerId).Collection("mortgages");

    public async Task<IReadOnlyList<MortgageRecord>> ListAsync(string ownerId, CancellationToken cancellationToken = default)
    {
        var snapshot = await Collection(ownerId).GetSnapshotAsync(cancellationToken);
        return snapshot.Documents
            .Select(document => ToRecord(ownerId, document))
            .OrderBy(record => record.Label, StringComparer.Ordinal)
            .ToArray();
    }

    public async Task<MortgageRecord?> GetAsync(string ownerId, string id, CancellationToken cancellationToken = default)
    {
        var document = await Collection(ownerId).Document(id).GetSnapshotAsync(cancellationToken);
        return document.Exists ? ToRecord(ownerId, document) : null;
    }

    public async Task<MortgageWriteResult> UpsertAsync(string ownerId, MortgageRecord record, DateTimeOffset? expectedUpdatedAt, CancellationToken cancellationToken = default)
    {
        if (!string.Equals(ownerId, record.UserId, StringComparison.Ordinal))
            return MortgageWriteResult.Invalid(["The record's owner id does not match the authenticated owner."]);

        var errors = MortgageValidator.Validate(record, _timeProvider.GetUtcNow());
        if (errors.Count > 0) return MortgageWriteResult.Invalid(errors);

        var documentRef = Collection(ownerId).Document(record.Id);
        return await _db.RunTransactionAsync(async transaction =>
        {
            var snapshot = await transaction.GetSnapshotAsync(documentRef, cancellationToken);

            if (expectedUpdatedAt is null)
            {
                if (snapshot.Exists) return MortgageWriteResult.Conflict();
                transaction.Set(documentRef, ToFields(record));
                return MortgageWriteResult.Ok(MortgageWriteStatus.Created, record);
            }

            if (!snapshot.Exists) return MortgageWriteResult.NotFound();
            var storedUpdatedAt = snapshot.GetValue<Timestamp>("updatedAt").ToDateTimeOffset();
            if (storedUpdatedAt != expectedUpdatedAt) return MortgageWriteResult.Conflict();

            transaction.Set(documentRef, ToFields(record));
            return MortgageWriteResult.Ok(MortgageWriteStatus.Updated, record);
        }, cancellationToken: cancellationToken);
    }

    public async Task<bool> DeleteAsync(string ownerId, string id, CancellationToken cancellationToken = default)
    {
        var documentRef = Collection(ownerId).Document(id);
        var snapshot = await documentRef.GetSnapshotAsync(cancellationToken);
        if (!snapshot.Exists) return false;
        await documentRef.DeleteAsync(cancellationToken: cancellationToken);
        return true;
    }

    private static Dictionary<string, object> ToFields(MortgageRecord record) => new()
    {
        ["label"] = record.Label,
        ["currentBalance"] = record.CurrentBalance.ToString(CultureInfo.InvariantCulture),
        ["annualInterestRatePercent"] = record.AnnualInterestRatePercent.ToString(CultureInfo.InvariantCulture),
        ["monthlyPrincipalAndInterest"] = record.MonthlyPrincipalAndInterest.ToString(CultureInfo.InvariantCulture),
        ["asOfDate"] = record.AsOfDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        ["updatedAt"] = Timestamp.FromDateTimeOffset(record.UpdatedAt),
    };

    private static MortgageRecord ToRecord(string ownerId, DocumentSnapshot document) => new(
        document.Id,
        ownerId,
        document.GetValue<Timestamp>("updatedAt").ToDateTimeOffset(),
        document.GetValue<string>("label"),
        decimal.Parse(document.GetValue<string>("currentBalance"), CultureInfo.InvariantCulture),
        decimal.Parse(document.GetValue<string>("annualInterestRatePercent"), CultureInfo.InvariantCulture),
        decimal.Parse(document.GetValue<string>("monthlyPrincipalAndInterest"), CultureInfo.InvariantCulture),
        DateOnly.ParseExact(document.GetValue<string>("asOfDate"), "yyyy-MM-dd", CultureInfo.InvariantCulture));
}
