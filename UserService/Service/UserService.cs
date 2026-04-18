using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Internal;
using SharedModels.Exceptions;
using UserAPI.Models.Requests;
using UserAPI.Models.Responses;
using UserDb;
using UserDb.Models;
using SharedModels.General;
using SharedModels.Events.Users;
using SharedModels.Hash;
using MassTransit.Initializers;

namespace UserAPI.Service
{
    public interface IUserService
    {
        Task<UserResponse> CreateUserAsync(CreateRequest request);
        Task<UserResponse> GetUserAsync(Guid id, string status = "");
        Task<List<UserResponse>> GetAllUsersAsync(string status = "");
        Task<Guid> GetUserIdAsync (string email);
        Task<UserResponse> UpdateUserAsync(Guid id, string email);
        Task DeleteUserAsync(Guid id); 
        
    }
    public class UserService : IUserService
    {
        private readonly IDbContextFactory<UserContext> _dbContextFactory;
        private readonly IPublishEndpoint _publishEndpoint;
        private readonly ILogger<UserService> _logger;

        public UserService(IDbContextFactory<UserContext> dbContextFactory,
            ILogger<UserService> logger,
            IPublishEndpoint publishEndpoint)
        {
            _dbContextFactory = dbContextFactory;
            _logger = logger;
            _publishEndpoint = publishEndpoint;
        }

        public async Task<UserResponse> CreateUserAsync(CreateRequest request)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();
            
            if (await db.Users.AnyAsync(u => u.Email == request.Email))
            {
                throw new Exception("User with this email already exists");
            }

            var user = new User() { Email = request.Email };

            await db.Users.AddAsync(user);
            await db.SaveChangesAsync();

            _logger.LogInformation($"User created: {user.Id}");

            var passwordHash = PasswordHasher.HashPassword(request.Password);

            await _publishEndpoint.Publish<UserCreated>(new
            {
                Id = user.Id,
                Email = user.Email,
                Status = user.Status,
                Version = user.Version,
                PasswordHash = passwordHash
            });

            return new UserResponse(user);
        }

        public async Task<UserResponse> GetUserAsync(Guid id, string status = "")
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var user = await db.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == id && u.Status.ToString().Contains(status));

            if (user == null)
            {
                _logger.LogWarning($"User not found: {id}");
                throw new NotFoundException("User not found");
            }

            return new UserResponse(user);
        }

        public async Task<List<UserResponse>> GetAllUsersAsync(string status = "")
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();
            
            return await db.Users
                .AsNoTracking()
                .Where(u => u.Status.ToString().Contains(status))
                .Select(u => new UserResponse(u))
                .ToListAsync();
        }

        public async Task<Guid> GetUserIdAsync(string email)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            return await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email)
                .Select(u => u != null ? u.Id : Guid.Empty);
        }

        public async Task<UserResponse> UpdateUserAsync(Guid id, string email)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
            {
                _logger.LogWarning($"User not found: {id}");
                throw new NotFoundException("User not found");
            }
            
            if (user.Status != Status.Active)
            {
                _logger.LogWarning($"Invalid status for update {user.Status}");
                throw new StatusException("Invalid status for update"); 
            }

            user.Version++;
            user.Email = email;

            await db.SaveChangesAsync();

            await _publishEndpoint.Publish<UserUpdated>(new
            {
                Id = user.Id,
                Email = user.Email,
                Status = user.Status
            });

            return new UserResponse(user);
        }

        public async Task DeleteUserAsync(Guid id)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
            {
                _logger.LogWarning($"User not found: {id}");
                throw new NotFoundException("User not found");
            }

            user.Version++;
            user.Status = Status.Deleted;
            await db.SaveChangesAsync();

            await _publishEndpoint.Publish<UserDeleted>(new
            {
                Id = user.Id
            });
            await _publishEndpoint.Publish<UserUpdated>(new
            {
                Id = user.Id,
                Email = user.Email,
                Status = user.Status
            });
        }
    }
}
