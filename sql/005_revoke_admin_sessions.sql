UPDATE dbo.AdminSession
SET RevokedUtc = SYSUTCDATETIME()
WHERE RevokedUtc IS NULL;