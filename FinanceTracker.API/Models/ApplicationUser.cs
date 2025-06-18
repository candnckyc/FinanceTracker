using Microsoft.AspNetCore.Identity;

namespace FinanceTracker.API.Models
{
    public class ApplicationUser : IdentityUser
    {
        public List<Transaction> Transactions { get; set; } = new();
    }
}