// Custom resource: creates the RSA key pair for CloudFront signed URLs inside
// AWS. The private key goes straight into Secrets Manager and never exists on
// a laptop or in the repository; only the public key is returned.
const { SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const crypto = require('node:crypto');

const sm = new SecretsManagerClient({});

exports.handler = async (event) => {
  const secretId = event.ResourceProperties.SecretArn;
  if (event.RequestType === 'Delete') return { PhysicalResourceId: event.PhysicalResourceId };

  let privatePem;
  try {
    const current = await sm.send(new GetSecretValueCommand({ SecretId: secretId }));
    if (current.SecretString && current.SecretString.includes('BEGIN PRIVATE KEY')) privatePem = current.SecretString;
  } catch (e) {
    if (e.name !== 'ResourceNotFoundException') throw e;
  }
  if (!privatePem) {
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    await sm.send(new PutSecretValueCommand({ SecretId: secretId, SecretString: privatePem }));
  }
  const publicPem = crypto.createPublicKey(privatePem).export({ type: 'spki', format: 'pem' });
  return { PhysicalResourceId: `storyloom-cf-key-${secretId.slice(-6)}`, Data: { PublicKey: publicPem } };
};
