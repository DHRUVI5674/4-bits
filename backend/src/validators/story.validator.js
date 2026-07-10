import { body } from 'express-validator';

export const createStoryValidator = [
  body('roomCode')
    .optional()
    .isString()
    .withMessage('roomCode must be a string'),
  body('hostId')
    .exists()
    .withMessage('hostId is required')
    .isString()
    .withMessage('hostId must be a string'),
  body('theme')
    .optional()
    .isString()
    .withMessage('theme must be a string'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('difficulty must be easy, medium, or hard'),
  body('seed')
    .optional()
    .isString()
    .withMessage('seed must be a string'),
];
