using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Internal;
using SharedModels.Users;
using SharedModels.Exceptions;
using UserAPI.Models.Requests;
using UserAPI.Models.Responses;
using UserDb;
using UserDb.Models;
using SharedModels.General;

namespace UserAPI.Service
{
    public interface IUserService
    {
        Task<UserResponse> CreateUser(CreateRequest request);
        Task<UserResponse> GetUser(Guid id, string status = "");
        Task<List<UserResponse>> GetAllUsers(string status = "");
        Task<UserResponse> UpdateUser(Guid id, string email);
        Task DeleteUser(Guid id); 
        
    }
    public class UserService : IUserService
    {
        private readonly IDbContextFactory<UserContext> _dbFactory;
        private readonly IPublishEndpoint _publishEndpoint;
        private readonly ILogger<UserService> _logger;

        public UserService(IDbContextFactory<UserContext> dbFactory,
            ILogger<UserService> logger,
            IPublishEndpoint publishEndpoint)
        {
            _dbFactory = dbFactory;
            _logger = logger;
            _publishEndpoint = publishEndpoint;
        }

        public async Task<UserResponse> CreateUser(CreateRequest request)
        {
            using var db = await _dbFactory.CreateDbContextAsync();

            var user = new User() { Email = request.Email};

            await db.Users.AddAsync(user);
            await db.SaveChangesAsync();

            _logger.LogInformation($"User created: {user.Id}");

            await _publishEndpoint.Publish<UserCreated>(new
            {
                Id = user.Id,
                Email = user.Email,
                Status = user.Status,
                Version = user.Version,
                Password = request.Password
            });

            var response = new UserResponse(user);

            return response;
        }

        public async Task DeleteUser(Guid id)
        {
            using var db = await _dbFactory.CreateDbContextAsync();

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
        }

        public async Task<List<UserResponse>> GetAllUsers(string status = "")
        {
            using var db = await _dbFactory.CreateDbContextAsync();

            var usersResponse = await db.Users
                .Where(u => u.Status.ToString().Contains(status))
                .Select(u => new UserResponse(u))
                .ToListAsync();

            return usersResponse;
        }

        public async Task<UserResponse> GetUser(Guid id, string status = "")
        {
            using var db = await _dbFactory.CreateDbContextAsync();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Status.ToString().Contains(status));

            if (user == null)
            {
                _logger.LogWarning($"User not found: {id}");
                throw new NotFoundException("User not found");
            }

            var response = new UserResponse(user);

            return response;
        }

        public async Task<UserResponse> UpdateUser(Guid id, string email)
        {
            using var db = await _dbFactory.CreateDbContextAsync();

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
            user.Status = Status.Updated;
            user.Email = email;

            await db.SaveChangesAsync();

            var response = new UserResponse(user);

            return response;
        }
    }
}
