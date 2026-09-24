import { App, Tags } from 'aws-cdk-lib';
import { StoryloomStack } from '../lib/storyloom-stack.js';

const app = new App();

const stack = new StoryloomStack(app, 'Storyloom', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1' },
  description: 'Storyloom: family AI storytelling for Fire TV',
  alertEmail: app.node.tryGetContext('alertEmail'),
  monthlyBudgetUsd: Number(app.node.tryGetContext('monthlyBudgetUsd') ?? 60),
});

Tags.of(stack).add('project', 'storyloom');
