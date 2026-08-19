FROM node:20-alpine

# Cria diretório de trabalho e define permissões
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --omit=dev && \
    mkdir -p data/transcripts && \
    chown -R node:node /usr/src/app

COPY --chown=node:node . .

USER node

EXPOSE 3000

CMD ["node", "src/index.js"]
