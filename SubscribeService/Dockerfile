FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8085

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["SubscribeService/Subscribe API.csproj", "SubscribeService/"]
COPY ["SubscribeDb/SubscribeDb.csproj", "SubscribeDb/"]
COPY ["SharedModels/SharedModels.csproj", "SharedModels/"]
RUN dotnet restore "SubscribeService/Subscribe API.csproj"

COPY . .
WORKDIR "/src/SubscribeService"
RUN dotnet build "Subscribe API.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
RUN dotnet publish "Subscribe API.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Subscribe API.dll"]