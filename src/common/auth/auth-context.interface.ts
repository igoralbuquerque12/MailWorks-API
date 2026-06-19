import { ProviderType } from 'src/common/enums/provider-type.enum';

export interface AuthContext {
  tenantId: string;
  apiKeyId: string;
  providerId: string;
  providerType: ProviderType;
}
