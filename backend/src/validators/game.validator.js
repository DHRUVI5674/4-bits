import { body, param } from 'express-validator';

export const createGameValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 20 })
    .withMessage('Name must be between 2 and 20 characters'),
];

export const joinGameValidator = [
  param('code')
    .trim()
    .notEmpty()
    .withMessage('Room code is required')
    .isLength({ min: 6, max: 10 })
    .withMessage('Invalid room code'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 20 })
    .withMessage('Name must be between 2 and 20 characters'),
];

export const roomIdValidator = [
  param('code')
    .trim()
    .notEmpty()
    .withMessage('Room code is required'),
];

export const playerIdValidator = [
  ...roomIdValidator,
  param('playerId')
    .trim()
    .notEmpty()
    .withMessage('Player ID is required'),
];

export const actionValidator = [
  ...roomIdValidator,
  body('playerId')
    .trim()
    .notEmpty()
    .withMessage('Player ID is required'),
];

export const hostActionValidator = [
  ...roomIdValidator,
  body('hostId')
    .trim()
    .notEmpty()
    .withMessage('Host ID is required'),
];
