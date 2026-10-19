# Multi-stage Dockerfile for AegisLedger.Api (.NET 10)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files and restore dependencies
COPY ["src/AegisLedger.Domain/AegisLedger.Domain.csproj", "src/AegisLedger.Domain/"]
COPY ["src/AegisLedger.Application/AegisLedger.Application.csproj", "src/AegisLedger.Application/"]
COPY ["src/AegisLedger.Infrastructure/AegisLedger.Infrastructure.csproj", "src/AegisLedger.Infrastructure/"]
COPY ["src/AegisLedger.Api/AegisLedger.Api.csproj", "src/AegisLedger.Api/"]

RUN dotnet restore "src/AegisLedger.Api/AegisLedger.Api.csproj"

# Copy full source and publish
COPY . .
WORKDIR "/src/src/AegisLedger.Api"
RUN dotnet publish "AegisLedger.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime Image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "AegisLedger.Api.dll"]
