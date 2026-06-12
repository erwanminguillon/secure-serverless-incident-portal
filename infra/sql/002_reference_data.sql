INSERT INTO dbo.RefStatus (StatusCode, DisplayName, SortOrder, IsTerminal)
VALUES
('submitted', 'Submitted', 1, 0),
('triage', 'Triage', 2, 0),
('investigating', 'Investigating', 3, 0),
('resolved', 'Resolved', 4, 0),
('closed', 'Closed', 5, 1),
('rejected', 'Rejected', 6, 1);
GO

INSERT INTO dbo.RefSeverity (SeverityCode, DisplayName, SortOrder)
VALUES
('low', 'Low', 1),
('medium', 'Medium', 2),
('high', 'High', 3),
('critical', 'Critical', 4);
GO

INSERT INTO dbo.RefReportType (ReportTypeCode, DisplayName, SortOrder)
VALUES
('incident', 'Incident', 1),
('vulnerability', 'Vulnerability', 2),
('suspicious_activity', 'Suspicious Activity', 3);
GO

INSERT INTO dbo.RefCategory (CategoryCode, DisplayName, SortOrder)
VALUES
('phishing', 'Phishing', 1),
('malware', 'Malware', 2),
('account_compromise', 'Account Compromise', 3),
('vulnerability', 'Vulnerability', 4),
('suspicious_activity', 'Suspicious Activity', 5),
('data_exposure', 'Data Exposure', 6),
('policy_violation', 'Policy Violation', 7),
('other', 'Other', 8);
GO