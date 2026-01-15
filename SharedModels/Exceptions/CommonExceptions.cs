namespace SharedModels.Exceptions
{
    public class NotFoundException : Exception
    {
        public NotFoundException(string message) : base(message) { }
    }
    public class StatusException : Exception
    {
        public StatusException(string message) : base(message) { }
    }
}
