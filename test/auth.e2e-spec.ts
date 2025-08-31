// Set up environment variables for testing BEFORE any imports
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '24h';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account } from '../src/accounts/accounts.model';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let accountModel: Model<Account>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    accountModel = moduleFixture.get<Model<Account>>(getModelToken('Account'));
    
    await app.init();
  });

  afterEach(async () => {
    // Clean up test data
    await accountModel.deleteMany({});
    await app.close();
  });

  describe('/auth/signup (POST)', () => {
    const validSignupData = {
      userName: 'test@example.com',
      password: 'password123',
      userId: 'user123',
    };

    it('should successfully register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(validSignupData)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual({
        id: expect.any(String),
        userName: validSignupData.userName,
        userId: validSignupData.userId,
      });

      // Verify user was created in database
      const createdUser = await accountModel.findOne({ userName: validSignupData.userName });
      expect(createdUser).toBeTruthy();
      expect(createdUser.userName).toBe(validSignupData.userName);
      expect(createdUser.userId).toBe(validSignupData.userId);
      // Password should be hashed
      expect(createdUser.password).not.toBe(validSignupData.password);
    });

    it('should return conflict error for duplicate email', async () => {
      // Create initial user
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(validSignupData)
        .expect(201);

      // Try to create user with same email
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          ...validSignupData,
          userId: 'differentUserId',
        })
        .expect(409);

      expect(response.body.message).toBe('User with this email already exists');
    });

    it('should return conflict error for duplicate userId', async () => {
      // Create initial user
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(validSignupData)
        .expect(201);

      // Try to create user with same userId
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          ...validSignupData,
          userName: 'different@example.com',
        })
        .expect(409);

      expect(response.body.message).toBe('User with this userId already exists');
    });

    it('should return validation error for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          ...validSignupData,
          userName: 'invalid-email',
        })
        .expect(400);

      expect(response.body.message).toContain('Please provide a valid email address');
    });

    it('should return validation error for short password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          ...validSignupData,
          password: '1234567', // 7 characters
        })
        .expect(400);

      expect(response.body.message).toContain('Password must be at least 8 characters long');
    });

    it('should return validation error for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          userName: 'test@example.com',
          // missing password and userId
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'Password is required',
          'User ID is required',
        ])
      );
    });

    it('should return validation error for empty fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          userName: '',
          password: '',
          userId: '',
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'Email is required',
          'Password is required',
          'User ID is required',
        ])
      );
    });
  });

  describe('/auth/login (POST)', () => {
    const testUser = {
      userName: 'test@example.com',
      password: 'password123',
      userId: 'user123',
    };

    beforeEach(async () => {
      // Create a test user for login tests
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(201);
    });

    it('should successfully login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          userName: testUser.userName,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual({
        id: expect.any(String),
        userName: testUser.userName,
        userId: testUser.userId,
      });
      expect(typeof response.body.access_token).toBe('string');
      expect(response.body.access_token.length).toBeGreaterThan(0);
    });

    it('should return unauthorized error for invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          userName: testUser.userName,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return unauthorized error for non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          userName: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return validation error for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          userName: 'invalid-email',
          password: testUser.password,
        })
        .expect(400);

      expect(response.body.message).toContain('Please provide a valid email address');
    });

    it('should return validation error for missing credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'Email is required',
          'Password is required',
        ])
      );
    });

    it('should return validation error for empty credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          userName: '',
          password: '',
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'Email is required',
          'Password is required',
        ])
      );
    });
  });

  describe('/auth/profile (GET) - Protected Route', () => {
    const testUser = {
      userName: 'test@example.com',
      password: 'password123',
      userId: 'user123',
    };
    let validToken: string;

    beforeEach(async () => {
      // Create a test user and get valid token
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(201);
      
      validToken = signupResponse.body.access_token;
    });

    it('should return user profile with valid JWT token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        id: expect.any(String),
        userName: testUser.userName,
        userId: testUser.userId,
      });
    });

    it('should return unauthorized error without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);

      expect(response.body.message).toBe('No token provided');
    });

    it('should return unauthorized error with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toBe('Invalid token');
    });

    it('should return unauthorized error with malformed authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.message).toBe('No token provided');
    });

    it('should return unauthorized error with expired token', async () => {
      // Create a token that's already expired (this is a mock scenario)
      // In a real scenario, you'd need to create a token with past expiration
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.message).toBe('Invalid token');
    });
  });

  describe('Complete Authentication Flow', () => {
    const testUser = {
      userName: 'flow@example.com',
      password: 'password123',
      userId: 'flowuser123',
    };

    it('should complete full signup -> login -> protected route flow', async () => {
      // Step 1: Signup
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(201);

      expect(signupResponse.body).toHaveProperty('access_token');
      const signupToken = signupResponse.body.access_token;

      // Step 2: Use signup token to access protected route
      const profileResponse1 = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${signupToken}`)
        .expect(200);

      expect(profileResponse1.body.userName).toBe(testUser.userName);

      // Step 3: Login with same credentials
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          userName: testUser.userName,
          password: testUser.password,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('access_token');
      const loginToken = loginResponse.body.access_token;

      // Step 4: Use login token to access protected route
      const profileResponse2 = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(profileResponse2.body.userName).toBe(testUser.userName);
      expect(profileResponse2.body.userId).toBe(testUser.userId);
    });

    it('should handle multiple users independently', async () => {
      const user1 = { userName: 'user1@example.com', password: 'password123', userId: 'user1' };
      const user2 = { userName: 'user2@example.com', password: 'password456', userId: 'user2' };

      // Create two users
      const signup1 = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(user1)
        .expect(201);

      const signup2 = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(user2)
        .expect(201);

      // Each should have different tokens
      expect(signup1.body.access_token).not.toBe(signup2.body.access_token);

      // Each token should return correct user data
      const profile1 = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${signup1.body.access_token}`)
        .expect(200);

      const profile2 = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${signup2.body.access_token}`)
        .expect(200);

      expect(profile1.body.userName).toBe(user1.userName);
      expect(profile2.body.userName).toBe(user2.userName);
      expect(profile1.body.userId).toBe(user1.userId);
      expect(profile2.body.userId).toBe(user2.userId);
    });
  });
});