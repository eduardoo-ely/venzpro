# ── Estágio 1: build ────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Copia package.json e instala dependências
COPY package*.json ./
RUN npm install

# Copia o código e faz o build
COPY . .

# Define a URL da API para apontar para o backend
ARG VITE_API_URL=http://localhost:8080/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Estágio 2: servidor nginx ─────────────────────────────────────────────────
FROM nginx:alpine

# Copia o build gerado
COPY --from=build /app/dist /usr/share/nginx/html

# Configuração do nginx para SPA (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]