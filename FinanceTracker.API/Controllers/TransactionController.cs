using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FinanceTracker.API.Data;
using FinanceTracker.API.Models;

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
public async Task<IActionResult> AddTransaction([FromBody] Transaction transaction)
{
    if (!ModelState.IsValid)
    {
        Console.WriteLine("Model validation failed:");
        foreach (var error in ModelState.Values.SelectMany(v => v.Errors))
        {
            Console.WriteLine(error.ErrorMessage);
        }
        return BadRequest(ModelState);
    }

    var user = await _userManager.GetUserAsync(User);
    if (user == null)
    {
        Console.WriteLine("User is not authenticated");
        return Unauthorized(new { Message = "User is not authenticated" });
    }

    transaction.UserId = user.Id;

    _context.Transactions.Add(transaction);
    await _context.SaveChangesAsync();

    Console.WriteLine($"Transaction added successfully: {transaction.Description}, Amount: {transaction.Amount}");

    return Ok(new { Message = "Transaction added successfully", TransactionId = transaction.Id });
}

    [HttpGet("list")]
    public async Task<IActionResult> ListTransactions()
    {
        var user = await _userManager.GetUserAsync(User);

        if (user == null)
            return Unauthorized(new { Message = "User is not authenticated" });

        var transactions = await _context.Transactions
            .Where(t => t.UserId == user.Id)
            .OrderByDescending(t => t.Date)
            .ToListAsync();

        return Ok(transactions);
    }

    [HttpPut("update/{id}")]
    public async Task<IActionResult> UpdateTransaction(int id, [FromBody] Transaction transaction)
    {
        var user = await _userManager.GetUserAsync(User);

        if (user == null)
            return Unauthorized(new { Message = "User is not authenticated" });

        var existingTransaction = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == user.Id);

        if (existingTransaction == null)
            return NotFound(new { Message = "Transaction not found" });

        existingTransaction.Description = transaction.Description;
        existingTransaction.Amount = transaction.Amount;
        existingTransaction.Date = transaction.Date;
        existingTransaction.Category = transaction.Category;

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Transaction updated successfully" });
    }

    [HttpDelete("delete/{id}")]
    public async Task<IActionResult> DeleteTransaction(int id)
    {
        var user = await _userManager.GetUserAsync(User);

        if (user == null)
            return Unauthorized(new { Message = "User is not authenticated" });

        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == user.Id);

        if (transaction == null)
            return NotFound(new { Message = "Transaction not found" });

        _context.Transactions.Remove(transaction);
        await _context.SaveChangesAsync();
        return Ok(new { Message = "Transaction deleted successfully" });
    }
}