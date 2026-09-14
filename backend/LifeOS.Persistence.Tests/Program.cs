using LifeOS.Api.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

var root = Path.Combine(Path.GetTempPath(), "lifeos-persistence-test-" + Guid.NewGuid().ToString("N"));
try
{
    var configuration = new ConfigurationManager();
    configuration["Persistence:RootPath"] = root;
    using var loggerFactory = LoggerFactory.Create(_ => { });
    var repository = new JsonFileApplicationRepository(configuration, loggerFactory.CreateLogger<JsonFileApplicationRepository>());
    var now = DateTimeOffset.UtcNow;
    var task = new TaskRecord("task-1", "owner", now, "Persist me", "open");

    var saved = await repository.UpsertAsync("owner", task);
    Assert(saved.Success, "upsert should succeed");

    var listed = await repository.ListAsync<TaskRecord>("owner");
    Assert(listed.Success && listed.Value?.Count == 1 && listed.Value[0].Title == "Persist me", "stored task should round-trip");

    var updated = task with { Title = "Updated", UpdatedAt = now.AddMinutes(1) };
    await repository.UpsertAsync("owner", updated);
    var deduped = await repository.ListAsync<TaskRecord>("owner");
    Assert(deduped.Value?.Count == 1 && deduped.Value[0].Title == "Updated", "idempotent upsert should not duplicate records");

    var rejected = await repository.UpsertAsync("another-user", updated);
    Assert(!rejected.Success, "cross-user writes must fail safely");

    var migrated = PersistenceMigrator.Migrate(new UserDatabaseDocument { SchemaVersion = 0 });
    Assert(migrated.SchemaVersion == JsonFileApplicationRepository.CurrentSchemaVersion, "schema migration should be repeatable");
    Assert(PersistenceMigrator.Migrate(migrated).SchemaVersion == JsonFileApplicationRepository.CurrentSchemaVersion, "repeated migration should be idempotent");

    var deleted = await repository.DeleteAsync<TaskRecord>("owner", "task-1");
    Assert(deleted.Success && deleted.Value, "delete should succeed");
    Console.WriteLine("Persistence foundation tests passed.");
}
finally
{
    if (Directory.Exists(root)) Directory.Delete(root, true);
}

static void Assert(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}
