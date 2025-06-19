using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FinanceTracker.API.Data;
using FinanceTracker.API.Models;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace FinanceTracker.API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class TransactionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public TransactionController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddTransaction([FromBody] TransactionCreateDto transactionDto)
        {
            try
            {
                // Validate the model
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Try multiple ways to get the user ID from claims
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("userId")?.Value
                           ?? User.FindFirst("sub")?.Value
                           ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    // Debug: Log all available claims
                    Console.WriteLine("❌ No user ID found in claims. Available claims:");
                    foreach (var claim in User.Claims)
                    {
                        Console.WriteLine($"  {claim.Type}: {claim.Value}");
                    }
                    return Unauthorized(new { message = "User ID not found in token claims" });
                }

                // Try to get the user from the database
                var user = await _userManager.FindByIdAsync(userId);
                
                if (user == null)
                {
                    return Unauthorized(new { message = $"User not found in database with ID: {userId}" });
                }

                // Debug: Log user information
                Console.WriteLine($"✅ User authenticated: {user.Email} (ID: {user.Id})");

                // Create the transaction entity from the DTO
                var transaction = new Transaction
                {
                    Description = transactionDto.Description,
                    Amount = transactionDto.Amount,
                    Date = transactionDto.Date,
                    Category = transactionDto.Category,
                    UserId = user.Id // Set from authenticated user
                };

                Console.WriteLine($"💾 Saving transaction: {transaction.Description} for user {user.Email}");

                _context.Transactions.Add(transaction);
                await _context.SaveChangesAsync();

                Console.WriteLine($"✅ Transaction saved with ID: {transaction.Id}");

                return Ok(new { 
                    Message = "Transaction added successfully", 
                    TransactionId = transaction.Id,
                    UserId = user.Id,
                    UserEmail = user.Email,
                    Amount = transaction.Amount,
                    Description = transaction.Description
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error adding transaction: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return BadRequest(new { message = $"Error: {ex.Message}" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetTransactions()
        {
            try
            {
                // Try multiple ways to get the user ID from claims
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("userId")?.Value
                           ?? User.FindFirst("sub")?.Value
                           ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User ID not found in token claims" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                
                if (user == null)
                {
                    return Unauthorized(new { message = $"User not found in database with ID: {userId}" });
                }

                // Get transactions WITHOUT the User navigation property to avoid cycles
                var transactions = await _context.Transactions
                    .Where(t => t.UserId == user.Id)
                    .Select(t => new
                    {
                        t.Id,
                        t.Description,
                        t.Amount,
                        t.Date,
                        t.Category,
                        t.UserId
                        // Explicitly exclude User navigation property
                    })
                    .OrderByDescending(t => t.Date)
                    .ToListAsync();

                return Ok(new
                {
                    message = "Transactions retrieved successfully",
                    userId = user.Id,
                    userEmail = user.Email,
                    transactionCount = transactions.Count,
                    transactions = transactions
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error getting transactions: {ex.Message}");
                return BadRequest(new { message = $"Error: {ex.Message}" });
            }
        }

        [HttpGet("list")]
        public async Task<IActionResult> ListTransactions()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("userId")?.Value
                           ?? User.FindFirst("sub")?.Value
                           ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User ID not found in token claims" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                
                if (user == null)
                {
                    return Unauthorized(new { message = $"User not found in database with ID: {userId}" });
                }

                // Get transactions WITHOUT the User navigation property to avoid cycles
                var transactions = await _context.Transactions
                    .Where(t => t.UserId == user.Id)
                    .Select(t => new
                    {
                        t.Id,
                        t.Description,
                        t.Amount,
                        t.Date,
                        t.Category,
                        t.UserId
                    })
                    .OrderByDescending(t => t.Date)
                    .ToListAsync();

                return Ok(transactions);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error getting transactions: {ex.Message}");
                return BadRequest(new { message = $"Error: {ex.Message}" });
            }
        }

        [HttpPut("update/{id}")]
        public async Task<IActionResult> UpdateTransaction(int id, [FromBody] TransactionCreateDto transactionDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("userId")?.Value
                           ?? User.FindFirst("sub")?.Value
                           ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User ID not found in token claims" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                
                if (user == null)
                {
                    return Unauthorized(new { message = $"User not found in database with ID: {userId}" });
                }

                var existingTransaction = await _context.Transactions
                    .FirstOrDefaultAsync(t => t.Id == id && t.UserId == user.Id);

                if (existingTransaction == null)
                    return NotFound(new { Message = "Transaction not found" });

                existingTransaction.Description = transactionDto.Description;
                existingTransaction.Amount = transactionDto.Amount;
                existingTransaction.Date = transactionDto.Date;
                existingTransaction.Category = transactionDto.Category;

                await _context.SaveChangesAsync();
                return Ok(new { Message = "Transaction updated successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error updating transaction: {ex.Message}");
                return BadRequest(new { message = $"Error: {ex.Message}" });
            }
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> DeleteTransaction(int id)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("userId")?.Value
                           ?? User.FindFirst("sub")?.Value
                           ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User ID not found in token claims" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                
                if (user == null)
                {
                    return Unauthorized(new { message = $"User not found in database with ID: {userId}" });
                }

                var transaction = await _context.Transactions
                    .FirstOrDefaultAsync(t => t.Id == id && t.UserId == user.Id);

                if (transaction == null)
                    return NotFound(new { Message = "Transaction not found" });

                _context.Transactions.Remove(transaction);
                await _context.SaveChangesAsync();
                return Ok(new { Message = "Transaction deleted successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error deleting transaction: {ex.Message}");
                return BadRequest(new { message = $"Error: {ex.Message}" });
            }
        }

        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("userId")?.Value
                           ?? User.FindFirst("sub")?.Value
                           ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User ID not found in token claims" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                
                if (user == null)
                {
                    return Unauthorized(new { message = $"User not found in database with ID: {userId}" });
                }

                var transactions = await _context.Transactions
                    .Where(t => t.UserId == user.Id)
                    .ToListAsync();

                var totalIncome = transactions.Where(t => t.Amount > 0).Sum(t => t.Amount);
                var totalExpenses = transactions.Where(t => t.Amount < 0).Sum(t => t.Amount);

                return Ok(new
                {
                    TotalIncome = totalIncome,
                    TotalExpenses = totalExpenses,
                    NetBalance = totalIncome + totalExpenses
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error getting statistics: {ex.Message}");
                return BadRequest(new { message = $"Error: {ex.Message}" });
            }
        }

        [HttpGet("test-auth")]
        public async Task<IActionResult> TestAuth()
        {
            try
            {
                // Try multiple ways to get the user ID from claims
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("userId")?.Value
                           ?? User.FindFirst("sub")?.Value
                           ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

                ApplicationUser? user = null;
                if (!string.IsNullOrEmpty(userId))
                {
                    user = await _userManager.FindByIdAsync(userId);
                }

                var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                
                return Ok(new
                {
                    message = "Authentication test successful",
                    isAuthenticated = User.Identity?.IsAuthenticated ?? false,
                    userId = user?.Id ?? "Not found",
                    userEmail = user?.Email ?? "Not found",
                    userName = user?.UserName ?? "Not found",
                    userIdFromClaims = userId ?? "Not found",
                    authHeaderPresent = !string.IsNullOrEmpty(authHeader),
                    claimsCount = User.Claims.Count(),
                    claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList()
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error: {ex.Message}" });
            }
        }
    }
}