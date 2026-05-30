import * as Keychain from 'react-native-keychain';

export class IOSSecureEnclaveService {
  private static readonly SERVICE_NAME = 'com.nhai.secureenclave';

  static async secureKeyStorage(alias: string, keyData: string): Promise<void> {
    await Keychain.setGenericPassword(alias, keyData, {
      service: this.SERVICE_NAME,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  static async keyRetrieval(): Promise<string | null> {
    const credentials = await Keychain.getGenericPassword({
      service: this.SERVICE_NAME,
    });
    if (credentials) {
      return credentials.password;
    }
    return null;
  }

  static async keyRotationSupport(newAlias: string, newKeyData: string): Promise<void> {
    await this.secureKeyStorage(newAlias, newKeyData);
  }
}
