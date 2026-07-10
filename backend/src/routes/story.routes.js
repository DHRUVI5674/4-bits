import express from 'express';
import * as storyController from '../controllers/story.controller.js';
import * as roleController from '../controllers/role.controller.js';
import * as timelineController from '../controllers/timeline.controller.js';
import * as clueController from '../controllers/clue.controller.js';
import { createStoryValidator } from '../validators/story.validator.js';
import { assignRoleValidator } from '../validators/role.validator.js';
import { generateTimelineValidator } from '../validators/timeline.validator.js';
import { generateCluesValidator } from '../validators/clue.validator.js';
import validate from '../middleware/validate.js';

const router = express.Router();

router.post('/create', createStoryValidator, validate, storyController.createStory);
router.post('/assign-role', assignRoleValidator, validate, roleController.assignRole);
router.post('/generate-timeline', generateTimelineValidator, validate, timelineController.generateTimeline);
router.post('/generate-clues', generateCluesValidator, validate, clueController.generateClues);

export default router;
