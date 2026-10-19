using AegisLedger.Domain.Exceptions;

namespace AegisLedger.Domain.ValueObjects;

public sealed record Currency
{
    public string Code { get; }
    public string Symbol { get; }
    public string Name { get; }

    public static readonly Currency USD = new("USD", "$", "US Dollar");
    public static readonly Currency EUR = new("EUR", "€", "Euro");
    public static readonly Currency PKR = new("PKR", "₨", "Pakistani Rupee");

    private static readonly Dictionary<string, Currency> AllCurrencies = new(StringComparer.OrdinalIgnoreCase)
    {
        [USD.Code] = USD,
        [EUR.Code] = EUR,
        [PKR.Code] = PKR
    };

    private Currency(string code, string symbol, string name)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Currency code cannot be empty.", nameof(code));

        Code = code.ToUpperInvariant().Trim();
        Symbol = symbol;
        Name = name;
    }

    public static Currency FromCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Currency code cannot be null or empty.", nameof(code));

        var normalized = code.ToUpperInvariant().Trim();
        if (AllCurrencies.TryGetValue(normalized, out var currency))
        {
            return currency;
        }

        throw new DomainException($"Unsupported currency code: '{code}'. Supported codes: USD, EUR, PKR.");
    }

    public static implicit operator string(Currency currency) => currency.Code;

    public override string ToString() => Code;
}
