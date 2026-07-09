# Deploying soar-crm.com

The site auto-deploys to GitHub Pages on every push to `main` (see `.github/workflows/deploy.yml`). `public/CNAME` keeps the custom domain attached across deploys.

## One-time GitHub setup

1. Create the repo `soar-website` on GitHub and push this project to `main`.
2. Repo **Settings → Pages** → under "Build and deployment", set **Source: GitHub Actions**.
3. After the first deploy finishes, still in **Settings → Pages**, enter `soar-crm.com` under **Custom domain** and save. Check **Enforce HTTPS** once the certificate is issued (can take a few minutes after DNS resolves).

## One-time GoDaddy DNS setup

In GoDaddy: **My Products → soar-crm.com → DNS → Manage DNS**, then:

1. **Delete** any existing `A` record for host `@` (GoDaddy adds a "Parked" one).
2. **Add four `A` records** — host `@`, TTL default, pointing at GitHub Pages:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
3. **Add a `CNAME` record** — host `www`, value `twoofspadess.github.io` (so www.soar-crm.com works too). If GoDaddy pre-created a `www` CNAME, edit it instead.

DNS propagation is usually minutes but can take up to an hour. Verify with:

```powershell
Resolve-DnsName soar-crm.com -Type A
```

All four GitHub IPs should come back. Then confirm https://soar-crm.com loads and enable **Enforce HTTPS**.
