import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import type { Story, UploadTicket } from '@storyloom/protocol';
import { env } from './env';
import { secret } from './secrets';

export const s3 = new S3Client({});
export const MAX_DRAWING_BYTES = 4 * 1024 * 1024;

/** Presigned POST: S3 itself enforces type and size, so a phone can't upload anything else. */
export async function drawingUploadTicket(roomId: string, id: string): Promise<UploadTicket> {
  const key = `drawings/${roomId}/${id}.jpg`;
  const { url, fields } = await createPresignedPost(s3, {
    Bucket: env.mediaBucket,
    Key: key,
    Conditions: [
      ['content-length-range', 1, MAX_DRAWING_BYTES],
      ['eq', '$Content-Type', 'image/jpeg'],
    ],
    Fields: { 'Content-Type': 'image/jpeg' },
    Expires: 300,
  });
  return { url, fields, key, maxBytes: MAX_DRAWING_BYTES };
}

export async function objectExists(key: string) {
  try {
    const r = await s3.send(new HeadObjectCommand({ Bucket: env.mediaBucket, Key: key }));
    return (r.ContentLength ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Media is private: the TV and phones get CloudFront signed URLs that expire,
 * so a story's pictures and a child's drawing can't be shared or scraped.
 */
export async function signedMediaUrl(key: string | undefined, hours = 12) {
  if (!key) return undefined;
  const privateKey = await secret(env.cfPrivateKeySecretArn);
  return getSignedUrl({
    url: `https://${env.mediaDomain}/${key}`,
    keyPairId: env.cfKeyPairId,
    privateKey,
    dateLessThan: new Date(Date.now() + hours * 3600_000).toISOString(),
  });
}

type StoredPage = Story['pages'][number] & { imageKey?: string; audioKey?: string };
type StoredStory = Story & { coverKey?: string; pages: StoredPage[] };

/** Turns stored S3 keys into short-lived URLs just before sending to a client. */
export async function withSignedUrls(story: StoredStory): Promise<Story> {
  const pages = await Promise.all(
    (story.pages as StoredPage[]).map(async ({ imageKey, audioKey, ...p }) => ({
      ...p,
      imageUrl: await signedMediaUrl(imageKey),
      audioUrl: await signedMediaUrl(audioKey),
    })),
  );
  const hero = { ...story.hero } as Story['hero'] & { portraitKey?: string; drawingKey?: string; cutoutKey?: string };
  const choice = story.choice
    ? {
        ...story.choice,
        options: (await Promise.all(
          story.choice.options.map(async (o) => {
            const { imageKey, ...rest } = o as typeof o & { imageKey?: string };
            return { ...rest, imageUrl: await signedMediaUrl(imageKey) };
          }),
        )) as NonNullable<Story['choice']>['options'],
      }
    : undefined;
  const { coverKey, ...rest } = story;
  return {
    ...rest,
    coverUrl: await signedMediaUrl(coverKey),
    hero: {
      kind: 'hero',
      by: hero.by,
      name: hero.name,
      description: hero.description,
      portraitUrl: await signedMediaUrl(hero.portraitKey),
      cutoutUrl: await signedMediaUrl(hero.cutoutKey),
    },
    choice,
    pages,
  };
}
