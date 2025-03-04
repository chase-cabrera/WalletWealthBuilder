import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async signup(signupDto: SignupDto): Promise<{ accessToken: string; user: any }> {
    const { username, email, password } = signupDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ 
      where: [{ username }, { email }] 
    });
    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
    });

    await this.userRepository.save(user);

    // Generate JWT token
    const payload = { username: user.username, sub: user.id };
    const accessToken = this.jwtService.sign(payload);

    // Return user without password
    const { password: _, ...result } = user;
    return { accessToken, user: result };
  }

  async validateUser(email: string, password: string): Promise<any> {
    // Find user by email instead of username
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      return null;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (isPasswordValid) {
      const { password, ...result } = user;
      return result;
    }
    
    return null;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    
    const user = await this.validateUser(email, password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    
    const payload = { sub: user.id, email: user.email, role: user.role };
    
    return {
      user,
      token: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }
    
    // Generate username from email if not provided
    if (!registerDto.username) {
      registerDto.username = registerDto.email.split('@')[0];
      
      // Check if username already exists and add a random suffix if needed
      const existingUsername = await this.userRepository.findOne({ 
        where: { username: registerDto.username } 
      });
      
      if (existingUsername) {
        registerDto.username = `${registerDto.username}${Math.floor(Math.random() * 1000)}`;
      }
    }
    
    // Create new user
    const user = await this.usersService.create(registerDto);
    
    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    
    return {
      user,
      token: this.jwtService.sign(payload),
    };
  }
} 