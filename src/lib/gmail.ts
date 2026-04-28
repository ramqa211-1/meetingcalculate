import { GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { auth } from './firebase';

const GMAIL_TOKEN_KEY = 'gmail_access_token';
const GMAIL_TOKEN_EXPIRY_KEY = 'gmail_token_expiry';

function getCachedToken(): string | null {
  const token = sessionStorage.getItem(GMAIL_TOKEN_KEY);
  const expiry = sessionStorage.getItem(GMAIL_TOKEN_EXPIRY_KEY);
  if (!token || !expiry) return null;
  if (Date.now() > parseInt(expiry)) {
    sessionStorage.removeItem(GMAIL_TOKEN_KEY);
    sessionStorage.removeItem(GMAIL_TOKEN_EXPIRY_KEY);
    return null;
  }
  return token;
}

function setCachedToken(token: string): void {
  sessionStorage.setItem(GMAIL_TOKEN_KEY, token);
  sessionStorage.setItem(GMAIL_TOKEN_EXPIRY_KEY, String(Date.now() + 3500 * 1000));
}

async function getGmailAccessToken(): Promise<string> {
  const cached = getCachedToken();
  if (cached) return cached;

  const user = auth.currentUser;
  if (!user) throw new Error('המשתמש אינו מחובר');

  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/gmail.send');

  const result = await reauthenticateWithPopup(user, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);

  if (!credential?.accessToken) {
    throw new Error('לא ניתן לקבל הרשאת Gmail. נסה שוב.');
  }

  setCachedToken(credential.accessToken);
  return credential.accessToken;
}

function encodeBase64Utf8(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

function createMimeEmail(
  to: string,
  subject: string,
  bodyHtml: string,
  pdfBase64: string,
  filename: string
): string {
  const boundary = `boundary_${Math.random().toString(36).slice(2)}`;

  const parts = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${encodeBase64Utf8(subject)}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodeBase64Utf8(bodyHtml),
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${filename}"`,
    '',
    pdfBase64,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  return btoa(unescape(encodeURIComponent(parts)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendInvoiceEmail(
  to: string,
  subject: string,
  bodyHtml: string,
  pdfBase64: string,
  filename: string
): Promise<void> {
  const accessToken = await getGmailAccessToken();

  const raw = createMimeEmail(to, subject, bodyHtml, pdfBase64, filename);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'שגיאה בשליחת המייל');
  }
}
