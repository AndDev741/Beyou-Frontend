FROM node:20-alpine AS base
WORKDIR /app
# Copy root workspace manifests + web workspace manifest so npm ci resolves the full workspace graph
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM base AS dev
COPY . .
EXPOSE 3000
CMD ["npm", "--workspace", "@beyou/web", "run", "dev"]

FROM base AS build
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS nginx
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
