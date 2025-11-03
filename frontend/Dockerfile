# Frontend - React + Vite
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# precisa permitir acesso externo ao Vite
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
