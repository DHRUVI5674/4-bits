import { body } from 'express-validator';

export const assignRoleValidator = [
  body('roomCode')
    .exists()
    .withMessage('roomCode is required')
    .isString()
    .withMessage('roomCode must be a string'),
  body('playerId')
    .exists()
    .withMessage('playerId is required')
    .isString()
    .withMessage('playerId must be a string'),
  body('playerName')
    .optional()
    .isString()
    .withMessage('playerName must be a string'),
  body('seed')
    .optional()
    .isString()
    .withMessage('seed must be a string'),
];
