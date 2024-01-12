# Build dependencies
FROM node:18 as builder
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY . .

# Install all dependencies
RUN npm install

# Download the model
RUN node -e "import('@xenova/transformers').then(t => t.pipeline('image-to-text', 'Xenova/vit-gpt2-image-captioning')).then(() => process.exit(0))"

# Copy the model to a specific directory
RUN cp -r node_modules/@xenova/transformers/.cache/Xenova/vit-gpt2-image-captioning /model-cache

# Build your application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Production image
FROM node:18-alpine
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built application from builder stage
COPY --from=builder /app ./

# Copy the downloaded model from the builder stage
COPY --from=builder /model-cache /node_modules/@xenova/transformers/.cache/Xenova/vit-gpt2-image-captioning

# Start your application
CMD ["npm", "run", "start"]

# # Build dependencies
# FROM node:18 as builder
# WORKDIR /app
# COPY . .
# RUN npm i
# RUN node -e "import('@xenova/transformers').then(t => t.pipeline('image-to-text', 'Xenova/vit-gpt2-image-captioning')).then(() => process.exit(0))"
# RUN cp -r node_modules/@xenova/transformers/.cache/Xenova/model-name /node_modules/@xenova/transformers/.cache/Xenova/
# RUN npm run build

# # Production image
# # FROM node:18-alpine
# # WORKDIR /app
# # COPY . .
# # RUN npm i --only=production
# # COPY --from=builder /app/dist ./dist

# CMD ["npm", "run", "start"]