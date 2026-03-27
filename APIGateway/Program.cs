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
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["JWT_SECRET"] ?? "YourSuperSecretKeyThatIsAtLeast32CharactersLong123!")),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["JWT_ISSUER"] ?? "Cania",
        ValidateAudience = true,
        ValidAudience = builder.Configuration["JWT_AUDIENCE"] ?? "Cania",
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(5)
    };
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

app.UseAuthentication();
app.UseAuthorization();

await app.UseOcelot();
await app.RunAsync();