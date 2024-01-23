# Build dependencies
FROM node:18 as builder
FROM mcr.microsoft.com/playwright:focal
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
RUN apt-get update && apt-get -y install libnss3 libatk-bridge2.0-0 libdrm-dev libxkbcommon-dev libgbm-dev libasound-dev libatspi2.0-0 libxshmfence-dev

COPY package.json ./
RUN npm i

COPY . .
RUN npm run build

# Production image
# FROM node:18-alpine
# WORKDIR /app
# COPY . .
# RUN npm i --only=production
# COPY --from=builder /app/dist ./dist

CMD ["npm", "run", "start"]

# Build dependencies with specific Node.js version
# FROM node:18 as builder
# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN npm run build

# # Production image with Playwright
# FROM mcr.microsoft.com/playwright:focal
# WORKDIR /app

# # Copy built application from the builder stage
# COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/node_modules ./node_modules

# # Install only production dependencies (Playwright should be included if it's a production dependency)
# RUN npm install

# CMD ["npm", "run", "start"]
