namespace SharedModels.General
{
    public enum StatusTask
    {
        Cancelled = -10,
        Failed = -1,
        Created = 0,
        PlannerOk = 1,
        ScannerOk = 2,
        DiscoveryOk = 3,
        ExploitOk = 4,
        Completed = 5
    }
}
