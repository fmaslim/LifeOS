using LifeOS.Api.Persistence;
using LifeOS.Api.Auth;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Http.Json;

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

    await VerifyAuthenticationContract();
    Console.WriteLine("Persistence foundation tests passed.");
}
finally
{
    if (Directory.Exists(root)) Directory.Delete(root, true);
}

static async Task VerifyAuthenticationContract()
{
    const string password = "test-owner-password";
    await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        builder.UseSetting("Auth:OwnerPassword", password)
            .UseSetting("Auth:SigningKey", "test-only-signing-key-that-is-at-least-thirty-two-bytes")
            .UseSetting("Auth:SessionHours", "1"));

    using var signedOutClient = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
    var signedOut = await signedOutClient.GetAsync("/api/auth/session");
    Assert(signedOut.StatusCode == HttpStatusCode.Unauthorized, "signed-out session should return 401");
    Assert(signedOut.Headers.TryGetValues("X-LifeOS-Auth-State", out var authStates) && authStates.Single() == "signed-out",
        "signed-out session should include the production auth-state header");

    var failedLogin = await signedOutClient.PostAsJsonAsync("/api/auth/login", new AuthEndpoints.LoginRequest("wrong"));
    Assert(failedLogin.StatusCode == HttpStatusCode.Unauthorized, "invalid password should be rejected");

    using var sessionClient = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false, HandleCookies = true });
    var login = await sessionClient.PostAsJsonAsync("/api/auth/login", new AuthEndpoints.LoginRequest(password));
    Assert(login.StatusCode == HttpStatusCode.OK, "valid login should succeed");
    Assert(login.Headers.TryGetValues("Set-Cookie", out var cookies) && cookies.Any(cookie => cookie.StartsWith(LifeOSAuthenticationHandler.CookieName + "=", StringComparison.Ordinal)),
        "login should issue the session cookie");

    var authenticated = await sessionClient.GetAsync("/api/auth/session");
    Assert(authenticated.StatusCode == HttpStatusCode.OK, "session cookie should authorize the protected session route");

    var logout = await sessionClient.PostAsync("/api/auth/logout", null);
    Assert(logout.StatusCode == HttpStatusCode.NoContent, "logout should succeed");
    Assert(logout.Headers.TryGetValues("Set-Cookie", out var logoutCookies) && logoutCookies.Any(cookie => cookie.StartsWith(LifeOSAuthenticationHandler.CookieName + "=", StringComparison.Ordinal)),
        "logout should expire the session cookie");

    var afterLogout = await sessionClient.GetAsync("/api/auth/session");
    Assert(afterLogout.StatusCode == HttpStatusCode.Unauthorized, "logged-out session should be protected");
}

static void Assert(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}
