IF OBJECT_ID('dbo.IncidentEvidence', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.IncidentEvidence (
        EvidenceId UNIQUEIDENTIFIER NOT NULL,
        IncidentId UNIQUEIDENTIFIER NOT NULL,

        OriginalFileName NVARCHAR(260) NOT NULL,
        BlobName NVARCHAR(500) NOT NULL,
        ContentType NVARCHAR(100) NOT NULL,
        FileSizeBytes BIGINT NOT NULL,
        Sha256Hash NVARCHAR(128) NOT NULL,

        UploadedByType NVARCHAR(50) NOT NULL,
        UploadedUtc DATETIME2 NOT NULL,

        CONSTRAINT PK_IncidentEvidence PRIMARY KEY (EvidenceId),

        CONSTRAINT FK_IncidentEvidence_Incident
            FOREIGN KEY (IncidentId)
            REFERENCES dbo.Incident (IncidentId)
            ON DELETE CASCADE,

        CONSTRAINT CK_IncidentEvidence_FileSizeBytes
            CHECK (FileSizeBytes > 0 AND FileSizeBytes <= 5242880),

        CONSTRAINT CK_IncidentEvidence_ContentType
            CHECK (ContentType IN (
                'image/png',
                'image/jpeg',
                'image/webp'
            )),

        CONSTRAINT CK_IncidentEvidence_UploadedByType
            CHECK (UploadedByType IN (
                'public-reporter',
                'admin'
            ))
    );
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_IncidentEvidence_IncidentId_UploadedUtc'
      AND object_id = OBJECT_ID('dbo.IncidentEvidence')
)
BEGIN
    CREATE INDEX IX_IncidentEvidence_IncidentId_UploadedUtc
    ON dbo.IncidentEvidence (IncidentId, UploadedUtc DESC);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_IncidentEvidence_BlobName'
      AND object_id = OBJECT_ID('dbo.IncidentEvidence')
)
BEGIN
    CREATE UNIQUE INDEX UX_IncidentEvidence_BlobName
    ON dbo.IncidentEvidence (BlobName);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_IncidentEvidence_Sha256Hash'
      AND object_id = OBJECT_ID('dbo.IncidentEvidence')
)
BEGIN
    CREATE INDEX IX_IncidentEvidence_Sha256Hash
    ON dbo.IncidentEvidence (Sha256Hash);
END;
GO