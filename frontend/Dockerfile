FROM node:18.14.2 as base

ARG NITRO_PORT

WORKDIR /src

# Build
FROM base as build

COPY . .
RUN npm install

RUN npm run build
RUN npm prune

# Run
FROM base

ENV NITRO_PORT=$NITRO_PORT

COPY --from=build /src/.output /src/.output
COPY --from=build /src/.nuxt /src/.nuxt
COPY --from=build /src/package.json /src/package.json

EXPOSE $NITRO_PORT

CMD [ "npm", "run", "start" ]