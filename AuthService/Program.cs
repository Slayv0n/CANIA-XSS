using Auth_API.Consumers;
using Auth_API.Models.Requests;
using Auth_API.Models.Settings;
using Auth_API.Services;
using AuthDb;
using MassTransit;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using SharedModels.Exceptions;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    options.Cookie.Name = "auth-cookie";
    options.ExpireTimeSpan = TimeSpan.FromMinutes(Convert.ToDouble(
        builder.Configuration.GetValue<string>("JwtSettings_ExpirationAccessTokenMinutes") ?? "15"));
    options.SlidingExpiration = true;

    options.Cookie.SameSite = SameSiteMode.None;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.IsEssential = true;
    options.Cookie.HttpOnly = false;
})
.AddOpenIdConnect("Google", options =>
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

    options.Events = new OpenIdConnectEvents
    {
        OnTokenValidated = context =>
        {
            var identity = (ClaimsIdentity?)context.Principal?.Identity;

            identity?.AddClaim(new Claim("provider", "google"));

            Console.WriteLine($"Token validated, provider: google");

            return Task.CompletedTask;
        }
    };
})
.AddOAuth("GitHub", "Login with GitHub", options =>
{
    options.ClientId = builder.Configuration.GetValue<string>("GitHub_ClientId")
        ?? throw new InvalidOperationException("GitHub_ClientId is required");
    options.ClientSecret = builder.Configuration.GetValue<string>("GitHub_SecretKey")
        ?? throw new InvalidOperationException("GitHub_SecretKey is required");

    options.AuthorizationEndpoint = "https://github.com/login/oauth/authorize";
    options.TokenEndpoint = "https://github.com/login/oauth/access_token";
    options.UserInformationEndpoint = "https://api.github.com/user";

    options.Scope.Add("user:email");
    options.Scope.Add("read:user");

    options.CallbackPath = "/signin-github";
    options.SaveTokens = true;

    options.CorrelationCookie.MaxAge = TimeSpan.FromMinutes(Convert.ToDouble(
        builder.Configuration.GetValue<string>("JwtSettings_ExpirationAccessTokenMinutes") ?? "15"));
    options.CorrelationCookie.SameSite = SameSiteMode.None;
    options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;
    options.CorrelationCookie.IsEssential = true;

    options.ClaimActions.MapJsonKey(ClaimTypes.NameIdentifier, "id");
    options.ClaimActions.MapJsonKey(ClaimTypes.Name, "login");

    options.Events = new OAuthEvents
    {
        OnCreatingTicket = async context =>
        {
            var request = new HttpRequestMessage(HttpMethod.Get, context.Options.UserInformationEndpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", context.AccessToken);
            request.Headers.Add("User-Agent", "Cania");
            request.Headers.Add("Accept", "application/vnd.github+json");

            var response = await context.Backchannel.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, context.HttpContext.RequestAborted);
            response.EnsureSuccessStatusCode();

            using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var userElement = payload.RootElement;

            string? email = null;
            if (userElement.TryGetProperty("email", out var emailElement) &&
                !emailElement.ValueKind.Equals(JsonValueKind.Null))
            {
                email = emailElement.GetString();
            }

            if (string.IsNullOrEmpty(email) &&
                userElement.TryGetProperty("public_email", out var publicEmailElement) &&
                !publicEmailElement.ValueKind.Equals(JsonValueKind.Null))
            {
                email = publicEmailElement.GetString();
            }

            if (string.IsNullOrEmpty(email))
            {
                var emailRequest = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user/emails");
                emailRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", context.AccessToken);
                emailRequest.Headers.Add("User-Agent", "Cania");
                emailRequest.Headers.Add("Accept", "application/vnd.github+json");

                context.HttpContext.Request.Host = new HostString(builder.Configuration.GetValue<string>("AUTH_HOST"));

                var emailResponse = await context.Backchannel.SendAsync(emailRequest, HttpCompletionOption.ResponseHeadersRead, context.HttpContext.RequestAborted);
                if (emailResponse.IsSuccessStatusCode)
                {
                    using var emailPayload = JsonDocument.Parse(await emailResponse.Content.ReadAsStringAsync());

                    var primaryEmailElement = emailPayload.RootElement.EnumerateArray()
                        .FirstOrDefault(e =>
                            e.TryGetProperty("primary", out var primaryProp) &&
                            primaryProp.ValueKind == JsonValueKind.True);

                    if (primaryEmailElement.ValueKind != JsonValueKind.Null &&
                        primaryEmailElement.TryGetProperty("email", out var emailProp) &&
                        !emailProp.ValueKind.Equals(JsonValueKind.Null))
                    {
                        email = emailProp.GetString();
                    }
                }
            }

            bool emailVerified = true;
            if (string.IsNullOrEmpty(email))
            {
                var login = userElement.GetProperty("login").GetString();
                email = $"{login}@github.com";
                emailVerified = false;
            }

            context.Identity!.AddClaim(new Claim(ClaimTypes.Email, email));
            context.Identity.AddClaim(new Claim("email_verified", emailVerified.ToString().ToLower()));
            context.Identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, userElement.GetProperty("id").GetInt64().ToString()));
            context.Identity.AddClaim(new Claim(ClaimTypes.Name, userElement.GetProperty("login").GetString() ?? ""));
            context.Identity.AddClaim(new Claim("provider", "github"));
        },
    };
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

app.UseForwardedHeaders();

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

//Social auth

app.MapGet("/auth/login/google", () =>
    Results.Challenge(new AuthenticationProperties { RedirectUri = "/auth/callback" }, new[] { "Google" }));

app.MapGet("/auth/login/github", () =>
    Results.Challenge(new AuthenticationProperties { RedirectUri = "/auth/callback" }, new[] { "GitHub" }));

app.MapGet("/auth/callback", async (
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

    var response = await service.LoginAsync(claimsPrincipal);

    await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

    return Results.Ok(response);
});

app.Run();