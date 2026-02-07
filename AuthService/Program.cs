using Auth_API.Consumers;
using Auth_API.Models.Requests;
using Auth_API.Models.Settings;
using Auth_API.Services;
using AuthDb;
using MassTransit;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SharedModels.Exceptions;

var builder = WebApplication.CreateBuilder(args);

Console.WriteLine(builder.Configuration.GetValue<string>("Google_ClientId"));
Console.WriteLine(builder.Configuration.GetValue<string>("Google_SecretKey"));

builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    options.Cookie.Name = "google-auth";
    options.ExpireTimeSpan = TimeSpan.FromMinutes(60);
    options.SlidingExpiration = true;

    options.Cookie.SameSite = SameSiteMode.None;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.IsEssential = true;
    options.Cookie.HttpOnly = false;
})
.AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, options =>
{
    options.Authority = "https://accounts.google.com";
    options.ClientId = builder.Configuration.GetValue<string>("Google_ClientId")
        ?? throw new InvalidOperationException("Google_ClientId is required");
    options.ClientSecret = builder.Configuration.GetValue<string>("Google_SecretKey")
        ?? throw new InvalidOperationException("Google_SecretKey is required");

    options.Scope.Add("openid");
    options.Scope.Add("profile");
    options.Scope.Add("email");

    options.CallbackPath = "/signin-google";

    options.SaveTokens = true;
    options.GetClaimsFromUserInfoEndpoint = true;

    options.CorrelationCookie.MaxAge = TimeSpan.FromMinutes(10);
    options.CorrelationCookie.SameSite = SameSiteMode.None;
    options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;
    options.CorrelationCookie.IsEssential = true;
    options.CorrelationCookie.HttpOnly = false;
});


builder.Services.AddAuthorization();

builder.Services.AddDbContextFactory<AuthContext>(
    options => options.UseNpgsql(Environment.GetEnvironmentVariable("AUTH_DB_CONNECTION")));

var jwtSettings = new JwtSettings()
{
    SecretKey = builder.Configuration.GetValue<string>("JwtSettings_SecretKey")
        ?? throw new InvalidOperationException("JwtSettings_SecretKey is required"),
    Issuer = builder.Configuration.GetValue<string>("JwtSettings_Issuer") ?? "Auth",
    Audience = builder.Configuration.GetValue<string>("JwtSettings_Audience")?? "Services",
    ExpirationAccessTokenMinutes = 
        double.Parse(builder.Configuration.GetValue<string>("JwtSettings_ExpirationAccessTokenMinutes") ?? "15"),
    ExpirationRefreshTokenDays =
        double.Parse(builder.Configuration.GetValue<string>("JwtSettings_ExpirationRefreshTokenDays") ?? "7")
};
builder.Services.AddSingleton<JwtSettings>(jwtSettings);

builder.Services.AddScoped<IJwtService, JwtService>();

builder.Services.AddScoped<IAuthenticationJWTService, AuthenticationJWTService>();

builder.Services.AddScoped<ISocialAuthenticationService, SocialAuthenticationService>();

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<UserCreatedConsumer>();

    x.AddConsumer<UserUpdatedConsumer>();

    x.AddConsumer<UserDeletedConsumer>();

    x.AddConsumer<PasswordUpdatedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.ReceiveEndpoint("auth-users-queue", e =>
        {
            e.ConfigureConsumer<UserCreatedConsumer>(context);
            e.ConfigureConsumer<UserUpdatedConsumer>(context);
            e.ConfigureConsumer<UserDeletedConsumer>(context);
            
            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });

        cfg.ReceiveEndpoint("auth-passwords-queue", e =>
        {
            e.ConfigureConsumer<PasswordUpdatedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });
    });
});

var app = builder.Build();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

//JWT Auth

app.MapPost("/auth/login", async (LoginRequest request, IAuthenticationJWTService authenticationService) =>
{
    try
    {
        var response = await authenticationService.LoginAsync(request.Email, request.Password);
        return Results.Ok(response);
    }
    catch (AuthException)
    {
        return Results.Unauthorized();
    }
    catch(Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.MapPost("/auth/refresh", async (TokenRequest request, IAuthenticationJWTService authenticationService) =>
{
    try
    {
        var response = await authenticationService.RefreshAsync(request.RefreshToken);
        return Results.Ok(response);
    }
    catch (AuthException)
    {
        return Results.Unauthorized();
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.MapPost("/auth/logout", async (TokenRequest request, IAuthenticationJWTService authenticationService) =>
{
    try
    {
        await authenticationService.LogoutAsync(request.RefreshToken);
        return Results.Ok();
    }
    catch (AuthException)
    {
        return Results.Unauthorized();
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.MapPost("/auth/logout/all", async (TokenRequest request, HttpContext context, IAuthenticationJWTService authenticationService) =>
{
    try
    {
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);

        if (!verify)
        {
            throw new AuthException("User");
        }

        await authenticationService.LogoutAllAsync(userId, request.RefreshToken);
        return Results.Ok();
    }
    catch (AuthException)
    {
        return Results.Unauthorized();
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.MapGet("/auth/google/login", async (HttpContext context) =>
{
    var properties = new AuthenticationProperties
    {
        RedirectUri = "/auth/google/callback"
    };

    return Results.Challenge(properties, new[] { OpenIdConnectDefaults.AuthenticationScheme });
});

app.MapGet("/auth/google/callback", async (
    HttpContext context,
    ISocialAuthenticationService service) =>
{
    var authenticateResult = await context.AuthenticateAsync(
    CookieAuthenticationDefaults.AuthenticationScheme);

    if (!authenticateResult.Succeeded)
    {
        Console.WriteLine($"Authentication FAILED");
        Console.WriteLine($"Error: {authenticateResult.Failure?.Message}");
        Console.WriteLine($"Failure type: {authenticateResult.Failure?.GetType().Name}");

        return Results.Unauthorized();
    }

    var claimsPrincipal = authenticateResult.Principal;

    var response = await service.Login(claimsPrincipal);

    await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

    return Results.Ok(response);
});

app.Run();