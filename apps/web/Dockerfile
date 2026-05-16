FROM node:20-alpine AS base
WORKDIR /app
COPY package.json turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/ai-engine/package.json ./packages/ai-engine/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/tsconfig/package.json ./packages/tsconfig/package.json
RUN npm install

FROM base AS dev
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--workspace=@blueprint/web"]
