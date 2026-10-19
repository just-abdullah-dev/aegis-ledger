namespace AegisLedger.Domain.Enums;

/// <summary>
/// Double-entry posting entry type: Debit (DR) or Credit (CR).
/// </summary>
public enum EntryType
{
    Debit = 1,
    Credit = 2
}

/// <summary>
/// Predefined regulatory and operational hold reasons.
/// </summary>
public enum HoldReason
{
    CardAuthPreCheck = 1,
    AmlFraudReview = 2,
    ChequeClearance = 3,
    EscrowMilestoneGuarantee = 4
}

public static class HoldReasonExtensions
{
    public static string ToFriendlyString(this HoldReason reason) => reason switch
    {
        HoldReason.CardAuthPreCheck => "Card Auth Pre-check",
        HoldReason.AmlFraudReview => "AML Fraud Review",
        HoldReason.ChequeClearance => "Cheque Clearance",
        HoldReason.EscrowMilestoneGuarantee => "Escrow Milestone Guarantee",
        _ => reason.ToString()
    };

    public static HoldReason FromFriendlyString(string text) => text switch
    {
        "Card Auth Pre-check" => HoldReason.CardAuthPreCheck,
        "AML Fraud Review" => HoldReason.AmlFraudReview,
        "Cheque Clearance" => HoldReason.ChequeClearance,
        "Escrow Milestone Guarantee" => HoldReason.EscrowMilestoneGuarantee,
        _ => Enum.TryParse<HoldReason>(text, true, out var r) ? r : HoldReason.CardAuthPreCheck
    };
}

/// <summary>
/// Status of a ring-fenced hold.
/// </summary>
public enum HoldStatus
{
    Active = 1,
    Released = 2,
    Captured = 3
}

/// <summary>
/// Immutable journal transaction status.
/// </summary>
public enum TransactionStatus
{
    Posted = 1,
    Pending = 2,
    Reversed = 3
}
