import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the AES-256 encryption key from environment.
 * Must be exactly 32 bytes (64 hex characters).
 */
function getEncryptionKey(): Buffer {
  const key = process.env.SIGNATURE_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('SIGNATURE_ENCRYPTION_KEY is not set in environment variables');
  }
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('SIGNATURE_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
  }
  return keyBuffer;
}

/**
 * Build the raw payload string from signature components.
 * Components are joined with '|' separator.
 * Dispenser IDs are sorted alphabetically for deterministic output.
 */
export function buildSignaturePayload(data: {
  dispenserIds: string[];
  timestamp: string;
  deviceInfo: string;
  technicianId: string;
  customerName: string;
  customerIdentity: string;
}): string {
  return [
    data.dispenserIds.sort().join(','),
    data.timestamp,
    data.deviceInfo,
    data.technicianId,
    data.customerName.trim(),
    data.customerIdentity.trim(),
  ].join('|');
}

/**
 * Generate SHA-512 hash of the given payload string.
 */
export function hashSHA512(payload: string): string {
  return crypto.createHash('sha512').update(payload, 'utf8').digest('hex');
}

/**
 * Encrypt data using AES-256-GCM.
 * Returns a compact string: base64(iv):base64(authTag):base64(encrypted)
 */
export function encryptAES256(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:ciphertext (all base64)
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted,
  ].join(':');
}

/**
 * Decrypt data that was encrypted with encryptAES256.
 * Expects format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function decryptAES256(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a complete digital signature:
 * 1. Build raw payload from components
 * 2. Compute SHA-512 hash
 * 3. Encrypt the hash with AES-256-GCM
 * 
 * Returns the encrypted hash and the raw payload for audit storage.
 */
export function generateSignature(data: {
  dispenserIds: string[];
  timestamp: string;
  deviceInfo: string;
  technicianId: string;
  customerName: string;
  customerIdentity: string;
}): {
  signatureHash: string;    // SHA-512 hex digest (plain, for display/verification)
  encryptedHash: string;    // AES-256-GCM encrypted hash (for tamper-proof storage)
  rawPayload: string;       // Original payload (for audit trail)
} {
  const rawPayload = buildSignaturePayload(data);
  const signatureHash = hashSHA512(rawPayload);
  const encryptedHash = encryptAES256(signatureHash);
  
  return { signatureHash, encryptedHash, rawPayload };
}

/**
 * Verify a signature by:
 * 1. Decrypting the stored encrypted hash
 * 2. Recomputing SHA-512 from the stored raw payload
 * 3. Comparing both hashes
 * 
 * Returns true if the signature is valid and untampered.
 */
export function verifySignature(
  encryptedHash: string,
  rawPayload: string
): { valid: boolean; hash: string; computedHash: string } {
  try {
    const decryptedHash = decryptAES256(encryptedHash);
    const computedHash = hashSHA512(rawPayload);
    
    // Use timing-safe comparison to prevent timing attacks
    const valid = crypto.timingSafeEqual(
      Buffer.from(decryptedHash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
    
    return { valid, hash: decryptedHash, computedHash };
  } catch {
    return { valid: false, hash: '', computedHash: '' };
  }
}
