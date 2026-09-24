import { randomUUID } from 'node:crypto';
import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from '@aws-sdk/client-bedrock-agentcore';
import { env } from './env';

const client = new BedrockAgentCoreClient({});

export type AgentTask =
  | { task: 'hero'; roomId: string; householdId: string; playerId: string; drawingKey: string; name: string; ageBand: string; language: string }
  | {
      task: 'weave';
      storyId: string;
      roomId: string;
      householdId: string;
      settings: Record<string, unknown>;
      room: Record<string, unknown>;
    };

/**
 * Hands a job to the Storyloom agent on Bedrock AgentCore Runtime. The agent
 * acknowledges immediately and keeps working in the background, streaming
 * progress to the room over WebSocket.
 */
export async function runAgent(job: AgentTask) {
  // AgentCore session ids must be at least 33 characters.
  const sessionId = `${job.task}-${randomUUID()}-${Date.now()}`;
  const res = await client.send(
    new InvokeAgentRuntimeCommand({
      agentRuntimeArn: env.agentRuntimeArn,
      runtimeSessionId: sessionId,
      contentType: 'application/json',
      accept: 'application/json',
      payload: new TextEncoder().encode(JSON.stringify(job)),
    }),
  );
  const body = res.response ? await res.response.transformToString() : '';
  return { sessionId, body };
}
