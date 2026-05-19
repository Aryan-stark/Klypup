FROM node:20-alpine

WORKDIR /app

# Copy both package.json and package-lock.json for reproducible installs
COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
