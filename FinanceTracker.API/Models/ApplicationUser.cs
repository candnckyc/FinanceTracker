using Microsoft.AspNetCore.Identity;

namespace FinanceTracker.API.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        
        // Navigation property for transactions
        public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    }
}