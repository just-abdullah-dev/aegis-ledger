namespace AegisLedger.Domain.Enums;

/// <summary>
/// Core banking account classification.
/// Supports both system ledgers and retail customer account types.
/// </summary>
public enum AccountType
{
    /// <summary>
    /// Commercial or personal checking deposit account (CHK).
    /// </summary>
    Checking = 1,

    /// <summary>
    /// High-yield or standard savings account (SAV).
    /// </summary>
    Savings = 2,

    /// <summary>
    /// Ring-fenced multi-party escrow account (ESC).
    /// </summary>
    Escrow = 3,

    /// <summary>
    /// Internal bank system ledger (SYS) for central reserves, clearing, and liabilities.
    /// </summary>
    SystemLedger = 4,

    /// <summary>
    /// Bank treasury operating reserve account.
    /// </summary>
    Treasury = 5,

    /// <summary>
    /// General ledger asset account.
    /// </summary>
    Asset = 6,

    /// <summary>
    /// General ledger liability account (deposit liabilities).
    /// </summary>
    Liability = 7,

    /// <summary>
    /// General ledger equity account.
    /// </summary>
    Equity = 8,

    /// <summary>
    /// Fee, interest, and operational revenue account.
    /// </summary>
    Revenue = 9
}

public static class AccountTypeExtensions
{
    public static string ToCode(this AccountType type) => type switch
    {
        AccountType.Checking => "CHK",
        AccountType.Savings => "SAV",
        AccountType.Escrow => "ESC",
        AccountType.SystemLedger => "SYS",
        AccountType.Treasury => "TRS",
        AccountType.Asset => "AST",
        AccountType.Liability => "LIA",
        AccountType.Equity => "EQU",
        AccountType.Revenue => "REV",
        _ => "GEN"
    };
}
