# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript/Node.js backend API for a workspace reservation system using Express.js, PostgreSQL with Sequelize ORM, and AWS Cognito authentication. The system manages users, spaces, and reservations with conflict detection and business rules.

## Development Commands

### Core Development
```bash
npm run dev          # Start development server with nodemon
npm run build        # Compile TypeScript to dist/
npm start            # Run production server from dist/
```

### Testing
```bash
npm test                    # Run full Jest test suite
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report

# Run specific test types
npm test -- --testPathPattern=unit         # Unit tests only
npm test -- --testPathPattern=integration  # Integration tests only
npm test -- --testPathPattern=e2e          # E2E tests only
```

### Docker Development (Recommended)
```bash
# Start PostgreSQL + API server
docker-compose up --build -d

# View logs
docker-compose logs -f api
docker-compose logs -f db

# Stop services
docker-compose down

# Clean up volumes (removes database data)
docker-compose down -v
```

### Service URLs
- **Docker Setup**: API at `http://localhost:3001`, DB at `localhost:5434`
- **Local Setup**: API at `http://localhost:3000`, DB at `localhost:5432`
- **Health Check**: `/health` endpoint (no auth required)

## Architecture

### Layered Architecture
The codebase follows a clean architecture pattern:
- **Controllers** (`src/controllers/`) - HTTP request/response handling
- **Services** (`src/services/`) - Business logic and validation
- **Repositories** (`src/repositories/`) - Data access layer
- **Models** (`src/models/`) - Sequelize database models with relationships

### Database Models & Relationships
- **Person**: User management (admin/client roles)
- **Space**: Meeting rooms/work areas with capacity
- **Reservation**: Time-based bookings with conflict detection
- **Relationships**: Person → Many Reservations, Space → Many Reservations

### Authentication System
- **AWS Cognito JWT Authentication** via `src/middleware/auth.ts`
- JWT verification using JWKS endpoint and `jose` library
- Role-based authorization (admin/client permissions)
- All endpoints except `/health` require valid JWT token

### Business Rules Implementation
- **Conflict Detection**: Prevents overlapping space reservations
- **Weekly Limits**: Maximum 3 reservations per person per week (Monday-Sunday)
- **Validation**: Comprehensive input validation for dates, times, emails
- **Time Format**: HH:mm (24-hour), Date Format: YYYY-MM-DD (ISO)

## Key Configuration Files

### Environment Setup
- Copy `.env.example` to `.env` and configure:
  - `DB_PASSWORD`: PostgreSQL password (required)
  - `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID`, `COGNITO_REGION`: AWS Cognito config
- Docker automatically uses `.env` file via `env_file` directive

### Testing Configuration
- **Jest Config**: `jest.config.js` with ts-jest preset, coverage reporting
- **Test Structure**: Unit tests in `src/__tests__/unit/`, Integration in `integration/`, E2E in `e2e/`
- **Mocking**: Custom JOSE library mock at `src/__tests__/mocks/jose.js`

### Deployment Configuration
- **Multi-stage Dockerfile** with Node.js 22 Alpine, optimized for production
- **Docker Compose** with PostgreSQL 15, health checks, and network isolation
- **GitHub Actions** at `.github/workflows/deploy-backend.yml` for CI/CD to EC2
- **Database Init**: `init-db.sql` for PostgreSQL initialization

## Development Workflow

### Authentication Testing
Use AWS Cognito for JWT tokens. The system validates tokens against Cognito's JWKS endpoint. For testing, use the frontend application or implement Cognito authentication flow.

### Database Operations
- **Local**: Connect to PostgreSQL on `localhost:5432`
- **Docker**: PostgreSQL runs in container, accessible on `localhost:5434`
- **Models**: Use Sequelize ORM with full type safety via TypeScript

### Error Handling
Centralized error handling in `src/middleware/errorHandler.ts`:
- Validation errors return 400
- Authentication errors return 401/403
- Business rule violations return 409
- Consistent JSON error responses

### Testing Strategy
- **Unit Tests**: Business logic validation (ReservationService conflict detection)
- **Integration Tests**: API endpoints with Supertest
- **E2E Tests**: Complete user flows
- **95%+ Coverage**: Comprehensive test coverage requirement

## Important Implementation Details

### Time and Date Validation
- All date/time validation happens in service layer
- Week boundaries calculated Monday to Sunday for reservation limits
- Conflict detection compares exact date/time overlaps

### JWT Token Handling
- Middleware extracts JWT from Authorization Bearer header
- Uses `jose` library for verification against Cognito JWKS
- User information extracted from JWT payload for authorization

### Database Connection
- Connection pooling via Sequelize
- Health check in startup sequence (`testConnection()`)
- Auto-sync database models with `syncDatabase()`

### CORS Configuration
- Supports multiple origins including localhost ports and EC2 IPs
- Configurable via `FRONTEND_ORIGINS` environment variable
- Credentials enabled for authenticated requests