IF OBJECT_ID('dbo.AdminSession', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AdminSession (
        SessionId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AdminSession PRIMARY KEY,
        SessionTokenHash NVARCHAR(128) NOT NULL,
        PrincipalId NVARCHAR(100) NOT NULL,
        PrincipalName NVARCHAR(200) NOT NULL,
        IdentityProvider NVARCHAR(100) NOT NULL,
        CreatedUtc DATETIME2 NOT NULL,
        ExpiresUtc DATETIME2 NOT NULL,
        RevokedUtc DATETIME2 NULL,
        LastSeenUtc DATETIME2 NULL
    );

    CREATE UNIQUE INDEX UX_AdminSession_SessionTokenHash
        ON dbo.AdminSession(SessionTokenHash);

    CREATE INDEX IX_AdminSession_ExpiresUtc
        ON dbo.AdminSession(ExpiresUtc);

    CREATE INDEX IX_AdminSession_PrincipalName
        ON dbo.AdminSession(PrincipalName);
END;