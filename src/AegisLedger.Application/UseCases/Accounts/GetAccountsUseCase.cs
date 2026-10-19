using AegisLedger.Application.Common.Dtos;
using AegisLedger.Application.Common.Interfaces;

namespace AegisLedger.Application.UseCases.Accounts;

public class GetAccountsUseCase
{
    private readonly IAccountRepository _accountRepository;

    public GetAccountsUseCase(IAccountRepository accountRepository)
    {
        _accountRepository = accountRepository;
    }

    public async Task<IReadOnlyList<AccountDto>> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var accounts = await _accountRepository.GetAllAsync(cancellationToken);
        return accounts.Select(a => new AccountDto(
            a.Id,
            a.AccountNumber,
            a.Name,
            a.Owner,
            a.Category.ToString().ToLowerInvariant(),
            a.Type.ToString(),
            a.Currency,
            a.LedgerBalance,
            a.AvailableBalance,
            a.Status.ToString(),
            a.RowVersion.Length > 0 ? "0x" + Convert.ToHexString(a.RowVersion) : "0x0000000000000000",
            a.OpenedAtUtc,
            a.RoutingCode,
            a.Description
        )).ToList();
    }
}
