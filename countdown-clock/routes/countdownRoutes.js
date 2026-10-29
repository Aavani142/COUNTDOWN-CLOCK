const express = require('express');
const mongoose = require('mongoose');
const Countdown = require('../models/Countdown');

const router = express.Router();
const CATEGORIES = ['personal', 'work', 'travel', 'celebration', 'other'];


function validatePayload(body) {
  const errors = [];
  const source = body && typeof body === 'object' ? body : {};

  const title = typeof source.title === 'string' ? source.title.trim() : '';
  if (!title) errors.push('Title is required.');
  else if (title.length > 100) errors.push('Title must be 100 characters or fewer.');

  let description = '';
  if (source.description !== undefined && source.description !== null) {
    if (typeof source.description !== 'string') {
      errors.push('Description must be text.');
    } else {
      description = source.description.trim();
      if (description.length > 500) errors.push('Description must be 500 characters or fewer.');
    }
  }

  let targetDate = null;
  if (!source.targetDate) {
    errors.push('Target date and time are required.');
  } else {
    targetDate = new Date(source.targetDate);
    if (Number.isNaN(targetDate.getTime())) {
      errors.push('Target date is not a valid date.');
    } else if (targetDate.getTime() <= Date.now()) {
      errors.push('Target date and time must be in the future.');
    }
  }

  const category = source.category || 'other';
  if (!CATEGORIES.includes(category)) errors.push('Category is not valid.');

  return { errors, data: { title, description, targetDate, category } };
}

function rejectInvalidId(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'Invalid countdown id.' });
    return true;
  }
  return false;
}

// GET /api/countdowns - all countdowns, soonest first
router.get('/', async (req, res, next) => {
  try {
    const countdowns = await Countdown.find().sort({ targetDate: 1 });
    res.status(200).json(countdowns);
  } catch (error) {
    next(error);
  }
});

// GET /api/countdowns/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (rejectInvalidId(req, res)) return;
    const countdown = await Countdown.findById(req.params.id);
    if (!countdown) return res.status(404).json({ error: 'Countdown not found.' });
    res.status(200).json(countdown);
  } catch (error) {
    next(error);
  }
});

// POST /api/countdowns
router.post('/', async (req, res, next) => {
  try {
    const { errors, data } = validatePayload(req.body);
    if (errors.length) return res.status(400).json({ error: 'Validation failed.', details: errors });

    const countdown = await Countdown.create(data);
    res.status(201).json(countdown);
  } catch (error) {
    next(error);
  }
});

// PUT /api/countdowns/:id
router.put('/:id', async (req, res, next) => {
  try {
    if (rejectInvalidId(req, res)) return;
    const { errors, data } = validatePayload(req.body);
    if (errors.length) return res.status(400).json({ error: 'Validation failed.', details: errors });

    const countdown = await Countdown.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!countdown) return res.status(404).json({ error: 'Countdown not found.' });
    res.status(200).json(countdown);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/countdowns/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (rejectInvalidId(req, res)) return;
    const countdown = await Countdown.findByIdAndDelete(req.params.id);
    if (!countdown) return res.status(404).json({ error: 'Countdown not found.' });
    res.status(200).json({ message: 'Countdown deleted.', id: countdown.id });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/countdowns/:id/complete - mark done early or reopen
router.patch('/:id/complete', async (req, res, next) => {
  try {
    if (rejectInvalidId(req, res)) return;
    if (typeof req.body.completed !== 'boolean') {
      return res.status(400).json({ error: 'completed must be true or false.' });
    }
    const countdown = await Countdown.findByIdAndUpdate(
      req.params.id, { completed: req.body.completed }, { new: true }
    );
    if (!countdown) return res.status(404).json({ error: 'Countdown not found.' });
    res.status(200).json(countdown);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/countdowns/:id/pin - pin or unpin
router.patch('/:id/pin', async (req, res, next) => {
  try {
    if (rejectInvalidId(req, res)) return;
    if (typeof req.body.pinned !== 'boolean') {
      return res.status(400).json({ error: 'pinned must be true or false.' });
    }
    const countdown = await Countdown.findByIdAndUpdate(
      req.params.id, { pinned: req.body.pinned }, { new: true }
    );
    if (!countdown) return res.status(404).json({ error: 'Countdown not found.' });
    res.status(200).json(countdown);
  } catch (error) {
    next(error);
  }
});

module.exports = router;