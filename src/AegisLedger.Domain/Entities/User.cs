using System.Security.Cryptography;
using System.Text;
using AegisLedger.Domain.Common;

namespace AegisLedger.Domain.Entities;

public sealed class User : Entity<Guid>, IAggregateRoot
{
    public string Username { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string FullName { get; private set; } = string.Empty;
    public string Role { get; private set; } = string.Empty; // SystemAdmin, BankTeller, ComplianceAuditor, Customer
    public string PasswordHash { get; private set; } = string.Empty;
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAtUtc { get; private set; }
    public DateTime? LastLoginAtUtc { get; private set; }

    private User()
    {
    }

    public User(string username, string email, string fullName, string role, string passwordHash, Guid? id = null)
    {
        Id = id ?? Guid.NewGuid();
        Username = username.Trim().ToLowerInvariant();
        Email = email.Trim().ToLowerInvariant();
        FullName = fullName.Trim();
        Role = role.Trim();
        PasswordHash = passwordHash;
        IsActive = true;
        CreatedAtUtc = DateTime.UtcNow;
    }

    public void RecordLogin()
    {
        LastLoginAtUtc = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
    }

    public void Activate()
    {
        IsActive = true;
    }

    public void UpdateRole(string newRole)
    {
        Role = newRole.Trim();
    }

    public static string HashPassword(string password)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(16);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password),
            salt,
            iterations: 100_000,
            hashAlgorithm: HashAlgorithmName.SHA256,
            outputLength: 32);

        return $"{Convert.ToBase64String(salt)}:{Convert.ToBase64String(hash)}";
    }

    public bool VerifyPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(PasswordHash))
            return false;

        if (PasswordHash.Contains(':'))
        {
            var parts = PasswordHash.Split(':');
            if (parts.Length == 2)
            {
                byte[] salt = Convert.FromBase64String(parts[0]);
                byte[] expectedHash = Convert.FromBase64String(parts[1]);
                byte[] actualHash = Rfc2898DeriveBytes.Pbkdf2(
                    Encoding.UTF8.GetBytes(password),
                    salt,
                    iterations: 100_000,
                    hashAlgorithm: HashAlgorithmName.SHA256,
                    outputLength: 32);

                return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
            }
        }

        return string.Equals(PasswordHash, password, StringComparison.Ordinal);
    }
}
