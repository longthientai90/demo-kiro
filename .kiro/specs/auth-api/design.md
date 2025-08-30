# Design Document

## Overview

This design implements a JWT-based authentication system for the existing NestJS application. The solution will extend the current accounts module to provide secure signup and login endpoints, leveraging NestJS guards for route protection and bcrypt for password hashing.

## Architecture

The authentication system follows NestJS modular architecture with the following components:

- **Auth Module**: Main authentication module containing controllers, services, and guards
- **Auth Service**: Business logic for signup, login, and token validation
- **Auth Controller**: REST endpoints for authentication operations
- **JWT Strategy**: Passport strategy for JWT token validation
- **Auth Guard**: Route protection mechanism
- **Account Model**: Extended existing model for authentication needs

## Components and Interfaces

### Auth Module Structure
```
src/auth/
├── auth.module.ts          # Module configuration
├── auth.controller.ts      # REST endpoints
├── auth.service.ts         # Business logic
├── auth.guard.ts          # Route protection
├── jwt.strategy.ts        # JWT validation strategy
├── dto/
│   ├── signup.dto.ts      # Signup request validation
│   └── login.dto.ts       # Login request validation
└── interfaces/
    └── auth-response.interface.ts  # Response types
```

### Key Interfaces

#### AuthResponse Interface
```typescript
interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    userName: string;
    userId: string;
  };
}
```

#### JWT Payload Interface
```typescript
interface JwtPayload {
  sub: string;  // user id
  userName: string;
  userId: string;
  iat: number;
  exp: number;
}
```

### REST API Endpoints

#### POST /auth/signup
- **Purpose**: Register new user account
- **Request Body**: `{ userName: string, password: string, userId: string }`
- **Response**: `AuthResponse` with JWT token
- **Status Codes**: 201 (Created), 400 (Bad Request), 409 (Conflict)

#### POST /auth/login
- **Request Body**: `{ userName: string, password: string }`
- **Response**: `AuthResponse` with JWT token
- **Status Codes**: 200 (OK), 401 (Unauthorized), 400 (Bad Request)

#### GET /auth/profile (Protected)
- **Purpose**: Get current user profile
- **Headers**: `Authorization: Bearer <token>`
- **Response**: User profile data
- **Status Codes**: 200 (OK), 401 (Unauthorized)

## Data Models

### Extended Account Schema
The existing Account schema will be enhanced with:
- Password hashing before save
- Email validation (using userName field as email)
- Timestamps for created/updated dates

```typescript
export const AccountSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  userName: { type: String, required: true, unique: true }, // Used as email
  password: { type: String, required: true, minlength: 8 },
}, {
  timestamps: true
});

// Pre-save middleware for password hashing
AccountSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
```

## Security Implementation

### Password Security
- **Hashing**: bcrypt with salt rounds of 12
- **Validation**: Minimum 8 characters, complexity requirements
- **Storage**: Never store plain text passwords

### JWT Configuration
- **Secret**: Environment variable `JWT_SECRET`
- **Expiration**: 24 hours for access tokens
- **Algorithm**: HS256
- **Payload**: User ID, username, and standard claims

### Input Validation
- **DTOs**: Class-validator decorators for request validation
- **Sanitization**: Trim whitespace, normalize email format
- **Rate Limiting**: Consider implementing for production

## Error Handling

### Authentication Errors
- **Invalid Credentials**: Generic "Invalid credentials" message
- **User Not Found**: Same generic message to prevent enumeration
- **Token Expired**: Clear error message with 401 status
- **Invalid Token**: 401 status with generic message

### Validation Errors
- **Missing Fields**: Detailed field-specific error messages
- **Format Errors**: Clear validation error descriptions
- **Duplicate User**: 409 status with appropriate message

### Server Errors
- **Database Errors**: Log detailed error, return generic 500 response
- **JWT Errors**: Log and return 401 with generic message
- **Unexpected Errors**: Global exception filter handling

## Testing Strategy

### Unit Tests
- **Auth Service**: Test all business logic methods
- **Auth Controller**: Test endpoint responses and error handling
- **JWT Strategy**: Test token validation logic
- **DTOs**: Test validation rules

### Integration Tests
- **Signup Flow**: End-to-end user registration
- **Login Flow**: Complete authentication process
- **Protected Routes**: Guard functionality testing
- **Error Scenarios**: Invalid inputs and edge cases

### Test Data
- **Mock Users**: Predefined test accounts
- **Invalid Tokens**: Expired and malformed JWT tokens
- **Edge Cases**: Empty requests, SQL injection attempts

## Dependencies

### Required Packages
```json
{
  "@nestjs/jwt": "^10.2.0",
  "@nestjs/passport": "^10.0.3",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "bcrypt": "^5.1.1",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.1"
}
```

### Dev Dependencies
```json
{
  "@types/bcrypt": "^5.0.2",
  "@types/passport-jwt": "^3.0.13"
}
```

## Configuration

### Environment Variables
- `JWT_SECRET`: Secret key for JWT signing
- `JWT_EXPIRES_IN`: Token expiration time (default: 24h)
- `BCRYPT_ROUNDS`: Salt rounds for password hashing (default: 12)

### Module Integration
The Auth module will be imported into the main AppModule and configured with:
- JWT module configuration
- Passport module setup
- Global guard registration (optional)