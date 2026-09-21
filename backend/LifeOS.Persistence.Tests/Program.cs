using LifeOS.Api.Persistence;
using LifeOS.Api.Auth;
using LifeOS.Api.Finance;
using LifeOS.Persistence.Tests;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;

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
    await VerifyFinanceEndpointFailsClosed();
    await VerifyCredentialStatusNeverLeaksSecretValue();
    await VerifyCorsDeniesUnconfiguredOrigins();
    await VerifyLoginRejectsNonJsonBody();
    await VerifyMortgageRepositoryContract();
    await VerifyMortgageEndpointsFailClosedWhenUnconfigured();
    await VerifyMortgageEndpointsRejectAnonymousAccess();
    await VerifyMortgageEndpointsCrudAuthAndValidation();
    Console.WriteLine("Persistence foundation tests passed.");
}
finally
{
    if (Directory.Exists(root)) Directory.Delete(root, true);
}

static async Task VerifyAuthenticationContract()
{
    const string password = "test-owner-password";
    await using var factory = new WebApplicationFactory<LifeOS.Api.ApiAssemblyMarker>().WithWebHostBuilder(builder =>
        builder.UseContentRoot(Path.GetFullPath("backend/LifeOS.Api", Directory.GetCurrentDirectory()))
            .UseSetting("Auth:OwnerPassword", password)
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

static async Task VerifyFinanceEndpointFailsClosed()
{
    await using var factory = new WebApplicationFactory<LifeOS.Api.ApiAssemblyMarker>().WithWebHostBuilder(builder =>
        builder.UseContentRoot(Path.GetFullPath("backend/LifeOS.Api", Directory.GetCurrentDirectory()))
            .UseSetting("Auth:OwnerPassword", "test-owner-password")
            .UseSetting("Auth:SigningKey", "test-only-signing-key-that-is-at-least-thirty-two-bytes")
            .UseSetting("Auth:SessionHours", "1"));

    using var anonymousClient = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
    var anonymous = await anonymousClient.GetAsync("/api/finance/summary");
    Assert(anonymous.StatusCode == HttpStatusCode.Unauthorized, "signed-out access to the finance summary must be rejected");

    using var sessionClient = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false, HandleCookies = true });
    await sessionClient.PostAsJsonAsync("/api/auth/login", new AuthEndpoints.LoginRequest("test-owner-password"));

    var response = await sessionClient.GetAsync("/api/finance/summary");
    Assert(response.StatusCode == HttpStatusCode.OK, "an authenticated request should still receive a safe snapshot, not an error");
    var body = await response.Content.ReadAsStringAsync();
    Assert(body.Contains("\"status\":\"disconnected\"", StringComparison.Ordinal), "an unconfigured finance provider must report a disconnected status, not synthesize data");
    Assert(body.Contains("\"accounts\":[]", StringComparison.Ordinal) && body.Contains("\"investments\":[]", StringComparison.Ordinal), "an unconfigured finance provider must return empty collections, never mock or stale financial figures");
}

static async Task VerifyCredentialStatusNeverLeaksSecretValue()
{
    const string secret = "test-only-finance-secret-should-never-leak";
    await using var factory = new WebApplicationFactory<LifeOS.Api.ApiAssemblyMarker>().WithWebHostBuilder(builder =>
        builder.UseContentRoot(Path.GetFullPath("backend/LifeOS.Api", Directory.GetCurrentDirectory()))
            .UseSetting("Auth:OwnerPassword", "test-owner-password")
            .UseSetting("Auth:SigningKey", "test-only-signing-key-that-is-at-least-thirty-two-bytes")
            .UseSetting("Auth:SessionHours", "1")
            .UseSetting("Integrations:Finance:Credential", secret));

    using var sessionClient = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false, HandleCookies = true });
    await sessionClient.PostAsJsonAsync("/api/auth/login", new AuthEndpoints.LoginRequest("test-owner-password"));

    var response = await sessionClient.GetAsync("/api/integrations/credentials");
    Assert(response.StatusCode == HttpStatusCode.OK, "the credentials status route should be reachable for an authenticated owner");
    var body = await response.Content.ReadAsStringAsync();
    Assert(!body.Contains(secret, StringComparison.Ordinal), "credential status responses must never contain the configured secret value");
    Assert(body.Contains("\"provider\":\"Finance\"", StringComparison.Ordinal) && body.Contains("\"state\":\"configured\"", StringComparison.Ordinal), "a configured finance credential should report state metadata only");
}

static async Task VerifyCorsDeniesUnconfiguredOrigins()
{
    await using var factory = new WebApplicationFactory<LifeOS.Api.ApiAssemblyMarker>().WithWebHostBuilder(builder =>
        builder.UseContentRoot(Path.GetFullPath("backend/LifeOS.Api", Directory.GetCurrentDirectory()))
            .UseSetting("Auth:OwnerPassword", "test-owner-password")
            .UseSetting("Auth:SigningKey", "test-only-signing-key-that-is-at-least-thirty-two-bytes")
            .UseEnvironment("Production"));

    using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
    using var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/session");
    request.Headers.Add("Origin", "https://evil.example");
    var response = await client.SendAsync(request);

    Assert(!response.Headers.Contains("Access-Control-Allow-Origin"), "with no configured allowed origins, production must not echo back a third-party Origin");
}

static async Task VerifyLoginRejectsNonJsonBody()
{
    await using var factory = new WebApplicationFactory<LifeOS.Api.ApiAssemblyMarker>().WithWebHostBuilder(builder =>
        builder.UseContentRoot(Path.GetFullPath("backend/LifeOS.Api", Directory.GetCurrentDirectory()))
            .UseSetting("Auth:OwnerPassword", "test-owner-password")
            .UseSetting("Auth:SigningKey", "test-only-signing-key-that-is-at-least-thirty-two-bytes"));

    using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
    using var formBody = new StringContent("password=test-owner-password", Encoding.UTF8, "application/x-www-form-urlencoded");
    var response = await client.PostAsync("/api/auth/login", formBody);

    Assert(response.StatusCode != HttpStatusCode.OK, "a form-encoded login body (the shape a cross-site form submission would send) must never authenticate");
}

static async Task VerifyMortgageRepositoryContract()
{
    var timeProvider = new FakeTimeProvider(new DateTimeOffset(2026, 9, 21, 12, 0, 0, TimeSpan.Zero));
    IMortgageRepository repository = new InMemoryMortgageRepository(timeProvider);

    MortgageRecord Valid(string id, string ownerId = "owner-a") => new(
        id, ownerId, timeProvider.GetUtcNow(), "Test St mortgage", 250_000.00m, 5.5m, 1_650.00m, new DateOnly(2026, 9, 1));

    // Validation: monetary, rate, and date bounds are rejected before anything is stored.
    var negativeBalance = await repository.UpsertAsync("owner-a", Valid("m-negative") with { CurrentBalance = -1m }, null);
    Assert(negativeBalance.Status == MortgageWriteStatus.Invalid, "a negative balance must be rejected");

    var rateTooHigh = await repository.UpsertAsync("owner-a", Valid("m-rate") with { AnnualInterestRatePercent = 101m }, null);
    Assert(rateTooHigh.Status == MortgageWriteStatus.Invalid, "a rate above 100 percent must be rejected");

    var negativePayment = await repository.UpsertAsync("owner-a", Valid("m-payment") with { MonthlyPrincipalAndInterest = -1m }, null);
    Assert(negativePayment.Status == MortgageWriteStatus.Invalid, "a negative monthly payment must be rejected");

    var futureAsOf = await repository.UpsertAsync("owner-a", Valid("m-future") with { AsOfDate = new DateOnly(2026, 9, 22) }, null);
    Assert(futureAsOf.Status == MortgageWriteStatus.Invalid, "an as-of date in the future must be rejected");

    var blankLabel = await repository.UpsertAsync("owner-a", Valid("m-label") with { Label = "  " }, null);
    Assert(blankLabel.Status == MortgageWriteStatus.Invalid, "a blank label must be rejected");

    var mismatchedOwner = await repository.UpsertAsync("owner-a", Valid("m-mismatch", ownerId: "owner-b"), null);
    Assert(mismatchedOwner.Status == MortgageWriteStatus.Invalid, "a record whose owner id does not match the caller must be rejected");

    Assert((await repository.ListAsync("owner-a")).Count == 0, "no invalid record should have been persisted");

    // Create.
    var created = await repository.UpsertAsync("owner-a", Valid("m-1"), null);
    Assert(created.Status == MortgageWriteStatus.Created && created.Record is not null, "a valid mortgage should be created");

    var duplicateCreate = await repository.UpsertAsync("owner-a", Valid("m-1"), null);
    Assert(duplicateCreate.Status == MortgageWriteStatus.Conflict, "creating over an existing id without an expected version must conflict");

    // Ownership isolation: a second owner cannot see or affect the first owner's record.
    await repository.UpsertAsync("owner-b", Valid("m-1", ownerId: "owner-b"), null);
    Assert((await repository.ListAsync("owner-a")).Count == 1, "owner A must only see their own mortgage");
    Assert((await repository.ListAsync("owner-b")).Count == 1, "owner B must only see their own mortgage");
    Assert(await repository.GetAsync("owner-b", "m-1") is not null, "owner B can read their own record");
    var crossOwnerDelete = await repository.DeleteAsync("owner-a", "does-not-belong-to-owner-a");
    Assert(!crossOwnerDelete, "deleting a nonexistent id under another owner must not succeed");

    // Optimistic concurrency.
    var current = await repository.GetAsync("owner-a", "m-1");
    Assert(current is not null, "the created record should be readable");
    var staleUpdate = await repository.UpsertAsync("owner-a", current! with { CurrentBalance = 249_000m }, current.UpdatedAt.AddMinutes(-5));
    Assert(staleUpdate.Status == MortgageWriteStatus.Conflict, "an update against a stale expected version must conflict");

    var missingUpdate = await repository.UpsertAsync("owner-a", Valid("does-not-exist"), timeProvider.GetUtcNow());
    Assert(missingUpdate.Status == MortgageWriteStatus.NotFound, "updating a nonexistent record must report not-found");

    var updated = await repository.UpsertAsync("owner-a", current with { CurrentBalance = 249_000m, UpdatedAt = timeProvider.GetUtcNow().AddMinutes(1) }, current.UpdatedAt);
    Assert(updated.Status == MortgageWriteStatus.Updated && updated.Record?.CurrentBalance == 249_000m, "an update against the correct expected version should succeed");

    // Delete.
    Assert(await repository.DeleteAsync("owner-a", "m-1"), "deleting an existing record should succeed");
    Assert(await repository.GetAsync("owner-a", "m-1") is null, "a deleted record should no longer be readable");
}

static async Task VerifyMortgageEndpointsFailClosedWhenUnconfigured()
{
    // No Integrations:Finance:Firestore:ProjectId is set, so Program.cs never registers
    // IMortgageRepository at all - the endpoints must fail closed, not fall back silently.
    await using var factory = new WebApplicationFactory<LifeOS.Api.ApiAssemblyMarker>().WithWebHostBuilder(builder =>
        builder.UseContentRoot(Path.GetFullPath("backend/LifeOS.Api", Directory.GetCurrentDirectory()))
            .UseSetting("Auth:OwnerPassword", "test-owner-password")
            .UseSetting("Auth:SigningKey", "test-only-signing-key-that-is-at-least-thirty-two-bytes"));

    using var client = await SignedInClient(factory, "test-owner-password");
    var response = await client.GetAsync("/api/finance/mortgages/");
    Assert(response.StatusCode == HttpStatusCode.ServiceUnavailable, "an unconfigured mortgage store must fail closed with 503, never a mock list");
}

static async Task VerifyMortgageEndpointsRejectAnonymousAccess()
{
    await using var factory = new WebApplicationFactory<LifeOS.Api.ApiAssemblyMarker>().WithWebHostBuilder(builder =>
        builder.UseContentRoot(Path.GetFullPath("backend/LifeOS.Api", Directory.GetCurrentDirectory()))
            .UseSetting("Auth:OwnerPassword", "test-owner-password")
            .UseSetting("Auth:SigningKey", "test-only-signing-key-that-is-at-least-thirty-two-bytes")
            .ConfigureTestServices(services => services.AddSingleton<IMortgageRepository>(new InMemoryMortgageRepository(TimeProvider.System))));

    using var anonymous = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
    Assert((await anonymous.GetAsync("/api/finance/mortgages/")).StatusCode == HttpStatusCode.Unauthorized, "anonymous list must be rejected");
    Assert((await anonymous.PostAsJsonAsync("/api/finance/mortgages/", SampleRequest())).StatusCode == HttpStatusCode.Unauthorized, "anonymous create must be rejected");
    Assert((await anonymous.PutAsJsonAsync("/api/finance/mortgages/any-id", SampleUpdateRequest(DateTimeOffset.UtcNow))).StatusCode == HttpStatusCode.Unauthorized, "anonymous update must be rejected");
    Assert((await anonymous.DeleteAsync("/api/finance/mortgages/any-id")).StatusCode == HttpStatusCode.Unauthorized, "anonymous delete must be rejected");
}

static async Task VerifyMortgageEndpointsCrudAuthAndValidation()
{
    await using var factory = new WebApplicationFactory<LifeOS.Api.ApiAssemblyMarker>().WithWebHostBuilder(builder =>
        builder.UseContentRoot(Path.GetFullPath("backend/LifeOS.Api", Directory.GetCurrentDirectory()))
            .UseSetting("Auth:OwnerPassword", "test-owner-password")
            .UseSetting("Auth:SigningKey", "test-only-signing-key-that-is-at-least-thirty-two-bytes")
            .ConfigureTestServices(services => services.AddSingleton<IMortgageRepository>(new InMemoryMortgageRepository(TimeProvider.System))));

    using var client = await SignedInClient(factory, "test-owner-password");

    // CSRF guard: a write without the client header must be rejected even for a signed-in owner.
    using (var withoutHeader = new HttpRequestMessage(HttpMethod.Post, "/api/finance/mortgages/") { Content = JsonContent.Create(SampleRequest()) })
    {
        var rejected = await client.SendAsync(withoutHeader);
        Assert(rejected.StatusCode == HttpStatusCode.Forbidden, "a create request missing the X-LifeOS-Client header must be rejected");
    }

    // Invalid input is rejected and never stored.
    using (var invalid = new HttpRequestMessage(HttpMethod.Post, "/api/finance/mortgages/") { Content = JsonContent.Create(SampleRequest() with { CurrentBalance = -5m }) })
    {
        invalid.Headers.Add("X-LifeOS-Client", "web");
        var invalidResponse = await client.SendAsync(invalid);
        Assert(invalidResponse.StatusCode == HttpStatusCode.BadRequest, "an invalid mortgage payload must be rejected with 400");
    }
    Assert((await client.GetFromJsonAsync<MortgageResponse[]>("/api/finance/mortgages/"))!.Length == 0, "no invalid record should have been stored");

    // Create.
    MortgageResponse created;
    using (var create = new HttpRequestMessage(HttpMethod.Post, "/api/finance/mortgages/") { Content = JsonContent.Create(SampleRequest()) })
    {
        create.Headers.Add("X-LifeOS-Client", "web");
        var createResponse = await client.SendAsync(create);
        Assert(createResponse.StatusCode == HttpStatusCode.Created, "a valid mortgage should be created");
        created = (await createResponse.Content.ReadFromJsonAsync<MortgageResponse>())!;
        Assert(created.Label == "Test St mortgage" && created.CurrentBalance == 250_000.00m, "the created record should round-trip the submitted values");
    }

    var list = await client.GetFromJsonAsync<MortgageResponse[]>("/api/finance/mortgages/");
    Assert(list!.Length == 1 && list[0].Id == created.Id, "the created mortgage should appear in the list");

    var fetched = await client.GetFromJsonAsync<MortgageResponse>($"/api/finance/mortgages/{created.Id}");
    Assert(fetched is not null && fetched.Id == created.Id, "the created mortgage should be readable by id");

    // Update with a stale version conflicts.
    using (var staleUpdate = new HttpRequestMessage(HttpMethod.Put, $"/api/finance/mortgages/{created.Id}") { Content = JsonContent.Create(SampleUpdateRequest(created.UpdatedAt.AddMinutes(-1))) })
    {
        staleUpdate.Headers.Add("X-LifeOS-Client", "web");
        var staleResponse = await client.SendAsync(staleUpdate);
        Assert(staleResponse.StatusCode == HttpStatusCode.Conflict, "updating with a stale expected version must return 409");
    }

    // Update with the correct version succeeds.
    using (var update = new HttpRequestMessage(HttpMethod.Put, $"/api/finance/mortgages/{created.Id}") { Content = JsonContent.Create(SampleUpdateRequest(created.UpdatedAt) with { CurrentBalance = 249_500m }) })
    {
        update.Headers.Add("X-LifeOS-Client", "web");
        var updateResponse = await client.SendAsync(update);
        Assert(updateResponse.StatusCode == HttpStatusCode.OK, "updating with the correct expected version should succeed");
        var updated = await updateResponse.Content.ReadFromJsonAsync<MortgageResponse>();
        Assert(updated!.CurrentBalance == 249_500m, "the update should be reflected in the response");
    }

    // Updating a nonexistent id reports not-found.
    using (var missing = new HttpRequestMessage(HttpMethod.Put, "/api/finance/mortgages/does-not-exist") { Content = JsonContent.Create(SampleUpdateRequest(DateTimeOffset.UtcNow)) })
    {
        missing.Headers.Add("X-LifeOS-Client", "web");
        var missingResponse = await client.SendAsync(missing);
        Assert(missingResponse.StatusCode == HttpStatusCode.NotFound, "updating a nonexistent mortgage must return 404");
    }

    // Delete without the client header is rejected; with it, succeeds; deleting again is not-found.
    using (var deleteWithoutHeader = new HttpRequestMessage(HttpMethod.Delete, $"/api/finance/mortgages/{created.Id}"))
    {
        var rejected = await client.SendAsync(deleteWithoutHeader);
        Assert(rejected.StatusCode == HttpStatusCode.Forbidden, "a delete request missing the X-LifeOS-Client header must be rejected");
    }
    using (var delete = new HttpRequestMessage(HttpMethod.Delete, $"/api/finance/mortgages/{created.Id}"))
    {
        delete.Headers.Add("X-LifeOS-Client", "web");
        Assert((await client.SendAsync(delete)).StatusCode == HttpStatusCode.NoContent, "deleting an existing mortgage should succeed");
    }
    using (var deleteAgain = new HttpRequestMessage(HttpMethod.Delete, $"/api/finance/mortgages/{created.Id}"))
    {
        deleteAgain.Headers.Add("X-LifeOS-Client", "web");
        Assert((await client.SendAsync(deleteAgain)).StatusCode == HttpStatusCode.NotFound, "deleting an already-deleted mortgage must return 404");
    }
}

static MortgageRequest SampleRequest() => new("Test St mortgage", 250_000.00m, 5.5m, 1_650.00m, new DateOnly(2026, 9, 1));

static MortgageUpdateRequest SampleUpdateRequest(DateTimeOffset expectedUpdatedAt) => new("Test St mortgage", 250_000.00m, 5.5m, 1_650.00m, new DateOnly(2026, 9, 1), expectedUpdatedAt);

static async Task<HttpClient> SignedInClient(WebApplicationFactory<LifeOS.Api.ApiAssemblyMarker> factory, string password)
{
    var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false, HandleCookies = true });
    var login = await client.PostAsJsonAsync("/api/auth/login", new AuthEndpoints.LoginRequest(password));
    Assert(login.StatusCode == HttpStatusCode.OK, "test setup: login must succeed before exercising a protected route");
    return client;
}

static void Assert(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}

sealed class FakeTimeProvider(DateTimeOffset now) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => now;
}
