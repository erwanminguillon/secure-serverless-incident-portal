CREATE SEQUENCE dbo.IncidentNumberSequence
    AS INT
    START WITH 1
    INCREMENT BY 1;
GO

CREATE TABLE dbo.Incident (
    IncidentId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    IncidentNumber INT NOT NULL UNIQUE,
    PublicId NVARCHAR(50) NOT NULL UNIQUE,
    TrackingTokenHash NVARCHAR(128) NOT NULL,

    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,

    ReportTypeCode NVARCHAR(50) NOT NULL,
    CategoryCode NVARCHAR(50) NULL,
    SeverityCode NVARCHAR(50) NOT NULL,
    StatusCode NVARCHAR(50) NOT NULL,

    SubmitterName NVARCHAR(200) NULL,
    SubmitterEmail NVARCHAR(320) NULL,
    IsAnonymous BIT NOT NULL,

    AssignedReviewerId NVARCHAR(100) NULL,
    AssignedReviewerDisplayName NVARCHAR(200) NULL,

    SubmittedUtc DATETIME2 NOT NULL,
    CreatedUtc DATETIME2 NOT NULL,
    UpdatedUtc DATETIME2 NOT NULL,
    LastStatusChangedUtc DATETIME2 NOT NULL,

    RowVersion ROWVERSION NOT NULL
);
GO

CREATE TABLE dbo.IncidentComment (
    CommentId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    IncidentId UNIQUEIDENTIFIER NOT NULL,
    CommentText NVARCHAR(MAX) NOT NULL,
    IsInternal BIT NOT NULL,
    CreatedById NVARCHAR(100) NULL,
    CreatedByDisplayName NVARCHAR(200) NULL,
    CreatedUtc DATETIME2 NOT NULL,

    CONSTRAINT FK_IncidentComment_Incident
        FOREIGN KEY (IncidentId) REFERENCES dbo.Incident(IncidentId)
);
GO

CREATE INDEX IX_Incident_PublicId ON dbo.Incident (PublicId);
GO

CREATE INDEX IX_Incident_StatusCode_SubmittedUtc
    ON dbo.Incident (StatusCode, SubmittedUtc DESC);
GO

CREATE INDEX IX_IncidentComment_IncidentId_CreatedUtc
    ON dbo.IncidentComment (IncidentId, CreatedUtc DESC);
GO