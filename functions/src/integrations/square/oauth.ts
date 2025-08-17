import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { Client, OAuthApi } from 'square';

const secrets = new SecretManagerServiceClient();

export async function storeSquareTokenForBiz(bizId: string, accessToken: string) {
  const name = `projects/${process.env.GCLOUD_PROJECT}/secrets/square_${bizId}/versions`;
  await secrets.addSecretVersion({ parent: name.replace(/\/versions$/, ''), payload: { data: Buffer.from(accessToken) } }).catch(async (e) => {
    if (e.code === 5) {
      await secrets.createSecret({ parent: `projects/${process.env.GCLOUD_PROJECT}`, secret: { name: `square_${bizId}`, replication: { automatic: {} } }, secretId: `square_${bizId}` });
      await secrets.addSecretVersion({ parent: name.replace(/\/versions$/, ''), payload: { data: Buffer.from(accessToken) } });
    } else {
      throw e;
    }
  });
}

export async function exchangeSquareCode(code: string, redirectUri: string) {
  const client = new Client({ environment: 'production' as any });
  const oauth = new OAuthApi(client);
  const appId = process.env.SQUARE_APP_ID!;
  const appSecret = process.env.SQUARE_APP_SECRET!;
  const res = await oauth.obtainToken({
    clientId: appId,
    clientSecret: appSecret,
    code,
    grantType: 'authorization_code',
    redirectUri,
  } as any);
  return res.result.accessToken!;
} 