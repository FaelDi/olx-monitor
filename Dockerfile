

# Etapa de build
FROM node:20 AS builder

WORKDIR /usr/app

# Copia os arquivos do projeto
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Etapa final
FROM node:20  
# <- Evita -alpine para manter suporte nativo a fetch e WebSocket

WORKDIR /usr/app

# Copia os arquivos da etapa de build
COPY --from=builder /usr/app .

# Define variável de ambiente de produção (opcional)
ENV NODE_ENV=production

# Exponha a porta (se usar express)
EXPOSE 8080

# Comando padrão
CMD ["npm", "start"]