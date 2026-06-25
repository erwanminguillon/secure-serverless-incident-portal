import crypto from "crypto";
import path from "path";

import { BlobServiceClient } from "@azure/storage-blob";

const EVIDENCE_CONTAINER_NAME =
  process.env.EVIDENCE_CONTAINER_NAME?.trim() || "evidence";

const MAX_EVIDENCE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const CONTENT_TYPE_TO_EXTENSION: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

export type ValidatedEvidenceFile = {
  originalFileName: string;
  sanitizedFileName: string;
  contentType: string;
  fileBuffer: Buffer;
  fileSizeBytes: number;
  sha256Hash: string;
  extension: string;
};

export type UploadedEvidenceBlob = {
  blobName: string;
  contentType: string;
  fileSizeBytes: number;
  sha256Hash: string;
};

export type EvidenceBlobContent = {
  content: Buffer;
  contentType: string;
};

function getEvidenceStorageConnectionString(): string {
  const connectionString =
    process.env.EVIDENCE_STORAGE_CONNECTION_STRING ||
    process.env.AzureWebJobsStorage;

  if (!connectionString || connectionString.trim().length === 0) {
    throw new Error(
      "Evidence storage is not configured. Missing EVIDENCE_STORAGE_CONNECTION_STRING or AzureWebJobsStorage."
    );
  }

  return connectionString;
}

function getEvidenceContainerClient() {
  const connectionString = getEvidenceStorageConnectionString();

  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);

  return blobServiceClient.getContainerClient(EVIDENCE_CONTAINER_NAME);
}

function sanitizeFileName(fileName: string): string {
  const baseName = path.basename(fileName || "evidence");

  return baseName
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

function getExtensionFromFileName(fileName: string): string {
  return path.extname(fileName || "").toLowerCase();
}

function assertAllowedContentType(contentType: string): void {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error(
      "Unsupported evidence file type. Only PNG, JPG, JPEG, and WEBP images are allowed."
    );
  }
}

function assertAllowedExtension(
  originalFileName: string,
  contentType: string
): string {
  const expectedExtension = CONTENT_TYPE_TO_EXTENSION[contentType];
  const actualExtension = getExtensionFromFileName(originalFileName);

  if (contentType === "image/jpeg") {
    if (actualExtension !== ".jpg" && actualExtension !== ".jpeg") {
      throw new Error("JPEG evidence files must use .jpg or .jpeg extension.");
    }

    return actualExtension;
  }

  if (actualExtension !== expectedExtension) {
    throw new Error(
      `Evidence file extension does not match content type. Expected ${expectedExtension}.`
    );
  }

  return actualExtension;
}

export function validateEvidenceFile(input: {
  fileName: string;
  contentType: string;
  fileBase64: string;
}): ValidatedEvidenceFile {
  const originalFileName = input.fileName?.trim();

  if (!originalFileName) {
    throw new Error("Evidence file name is required.");
  }

  const contentType = input.contentType?.trim().toLowerCase();

  if (!contentType) {
    throw new Error("Evidence content type is required.");
  }

  assertAllowedContentType(contentType);

  if (!input.fileBase64 || input.fileBase64.trim().length === 0) {
    throw new Error("Evidence file content is required.");
  }

  const extension = assertAllowedExtension(originalFileName, contentType);

  let fileBuffer: Buffer;

  try {
    fileBuffer = Buffer.from(input.fileBase64, "base64");
  } catch {
    throw new Error("Evidence file content is not valid base64.");
  }

  if (fileBuffer.length === 0) {
    throw new Error("Evidence file is empty.");
  }

  if (fileBuffer.length > MAX_EVIDENCE_FILE_SIZE_BYTES) {
    throw new Error("Evidence file is too large. Maximum size is 5 MB.");
  }

  const sha256Hash = crypto
    .createHash("sha256")
    .update(fileBuffer)
    .digest("hex");

  return {
    originalFileName,
    sanitizedFileName: sanitizeFileName(originalFileName),
    contentType,
    fileBuffer,
    fileSizeBytes: fileBuffer.length,
    sha256Hash,
    extension,
  };
}

export function createEvidenceBlobName(input: {
  incidentId: string;
  evidenceId: string;
  extension: string;
}): string {
  return `evidence/${input.incidentId}/${input.evidenceId}${input.extension}`;
}

export async function uploadEvidenceBlob(input: {
  incidentId: string;
  evidenceId: string;
  validatedFile: ValidatedEvidenceFile;
}): Promise<UploadedEvidenceBlob> {
  const containerClient = getEvidenceContainerClient();

  await containerClient.createIfNotExists();

  const blobName = createEvidenceBlobName({
    incidentId: input.incidentId,
    evidenceId: input.evidenceId,
    extension: input.validatedFile.extension,
  });

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(input.validatedFile.fileBuffer, {
    blobHTTPHeaders: {
      blobContentType: input.validatedFile.contentType,
      blobContentDisposition: `inline; filename="${input.validatedFile.sanitizedFileName}"`,
    },
    metadata: {
      evidenceId: input.evidenceId,
      incidentId: input.incidentId,
      sha256Hash: input.validatedFile.sha256Hash,
      uploadedBy: "ssip",
    },
  });

  return {
    blobName,
    contentType: input.validatedFile.contentType,
    fileSizeBytes: input.validatedFile.fileSizeBytes,
    sha256Hash: input.validatedFile.sha256Hash,
  };
}

export async function downloadEvidenceBlob(input: {
  blobName: string;
  contentType: string;
}): Promise<EvidenceBlobContent> {
  const containerClient = getEvidenceContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(input.blobName);

  const exists = await blockBlobClient.exists();

  if (!exists) {
    throw new Error("Evidence blob was not found.");
  }

  const downloadResponse = await blockBlobClient.downloadToBuffer();

  return {
    content: downloadResponse,
    contentType: input.contentType,
  };
}