import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CfnOutput,
  CustomResource,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
  aws_apigatewayv2 as apigw,
  aws_apigatewayv2_integrations as integrations,
  aws_bedrock as bedrock,
  aws_bedrockagentcore as agentcore,
  aws_budgets as budgets,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_cloudwatch as cloudwatch,
  aws_dynamodb as dynamodb,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_lambda_nodejs as nodejs,
  aws_logs as logs,
  aws_s3 as s3,
  aws_s3_assets as assets,
  aws_s3_deployment as deploy,
  aws_secretsmanager as secrets,
  custom_resources as cr,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

export interface StoryloomProps extends StackProps {
  alertEmail?: string;
  monthlyBudgetUsd?: number;
}

export class StoryloomStack extends Stack {
  constructor(scope: Construct, id: string, props: StoryloomProps = {}) {
    super(scope, id, props);

    // ---------------------------------------------------------------- data
    const table = new dynamodb.TableV2(this, 'Table', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      timeToLiveAttribute: 'ttl',
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const media = new s3.Bucket(this, 'Media', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [{ allowedMethods: [s3.HttpMethods.POST], allowedOrigins: ['*'], allowedHeaders: ['*'], maxAge: 3000 }],
      lifecycleRules: [
        // Children's drawing photos are deleted within a day; only the painted hero is kept.
        { id: 'drawings-24h', prefix: 'drawings/', expiration: Duration.days(1) },
        { id: 'abort-uploads', abortIncompleteMultipartUploadAfter: Duration.days(1) },
      ],
    });

    const site = new s3.Bucket(this, 'Site', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ------------------------------------------------------------- secrets
    const authSecret = new secrets.Secret(this, 'AuthSecret', {
      description: 'Storyloom token signing key',
      generateSecretString: { passwordLength: 64, excludePunctuation: true },
    });
    const cfKeySecret = new secrets.Secret(this, 'CloudFrontKey', {
      description: 'Storyloom CloudFront signing key (private, generated in AWS)',
    });

    const keyFn = new lambda.Function(this, 'KeyPairFn', {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(here, 'keypair')),
      timeout: Duration.seconds(30),
    });
    cfKeySecret.grantRead(keyFn);
    cfKeySecret.grantWrite(keyFn);
    const keyPair = new CustomResource(this, 'KeyPair', {
      serviceToken: new cr.Provider(this, 'KeyPairProvider', { onEventHandler: keyFn }).serviceToken,
      properties: { SecretArn: cfKeySecret.secretArn, Version: '1' },
    });
    const publicKey = new cloudfront.PublicKey(this, 'MediaPublicKey', { encodedKey: keyPair.getAttString('PublicKey') });
    const keyGroup = new cloudfront.KeyGroup(this, 'MediaKeyGroup', { items: [publicKey] });

    // ---------------------------------------------------------- CloudFront
    const spaRouting = new cloudfront.Function(this, 'SpaRouting', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(
        `function handler(event){var r=event.request;if(r.uri.indexOf('.')===-1){r.uri='/index.html';}return r;}`,
      ),
    });
    const securityHeaders = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      securityHeadersBehavior: {
        strictTransportSecurity: { accessControlMaxAge: Duration.days(365), includeSubdomains: true, override: true },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
      },
    });
    const mediaOrigin = origins.S3BucketOrigin.withOriginAccessControl(media);
    const signedMedia: cloudfront.BehaviorOptions = {
      origin: mediaOrigin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      trustedKeyGroups: [keyGroup],
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
    };
    const cdn = new cloudfront.Distribution(this, 'Cdn', {
      comment: 'Storyloom companion + private media',
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(site),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [{ function: spaRouting, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
        responseHeadersPolicy: securityHeaders,
      },
      additionalBehaviors: {
        'stories/*': signedMedia,
        'heroes/*': signedMedia,
        'drawings/*': signedMedia,
      },
    });
    const companionUrl = `https://${cdn.distributionDomainName}`;

    // ---------------------------------------------------------- Guardrail
    const guardrail = new bedrock.CfnGuardrail(this, 'KidSafeGuardrail', {
      name: `${this.stackName}-kid-safe`,
      description: 'Keeps every idea and every story word suitable for young children.',
      blockedInputMessaging: 'Let’s try a different idea for a family story.',
      blockedOutputsMessaging: 'Let’s try a different idea for a family story.',
      contentPolicyConfig: {
        filtersConfig: [
          { type: 'SEXUAL', inputStrength: 'HIGH', outputStrength: 'HIGH' },
          { type: 'VIOLENCE', inputStrength: 'HIGH', outputStrength: 'HIGH' },
          { type: 'HATE', inputStrength: 'HIGH', outputStrength: 'HIGH' },
          { type: 'INSULTS', inputStrength: 'HIGH', outputStrength: 'HIGH' },
          { type: 'MISCONDUCT', inputStrength: 'HIGH', outputStrength: 'HIGH' },
          { type: 'PROMPT_ATTACK', inputStrength: 'HIGH', outputStrength: 'NONE' },
        ],
      },
      topicPolicyConfig: {
        topicsConfig: [
          { name: 'Weapons', type: 'DENY', definition: 'Guns, knives, bombs or other weapons, or using objects to hurt someone.', examples: ['a hero with a gun', 'stab the dragon'] },
          { name: 'Self-harm', type: 'DENY', definition: 'Hurting oneself, suicide, or dangerous challenges.', examples: ['jump off the roof to fly'] },
          { name: 'Adult themes', type: 'DENY', definition: 'Alcohol, drugs, gambling, romance or dating.', examples: ['they drank beer', 'a casino'] },
        ],
      },
      wordPolicyConfig: { managedWordListsConfig: [{ type: 'PROFANITY' }] },
      sensitiveInformationPolicyConfig: {
        // Kids sometimes type where they live. Never let it reach a story.
        piiEntitiesConfig: [
          { type: 'ADDRESS', action: 'BLOCK' },
          { type: 'PHONE', action: 'BLOCK' },
          { type: 'EMAIL', action: 'BLOCK' },
        ],
      },
    });
    const guardrailVersion = new bedrock.CfnGuardrailVersion(this, 'KidSafeGuardrailV1', {
      guardrailIdentifier: guardrail.attrGuardrailId,
      description: 'v1',
    });

    // ----------------------------------------------------------- Realtime
    const wsFn = new nodejs.NodejsFunction(this, 'WsFn', {
      entry: path.join(root, 'services/api/src/handlers/ws.ts'),
      handler: 'main',
      ...lambdaDefaults(),
      logGroup: new logs.LogGroup(this, 'WsLogs', { retention: logs.RetentionDays.TWO_WEEKS, removalPolicy: RemovalPolicy.DESTROY }),
      timeout: Duration.seconds(15),
    });
    const wsApi = new apigw.WebSocketApi(this, 'Realtime', {
      // Note: an integration id of 'Default' collides with the route's logical id in CDK.
      connectRouteOptions: { integration: new integrations.WebSocketLambdaIntegration('WsConnect', wsFn) },
      disconnectRouteOptions: { integration: new integrations.WebSocketLambdaIntegration('WsDisconnect', wsFn) },
      defaultRouteOptions: { integration: new integrations.WebSocketLambdaIntegration('WsMessage', wsFn) },
    });
    const wsStage = new apigw.WebSocketStage(this, 'RealtimeLive', {
      webSocketApi: wsApi,
      stageName: 'live',
      autoDeploy: true,
      throttle: { rateLimit: 200, burstLimit: 400 },
    });
    const wsEndpoint = `https://${wsApi.apiId}.execute-api.${this.region}.amazonaws.com/${wsStage.stageName}`;

    // ------------------------------------------------------ AgentCore agent
    const memory = new agentcore.CfnMemory(this, 'FamilyMemory', {
      name: `${this.stackName.replace(/[^A-Za-z0-9]/g, '')}FamilyMemory`,
      description: 'What each family’s story world remembers: characters, places, favourite moments.',
      eventExpiryDuration: 90,
      memoryStrategies: [
        { semanticMemoryStrategy: { name: 'FamilyFacts', namespaces: ['/families/{actorId}/facts'] } },
      ],
    });

    const agentCode = new assets.Asset(this, 'AgentCode', { path: path.join(root, 'services/agent/dist/agent.zip') });
    const agentRole = new iam.Role(this, 'AgentRole', {
      assumedBy: new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com', {
        conditions: { StringEquals: { 'aws:SourceAccount': this.account } },
      }),
      description: 'Storyloom story engine on AgentCore Runtime',
    });
    agentCode.grantRead(agentRole);
    table.grantReadWriteData(agentRole);
    media.grantReadWrite(agentRole);
    cfKeySecret.grantRead(agentRole);
    agentRole.addToPolicy(bedrockModelsPolicy(this));
    agentRole.addToPolicy(marketplaceEntitlementPolicy());
    agentRole.addToPolicy(new iam.PolicyStatement({ actions: ['bedrock:ApplyGuardrail'], resources: [guardrail.attrGuardrailArn] }));
    agentRole.addToPolicy(new iam.PolicyStatement({ actions: ['polly:SynthesizeSpeech'], resources: ['*'] }));
    agentRole.addToPolicy(new iam.PolicyStatement({ actions: ['rekognition:DetectLabels', 'rekognition:DetectModerationLabels'], resources: ['*'] }));
    agentRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['execute-api:ManageConnections'],
        resources: [`arn:aws:execute-api:${this.region}:${this.account}:${wsApi.apiId}/${wsStage.stageName}/*`],
      }),
    );
    agentRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock-agentcore:CreateEvent', 'bedrock-agentcore:ListEvents', 'bedrock-agentcore:RetrieveMemoryRecords', 'bedrock-agentcore:ListMemoryRecords'],
        resources: [memory.attrMemoryArn],
      }),
    );
    agentRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents', 'logs:DescribeLogStreams', 'logs:DescribeLogGroups'],
        resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/bedrock-agentcore/runtimes/*`, `arn:aws:logs:${this.region}:${this.account}:log-group:*`],
      }),
    );
    agentRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords', 'xray:GetSamplingRules', 'xray:GetSamplingTargets'],
        resources: ['*'],
      }),
    );
    agentRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
        conditions: { StringEquals: { 'cloudwatch:namespace': 'bedrock-agentcore' } },
      }),
    );
    agentRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock-agentcore:GetWorkloadAccessToken', 'bedrock-agentcore:GetWorkloadAccessTokenForJWT', 'bedrock-agentcore:GetWorkloadAccessTokenForUserId'],
        resources: [`arn:aws:bedrock-agentcore:${this.region}:${this.account}:workload-identity-directory/default*`],
      }),
    );

    const runtime = new agentcore.CfnRuntime(this, 'StoryAgent', {
      agentRuntimeName: 'storyloom_story_agent',
      description: 'Strands multi-agent story engine: director, guardian, illustrator, narrator, curator.',
      roleArn: agentRole.roleArn,
      networkConfiguration: { networkMode: 'PUBLIC' },
      protocolConfiguration: 'HTTP',
      lifecycleConfiguration: { idleRuntimeSessionTimeout: 300, maxLifetime: 1800 },
      agentRuntimeArtifact: {
        codeConfiguration: {
          code: { s3: { bucket: agentCode.s3BucketName, prefix: agentCode.s3ObjectKey } },
          runtime: 'PYTHON_3_13',
          entryPoint: ['main.py'],
        },
      },
      environmentVariables: {
        TABLE_NAME: table.tableName,
        MEDIA_BUCKET: media.bucketName,
        WS_ENDPOINT: wsEndpoint,
        MEDIA_DOMAIN: cdn.distributionDomainName,
        CF_KEY_PAIR_ID: publicKey.publicKeyId,
        CF_PRIVATE_KEY_SECRET_ARN: cfKeySecret.secretArn,
        GUARDRAIL_ID: guardrail.attrGuardrailId,
        GUARDRAIL_VERSION: guardrailVersion.attrVersion,
        MEMORY_ID: memory.attrMemoryId,
        TEXT_MODEL: 'us.amazon.nova-2-lite-v1:0',
        SKETCH_MODEL: 'us.stability.stable-image-control-sketch-v1:0',
        STYLE_MODEL: 'us.stability.stable-image-style-guide-v1:0',
        CUTOUT_MODEL: 'us.stability.stable-image-remove-background-v1:0',
        TEXT_IMAGE_MODEL: 'stability.stable-image-core-v1:1',
        TEXT_IMAGE_REGION: 'us-west-2',
        CODE_VERSION: agentCode.assetHash,
      },
    });
    runtime.node.addDependency(agentRole);

    // ------------------------------------------------------------ HTTP API
    const apiEnv = {
      TABLE_NAME: table.tableName,
      MEDIA_BUCKET: media.bucketName,
      AUTH_SECRET_ARN: authSecret.secretArn,
      WS_ENDPOINT: wsEndpoint,
      WS_URL: wsStage.url,
      COMPANION_URL: companionUrl,
      MEDIA_DOMAIN: cdn.distributionDomainName,
      CF_KEY_PAIR_ID: publicKey.publicKeyId,
      CF_PRIVATE_KEY_SECRET_ARN: cfKeySecret.secretArn,
      AGENT_RUNTIME_ARN: runtime.attrAgentRuntimeArn,
      GUARDRAIL_ID: guardrail.attrGuardrailId,
      GUARDRAIL_VERSION: guardrailVersion.attrVersion,
    };
    const httpFn = new nodejs.NodejsFunction(this, 'HttpFn', {
      entry: path.join(root, 'services/api/src/handlers/http.ts'),
      handler: 'main',
      ...lambdaDefaults(),
      logGroup: new logs.LogGroup(this, 'HttpLogs', { retention: logs.RetentionDays.TWO_WEEKS, removalPolicy: RemovalPolicy.DESTROY }),
      timeout: Duration.seconds(29),
      environment: apiEnv,
    });
    Object.entries(apiEnv).forEach(([k, v]) => wsFn.addEnvironment(k, v));

    for (const fn of [httpFn, wsFn]) {
      table.grantReadWriteData(fn);
      authSecret.grantRead(fn);
      cfKeySecret.grantRead(fn);
      wsStage.grantManagementApiAccess(fn);
      fn.addToRolePolicy(new iam.PolicyStatement({ actions: ['bedrock:ApplyGuardrail'], resources: [guardrail.attrGuardrailArn] }));
    }
    media.grantReadWrite(httpFn);
    media.grantRead(wsFn);
    httpFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock-agentcore:InvokeAgentRuntime'],
        resources: [runtime.attrAgentRuntimeArn, `${runtime.attrAgentRuntimeArn}/*`],
      }),
    );

    const httpApi = new apigw.HttpApi(this, 'Api', {
      description: 'Storyloom API',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigw.CorsHttpMethod.GET, apigw.CorsHttpMethod.POST, apigw.CorsHttpMethod.PUT, apigw.CorsHttpMethod.DELETE],
        allowHeaders: ['authorization', 'content-type'],
        maxAge: Duration.hours(1),
      },
    });
    const defaultStage = httpApi.defaultStage?.node.defaultChild as apigw.CfnStage;
    defaultStage.defaultRouteSettings = { throttlingRateLimit: 50, throttlingBurstLimit: 100 };
    const httpIntegration = new integrations.HttpLambdaIntegration('Http', httpFn);
    const routes: [apigw.HttpMethod, string][] = [
      [apigw.HttpMethod.POST, '/households'],
      [apigw.HttpMethod.GET, '/household'],
      [apigw.HttpMethod.PUT, '/household/settings'],
      [apigw.HttpMethod.DELETE, '/household'],
      [apigw.HttpMethod.POST, '/rooms'],
      [apigw.HttpMethod.POST, '/rooms/{id}/join'],
      [apigw.HttpMethod.POST, '/rooms/{id}/drawings'],
      [apigw.HttpMethod.POST, '/rooms/{id}/hero'],
      [apigw.HttpMethod.POST, '/rooms/{id}/weave'],
      [apigw.HttpMethod.POST, '/rooms/{id}/close'],
      [apigw.HttpMethod.GET, '/stories'],
      [apigw.HttpMethod.GET, '/stories/{id}'],
      [apigw.HttpMethod.DELETE, '/stories/{id}'],
      [apigw.HttpMethod.GET, '/health'],
    ];
    for (const [method, p] of routes) httpApi.addRoutes({ path: p, methods: [method], integration: httpIntegration });

    // ---------------------------------------------------- Companion website
    new deploy.BucketDeployment(this, 'CompanionSite', {
      destinationBucket: site,
      sources: [
        deploy.Source.asset(path.join(root, 'apps/companion/dist')),
        deploy.Source.jsonData('config.json', { apiBaseUrl: httpApi.apiEndpoint }),
      ],
      distribution: cdn,
      distributionPaths: ['/index.html', '/config.json'],
      memoryLimit: 512,
    });

    // ------------------------------------------------- Observability + cost
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', { dashboardName: `${this.stackName}-health` });
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({ title: 'API requests & errors', left: [httpFn.metricInvocations(), httpFn.metricErrors()], width: 12 }),
      new cloudwatch.GraphWidget({ title: 'API latency (p90)', left: [httpFn.metricDuration({ statistic: 'p90' })], width: 12 }),
      new cloudwatch.GraphWidget({ title: 'Realtime messages & errors', left: [wsFn.metricInvocations(), wsFn.metricErrors()], width: 12 }),
    );
    new cloudwatch.Alarm(this, 'ApiErrors', {
      metric: httpFn.metricErrors({ period: Duration.minutes(5) }),
      threshold: 5,
      evaluationPeriods: 1,
      alarmDescription: 'Storyloom API is throwing errors',
    });

    if (props.alertEmail) {
      new budgets.CfnBudget(this, 'Budget', {
        budget: {
          budgetName: `${this.stackName}-monthly`,
          budgetType: 'COST',
          timeUnit: 'MONTHLY',
          budgetLimit: { amount: props.monthlyBudgetUsd ?? 60, unit: 'USD' },
          costTypes: { includeCredit: false, includeRefund: false },
        },
        notificationsWithSubscribers: [50, 80, 100].map((threshold) => ({
          notification: { comparisonOperator: 'GREATER_THAN', notificationType: 'ACTUAL', threshold, thresholdType: 'PERCENTAGE' },
          subscribers: [{ subscriptionType: 'EMAIL', address: props.alertEmail! }],
        })),
      });
    }

    new CfnOutput(this, 'ApiUrl', { value: httpApi.apiEndpoint });
    new CfnOutput(this, 'RealtimeUrl', { value: wsStage.url });
    new CfnOutput(this, 'CompanionUrl', { value: companionUrl });
    new CfnOutput(this, 'AgentRuntimeArn', { value: runtime.attrAgentRuntimeArn });
    new CfnOutput(this, 'DashboardName', { value: dashboard.dashboardName });
  }
}

function lambdaDefaults(): Partial<nodejs.NodejsFunctionProps> {
  return {
    runtime: lambda.Runtime.NODEJS_22_X,
    architecture: lambda.Architecture.ARM_64,
    memorySize: 1024,
    tracing: lambda.Tracing.ACTIVE,
    depsLockFilePath: path.join(root, 'services/api/package-lock.json'),
    projectRoot: root,
    bundling: {
      minify: true,
      sourceMap: true,
      target: 'node22',
      format: nodejs.OutputFormat.ESM,
      mainFields: ['module', 'main'],
      tsconfig: path.join(root, 'services/api/tsconfig.json'),
      banner: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      externalModules: [],
    },
    environment: {},
  };
}

function bedrockModelsPolicy(stack: Stack) {
  // Amazon Nova for words and vision; Stability AI (via cross-region profiles) for pictures.
  return new iam.PolicyStatement({
    actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
    resources: [
      'arn:aws:bedrock:*::foundation-model/amazon.nova-*',
      'arn:aws:bedrock:*::foundation-model/stability.*',
      `arn:aws:bedrock:*:${stack.account}:inference-profile/*amazon.nova-*`,
      `arn:aws:bedrock:*:${stack.account}:inference-profile/*stability.*`,
    ],
  });
}

function marketplaceEntitlementPolicy() {
  // Third-party Bedrock models are entitled through AWS Marketplace.
  return new iam.PolicyStatement({
    actions: ['aws-marketplace:ViewSubscriptions', 'aws-marketplace:Subscribe'],
    resources: ['*'],
  });
}
