import { Platform } from 'react-native';
import { EncryptionService } from './encryption/EncryptionService';
import { AndroidKeystoreService } from './keystore/AndroidKeystoreService';
import { IOSSecureEnclaveService } from './keystore/IOSSecureEnclaveService';
import { EncryptedPayload, SecurityStatus } from './models';

export class SecurityService {
  private static instance: SecurityService;
  private isInitialized = false;
  private masterKeyAlias = 'MASTER_AES_KEY';
  
  private cachedKey: string | null = null;
  private initPromise: Promise<SecurityStatus> | null = null;

  private constructor() {}

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  public initializeSecurityLayer(): Promise<SecurityStatus> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async (): Promise<SecurityStatus> => {
      try {
        const platform = this.determinePlatform();
        let existingKey = await this.delegateKeyRetrieval();

        if (!existingKey) {
          existingKey = EncryptionService.generateAESKey();
          await this.delegateKeyStorage(this.masterKeyAlias, existingKey);
        }

        this.cachedKey = existingKey;
        this.isInitialized = true;
        
        return { 
          isInitialized: true, 
          keyLoaded: true, 
          platform,
          keyVersion: 1 
        };
      } catch (error) {
        this.initPromise = null; 
        return { 
          isInitialized: false, 
          keyLoaded: false,
          platform: Platform.OS, 
          error: (error as Error).message 
        };
      }
    })();

    return this.initPromise;
  }

  public determinePlatform(): string {
    return Platform.OS;
  }

  private async delegateKeyRetrieval(): Promise<string | null> {
    if (Platform.OS === 'android') {
      return await AndroidKeystoreService.retrieveKeyAlias();
    } else if (Platform.OS === 'ios') {
      return await IOSSecureEnclaveService.keyRetrieval();
    }
    throw new Error('Unsupported platform');
  }

  private async delegateKeyStorage(alias: string, keyData: string): Promise<void> {
    if (Platform.OS === 'android') {
      await AndroidKeystoreService.generateKeyAlias(alias, keyData);
    } else if (Platform.OS === 'ios') {
      await IOSSecureEnclaveService.secureKeyStorage(alias, keyData);
    } else {
      throw new Error('Unsupported platform');
    }
  }

  public async encryptPayload(payload: object | string): Promise<EncryptedPayload> {
    if (!this.isInitialized || !this.cachedKey) {
      throw new Error('SecurityService not initialized or key not loaded');
    }

    if (typeof payload === 'string') {
      return EncryptionService.encryptString(payload, this.cachedKey);
    }
    return EncryptionService.encryptJSON(payload, this.cachedKey);
  }

  public async decryptPayload<T = unknown>(payload: EncryptedPayload, isJson = true): Promise<T | string> {
    if (!this.isInitialized || !this.cachedKey) {
      throw new Error('SecurityService not initialized or key not loaded');
    }

    if (isJson) {
      return EncryptionService.decryptJSON<T>(payload, this.cachedKey);
    }
    return EncryptionService.decryptString(payload, this.cachedKey);
  }

  public clearSession(): void {
    this.cachedKey = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  public resetSecurityLayer(): void {
    this.clearSession();
  }
}

export default SecurityService.getInstance();
