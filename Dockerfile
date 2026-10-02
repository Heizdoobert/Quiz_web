FROM node:22-alpine AS base

# 1. Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# 2. Builder
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV BUILDING=true
ENV NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=placeholder_project_id
ENV NEXT_PUBLIC_CHAIN_ID=84532
ENV NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS=0x1111111111111111111111111111111111111111
ENV NEXT_PUBLIC_QUIZ_BADGE_ADDRESS=0x2222222222222222222222222222222222222222
ENV NEXT_PUBLIC_CONTEST_ESCROW_ADDRESS=0x3333333333333333333333333333333333333333
ENV NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key
ENV SUPABASE_URL=https://placeholder.supabase.co
ENV SUPABASE_PUBLISHABLE_KEY=placeholder-key
ENV SUPABASE_SECRET_KEY=placeholder-key
ENV REWARD_SIGNER_PRIVATE_KEY=0x9999999999999999999999999999999999999999999999999999999999999999

RUN npm run build

# 3. Production Runner
FROM base AS runner
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

# robots.txt is static and touches no database, so it checks the server, not Supabase.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/robots.txt > /dev/null || exit 1

CMD ["npm", "start"]
