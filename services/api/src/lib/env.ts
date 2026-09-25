function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const env = {
  get table() {
    return required('TABLE_NAME');
  },
  get mediaBucket() {
    return required('MEDIA_BUCKET');
  },
  get secretArn() {
    return required('AUTH_SECRET_ARN');
  },
  get wsEndpoint() {
    return required('WS_ENDPOINT'); // https://{id}.execute-api.{region}.amazonaws.com/{stage}
  },
  get wsUrl() {
    return required('WS_URL'); // wss://...
  },
  get companionUrl() {
    return required('COMPANION_URL');
  },
  get mediaDomain() {
    return required('MEDIA_DOMAIN'); // CloudFront domain serving /media/*
  },
  get cfKeyPairId() {
    return required('CF_KEY_PAIR_ID');
  },
  get cfPrivateKeySecretArn() {
    return required('CF_PRIVATE_KEY_SECRET_ARN');
  },
  get agentRuntimeArn() {
    return required('AGENT_RUNTIME_ARN');
  },
  get guardrailId() {
    return process.env.GUARDRAIL_ID ?? '';
  },
  get guardrailVersion() {
    return process.env.GUARDRAIL_VERSION ?? 'DRAFT';
  },
  // Phone sign-in. Origination identity and India DLT ids are optional until SMS goes to production.
  get smsOrigination() {
    return process.env.SMS_ORIGINATION || undefined;
  },
  get smsConfigurationSet() {
    return process.env.SMS_CONFIGURATION_SET || undefined;
  },
  get smsIndiaEntityId() {
    return process.env.SMS_IN_ENTITY_ID || undefined;
  },
  get smsIndiaTemplateId() {
    return process.env.SMS_IN_TEMPLATE_ID || undefined;
  },
  /** Real text messages go out only once SMS is set up for production (a deliberate switch). */
  get smsEnabled() {
    return process.env.SMS_ENABLED === 'true';
  },
  get demoOtpCode() {
    return process.env.DEMO_OTP_CODE || '246810';
  },
};
