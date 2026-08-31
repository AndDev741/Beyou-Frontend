FROM node:20-alpine AS base
WORKDIR /app
# Copy the root lockfile + EVERY workspace manifest so `npm ci` can resolve and
# link the full monorepo graph (npm workspaces needs each workspace's package.json
# present, or the @beyou/* symlinks + shared-package deps won't be installed).
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages/types/package.json packages/types/
COPY packages/i18n/package.json packages/i18n/
COPY packages/theme/package.json packages/theme/
COPY packages/state/package.json packages/state/
COPY packages/api/package.json packages/api/
COPY packages/contracts/package.json packages/contracts/
RUN npm ci

FROM base AS dev
COPY . .
EXPOSE 3000
CMD ["npm", "--workspace", "@beyou/web", "run", "dev"]

FROM base AS build
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_APP_URL
# Error-collector DSN. A DSN is a public ingest identifier, not a secret, so a
# build ARG is fine. Leave it unset to build with telemetry off.
#
# Source-map UPLOAD is deliberately NOT wired here: it needs SENTRY_AUTH_TOKEN,
# a real secret, and build ARGs are readable in `docker history`. Uploading from
# a CI step that builds outside this image (or via BuildKit `--secret`) keeps the
# token out of the layers. Without an upload the maps stay hidden and undeleted
# in the image — which is why nginx.conf refuses `.map` requests.
ARG VITE_SENTRY_DSN
# PostHog project key — same reasoning as the DSN above: a public ingest
# identifier (it ships in the JS bundle regardless), so a build ARG is fine.
# Leave unset to build with product analytics off. Host only needs setting for
# an EU-cloud project; unset falls back to the US ingest in lib/analytics.ts.
ARG VITE_POSTHOG_KEY
ARG VITE_POSTHOG_HOST
# Federated sign-in. Both are needed before OidcButtons renders anything;
# unset ships the buttons permanently absent, which is the intended off state.
ARG VITE_OIDC_ISSUER
ARG VITE_OIDC_CLIENT_ID
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_APP_URL=${VITE_APP_URL}
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
ENV VITE_POSTHOG_KEY=${VITE_POSTHOG_KEY}
ENV VITE_POSTHOG_HOST=${VITE_POSTHOG_HOST}
ENV VITE_OIDC_ISSUER=${VITE_OIDC_ISSUER}
ENV VITE_OIDC_CLIENT_ID=${VITE_OIDC_CLIENT_ID}
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS nginx
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
