using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.API.Models
{
    public class TransactionCreateDto
    {
        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        public decimal Amount { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        public string Category { get; set; } = string.Empty;

        // No UserId - this will be set from the JWT token
    }
}