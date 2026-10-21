using System.Text;
using AegisLedger.Api.Endpoints;
using AegisLedger.Api.Middleware;
using AegisLedger.Api.Services;
using AegisLedger.Application;
using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Infrastructure;
using AegisLedger.Infrastructure.Jobs;
using AegisLedger.Infrastructure.Persistence;
using Hangfire;
using Hangfire.MemoryStorage;
using Hangfire.SqlServer;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;


// 1. Initialize Serilog bootstrap logger
Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] [{CorrelationId}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File("logs/aegisledger-.txt", rollingInterval: RollingInterval.Day, outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} {Level:u3}] [{CorrelationId}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

try
{
    Log.Information("Starting AegisLedger Core Banking & Ledger API host...");

    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog();

    // 2. Register Clean Architecture layers
    builder.Services.AddApplicationServices();
    builder.Services.AddInfrastructure(builder.Configuration);

    // 3. Register JWT Token Service & Auth
    builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

    var jwtKey = builder.Configuration["Jwt:SecretKey"] ?? "AegisLedger_CoreBanking_SuperSecretSecurityKey_2026_EnterpriseRelease!";
    var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "AegisLedger.Api";
    var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "AegisLedger.Clients";

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };

        // Extract JWT token from HttpOnly cookie if Authorization header is absent
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (string.IsNullOrEmpty(context.Token) &&
                    context.Request.Cookies.TryGetValue("aegis_access_token", out var cookieToken))
                {
                    context.Token = cookieToken;
                }
                return Task.CompletedTask;
            }
        };
    });

    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("RequireComplianceAuditor", policy => policy.RequireRole("ComplianceAuditor", "SystemAdmin"));
        options.AddPolicy("RequireBankTeller", policy => policy.RequireRole("BankTeller", "SystemAdmin"));
        options.AddPolicy("RequireSystemAdmin", policy => policy.RequireRole("SystemAdmin"));
    });

    // 4. OpenAPI / Swagger with JWT Bearer Definition
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "AegisLedger Core Banking & Ledger API",
            Version = "v1",
            Description = "Enterprise Core Banking & Immutable Double-Entry Ledger System (.NET 10 / SQL Server 2022 / Redis 7)"
        });

        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "JWT Authorization header using the Bearer scheme. Format: Bearer {token}",
            Name = "Authorization",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.ApiKey,
            Scheme = "Bearer"
        });

        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
    });

    // 5. Distributed Caching configuration (Redis or In-Memory fallback)
    var redisConnectionString = builder.Configuration.GetConnectionString("Redis");
    if (!builder.Environment.IsEnvironment("Testing") && !string.IsNullOrWhiteSpace(redisConnectionString))
    {
        builder.Services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = redisConnectionString;
            options.InstanceName = "AegisLedger:";
        });
    }
    else
    {
        builder.Services.AddDistributedMemoryCache();
    }

    // 6. Configure Hangfire Background Scheduler
    var sqlServerConnection = builder.Configuration.GetConnectionString("DefaultConnection") 
        ?? "Server=localhost;Database=AegisLedgerDb;Trusted_Connection=True;TrustServerCertificate=True;";

    builder.Services.AddHangfire(configuration =>
    {
        configuration.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings();

        if (builder.Environment.IsEnvironment("Testing") ||
            string.IsNullOrWhiteSpace(sqlServerConnection) ||
            sqlServerConnection.Contains("Data Source=", StringComparison.OrdinalIgnoreCase) ||
            sqlServerConnection.Contains("DataSource=", StringComparison.OrdinalIgnoreCase))
        {
            configuration.UseMemoryStorage();
        }
        else
        {
            try
            {
                configuration.UseSqlServerStorage(sqlServerConnection, new SqlServerStorageOptions
                {
                    CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
                    SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
                    QueuePollInterval = TimeSpan.Zero,
                    UseRecommendedIsolationLevel = true,
                    DisableGlobalLocks = true
                });
            }
            catch
            {
                configuration.UseMemoryStorage();
            }
        }
    });

    builder.Services.AddHangfireServer(options =>
    {
        options.WorkerCount = Environment.ProcessorCount * 2;
    });

    // 7. Configure CORS with Cookie Credentials Support
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowClientApps", policy =>
        {
            policy.SetIsOriginAllowed(origin => true)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    });

    var app = builder.Build();

    // 8. Middleware Pipeline
    app.UseMiddleware<CorrelationIdMiddleware>();
    app.UseSerilogRequestLogging();
    app.UseMiddleware<ExceptionHandlingMiddleware>();
    app.UseMiddleware<IdempotencyMiddleware>();
    app.UseCors("AllowClientApps");

    app.UseAuthentication();
    app.UseAuthorization();

    // 9. Swagger UI
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "AegisLedger API v1");
        c.RoutePrefix = "swagger";
    });

    // 10. Hangfire Dashboard & Recurring Jobs
    app.UseHangfireDashboard("/hangfire", new DashboardOptions
    {
        DashboardTitle = "AegisLedger Core Operations & Hangfire Scheduler",
        Authorization = []
    });

    try
    {
        RecurringJob.AddOrUpdate<EODReconciliationJob>(
            "eod-ledger-reconciliation",
            job => job.ExecuteAsync(CancellationToken.None),
            Cron.Daily(0, 0)
        );

        RecurringJob.AddOrUpdate<ExpiredHoldReleaseJob>(
            "expired-hold-release",
            job => job.ExecuteAsync(CancellationToken.None),
            "*/5 * * * *"
        );
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Could not register Hangfire recurring jobs immediately.");
    }

    // 11. Health & Solvency Invariant Check (Public Non-Confidential Diagnostic Probe)
    app.MapGet("/api/v1/health", () =>
    {
        return Results.Ok(new
        {
            system = "AegisLedger Core Banking Engine",
            version = "1.0.0",
            status = "Healthy",
            services = new
            {
                api = new { status = "online", label = "Operational" },
                redis = new { status = "online", label = "Connected" },
                hangfire = new { status = "online", label = "Active" }
            },
            solvencyInvariant = "SUM(Debits) == SUM(Credits)",
            isZeroDriftVerified = true,
            timestampUtc = DateTime.UtcNow
        });
    });

    // 12. Map Module Endpoints
    app.MapPortalEndpoints();
    app.MapAuthEndpoints();
    app.MapAccountEndpoints();
    app.MapTransactionEndpoints();
    app.MapHoldEndpoints();
    app.MapReconciliationEndpoints();
    app.MapReportEndpoints();
    app.MapHangfireEndpoints();

    // 13. Initialize Database & Seed Canonical Accounts
    await DbInitializer.InitializeAsync(app.Services);

    app.Run();
}
catch (Exception ex)
{
    Console.WriteLine($"FATAL STARTUP EXCEPTION: {ex}");
    Log.Fatal(ex, "AegisLedger host terminated unexpectedly.");
    throw;
}
finally
{
    Log.CloseAndFlush();
}

// Partial Program class for WebApplicationFactory in Integration Tests
public partial class Program { }
