using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FinanceTracker.API.Models;

namespace FinanceTracker.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IConfiguration _configuration;

        public AuthController(UserManager<ApplicationUser> userManager, IConfiguration configuration)
        {
            _userManager = userManager;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            bool userNameExist = await _userManager.Users.AnyAsync(p => p.UserName == model.Username);
            if (userNameExist)
                return BadRequest(new { Message = "Kullanıcı Adı Daha Önce Kayıt Edildi." });
            bool emailExist = await _userManager.Users.AnyAsync(p => p.Email == model.Email);
            if (emailExist)
                return BadRequest(new { Message = "Email Daha Önce Kayıt Edildi." });
            var user = new ApplicationUser
            {
                UserName = model.Username,
                Email = model.Email
            };   
            var result = await _userManager.CreateAsync(user, model.Password);

            if (!result.Succeeded)
                return BadRequest(result.Errors);

            return Ok(new { Message = "User registered successfully" });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null || !await _userManager.CheckPasswordAsync(user, model.Password))
                return Unauthorized(new { Message = "Invalid credentials" });

            // Create claims for the JWT token with CORRECT claim types
            var authClaims = new List<Claim>
            {
                // Add the user ID as NameIdentifier claim (this is what UserManager.GetUserAsync looks for)
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.UserName ?? ""),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.Sub, user.Id), // Subject claim
                new Claim("userId", user.Id) // Custom claim for easier access
            };

            // Debug: Log the claims being added
            Console.WriteLine("=== Creating JWT with claims ===");
            foreach (var claim in authClaims)
            {
                Console.WriteLine($"{claim.Type}: {claim.Value}");
            }

            // Generate the signing key
            var authSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JWT:Secret"]!));

            // Create the JWT token
            var token = new JwtSecurityToken(
                issuer: _configuration["JWT:ValidIssuer"],
                audience: _configuration["JWT:ValidAudience"],
                expires: DateTime.Now.AddHours(3), // Token expiration time
                claims: authClaims,
                signingCredentials: new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256)
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

            // Debug: Log token creation
            Console.WriteLine($"✅ JWT Token created for user: {user.Email} (ID: {user.Id})");
            Console.WriteLine($"Token preview: {tokenString.Substring(0, Math.Min(50, tokenString.Length))}...");

            // Return the token and expiration time
            return Ok(new
            {
                Token = tokenString,
                Expiration = token.ValidTo,
                UserId = user.Id,
                UserEmail = user.Email,
                UserName = user.UserName
            });
        }

        // Add a test endpoint to verify token creation
        [HttpPost("test-token")]
        public async Task<IActionResult> TestToken([FromBody] LoginModel model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
                return NotFound(new { Message = "User not found" });

            return Ok(new
            {
                UserId = user.Id,
                UserEmail = user.Email,
                UserName = user.UserName,
                Message = "User found successfully"
            });
        }
    }
}