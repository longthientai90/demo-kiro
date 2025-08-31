import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(), // Load environment variables first
    MongooseModule.forRoot(
      // `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@cluster0.re3ha3x.mongodb.net/nestjs-crud-app`,
        'mongodb://localhost:27017/demo_kiro'
    ),
    UsersModule,
    AuthModule, // Import AuthModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
