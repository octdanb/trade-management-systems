# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# dev: used by docker-compose for local development (source is volume-mounted)
# ---------------------------------------------------------------------------
FROM node:22-slim AS dev

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# ---------------------------------------------------------------------------
# prod: static build served by nginx, proxying API routes to the backend
# ---------------------------------------------------------------------------
FROM node:22-slim AS prod-builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS prod

COPY --from=prod-builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# The origin nginx proxies API traffic to; override at deploy time.
ENV BACKEND_ORIGIN=http://backend:8000

EXPOSE 80
