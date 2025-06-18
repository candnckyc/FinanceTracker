using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;

namespace FinanceTracker.API.Models
{
    public class Transaction
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)] // Auto-increment ID
        public int Id { get; set; }

        
        public string Description { get; set; }

        
        public decimal Amount { get; set; }

        
        public DateTime Date { get; set; }

        public string Category { get; set; }

        
        public string UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual ApplicationUser? User { get; set; } // Optional navigation property
    }
}