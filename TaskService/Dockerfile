FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8086

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

COPY ["TaskService/Task API.csproj", "TaskService/"]
COPY ["TaskDb/TaskDb.csproj", "TaskDb/"]
COPY ["SharedModels/SharedModels.csproj", "SharedModels/"]

RUN dotnet restore "TaskService/Task API.csproj"

COPY . .
WORKDIR "/src/TaskService"
RUN dotnet build "Task API.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
RUN dotnet publish "Task API.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Task API.dll"]