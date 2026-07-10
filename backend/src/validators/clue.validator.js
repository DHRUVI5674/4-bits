import { body } from 'express-validator';

export const generateCluesValidator = [
  body('roomCode')
    .exists()
    .withMessage('roomCode is required')
    .isString(),
  body('hostId')
    .exists()
    .withMessage('hostId is required')
    .isString(),
  body('storySeed')
    .optional()
    .isString(),
];
