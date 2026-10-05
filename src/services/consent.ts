/** Edad mínima y consentimiento (spec 03, RF-A13). Fachada sobre el backend activo. */
import { consentApi } from '@/services/backend';

export const getConsentStatus = consentApi.getStatus;
export const acceptPrivacy = consentApi.accept;
export const requestGuardianApproval = consentApi.requestGuardianApproval;
export const guardianRequestInfo = consentApi.guardianRequestInfo;
export const decideGuardianRequest = consentApi.decideGuardianRequest;
export const deleteUnderageAccount = consentApi.deleteUnderageAccount;
