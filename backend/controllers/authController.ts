import { Request, Response } from 'express';
import { User } from '../models/user.model.js';
import bcrypt from 'bcrypt';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const genereateToken = (id: string) => {
    return jwt.sign({id}, process.env.JWT_SECRET || "fallback_secret", {expiresIn: '30d'})
}

// Register User
// POST /api/auth/register
export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { name, email, password } = req.body;
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError(409, 'User with email or username already exists');
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword
  });

  const createdUser = await User.findById(user._id).select(
    '-password'
  );

  if(!createdUser){
    throw new ApiError(500, 'Something went wrong while registering user');
  }

  const token = genereateToken(user._id.toString());

  res.status(201).json(new ApiResponse(201,{
    user: createdUser,
    token
  }, 'User registered successfully'));
};
