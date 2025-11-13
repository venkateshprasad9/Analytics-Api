# --- Stage 1: Base Image ---
# Use an official Node.js 18 "slim" image.
FROM node:18-slim

# --- Set Working Directory ---
# Create and set the working directory inside the container
WORKDIR /app

# --- Copy Dependencies ---
# Copy package.json and package-lock.json first.
COPY package*.json ./

# --- Install Dependencies ---
# Install production dependencies only
RUN npm install --only=production

# --- Copy App Code ---
# Copy the rest of your application code
COPY . .

# --- Expose Port ---
# Tell Docker the container will listen on port 3000
EXPOSE 3000

# --- Start Command ---
# The command to run when the container starts
CMD [ "node", "server.js" ]