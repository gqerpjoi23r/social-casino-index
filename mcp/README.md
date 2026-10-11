# Social Casino Index MCP server

Social Casino Index (https://socialcasinoindex.com/) is an independent US research site that ranks social and sweepstakes casinos. This MCP server lets AI assistants read its toplist directly.

- Endpoint (Streamable HTTP): `https://mcp.socialcasinoindex.com/mcp`
- Registry name: `com.socialcasinoindex/toplist`
- Data: `https://socialcasinoindex.com/api/toplist.json`, built from the same model as the homepage.

## Tools

- `get_top_social_casinos`: the toplist in homepage order, with bonuses, payout times, minimums and sources.
- `get_social_casino`: one casino by name or slug.
- `check_state_availability`: the site offer policy for a US state.

## Operations

- Test: `npm test` (needs a site build, so `docs/api/toplist.json` exists).
- Deploy: AWS Lambda `social-casino-index-mcp` in `us-east-1`, account `349131272959`, Node 22 arm64, handler `lambda.handler`. Zip `server.mjs`, `lambda.mjs` and production `node_modules`, then run `aws lambda update-function-code`.
- Domain: API Gateway HTTP API `bkngmagwj2` with custom domain `mcp.socialcasinoindex.com` (ACM certificate in us-east-1). NiceNIC DNS has a CNAME `mcp` to `d-xxya43a1w9.execute-api.us-east-1.amazonaws.com` and the ACM validation CNAME; keep both. The Lambda Function URL still works as a fallback.
- Publish: bump `version` in `server.json` and `server.mjs`, then run `mcp-publisher login http --domain socialcasinoindex.com --private-key <hex>` and `mcp-publisher publish`. The Ed25519 key is at `~/.config/socialcasinoindex/mcp-registry-key.pem` on Nima's machine; its public half is `/.well-known/mcp-registry-auth`. Never commit the private key.
