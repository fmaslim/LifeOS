using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace LifeOS.Api.Persistence;

public sealed record PersistenceResult<T>(bool Success, T? Value, string? Error)
{
    public static PersistenceResult<T> Ok(T value) => new(true, value, null);
    public static PersistenceResult<T> Failed() => new(false, default, "Persistence is temporarily unavailable.");
}

public interface IApplicationRepository
{
    Task<PersistenceResult<IReadOnlyList<T>>> ListAsync<T>(string userId, CancellationToken cancellationToken = default) where T : CoreEntity;
    Task<PersistenceResult<T>> UpsertAsync<T>(string userId, T entity, CancellationToken cancellationToken = default) where T : CoreEntity;
    Task<PersistenceResult<bool>> DeleteAsync<T>(string userId, string id, CancellationToken cancellationToken = default) where T : CoreEntity;
}

public sealed class JsonFileApplicationRepository : IApplicationRepository
{
    public const int CurrentSchemaVersion = 1;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = false };
    private readonly string _rootPath;
    private readonly ILogger<JsonFileApplicationRepository> _logger;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new(StringComparer.Ordinal);

    public JsonFileApplicationRepository(IConfiguration configuration, ILogger<JsonFileApplicationRepository> logger)
    {
        _rootPath = configuration["Persistence:RootPath"] ?? Path.Combine(AppContext.BaseDirectory, "app_data");
        _logger = logger;
    }

    public async Task<PersistenceResult<IReadOnlyList<T>>> ListAsync<T>(string userId, CancellationToken cancellationToken = default) where T : CoreEntity
    {
        try
        {
            var document = await ReadDocumentAsync(userId, cancellationToken);
            if (!document.Collections.TryGetValue(CollectionName<T>(), out var collection))
                return PersistenceResult<IReadOnlyList<T>>.Ok(Array.Empty<T>());
            var values = collection.Values.Select(value => value.Deserialize<T>(JsonOptions)).Where(value => value is not null).Cast<T>().ToArray();
            return PersistenceResult<IReadOnlyList<T>>.Ok(values);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
        {
            _logger.LogWarning("Persistence read failed for user data collection {Collection}.", CollectionName<T>());
            return PersistenceResult<IReadOnlyList<T>>.Failed();
        }
    }

    public async Task<PersistenceResult<T>> UpsertAsync<T>(string userId, T entity, CancellationToken cancellationToken = default) where T : CoreEntity
    {
        if (!string.Equals(userId, entity.UserId, StringComparison.Ordinal)) return PersistenceResult<T>.Failed();
        try
        {
            var path = UserFile(userId);
            var gate = _locks.GetOrAdd(path, _ => new SemaphoreSlim(1, 1));
            await gate.WaitAsync(cancellationToken);
            try
            {
                var document = await ReadDocumentUnsafeAsync(path, cancellationToken);
                var name = CollectionName<T>();
                if (!document.Collections.TryGetValue(name, out var collection)) document.Collections[name] = collection = new Dictionary<string, JsonElement>(StringComparer.Ordinal);
                collection[entity.Id] = JsonSerializer.SerializeToElement(entity, JsonOptions);
                await WriteDocumentUnsafeAsync(path, document, cancellationToken);
                return PersistenceResult<T>.Ok(entity);
            }
            finally { gate.Release(); }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
        {
            _logger.LogWarning("Persistence write failed for user data collection {Collection}.", CollectionName<T>());
            return PersistenceResult<T>.Failed();
        }
    }

    public async Task<PersistenceResult<bool>> DeleteAsync<T>(string userId, string id, CancellationToken cancellationToken = default) where T : CoreEntity
    {
        try
        {
            var path = UserFile(userId);
            var gate = _locks.GetOrAdd(path, _ => new SemaphoreSlim(1, 1));
            await gate.WaitAsync(cancellationToken);
            try
            {
                var document = await ReadDocumentUnsafeAsync(path, cancellationToken);
                var removed = document.Collections.TryGetValue(CollectionName<T>(), out var collection) && collection.Remove(id);
                if (removed) await WriteDocumentUnsafeAsync(path, document, cancellationToken);
                return PersistenceResult<bool>.Ok(removed);
            }
            finally { gate.Release(); }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
        {
            _logger.LogWarning("Persistence delete failed for user data collection {Collection}.", CollectionName<T>());
            return PersistenceResult<bool>.Failed();
        }
    }

    private async Task<UserDatabaseDocument> ReadDocumentAsync(string userId, CancellationToken cancellationToken)
    {
        var path = UserFile(userId);
        var gate = _locks.GetOrAdd(path, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try { return await ReadDocumentUnsafeAsync(path, cancellationToken); }
        finally { gate.Release(); }
    }

    private async Task<UserDatabaseDocument> ReadDocumentUnsafeAsync(string path, CancellationToken cancellationToken)
    {
        if (!File.Exists(path)) return UserDatabaseDocument.CreateCurrent();
        await using var stream = File.OpenRead(path);
        var document = await JsonSerializer.DeserializeAsync<UserDatabaseDocument>(stream, JsonOptions, cancellationToken) ?? UserDatabaseDocument.CreateCurrent();
        return PersistenceMigrator.Migrate(document);
    }

    private async Task WriteDocumentUnsafeAsync(string path, UserDatabaseDocument document, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(_rootPath);
        var temp = path + ".tmp-" + Guid.NewGuid().ToString("N");
        try
        {
            await using (var stream = File.Create(temp))
                await JsonSerializer.SerializeAsync(stream, document, JsonOptions, cancellationToken);
            File.Move(temp, path, true);
        }
        finally { if (File.Exists(temp)) File.Delete(temp); }
    }

    private string UserFile(string userId)
    {
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(userId))).ToLowerInvariant();
        return Path.Combine(_rootPath, $"user-{hash}.json");
    }

    private static string CollectionName<T>() where T : CoreEntity => typeof(T).Name switch
    {
        nameof(TaskRecord) => "tasks",
        nameof(GoalRecord) => "goals",
        nameof(NoteRecord) => "notes",
        nameof(CalendarItemRecord) => "calendar",
        nameof(ProjectRecord) => "projects",
        nameof(HabitRecord) => "habits",
        nameof(PreferenceRecord) => "preferences",
        nameof(NotificationRecord) => "notifications",
        nameof(AutomationMetadataRecord) => "automationMetadata",
        nameof(KpiSnapshotRecord) => "kpiSnapshots",
        _ => throw new NotSupportedException("Unsupported persistence record type.")
    };
}

public sealed class UserDatabaseDocument
{
    public int SchemaVersion { get; set; } = JsonFileApplicationRepository.CurrentSchemaVersion;
    public Dictionary<string, Dictionary<string, JsonElement>> Collections { get; set; } = new(StringComparer.Ordinal);
    public static UserDatabaseDocument CreateCurrent() => new();
}

public static class PersistenceMigrator
{
    public static UserDatabaseDocument Migrate(UserDatabaseDocument document)
    {
        if (document.SchemaVersion < 1)
        {
            document.Collections ??= new Dictionary<string, Dictionary<string, JsonElement>>(StringComparer.Ordinal);
            document.SchemaVersion = 1;
        }
        if (document.SchemaVersion != JsonFileApplicationRepository.CurrentSchemaVersion)
            throw new JsonException("Unsupported persistence schema version.");
        document.Collections ??= new Dictionary<string, Dictionary<string, JsonElement>>(StringComparer.Ordinal);
        return document;
    }
}
