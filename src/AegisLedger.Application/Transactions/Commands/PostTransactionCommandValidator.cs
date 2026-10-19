using FluentValidation;

namespace AegisLedger.Application.Transactions.Commands;

public class PostTransactionCommandValidator : AbstractValidator<PostTransactionCommand>
{
    public PostTransactionCommandValidator()
    {
        RuleFor(x => x.Amount)
            .GreaterThan(0m)
            .WithMessage("Transfer amount must be greater than $0.00.");

        RuleFor(x => x.SourceAccountId)
            .NotEmpty()
            .WithMessage("Source account ID is required.");

        RuleFor(x => x.DestinationAccountId)
            .NotEmpty()
            .WithMessage("Destination account ID is required.")
            .NotEqual(x => x.SourceAccountId)
            .WithMessage("Source and destination accounts must be distinct.");

        RuleFor(x => x.Description)
            .NotEmpty()
            .WithMessage("Transaction description/memo must not be empty.")
            .MaximumLength(500)
            .WithMessage("Transaction description cannot exceed 500 characters.");
    }
}
