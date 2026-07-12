import { body, param } from 'express-validator';

export const createGameValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 60 })
    .withMessage('Name must be between 2 and 60 characters'),
  body('hostName')
    .trim()
    .notEmpty()
    .withMessage('Host name is required')
    .isLength({ min: 2, max: 40 })
    .withMessage('Host name must be between 2 and 40 characters'),
  body('hostId')
    .trim()
    .notEmpty()
    .withMessage('Host ID is required'),
  body('appearance')
    .optional()
    .isObject()
    .withMessage('Appearance must be an object'),
  body('mode')
    .optional()
    .isString(),
  body('maxMembers')
    .optional()
    .isInt({ min: 3, max: 10 }),
  body('revealPolicy')
    .optional()
    .isIn(['immediate', 'final_only'])
    .withMessage('revealPolicy must be either immediate or final_only'),
  body('maxRounds')
    .optional()
    .isInt({ min: 1, max: 10 }),
  body('roundDurationMinutes')
    .optional()
    .isInt({ min: 1, max: 10 }),
];

export const joinGameValidator = [
  param('code')
    .trim()
    .notEmpty()
    .withMessage('Room code is required')
    .isLength({ min: 6, max: 10 })
    .withMessage('Invalid room code'),
  body('playerName')
    .trim()
    .notEmpty()
    .withMessage('Player name is required')
    .isLength({ min: 2, max: 40 })
    .withMessage('Player name must be between 2 and 40 characters'),
  body('playerId')
    .trim()
    .notEmpty()
    .withMessage('Player ID is required'),
  body('appearance')
    .optional()
    .isObject()
    .withMessage('Appearance must be an object'),
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
