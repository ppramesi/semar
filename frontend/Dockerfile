FROM node:18.14.2

ARG NITRO_PORT

ENV NODE_ENV=production

WORKDIR /src

# Build
FROM base as build

COPY --link package.json package-lock.json ./
RUN npm install --production=false

COPY --link . .

RUN npm run build
RUN npm prune

# Run
FROM base

ENV NITRO_PORT=$NITRO_PORT

COPY --from=build /src/.output /src/.output

EXPOSE $NITRO_PORT

CMD [ "npm", "run", "start" ]