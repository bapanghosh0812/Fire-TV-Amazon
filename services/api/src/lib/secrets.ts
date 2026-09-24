import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

const sm = new SecretsManagerClient({});
const cache = new Map<string, Promise<string>>();

/** Reads a secret once per Lambda container. */
export function secret(arn: string): Promise<string> {
  let p = cache.get(arn);
  if (!p) {
    p = sm.send(new GetSecretValueCommand({ SecretId: arn })).then((r) => {
      if (!r.SecretString) throw new Error('Empty secret');
      return r.SecretString;
    });
    p.catch(() => cache.delete(arn));
    cache.set(arn, p);
  }
  return p;
}
