FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8083

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
# Копируем проект и зависимости (у тебя файл называется Notification API.csproj)
COPY ["NotificationService/Notification API.csproj", "NotificationService/"]
COPY ["NotificationDb/NotificationDb.csproj", "NotificationDb/"]
COPY ["SharedModels/SharedModels.csproj", "SharedModels/"]
RUN dotnet restore "NotificationService/Notification API.csproj"

COPY . .
WORKDIR "/src/NotificationService"
RUN dotnet build "Notification API.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
RUN dotnet publish "Notification API.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Notification API.dll"]