import { google } from 'googleapis';
import readline from 'readline';

// Replace with your actual credentials
const CLIENT_ID = '1020000635692-ltgcbsavcpniupbrmnek7ks7ns0n0d68.apps.googleusercontent.com';
const CLIENT_SECRET = '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';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

const scopes = ['https://mail.google.com/'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('1. Visit this URL in your browser:');
console.log(authUrl);
console.log('\n2. After authorizing, Google will show you an authorization code.');
console.log('3. Copy that code and paste it below:\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the authorization code: ', (code) => {
  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('Error getting token:', err);
      return;
    }
    console.log('\n✅ SUCCESS! Your refresh token is:');
    console.log(token.refresh_token);
    console.log('\nSave this token securely - you\'ll need it for Supabase!');
    rl.close();
  });
});