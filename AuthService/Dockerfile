FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
# Копируем основной проект и зависимость
COPY ["AuthService/Auth API.csproj", "AuthService/"]
COPY ["AuthDb/AuthDb.csproj", "AuthDb/"]
RUN dotnet restore "AuthService/Auth API.csproj"

COPY . .
WORKDIR "/src/AuthService"
RUN dotnet build "Auth API.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
RUN dotnet publish "Auth API.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Auth API.dll"]