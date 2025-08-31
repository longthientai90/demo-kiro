import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { Account } from '../accounts/accounts.model';
import { SignupDto, LoginDto } from './dto';
import { AuthResponse, JwtPayload } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('Account') private readonly accountModel: Model<Account>,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto): Promise<AuthResponse> {
    const { userName, password, userId } = signupDto;

    // Check if user already exists by email (userName) or userId
    const existingUserByEmail = await this.accountModel.findOne({ userName });
    if (existingUserByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    const existingUserById = await this.accountModel.findOne({ userId });
    if (existingUserById) {
      throw new ConflictException('User with this userId already exists');
    }

    // Create new user (password will be hashed by pre-save middleware)
    const newUser = new this.accountModel({
      userName,
      password,
      userId,
    });

    const savedUser = await newUser.save();

    // Generate JWT token
    const token = this.generateJwtToken(savedUser);

    return {
      access_token: token,
      user: {
        id: savedUser.id,
        userName: savedUser.userName,
        userId: savedUser.userId,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { userName, password } = loginDto;

    // Find user by userName (email)
    const user = await this.accountModel.findOne({ userName });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password using the comparePassword method from the Account model
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateJwtToken(user);

    return {
      access_token: token,
      user: {
        id: user.id,
        userName: user.userName,
        userId: user.userId,
      },
    };
  }

  private generateJwtToken(user: Account): string {
    const payload = {
      sub: user.id,
      userName: user.userName,
      userId: user.userId,
    };

    try {
      return this.jwtService.sign(payload);
    } catch (error) {
      console.error('JWT generation error:', error);
      throw new Error(`Failed to generate JWT token: ${error.message}`);
    }
  }
}