FROM node:18.0-alpine3.14 as build-stage

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

# production stage
FROM node:18.0-alpine3.14 as production-stage

COPY --from=build-stage /app/dist /app
COPY --from=build-stage /app/package.json /app/package.json
COPY --from=build-stage /app/chi_sim.traineddata /app/chi_sim.traineddata
COPY --from=build-stage /app/chi_sim.traineddata.gz /app/chi_sim.traineddata.gz
COPY --from=build-stage /app/.env /app/.env


WORKDIR /app

RUN npm install --production

EXPOSE 3002

CMD ["node", "/app/main.js"]