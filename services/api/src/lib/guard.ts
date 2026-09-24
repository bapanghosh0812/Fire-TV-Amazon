import { ApplyGuardrailCommand, BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { env } from './env';

const bedrock = new BedrockRuntimeClient({});

/**
 * Screens a child's idea (a world, a twist, a hero name) with Amazon Bedrock
 * Guardrails before it ever reaches the TV or the story engine.
 */
export async function isKidSafe(text: string): Promise<boolean> {
  if (!env.guardrailId || !text.trim()) return true;
  try {
    const r = await bedrock.send(
      new ApplyGuardrailCommand({
        guardrailIdentifier: env.guardrailId,
        guardrailVersion: env.guardrailVersion,
        source: 'INPUT',
        content: [{ text: { text } }],
      }),
    );
    return r.action !== 'GUARDRAIL_INTERVENED';
  } catch (e) {
    // Fail closed for children: if the check itself fails, don't show the text.
    console.warn('guardrail check failed', (e as Error).message);
    return false;
  }
}
