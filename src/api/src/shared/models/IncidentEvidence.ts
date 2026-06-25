export type IncidentEvidence = {
  evidenceId: string;
  incidentId: string;
  originalFileName: string;
  blobName: string;
  contentType: string;
  fileSizeBytes: number;
  sha256Hash: string;
  uploadedByType: "public-reporter" | "admin";
  uploadedUtc: string;
};

export type UploadEvidenceRequest = {
  publicId: string;
  trackingToken: string;
  fileName: string;
  contentType: string;
  fileBase64: string;
};

export type UploadEvidenceResponse = {
  evidenceId: string;
  publicId: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedUtc: string;
};

export type AdminIncidentEvidenceListResponse = {
  items: IncidentEvidence[];
};