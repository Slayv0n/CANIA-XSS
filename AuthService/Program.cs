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
using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Security.Claims;
using ValidationResult = System.ComponentModel.DataAnnotations.ValidationResult;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor |
                               ForwardedHeaders.XForwardedProto |
                               ForwardedHeaders.XForwardedHost;

    options.KnownIPNetworks.Add(new System.Net.IPNetwork(IPAddress.Parse("172.16.0.0"), 12));
    options.KnownIPNetworks.Add(new System.Net.IPNetwork(IPAddress.Parse("10.0.0.0"), 8));
});


builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
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
    options.Cookie.HttpOnly = true;
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
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalhost", policy =>
    {
        policy.WithOrigins(
            builder.Configuration["Frontend:Url"] ?? builder.Configuration["FRONTEND_URL"] ?? "http://localhost:5173",
            builder.Configuration["Frontend:UrlHttps"] ?? builder.Configuration["FRONTEND_URL_HTTPS"] ?? "https://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddAuthorization();

builder.Services.AddDbContextFactory<AuthContext>(
    options => options.UseNpgsql(Environment.GetEnvironmentVariable("AUTH_DB_CONNECTION")));

var jwtConfig = builder.Configuration.GetSection("JwtSettings");

var secret = jwtConfig["SecretKey"]
    ?? builder.Configuration["JWT_SECRET"]
    ?? "YourSuperSecretKeyThatIsAtLeast32CharactersLong123!";

var issuer = jwtConfig["Issuer"]
    ?? builder.Configuration["JWT_ISSUER"]
    ?? "Cania";

var audience = jwtConfig["Audience"]
    ?? builder.Configuration["JWT_AUDIENCE"]
    ?? "Cania";

var accessMinutes = double.TryParse(jwtConfig["ExpirationAccessTokenMinutes"], out var access) && access > 0
    ? access
    : 60;

var refreshDays = double.TryParse(jwtConfig["ExpirationRefreshTokenDays"], out var refresh) && refresh > 0
    ? refresh
    : 7;

var jwtSettings = new JwtSettings
{
    SecretKey = secret,
    Issuer = issuer,
    Audience = audience,
    ExpirationAccessTokenMinutes = accessMinutes,
    ExpirationRefreshTokenDays = refreshDays
};

builder.Services.AddHttpClient<IGitHubOAuthService, GitHubOAuthService>();

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

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<AuthContext>();

    if (context.Database.GetPendingMigrations().Any())
    {
        context.Database.Migrate();
    }
}
app.UseForwardedHeaders();

app.UseCors("AllowLocalhost");

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "OK", time = DateTime.UtcNow }));

//JWT Auth

app.MapPost("/auth/login", async (LoginRequest request, IAuthenticationJWTService authenticationService) =>
{
    try
    {
        var validationContext = new ValidationContext(request);
        var results = new List<ValidationResult>();

        if (!Validator.TryValidateObject(request, validationContext, results, validateAllProperties: true))
        {
            return Results.BadRequest(new
            {
                errors = results.Select(r => new
                {
                    field = string.Join(", ", r.MemberNames),
                    message = r.ErrorMessage
                })
            });
        }

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
        var validationContext = new ValidationContext(request);
        var results = new List<ValidationResult>();

        if (!Validator.TryValidateObject(request, validationContext, results, validateAllProperties: true))
        {
            return Results.BadRequest(new
            {
                errors = results.Select(r => new
                {
                    field = string.Join(", ", r.MemberNames),
                    message = r.ErrorMessage
                })
            });
        }

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
        var validationContext = new ValidationContext(request);
        var results = new List<ValidationResult>();

        if (!Validator.TryValidateObject(request, validationContext, results, validateAllProperties: true))
        {
            return Results.BadRequest(new
            {
                errors = results.Select(r => new
                {
                    field = string.Join(", ", r.MemberNames),
                    message = r.ErrorMessage
                })
            });
        }

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

        var validationContext = new ValidationContext(request);
        var results = new List<ValidationResult>();

        if (!Validator.TryValidateObject(request, validationContext, results, validateAllProperties: true))
        {
            return Results.BadRequest(new
            {
                errors = results.Select(r => new
                {
                    field = string.Join(", ", r.MemberNames),
                    message = r.ErrorMessage
                })
            });
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

app.MapGet("/auth/github/login", async (
    IGitHubOAuthService githubService) =>
{
    var authUrl = await githubService.GetAuthorizationUrl();
    return Results.Redirect(authUrl);
});
app.MapGet("/auth/github/callback", async (
    HttpContext context,
    IGitHubOAuthService githubService,
    ISocialAuthenticationService service) =>
{
    var code = context.Request.Query["code"].ToString();
    var state = context.Request.Query["state"].ToString();

    if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
        return Results.BadRequest("Missing code or state");

    var tokenResponse = await githubService.ExchangeCodeForToken(code);

    if (string.IsNullOrEmpty(tokenResponse.AccessToken))
        return Results.Unauthorized();

    var userInfo = await githubService.GetUserInfo(tokenResponse.AccessToken);

    string? email = userInfo.Email ?? userInfo.PublicEmail;

    if (string.IsNullOrEmpty(email))
    {
        var emails = await githubService.GetUserEmails(tokenResponse.AccessToken);
        email = emails.FirstOrDefault(e => e.Primary)?.Email
            ?? emails.FirstOrDefault()?.Email;
    }

    if (string.IsNullOrEmpty(email))
        email = $"{userInfo.Login}@users.noreply.github.com";

    var claims = new List<Claim>
{
    new Claim("provider", "github"),
    new Claim(ClaimTypes.NameIdentifier, userInfo.Id.ToString()),
    new Claim(ClaimTypes.Email, email)
};

    var identity = new ClaimsIdentity(claims, "GitHub");
    var claimsPrincipal = new ClaimsPrincipal(identity);

    var response = await service.LoginAsync(claimsPrincipal);

    await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

    return Results.Redirect("http://localhost:5173/profile");
});


app.Run();