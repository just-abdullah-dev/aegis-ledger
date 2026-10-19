namespace AegisLedger.Domain.Exceptions;

public class DomainException : Exception
{
    public DomainException(string message) : base(message)
    {
    }

    public DomainException(string message, Exception innerException) : base(message, innerException)
    {
    }
}

public sealed class InsufficientFundsException : DomainException
{
    public InsufficientFundsException(string accountNumber, decimal requested, decimal available)
        : base($"Account '{accountNumber}' has insufficient available liquidity. Requested: {requested:C}, Available: {available:C}.")
    {
    }
}

public sealed class AccountFrozenException : DomainException
{
    public AccountFrozenException(string accountNumber)
        : base($"Account '{accountNumber}' is frozen or inactive. Transactions and holds are prohibited.")
    {
    }
}

public sealed class UnbalancedTransactionException : DomainException
{
    public UnbalancedTransactionException(decimal totalDebits, decimal totalCredits, decimal drift)
        : base($"Ledger transaction invariant violation: SUM(Debits) != SUM(Credits). Debits: {totalDebits:F4}, Credits: {totalCredits:F4}, Drift: {drift:F4}.")
    {
    }
}

public sealed class InvalidHoldStateException : DomainException
{
    public InvalidHoldStateException(Guid holdId, string action, string currentStatus)
        : base($"Cannot {action} hold '{holdId}' because it is currently in state '{currentStatus}'.")
    {
    }
}

public sealed class CurrencyMismatchException : DomainException
{
    public CurrencyMismatchException(string expectedCurrency, string actualCurrency)
        : base($"Currency mismatch detected. Expected '{expectedCurrency}', but received '{actualCurrency}'.")
    {
    }
}

public sealed class DomainConcurrencyException : DomainException
{
    public DomainConcurrencyException(string message, Exception innerException)
        : base(message, innerException)
    {
    }

    public DomainConcurrencyException(string entityName, object key)
        : base($"Optimistic concurrency violation on {entityName} with key '{key}'. The entity was modified or locked by another concurrent process.")
    {
    }
}
