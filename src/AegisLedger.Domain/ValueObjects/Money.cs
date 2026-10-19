using System.Globalization;
using AegisLedger.Domain.Exceptions;

namespace AegisLedger.Domain.ValueObjects;

public sealed record Money : IComparable<Money>, IComparable
{
    public decimal Amount { get; }
    public Currency Currency { get; }

    public Money(decimal amount, Currency currency)
    {
        Currency = currency ?? throw new ArgumentNullException(nameof(currency));
        // Financial ledger values maintain 4 decimal places for zero-drift rounding
        Amount = decimal.Round(amount, 4, MidpointRounding.ToEven);
    }

    public static Money Zero(Currency currency) => new(0m, currency);
    public static Money USD(decimal amount) => new(amount, Currency.USD);
    public static Money EUR(decimal amount) => new(amount, Currency.EUR);
    public static Money PKR(decimal amount) => new(amount, Currency.PKR);

    public bool IsZero => Amount == 0m;
    public bool IsPositive => Amount > 0m;
    public bool IsNegative => Amount < 0m;

    public Money Abs() => new(Math.Abs(Amount), Currency);

    public static Money operator +(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return new Money(left.Amount + right.Amount, left.Currency);
    }

    public static Money operator -(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return new Money(left.Amount - right.Amount, left.Currency);
    }

    public static Money operator *(Money money, decimal multiplier)
    {
        return new Money(money.Amount * multiplier, money.Currency);
    }

    public static Money operator *(decimal multiplier, Money money) => money * multiplier;

    public static bool operator <(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return left.Amount < right.Amount;
    }

    public static bool operator <=(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return left.Amount <= right.Amount;
    }

    public static bool operator >(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return left.Amount > right.Amount;
    }

    public static bool operator >=(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return left.Amount >= right.Amount;
    }

    public int CompareTo(Money? other)
    {
        if (other is null) return 1;
        EnsureSameCurrency(this, other);
        return Amount.CompareTo(other.Amount);
    }

    public int CompareTo(object? obj)
    {
        if (obj is null) return 1;
        if (obj is not Money other)
            throw new ArgumentException("Object must be of type Money", nameof(obj));
        return CompareTo(other);
    }

    private static void EnsureSameCurrency(Money left, Money right)
    {
        if (left.Currency != right.Currency)
        {
            throw new CurrencyMismatchException(left.Currency.Code, right.Currency.Code);
        }
    }

    public override string ToString()
    {
        return $"{Currency.Symbol}{Amount.ToString("N2", CultureInfo.InvariantCulture)}";
    }

    public string ToDetailedString()
    {
        return $"{Amount.ToString("F4", CultureInfo.InvariantCulture)} {Currency.Code}";
    }
}
