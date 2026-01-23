var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuthentication("cookie").AddCookie("cookie");

var app = builder.Build();

app.MapGet("/", () => "");

app.Run();
