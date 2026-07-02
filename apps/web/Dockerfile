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
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_APP_URL=${VITE_APP_URL}
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS nginx
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
