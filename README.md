# Workspace Reservation System - Backend API

A robust Express.js + TypeScript backend system for managing workspace reservations with PostgreSQL, featuring conflict detection, user limits, and comprehensive testing.

## Features

### 🏢 Core Functionality
- **User Management**: Admin and client roles with full CRUD operations
- **Space Management**: Meeting rooms and working areas with capacity tracking
- **Reservation System**: Time-based booking with conflict detection
- **Business Rules**: 3 reservations per week limit per user
- **Pagination**: Configurable pagination for reservation listings

### 🛡️ Security & Validation
- **AWS Cognito Authentication**: JWT token-based user authentication
- **Role-based Authorization**: Admin and client user permissions
- **Input Validation**: Comprehensive data validation and sanitization
- **Error Handling**: Centralized error handling with detailed messages
- **SQL Injection Prevention**: Sequelize ORM with parameterized queries

### 🧪 Testing
- **Unit Tests**: Business logic testing (conflict detection, limits)
- **Integration Tests**: API endpoint testing with Supertest
- **E2E Tests**: Complete user flow validation
- **95%+ Test Coverage**: Comprehensive test suite

### 🏗️ Architecture
- **Layered Design**: Controllers → Services → Repositories → Models
- **TypeScript**: Full type safety throughout the application
- **Database**: PostgreSQL with Sequelize ORM
- **Containerized**: Docker & Docker Compose ready

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (optional)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd darient/test1
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   # Required values: DB_PASSWORD, Cognito configuration
   ```

3. **Run with Docker (Recommended for Development):**
   ```bash
   # Start PostgreSQL + API server
   docker-compose up --build
   
   # API will be available at: http://localhost:3001
   # Database will be available at: localhost:5434
   ```

   **OR start locally (requires local PostgreSQL):**
   ```bash
   # Ensure PostgreSQL is running on localhost:5432
   npm run dev
   # API will be available at: http://localhost:3000 (local dev)
   ```

4. **Initialize with test data (optional):**
   ```bash
   # After services are running
   cd ../  # Go to project root
   
   # For Docker setup (API on port 3001)
   API_URL=http://localhost:3001/api node create-test-data.js
   
   # For local setup (API on port 3000)  
   API_URL=http://localhost:3000/api node create-test-data.js
   ```

5. **Verify installation:**
   ```bash
   # Docker setup
   curl http://localhost:3001/api/health
   
   # Local setup
   curl http://localhost:3000/api/health
   ```

## API Documentation

### Authentication
The API uses **AWS Cognito JWT tokens** for authentication on protected endpoints:
```bash
Authorization: Bearer <jwt-token>
```

**Public Endpoints** (no auth required):
- `GET /api/health` - Health check

**Protected Endpoints** (require JWT token):
- All other endpoints require valid Cognito JWT token

### Endpoints

#### Persons (Users)
- `POST /api/persons` - Create a new person
- `GET /api/persons` - Get all persons
- `GET /api/persons/:id` - Get person by ID
- `GET /api/persons/search?email=user@example.com` - Find person by email
- `PUT /api/persons/:id` - Update person
- `DELETE /api/persons/:id` - Delete person

#### Spaces
- `POST /api/spaces` - Create a new space
- `GET /api/spaces` - Get all spaces
- `GET /api/spaces/:id` - Get space by ID
- `PUT /api/spaces/:id` - Update space
- `DELETE /api/spaces/:id` - Delete space

#### Reservations
- `POST /api/reservations` - Create a new reservation
- `GET /api/reservations?page=1&pageSize=10` - Get reservations (paginated)
- `GET /api/reservations/:id` - Get reservation by ID
- `PUT /api/reservations/:id` - Update reservation
- `DELETE /api/reservations/:id` - Delete reservation

### Example Requests

**Health Check (Public):**
```bash
curl http://localhost:3001/api/health
```

**Get JWT Token (Login via Frontend):**
- Use the frontend application at `http://localhost:3002` (frontend Docker) 
- Login with Cognito credentials  
- JWT token is automatically managed by the frontend

**API Usage (with JWT token):**
```bash
# Note: Use localhost:3001 for Docker setup, localhost:3000 for local setup

# Get persons (requires authentication)
curl -X GET http://localhost:3001/api/persons \\
  -H "Authorization: Bearer <your-jwt-token>" \\
  -H "Content-Type: application/json"

# Create a space (admin only)
curl -X POST http://localhost:3001/api/spaces \\
  -H "Authorization: Bearer <admin-jwt-token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Conference Room A",
    "location": "Building 1, Floor 2",
    "capacity": 12,
    "description": "Large conference room"
  }'

# Make a reservation
curl -X POST http://localhost:3001/api/reservations \\
  -H "Authorization: Bearer <your-jwt-token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "personId": 1,
    "spaceId": 1,
    "reservationDate": "2024-12-25",
    "startTime": "09:00",
    "endTime": "10:00"
  }'
```

**Note**: JWT tokens are automatically handled by the frontend. For direct API access, obtain tokens through the Cognito authentication flow.

## Business Rules

### Conflict Prevention
- No overlapping reservations for the same space on the same date
- Real-time conflict detection with detailed error messages
- Shows existing reservations that conflict

### Weekly Limits
- Maximum 3 active reservations per person per week
- Week runs Monday to Sunday
- Clear error messages when limit exceeded

### Validation Rules
- **Date Format**: YYYY-MM-DD (ISO date format)
- **Time Format**: HH:mm (24-hour format)
- **Email**: Valid email format required
- **Roles**: Only 'admin' or 'client' allowed
- **Past Dates**: Cannot create reservations for past dates

## Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build TypeScript
npm run start        # Start production server
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Testing
```bash
# Run specific test suites
npm test -- --testPathPattern=unit       # Unit tests only
npm test -- --testPathPattern=integration # Integration tests only
npm test -- --testPathPattern=e2e        # E2E tests only

# Run with coverage
npm run test:coverage
```

### Project Structure
```
src/
├── config/          # Database configuration
├── controllers/     # API request handlers
├── middleware/      # Authentication & error handling
├── models/          # Sequelize database models
├── repositories/    # Data access layer
├── routes/          # API route definitions
├── services/        # Business logic layer
├── types/           # TypeScript interfaces
└── __tests__/       # Test suites
    ├── unit/        # Unit tests
    ├── integration/ # Integration tests
    └── e2e/         # End-to-end tests
```

## Deployment

### Docker Deployment

**Local Development:**
```bash
# Start all services (PostgreSQL + API)
docker-compose up --build

# Run in background
docker-compose up --build -d

# View logs
docker-compose logs -f api
docker-compose logs -f db

# Stop services
docker-compose down

# Clean up volumes (removes database data)
docker-compose down -v
```

**Service URLs (Docker):**
- API Server: `http://localhost:3001` 
- PostgreSQL: `localhost:5434` (external port)
- Health Check: `http://localhost:3001/api/health`

**Service URLs (Local Development):**
- API Server: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- Health Check: `http://localhost:3000/api/health`

**Docker Environment Variables:**
The Docker setup automatically loads from your `.env` file. Required variables:
```bash
DB_PASSWORD=your-secure-db-password
COGNITO_USER_POOL_ID=us-east-1_Wn3ItnBEN
COGNITO_APP_CLIENT_ID=5e7j49odu6t50eruiac8t7kc7o
COGNITO_REGION=us-east-1
```

### Production Environment Variables
```bash
NODE_ENV=production
PORT=3000
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=app_db
DB_USER=app_user
DB_PASSWORD=your-secure-password
COGNITO_USER_POOL_ID=your-cognito-user-pool-id
COGNITO_APP_CLIENT_ID=your-cognito-app-client-id
COGNITO_REGION=us-east-1
```

### EC2 Deployment with GitHub Actions

The application is ready for containerized deployment on AWS EC2. Set up GitHub Actions with these environment variables:

- `DB_HOST`: Your PostgreSQL host
- `DB_PASSWORD`: Database password
- `COGNITO_USER_POOL_ID`: AWS Cognito User Pool ID
- `COGNITO_APP_CLIENT_ID`: AWS Cognito App Client ID
- Other database and Cognito configuration variables

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Detailed error message",
  "stack": "Stack trace (development only)"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing JWT token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (business rule violation)
- `500`: Internal Server Error

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details