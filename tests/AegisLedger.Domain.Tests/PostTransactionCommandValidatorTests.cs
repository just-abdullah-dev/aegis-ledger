using AegisLedger.Application.Transactions.Commands;
using FluentValidation.TestHelper;

namespace AegisLedger.Domain.Tests;

public class PostTransactionCommandValidatorTests
{
    private readonly PostTransactionCommandValidator _validator = new();

    [Fact]
    public void Validator_ShouldHaveError_WhenAmountIsZeroOrNegative()
    {
        var commandZero = new PostTransactionCommand(Guid.NewGuid(), Guid.NewGuid(), 0.00m, "Transfer");
        var commandNeg = new PostTransactionCommand(Guid.NewGuid(), Guid.NewGuid(), -10.00m, "Transfer");

        var resultZero = _validator.TestValidate(commandZero);
        var resultNeg = _validator.TestValidate(commandNeg);

        resultZero.ShouldHaveValidationErrorFor(x => x.Amount);
        resultNeg.ShouldHaveValidationErrorFor(x => x.Amount);
    }

    [Fact]
    public void Validator_ShouldHaveError_WhenSourceEqualsDestination()
    {
        var sameAccId = Guid.NewGuid();
        var command = new PostTransactionCommand(sameAccId, sameAccId, 100.00m, "Self transfer");

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor(x => x.DestinationAccountId);
    }

    [Fact]
    public void Validator_ShouldHaveError_WhenDescriptionIsEmpty()
    {
        var command = new PostTransactionCommand(Guid.NewGuid(), Guid.NewGuid(), 100.00m, "");

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor(x => x.Description);
    }

    [Fact]
    public void Validator_ShouldPass_WhenAllFieldsAreValid()
    {
        var command = new PostTransactionCommand(
            Guid.NewGuid(),
            Guid.NewGuid(),
            2500.50m,
            "Valid corporate settlement",
            "idem-key-123"
        );

        var result = _validator.TestValidate(command);

        result.ShouldNotHaveAnyValidationErrors();
    }
}
