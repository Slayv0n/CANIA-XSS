FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8084

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["PasswordService/Password API.csproj", "PasswordService/"]
COPY ["PasswordDb/PasswordDb.csproj", "PasswordDb/"]
COPY ["SharedModels/SharedModels.csproj", "SharedModels/"]
RUN dotnet restore "PasswordService/Password API.csproj"

COPY . .
WORKDIR "/src/PasswordService"
RUN dotnet build "Password API.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
RUN dotnet publish "Password API.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Password API.dll"]