import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = args => JSON.parse(execFileSync("aws", [...args, "--output", "json"], {
  encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 60000,
}) || "{}");
const identity = run(["sts", "get-caller-identity"]);
const account = identity.Account;
const region = "eu-north-1";
const bucket = `socialcasinoindex-monitor-${account}`;
const role = "socialcasinoindex-monitor-github";
const repository = "gqerpjoi23r/social-casino-index";
const parameter = "/socialcasinoindex/monitor/model-key";
const trust = {
  Version: "2012-10-17",
  Statement: [{ Effect: "Allow", Principal: { Federated: `arn:aws:iam::${account}:oidc-provider/token.actions.githubusercontent.com` },
    Action: "sts:AssumeRoleWithWebIdentity",
    Condition: { StringEquals: { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      StringLike: { "token.actions.githubusercontent.com:sub": [
        `repo:${repository}:ref:refs/heads/main`, `repo:${repository}:ref:refs/heads/codex/s3-numeric-monitor`,
      ] } } }],
};
const policy = {
  Version: "2012-10-17",
  Statement: [
    { Effect: "Allow", Action: ["s3:ListBucket"], Resource: `arn:aws:s3:::${bucket}`, Condition: { StringLike: { "s3:prefix": ["runs/*"] } } },
    { Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject"], Resource: `arn:aws:s3:::${bucket}/runs/*` },
    { Effect: "Allow", Action: ["ssm:GetParameter"], Resource: `arn:aws:ssm:${region}:${account}:parameter${parameter}` },
  ],
};
const buckets = run(["s3api", "list-buckets"]).Buckets;
if (!buckets.some(item => item.Name === bucket)) run(["s3api", "create-bucket", "--bucket", bucket,
  "--region", region, "--create-bucket-configuration", JSON.stringify({ LocationConstraint: region })]);
run(["s3api", "put-public-access-block", "--bucket", bucket, "--public-access-block-configuration",
  JSON.stringify({ BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true })]);
run(["s3api", "put-bucket-encryption", "--bucket", bucket, "--server-side-encryption-configuration",
  JSON.stringify({ Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" } }] })]);
run(["s3api", "put-bucket-versioning", "--bucket", bucket, "--versioning-configuration", JSON.stringify({ Status: "Enabled" })]);
run(["s3api", "put-bucket-policy", "--bucket", bucket, "--policy", JSON.stringify({
  Version: "2012-10-17", Statement: [{ Sid: "RequireTLS", Effect: "Deny", Principal: "*", Action: "s3:*",
    Resource: [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`],
    Condition: { Bool: { "aws:SecureTransport": "false" } } }],
})]);
const roles = run(["iam", "list-roles"]).Roles;
if (!roles.some(item => item.RoleName === role)) run(["iam", "create-role", "--role-name", role, "--assume-role-policy-document", JSON.stringify(trust)]);
else run(["iam", "update-assume-role-policy", "--role-name", role, "--policy-document", JSON.stringify(trust)]);
run(["iam", "put-role-policy", "--role-name", role, "--policy-name", "MonitorArchive", "--policy-document", JSON.stringify(policy)]);
// AWS CLI cannot read /dev/stdin reliably on macOS. Use a private, short-lived file.
if (process.env.AUTORANK_AZURE_OPENAI_API_KEY) {
  const request = JSON.stringify({ Name: parameter, Type: "SecureString", Value: process.env.AUTORANK_AZURE_OPENAI_API_KEY, Overwrite: true });
  const directory = mkdtempSync(join(tmpdir(), "sci-ssm-"));
  try {
    const path = join(directory, "request.json");
    writeFileSync(path, request, { mode: 0o600 });
    execFileSync("aws", ["ssm", "put-parameter", "--region", region, "--cli-input-json", `file://${path}`],
      { stdio: ["ignore", "pipe", "pipe"], timeout: 60000 });
  } catch {
    throw new Error("model_key_storage_failed");
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
console.log(JSON.stringify({ account, region, bucket, roleArn: `arn:aws:iam::${account}:role/${role}`, modelKeyParameter: parameter }, null, 2));
