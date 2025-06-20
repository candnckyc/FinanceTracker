using System.ComponentModel.DataAnnotations;

namespace FinanceTracker.API.Models
{
    public class RegisterModel
    {
        [Required]
        public string Username { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [MinLength(6)]
        public string Password { get; set; }

        // Optional: Add these if you want to support first/last names
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
    }
}