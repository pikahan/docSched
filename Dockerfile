FROM node:16-alpine as build-stage

RUN apk add --update --no-cache \
    make \
    g++ \
    jpeg-dev \
    cairo-dev \
    giflib-dev \
    pango-dev \
    libtool \
    autoconf \
    automake


WORKDIR /app

COPY package.json .

RUN npm config set registry https://registry.npmmirror.com/
RUN npm install

COPY . .

RUN npm run build

# production stage
FROM node:16-alpine as production-stage

RUN apk add --update --no-cache \
    make \
    g++ \
    jpeg-dev \
    cairo-dev \
    giflib-dev \
    pango-dev \
    libtool \
    autoconf \
    automake

COPY --from=build-stage /app/dist /app
COPY --from=build-stage /app/package.json /app/package.json
COPY --from=build-stage /app/chi_sim.traineddata /app/chi_sim.traineddata
COPY --from=build-stage /app/chi_sim.traineddata.gz /app/chi_sim.traineddata.gz
COPY --from=build-stage /app/ecosystem.config.js /app/ecosystem.config.js
COPY --from=build-stage /app/.env /app/.env


WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com/
RUN npm install --production
RUN npm install pm2 -g

EXPOSE 3002

CMD ["pm2-runtime", "start", "/app/ecosystem.config.js", "--env", "prod"]