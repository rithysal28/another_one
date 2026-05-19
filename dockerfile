FROM node:22-alpine

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all application source files
COPY . .

# Expose the application port
EXPOSE 8092

# Start the application
CMD ["npm", "start"]