import { NativeModules } from 'react-native';

export type MemberSession = {
  projectId: string;
  uid: string;
  email: string;
  token: string;
  refreshToken: string;
  expiresAt: number;
};
const device = () => NativeModules.SangamDevice;
const config = () => {
  const apiKey = device()?.googleCloudApiKey;
  const projectId = device()?.googleCloudProjectId;
  if (
    !apiKey ||
    !projectId ||
    !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)
  )
    throw new Error(
      'Account sign-in is temporarily unavailable. Please contact your community team.',
    );
  return { apiKey: apiKey as string, projectId: projectId as string };
};
export const memberSessionKey = () => `cloud-member:${config().projectId}`;
const messages: Record<string, string> = {
  EMAIL_EXISTS: 'This email already has an account. Please log in.',
  INVALID_LOGIN_CREDENTIALS: 'Check your email and password and try again.',
  EMAIL_NOT_FOUND: 'Check your email and password and try again.',
  INVALID_PASSWORD: 'Check your email and password and try again.',
  USER_DISABLED: 'This account is disabled. Contact your community team.',
  TOKEN_EXPIRED: 'Your session expired. Please log in again.',
  INVALID_REFRESH_TOKEN: 'Please log in again.',
  PROJECT_NUMBER_MISMATCH: 'Please log in again.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Please try again later.',
  WEAK_PASSWORD: 'Use at least 8 characters for your password.',
  INVALID_EMAIL: 'Enter a valid email address.',
  OPERATION_NOT_ALLOWED: 'This sign-in option is temporarily unavailable.',
  ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL:
    'Log in with your existing email and password first.',
};
export class AuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}
async function request(url: string, body: any, form = false) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': form
          ? 'application/x-www-form-urlencoded'
          : 'application/json',
      },
      body: form
        ? Object.entries(body)
            .map(
              ([key, value]) => `${key}=${encodeURIComponent(String(value))}`,
            )
            .join('&')
        : JSON.stringify(body),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      const code = String(result.error?.message || 'AUTH_FAILED').split(
        ' : ',
      )[0];
      throw new AuthError(
        code,
        messages[code] || 'Could not sign in. Please try again.',
      );
    }
    return result;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new Error(
      'Could not connect. Check your internet connection and try again.',
    );
  } finally {
    clearTimeout(timer);
  }
}
const accounts = (action: string, body: any) =>
  request(
    `https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${encodeURIComponent(
      config().apiKey,
    )}`,
    body,
  );
function session(result: any): MemberSession {
  if (result.needConfirmation)
    throw new AuthError(
      'ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL',
      messages.ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL,
    );
  if (!result.localId || !result.idToken || !result.refreshToken)
    throw new Error('Sign-in did not complete. Please try again.');
  return {
    projectId: config().projectId,
    uid: result.localId,
    email: result.email || '',
    token: result.idToken,
    refreshToken: result.refreshToken,
    expiresAt: Date.now() + Number(result.expiresIn || 3600) * 1000,
  };
}
export function validateCredentials(
  email: string,
  password: string,
  registering: boolean,
  confirm = '',
) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return 'Enter a valid email address.';
  if (!password) return 'Enter your password.';
  if (registering && password.length < 8)
    return 'Use at least 8 characters for your password.';
  if (registering && password !== confirm)
    return 'Your passwords do not match.';
  return '';
}
export async function emailSignIn(
  email: string,
  password: string,
  registering: boolean,
) {
  return session(
    await accounts(registering ? 'signUp' : 'signInWithPassword', {
      email: email.trim().toLowerCase(),
      password,
      returnSecureToken: true,
    }),
  );
}
export async function googleSignIn() {
  config();
  const idToken = await device().googleSignIn();
  // Google Cloud Identity Platform verifies Google's token before issuing a session.
  return session(
    await accounts('signInWithIdp', {
      postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`,
      requestUri: 'https://shreeswayam.tech',
      returnSecureToken: true,
      returnIdpCredential: true,
    }),
  );
}
export async function resetPassword(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    throw new Error('Enter your email address first.');
  try {
    await accounts('sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email: email.trim().toLowerCase(),
    });
  } catch (err) {
    if (!(err instanceof AuthError && err.code === 'EMAIL_NOT_FOUND'))
      throw err;
  }
}
export async function restoreMember(saved: MemberSession) {
  if (!saved?.uid || !saved.refreshToken) return null;
  if (saved.projectId !== config().projectId)
    throw new AuthError('PROJECT_CHANGED', 'Please log in again.');
  const refreshed = await request(
    `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(
      config().apiKey,
    )}`,
    { grant_type: 'refresh_token', refresh_token: saved.refreshToken },
    true,
  );
  const result = await accounts('lookup', { idToken: refreshed.id_token });
  const user = result.users?.[0];
  if (!user || user.disabled || user.localId !== saved.uid)
    throw new AuthError('USER_DISABLED', 'Please log in again.');
  return {
    projectId: config().projectId,
    uid: user.localId,
    email: user.email || '',
    token: refreshed.id_token,
    refreshToken: refreshed.refresh_token,
    expiresAt: Date.now() + Number(refreshed.expires_in) * 1000,
  } as MemberSession;
}

// Separate keys from the existing admin session; never persist passwords.
let writes: Promise<any> = Promise.resolve();
export const memberStore = {
  read: async (key: string) => {
    await writes.catch(() => {});
    const raw = await device().readSecure(key);
    return raw ? JSON.parse(raw) : null;
  },
  save: (key: string, value: any) => {
    const snapshot = JSON.stringify(value);
    writes = writes
      .catch(() => {})
      .then(() => device().saveSecure(key, snapshot));
    return writes;
  },
  clear: (key: string) => {
    writes = writes.catch(() => {}).then(() => device().clearSecure(key));
    return writes;
  },
  flush: () => writes,
};
export const draftKey = (uid: string, slug: string) =>
  `cloud-draft:${config().projectId}:${uid}:${slug}`;
