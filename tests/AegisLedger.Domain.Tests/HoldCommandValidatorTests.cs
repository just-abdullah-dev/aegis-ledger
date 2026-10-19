using AegisLedger.Application.Holds.Commands;
using AegisLedger.Domain.Enums;
using FluentValidation.TestHelper;

namespace AegisLedger.Domain.Tests;

public class HoldCommandValidatorTests
{
    private readonly ApplyHoldCommandValidator _applyValidator = new();
    private readonly ReleaseHoldCommandValidator _releaseValidator = new();
    private readonly CaptureHoldCommandValidator _captureValidator = new();

    [Fact]
    public void ApplyHoldCommandValidator_ShouldFail_WhenAmountIsZeroOrNegative()
    {
        var cmdZero = new ApplyHoldCommand(Guid.NewGuid(), 0m, HoldReason.CardAuthPreCheck, 60);
        var cmdNeg = new ApplyHoldCommand(Guid.NewGuid(), -50m, HoldReason.CardAuthPreCheck, 60);

        var resZero = _applyValidator.TestValidate(cmdZero);
        var resNeg = _applyValidator.TestValidate(cmdNeg);

        resZero.ShouldHaveValidationErrorFor(x => x.Amount);
        resNeg.ShouldHaveValidationErrorFor(x => x.Amount);
    }

    [Fact]
    public void ApplyHoldCommandValidator_ShouldFail_WhenTtlIsZeroOrNegative()
    {
        var cmdZero = new ApplyHoldCommand(Guid.NewGuid(), 100m, HoldReason.CardAuthPreCheck, 0);
        var cmdNeg = new ApplyHoldCommand(Guid.NewGuid(), 100m, HoldReason.CardAuthPreCheck, -15);

        var resZero = _applyValidator.TestValidate(cmdZero);
        var resNeg = _applyValidator.TestValidate(cmdNeg);

        resZero.ShouldHaveValidationErrorFor(x => x.TtlMinutes);
        resNeg.ShouldHaveValidationErrorFor(x => x.TtlMinutes);
    }

    [Fact]
    public void ApplyHoldCommandValidator_ShouldPass_WhenValid()
    {
        var cmd = new ApplyHoldCommand(Guid.NewGuid(), 2500m, HoldReason.EscrowMilestoneGuarantee, 1440, "corr-test");
        var res = _applyValidator.TestValidate(cmd);

        res.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void ReleaseHoldCommandValidator_ShouldValidateAccountAndHoldIds()
    {
        var invalidCmd = new ReleaseHoldCommand(Guid.Empty, Guid.Empty);
        var validCmd = new ReleaseHoldCommand(Guid.NewGuid(), Guid.NewGuid());

        var resInvalid = _releaseValidator.TestValidate(invalidCmd);
        var resValid = _releaseValidator.TestValidate(validCmd);

        resInvalid.ShouldHaveValidationErrorFor(x => x.AccountId);
        resInvalid.ShouldHaveValidationErrorFor(x => x.HoldId);
        resValid.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void CaptureHoldCommandValidator_ShouldValidateAccountAndHoldIds()
    {
        var invalidCmd = new CaptureHoldCommand(Guid.Empty, Guid.Empty);
        var validCmd = new CaptureHoldCommand(Guid.NewGuid(), Guid.NewGuid());

        var resInvalid = _captureValidator.TestValidate(invalidCmd);
        var resValid = _captureValidator.TestValidate(validCmd);

        resInvalid.ShouldHaveValidationErrorFor(x => x.AccountId);
        resInvalid.ShouldHaveValidationErrorFor(x => x.HoldId);
        resValid.ShouldNotHaveAnyValidationErrors();
    }
}
