using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FinanceTracker.API.Data;
using FinanceTracker.API.Models;

namespace FinanceTracker.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TransactionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public TransactionsController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // DTO classes to avoid circular references
        public class TransactionDto
        {
            public int Id { get; set; }
            public string Description { get; set; }
            public decimal Amount { get; set; }
            public DateTime Date { get; set; }
            public string Category { get; set; }
            public string UserId { get; set; }
        }

        public class CreateTransactionDto
        {
            public string Description { get; set; }
            public decimal Amount { get; set; }
            public DateTime Date { get; set; }
            public string Category { get; set; }
        }

        // GET: api/transactions
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TransactionDto>>> GetTransactions()
        {
            var userId = _userManager.GetUserId(User);
            
            var transactions = await _context.Transactions
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.Date)
                .Select(t => new TransactionDto
                {
                    Id = t.Id,
                    Description = t.Description,
                    Amount = t.Amount,
                    Date = t.Date,
                    Category = t.Category,
                    UserId = t.UserId
                })
                .ToListAsync();

            return Ok(transactions);
        }

        // GET: api/transactions/5
        [HttpGet("{id}")]
        public async Task<ActionResult<TransactionDto>> GetTransaction(int id)
        {
            var userId = _userManager.GetUserId(User);
            
            var transaction = await _context.Transactions
                .Where(t => t.Id == id && t.UserId == userId)
                .Select(t => new TransactionDto
                {
                    Id = t.Id,
                    Description = t.Description,
                    Amount = t.Amount,
                    Date = t.Date,
                    Category = t.Category,
                    UserId = t.UserId
                })
                .FirstOrDefaultAsync();

            if (transaction == null)
            {
                return NotFound();
            }

            return Ok(transaction);
        }

        // POST: api/transactions
        [HttpPost]
        public async Task<ActionResult<TransactionDto>> PostTransaction(CreateTransactionDto createDto)
        {
            var userId = _userManager.GetUserId(User);

            var transaction = new Transaction
            {
                Description = createDto.Description,
                Amount = createDto.Amount,
                Date = createDto.Date,
                Category = createDto.Category,
                UserId = userId
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            var responseDto = new TransactionDto
            {
                Id = transaction.Id,
                Description = transaction.Description,
                Amount = transaction.Amount,
                Date = transaction.Date,
                Category = transaction.Category,
                UserId = transaction.UserId
            };

            return CreatedAtAction(nameof(GetTransaction), new { id = transaction.Id }, responseDto);
        }

        // PUT: api/transactions/5
        [HttpPut("{id}")]
        public async Task<ActionResult<TransactionDto>> PutTransaction(int id, CreateTransactionDto updateDto)
        {
            var userId = _userManager.GetUserId(User);
            
            var transaction = await _context.Transactions
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (transaction == null)
            {
                return NotFound();
            }

            transaction.Description = updateDto.Description;
            transaction.Amount = updateDto.Amount;
            transaction.Date = updateDto.Date;
            transaction.Category = updateDto.Category;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TransactionExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            var responseDto = new TransactionDto
            {
                Id = transaction.Id,
                Description = transaction.Description,
                Amount = transaction.Amount,
                Date = transaction.Date,
                Category = transaction.Category,
                UserId = transaction.UserId
            };

            return Ok(responseDto);
        }

        // DELETE: api/transactions/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTransaction(int id)
        {
            var userId = _userManager.GetUserId(User);
            
            var transaction = await _context.Transactions
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
                
            if (transaction == null)
            {
                return NotFound();
            }

            _context.Transactions.Remove(transaction);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/transactions/statistics
        [HttpGet("statistics")]
        public async Task<ActionResult> GetStatistics()
        {
            var userId = _userManager.GetUserId(User);
            
            var transactions = await _context.Transactions
                .Where(t => t.UserId == userId)
                .ToListAsync();

            var totalIncome = transactions.Where(t => t.Amount > 0).Sum(t => t.Amount);
            var totalExpenses = Math.Abs(transactions.Where(t => t.Amount < 0).Sum(t => t.Amount));
            var balance = totalIncome - totalExpenses;
            var transactionCount = transactions.Count;

            return Ok(new
            {
                TotalIncome = totalIncome,
                TotalExpenses = totalExpenses,
                Balance = balance,
                TransactionCount = transactionCount
            });
        }

        private bool TransactionExists(int id)
        {
            return _context.Transactions.Any(e => e.Id == id);
        }
    }
}