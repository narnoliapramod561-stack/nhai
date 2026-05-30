import * as Keychain from 'react-native-keychain';

export class AndroidKeystoreService {
  private static readonly SERVICE_NAME = 'com.nhai.keystore';

  static async generateKeyAlias(alias: string, keyData: string): Promise<void> {
    await Keychain.setGenericPassword(alias, keyData, {
      service: this.SERVICE_NAME,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    });
  }

  static async retrieveKeyAlias(): Promise<string | null> {
    const credentials = await Keychain.getGenericPassword({
      service: this.SERVICE_NAME,
    });
    if (credentials) {
      return credentials.password;
    }
    return null;
  }

  static async keyRotationSupport(newAlias: string, newKeyData: string): Promise<void> {
    // Overwrite the existing credentials with new key
    await this.generateKeyAlias(newAlias, newKeyData);
  }
}
