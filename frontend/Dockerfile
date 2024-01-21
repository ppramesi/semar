FROM node:18.14.2

WORKDIR /src

COPY package.json ./
RUN npm i

ARG NITRO_PORT
ENV NITRO_PORT=$NITRO_PORT

COPY . .
RUN npm run build

CMD [ "npm", "run", "start" ]