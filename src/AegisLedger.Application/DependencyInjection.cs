using System.Reflection;
using AegisLedger.Application.Common.Behaviors;
using AegisLedger.Application.UseCases.Accounts;
using AegisLedger.Application.UseCases.Transactions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace AegisLedger.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        // MediatR pipeline configuration
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(assembly);
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        });

        // FluentValidation registration
        services.AddValidatorsFromAssembly(assembly);

        // Retain use-cases for direct resolution if needed
        services.AddScoped<GetAccountsUseCase>();
        services.AddScoped<PostTransferUseCase>();

        return services;
    }
}
