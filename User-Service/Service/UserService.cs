using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Internal;
using SharedModels.Users;
using SharedModels.Exceptions;
using UserAPI.Models.Requests;
using UserAPI.Models.Responses;
using UserDb;
using UserDb.Models;

namespace UserAPI.Service
{
    public interface IUserService
    {
        Task<UserCreateResponse> CreateUser(UserCreateRequest request);
        Task<UserCreateResponse> GetUser(Guid id);
        
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

        public async Task<UserCreateResponse> CreateUser(UserCreateRequest request)
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

            var userResponse = new UserCreateResponse
            {
                Id = user.Id,
                Email = user.Email
            };

            return userResponse;
        }

        public async Task<UserCreateResponse> GetUser(Guid id)
        {
            using var db = await _dbFactory.CreateDbContextAsync();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
            {
                _logger.LogWarning($"User not found: {id}");
                throw new NotFoundException("User not found");
            }

            var userResponse = new UserCreateResponse
            {
                Id = user.Id,
                Email = user.Email
            };

            return userResponse;
        }
    }
}
