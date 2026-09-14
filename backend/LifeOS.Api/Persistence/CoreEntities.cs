namespace LifeOS.Api.Persistence;

public abstract record CoreEntity(string Id, string UserId, DateTimeOffset UpdatedAt);

public sealed record TaskRecord(string Id, string UserId, DateTimeOffset UpdatedAt, string Title, string Status, string? DueDate = null) : CoreEntity(Id, UserId, UpdatedAt);
public sealed record GoalRecord(string Id, string UserId, DateTimeOffset UpdatedAt, string Title, string Status, double Progress = 0) : CoreEntity(Id, UserId, UpdatedAt);
public sealed record NoteRecord(string Id, string UserId, DateTimeOffset UpdatedAt, string Title, string Body, bool Pinned = false) : CoreEntity(Id, UserId, UpdatedAt);
public sealed record CalendarItemRecord(string Id, string UserId, DateTimeOffset UpdatedAt, string Title, DateTimeOffset StartsAt, DateTimeOffset EndsAt, string? ExternalId = null) : CoreEntity(Id, UserId, UpdatedAt);
public sealed record ProjectRecord(string Id, string UserId, DateTimeOffset UpdatedAt, string Title, string Status, double Progress = 0) : CoreEntity(Id, UserId, UpdatedAt);
public sealed record HabitRecord(string Id, string UserId, DateTimeOffset UpdatedAt, string Title, string Cadence, int Streak = 0) : CoreEntity(Id, UserId, UpdatedAt);
public sealed record PreferenceRecord(string Id, string UserId, DateTimeOffset UpdatedAt, string Key, string JsonValue) : CoreEntity(Id, UserId, UpdatedAt);
public sealed record NotificationRecord(string Id, string UserId, DateTimeOffset UpdatedAt, string Source, string Severity, string Message, bool Read = false) : CoreEntity(Id, UserId, UpdatedAt);
public sealed record AutomationMetadataRecord(string Id, string UserId, DateTimeOffset UpdatedAt, string Name, string Status, string? Schedule = null) : CoreEntity(Id, UserId, UpdatedAt);
public sealed record KpiSnapshotRecord(string Id, string UserId, DateTimeOffset UpdatedAt, string KpiId, double Value, DateTimeOffset CapturedAt) : CoreEntity(Id, UserId, UpdatedAt);
