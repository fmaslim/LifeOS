using LifeOS.Api.Auth;
using LifeOS.Api.Integrations;
using Microsoft.AspNetCore.Authentication;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(options => options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<ISecretProvider, EnvironmentSecretProvider>();
builder.Services.AddSingleton<CredentialBroker>();
builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection(AuthOptions.SectionName));
builder.Services.AddSingleton<IAuthSessionService, HmacAuthSessionService>();
builder.Services.AddAuthentication(LifeOSAuthenticationHandler.Scheme)
    .AddScheme<AuthenticationSchemeOptions, LifeOSAuthenticationHandler>(LifeOSAuthenticationHandler.Scheme, _ => { });
builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapLifeOSAuth();

app.MapGet("/api/integrations/credentials", async (CredentialBroker broker, CancellationToken cancellationToken) =>
{
    var providers = new[] { ("GitHub", "Integrations:GitHub:Credential"), ("YouTube", "Integrations:YouTube:Credential"), ("LinLoop Reach", "Integrations:Jarvis:Credential") };
    var statuses = await Task.WhenAll(providers.Select(item => broker.GetStatusAsync(item.Item1, item.Item2, cancellationToken).AsTask()));
    return Results.Ok(statuses);
}).RequireAuthorization();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
