using LifeOS.Api.Persistence;

namespace LifeOS.Api.Finance;

/// <summary>
/// A manually entered mortgage snapshot. Deliberately minimal: only the fields the
/// owner enters by hand, never a synced/imported balance.
/// </summary>
public sealed record MortgageRecord(
    string Id,
    string UserId,
    DateTimeOffset UpdatedAt,
    string Label,
    decimal CurrentBalance,
    decimal AnnualInterestRatePercent,
    decimal MonthlyPrincipalAndInterest,
    DateOnly AsOfDate) : CoreEntity(Id, UserId, UpdatedAt);

/// <summary>
/// Pure validation for a <see cref="MortgageRecord"/>. Deliberately independent of any
/// storage adapter so both the in-memory fake and a future Firestore adapter enforce the
/// exact same rules and can share the same test expectations.
/// </summary>
public static class MortgageValidator
{
    public const int MaxLabelLength = 200;
    public const decimal MaxBalance = 100_000_000m;
    public const decimal MaxMonthlyPayment = 1_000_000m;
    public const decimal MaxAnnualRatePercent = 100m;
    public static readonly DateOnly MinAsOfDate = new(1900, 1, 1);

    public static IReadOnlyList<string> Validate(MortgageRecord record, DateTimeOffset now)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(record.Id)) errors.Add("Id is required.");
        if (string.IsNullOrWhiteSpace(record.UserId)) errors.Add("Owner id is required.");

        if (string.IsNullOrWhiteSpace(record.Label)) errors.Add("Label is required.");
        else if (record.Label.Length > MaxLabelLength) errors.Add($"Label must be {MaxLabelLength} characters or fewer.");

        if (record.CurrentBalance < 0 || record.CurrentBalance > MaxBalance)
            errors.Add($"Current balance must be between 0 and {MaxBalance:0}.");

        if (record.AnnualInterestRatePercent < 0 || record.AnnualInterestRatePercent > MaxAnnualRatePercent)
            errors.Add("Annual interest rate must be between 0 and 100 percent.");

        if (record.MonthlyPrincipalAndInterest < 0 || record.MonthlyPrincipalAndInterest > MaxMonthlyPayment)
            errors.Add($"Monthly principal and interest payment must be between 0 and {MaxMonthlyPayment:0}.");

        var today = DateOnly.FromDateTime(now.UtcDateTime);
        if (record.AsOfDate == default) errors.Add("As-of date is required.");
        else if (record.AsOfDate > today) errors.Add("As-of date cannot be in the future.");
        else if (record.AsOfDate < MinAsOfDate) errors.Add($"As-of date must be on or after {MinAsOfDate:yyyy-MM-dd}.");

        return errors;
    }
}
