CREATE UNIQUE INDEX IX_Incident_PublicId
    ON dbo.Incident(PublicId);
GO

CREATE INDEX IX_Incident_StatusCode
    ON dbo.Incident(StatusCode);
GO

CREATE INDEX IX_Incident_SeverityCode
    ON dbo.Incident(SeverityCode);
GO

CREATE INDEX IX_Incident_CategoryCode
    ON dbo.Incident(CategoryCode);
GO

CREATE INDEX IX_Incident_SubmittedUtc
    ON dbo.Incident(SubmittedUtc DESC);
GO

CREATE INDEX IX_IncidentComment_IncidentId_CreatedUtc
    ON dbo.IncidentComment(IncidentId, CreatedUtc DESC);
GO