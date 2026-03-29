using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})

.AddJwtBearer("Bearer", options =>
{
    var jwtOptions = builder.Configuration.GetSection("JwtSettings");
    var secret = jwtOptions["SecretKey"] ?? builder.Configuration["JWT_SECRET"] ?? "YourSuperSecretKeyThatIsAtLeast32CharactersLong123!";
    var issuer = jwtOptions["Issuer"] ?? builder.Configuration["JWT_ISSUER"] ?? "Cania";
    var audience = jwtOptions["Audience"] ?? builder.Configuration["JWT_AUDIENCE"] ?? "Cania";

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
        ValidateIssuer = true,
        ValidIssuer = issuer,
        ValidateAudience = true,
        ValidAudience = audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(5)
    };
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalhost", policy =>
    {
        policy.WithOrigins(
            builder.Configuration["FRONTEND_URL"] ?? "http://localhost:5173",
            builder.Configuration["FRONTEND_URL_HTTPS"] ?? "https://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddAuthorization();

builder.Configuration
    .SetBasePath(builder.Environment.ContentRootPath)
    .AddOcelot();
builder.Services
    .AddOcelot(builder.Configuration);

if (builder.Environment.IsDevelopment())
{
    builder.Logging.AddConsole();
}

var app = builder.Build();

app.UseCors("AllowLocalhost");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "OK", time = DateTime.UtcNow }));

await app.UseOcelot();
await app.RunAsync();