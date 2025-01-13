
# HirewayManager

A web application built with Express.js, React, and PostgreSQL for managing job classifications and trial structures.

## Prerequisites

- Node.js v20 or higher
- PostgreSQL database
- Poetry (for Python scripts)

## Setup

1. Install dependencies:
```bash
npm install
poetry install
```

2. Set up the database:
```bash
npm run db:reset   # Reset database tables
npm run db:seed    # Seed initial data
npm run import:sector  # Import sector distribution data
```

## Running the Application

The application consists of both a client and server component, but they can be started with a single command:

```bash
npm run dev
```

This will:
- Start the Express server on port 3000
- Start the Vite development server
- Enable hot module replacement for development

The application will be available at:
- Web UI: http://0.0.0.0:3000
- API Endpoints: http://0.0.0.0:3000/api/*

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run check` - Type check TypeScript files
- `npm run db:push` - Push database changes
- `npm run db:reset` - Reset database
- `npm run db:seed` - Seed database with initial data
- `npm run import:sector` - Import sector distribution data

## API Endpoints

- `/api/soc/search` - Search SOC classifications
- `/api/soc/top` - Get top SOC classifications

## Project Structure

- `/client` - React frontend code
- `/server` - Express backend code 
- `/db` - Database schema and migrations
- `/scripts` - Data import and seeding scripts
