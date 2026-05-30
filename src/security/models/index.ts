export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export interface StoredKeyMetadata {
  alias: string;
  createdAt: string;
  version: number;
}

export interface SecurityStatus {
  isInitialized: boolean;
  keyLoaded: boolean;
  platform: string;
  keyVersion?: number;
  error?: string;
}
