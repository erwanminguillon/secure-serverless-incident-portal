CREATE SEQUENCE dbo.IncidentNumberSequence
    AS INT
    START WITH 1
    INCREMENT BY 1;
GO

CREATE TABLE dbo.RefStatus (
    StatusCode NVARCHAR(50) NOT NULL PRIMARY KEY,
    DisplayName NVARCHAR(100) NOT NULL,
    SortOrder INT NOT NULL,
    IsTerminal BIT NOT NULL
);
GO

CREATE TABLE dbo.RefSeverity (
    SeverityCode NVARCHAR(50) NOT NULL PRIMARY KEY,
    DisplayName NVARCHAR(100) NOT NULL,
    SortOrder INT NOT NULL
);
GO

CREATE TABLE dbo.RefReportType (
    ReportTypeCode NVARCHAR(50) NOT NULL PRIMARY KEY,
    DisplayName NVARCHAR(100) NOT NULL,
    SortOrder INT NOT NULL
);
GO

CREATE TABLE dbo.RefCategory (
    CategoryCode NVARCHAR(50) NOT NULL PRIMARY KEY,
    DisplayName NVARCHAR(100) NOT NULL,
    SortOrder INT NOT NULL
);
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

    RowVersion ROWVERSION NOT NULL,

    CONSTRAINT FK_Incident_RefStatus
        FOREIGN KEY (StatusCode) REFERENCES dbo.RefStatus(StatusCode),

    CONSTRAINT FK_Incident_RefSeverity
        FOREIGN KEY (SeverityCode) REFERENCES dbo.RefSeverity(SeverityCode),

    CONSTRAINT FK_Incident_RefReportType
        FOREIGN KEY (ReportTypeCode) REFERENCES dbo.RefReportType(ReportTypeCode),

    CONSTRAINT FK_Incident_RefCategory
        FOREIGN KEY (CategoryCode) REFERENCES dbo.RefCategory(CategoryCode)
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