import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { env } from './env';

const sms = new PinpointSMSVoiceV2Client({});
const sns = new SNSClient({});

export class SmsUnavailable extends Error {
  status = 503;
  constructor() {
    super('We couldn’t send a text message right now. Please try again in a minute.');
  }
}

export class SmsNotReady extends Error {
  status = 503;
  constructor() {
    super('Text messages aren’t switched on for this service yet. Please use the demo number, or sign in on your phone.');
  }
}

/**
 * Sends a transactional SMS with AWS End User Messaging (falls back to Amazon SNS).
 * India requires DLT registration: set SMS_IN_ENTITY_ID / SMS_IN_TEMPLATE_ID once approved.
 */
export async function sendSms(phone: string, body: string) {
  if (!env.smsEnabled) throw new SmsNotReady();
  const india = phone.startsWith('+91');
  try {
    await sms.send(
      new SendTextMessageCommand({
        DestinationPhoneNumber: phone,
        MessageBody: body,
        MessageType: 'TRANSACTIONAL',
        OriginationIdentity: env.smsOrigination,
        ConfigurationSetName: env.smsConfigurationSet,
        MaxPrice: '0.10',
        TimeToLive: 300,
        DestinationCountryParameters:
          india && env.smsIndiaEntityId && env.smsIndiaTemplateId
            ? { IN_ENTITY_ID: env.smsIndiaEntityId, IN_TEMPLATE_ID: env.smsIndiaTemplateId }
            : undefined,
      }),
    );
    return;
  } catch (e) {
    console.warn(JSON.stringify({ level: 'warn', msg: 'end-user-messaging send failed, trying SNS', error: (e as Error).name }));
  }
  try {
    await sns.send(
      new PublishCommand({
        PhoneNumber: phone,
        Message: body,
        MessageAttributes: { 'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' } },
      }),
    );
  } catch (e) {
    console.error(JSON.stringify({ level: 'error', msg: 'sms send failed', error: (e as Error).name }));
    throw new SmsUnavailable();
  }
}
