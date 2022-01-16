FROM alpine:latest

WORKDIR /md_updater

COPY . .

RUN apk add --update nodejs npm

RUN npm install

CMD ["node", "./index.js"]
