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
using static MassTransit.Transports.ReceiveEndpoint;
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

builder.Services.AddHttpClient<IGoogleOAuthService, GoogleOAuthService>();

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

app.MapGet("/auth/github/login", async (IGitHubOAuthService githubService) =>
{
    var authUrl = await githubService.GetAuthorizationUrl();
    return Results.Redirect(authUrl);
});
app.MapGet("/auth/github/callback", async (HttpContext context,
    IGitHubOAuthService githubService,
    ISocialAuthenticationService socialService) =>
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

    // саня проверь что нейронка написала это правда? если да, то вот что она нагенерировала вместо срочки выше

    //email = emails.FirstOrDefault(e => e.Primary && e.Verified)?.Email 
    //?? emails.FirstOrDefault(e => e.Verified)?.Email;

    // Google всегда отдает проверенные (Verified) email-адреса. А вот в GitHub пользователь может 
    // написать в профиле любой email, даже не подтверждая его.
    // В вашем GitHubOAuthService.cs вы берете первый попавшийся email. 
    // Хакер может указать в своем GitHub чужую почту (например, админа) и ваш сервис свяжет 
    // их аккаунты (Account Takeover).

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

    var jwtResponse = await socialService.LoginAsync(claimsPrincipal);

    /* --- СТАРЫЙ ВАРИАНТ ---
    // Этот вариант не подходит для текущей архитектуры, так как Ocelot (API Gateway)
    // ждет токен в заголовке Authorization: Bearer, а не в куках. Фронтенд не может 
    // достать HttpOnly куку, чтобы вставить ее в заголовок.
    context.Response.Cookies.Append("access_token", jwtResponse.AccessToken, new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Lax,
        Expires = DateTimeOffset.UtcNow.AddMinutes(15),
        Path = "/"
    });

    context.Response.Cookies.Append("refresh_token", jwtResponse.RefreshToken, new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Lax,
        Expires = DateTimeOffset.UtcNow.AddDays(7),
        Path = "/"
    });

    return Results.Redirect("http://localhost:5173/profile");
    ------------------------ */

    // --- НОВЫЙ ВАРИАНТ ---
    // Возвращаем токены в URL, чтобы фронтенд мог их перехватить на специальной странице,
    // сохранить в клиентские куки и использовать для заголовка Authorization.
    return Results.Redirect($"http://localhost:5173/oauth-callback?access_token={jwtResponse.AccessToken}&refresh_token={jwtResponse.RefreshToken}");
});

app.MapGet("/auth/google/login", async (IGoogleOAuthService googleService) =>
{
    var authUrl = await googleService.GetAuthorizationUrl();
    return Results.Redirect(authUrl);
});

app.MapGet("/auth/google/callback", async (HttpContext context,
    IGoogleOAuthService googleService,
    ISocialAuthenticationService socialService) =>
{
    var code = context.Request.Query["code"].ToString();
    var state = context.Request.Query["state"].ToString();

    if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
        return Results.BadRequest("Missing code or state");

    var tokenResponse = await googleService.ExchangeCodeForToken(code);

    if (string.IsNullOrEmpty(tokenResponse.AccessToken))
        return Results.Unauthorized();

    var userInfo = await googleService.GetUserInfo(tokenResponse.AccessToken);
    var email = userInfo.Email;
    
    var claims = new List<Claim>
        {
            new Claim("provider", "google"),
            new Claim(ClaimTypes.NameIdentifier, userInfo.Id ?? "unknown"),
            new Claim(ClaimTypes.Email, email!)
        };
    var identity = new ClaimsIdentity(claims, "Google");
    var claimsPrincipal = new ClaimsPrincipal(identity);

    var jwtResponse = await socialService.LoginAsync(claimsPrincipal);

    // context.Response.Cookies.Append("access_token", jwtResponse.AccessToken, new CookieOptions
    // {
    //     HttpOnly = true,
    //     Secure = true,
    //     SameSite = SameSiteMode.Lax,
    //     Expires = DateTimeOffset.UtcNow.AddMinutes(15),
    //     Path = "/"
    // });

    // context.Response.Cookies.Append("refresh_token", jwtResponse.RefreshToken, new CookieOptions
    // {
    //     HttpOnly = true,
    //     Secure = true,
    //     SameSite = SameSiteMode.Lax,
    //     Expires = DateTimeOffset.UtcNow.AddDays(7),
    //     Path = "/"
    // });

    // return Results.Redirect("http://localhost:5173/profile");
    return Results.Redirect($"http://localhost:5173/oauth-callback?access_token={jwtResponse.AccessToken}&refresh_token={jwtResponse.RefreshToken}");
});

app.Run();