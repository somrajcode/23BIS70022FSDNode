// index.js
const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const LOCK_DURATION_MS = 60 * 1000; // 1 minute lock (change if you like)
const SEAT_COUNT = 10; // change number of seats

/**
 * Seat structure:
 * seats[id] = {
 *   status: "available" | "locked" | "booked",
 *   lockedBy?: string,      // optional user id who locked the seat
 *   lockedAt?: number,      // timestamp
 *   lockTimer?: TimeoutId   // reference to setTimeout so we can clear it on confirm/unlock
 * }
 */
const seats = {};
for (let i = 1; i <= SEAT_COUNT; i++) {
  seats[i] = { status: 'available' };
}

/**
 * Helper: safely lock seat (synchronous checks + immediate set -> avoids race)
 * returns { ok: boolean, message, seat }
 */
function tryLockSeat(id, userId) {
  const seat = seats[id];
  if (!seat) return { ok: false, message: `Seat ${id} does not exist.` };

  if (seat.status === 'available') {
    // assign lock synchronously
    seat.status = 'locked';
    seat.lockedBy = userId || null;
    seat.lockedAt = Date.now();

    // set expiry timer
    seat.lockTimer = setTimeout(() => {
      // only release if still locked (wasn't confirmed)
      if (seat.status === 'locked') {
        seat.status = 'available';
        seat.lockedBy = null;
        seat.lockedAt = null;
        seat.lockTimer = null;
        console.log(`Lock expired: seat ${id} returned to available`);
      }
    }, LOCK_DURATION_MS);

    return { ok: true, message: `Seat ${id} locked successfully. Confirm within ${LOCK_DURATION_MS / 1000} seconds.` , seat };
  }

  if (seat.status === 'locked') {
    return { ok: false, message: `Seat ${id} is currently locked by ${seat.lockedBy ?? 'another user'}.` };
  }

  if (seat.status === 'booked') {
    return { ok: false, message: `Seat ${id} is already booked.` };
  }

  return { ok: false, message: `Unable to lock seat ${id}.` };
}

/**
 * Helper: confirm booking
 */
function tryConfirmSeat(id, userId) {
  const seat = seats[id];
  if (!seat) return { ok: false, message: `Seat ${id} does not exist.` };

  if (seat.status !== 'locked') {
    return { ok: false, message: `Seat is not locked and cannot be booked` };
  }

  // Optional: enforce that the same user who locked can confirm
  if (seat.lockedBy && userId && seat.lockedBy !== userId) {
    return { ok: false, message: `Seat locked by another user and cannot be confirmed by you.` };
  }

  // confirm: clear timer, set booked
  if (seat.lockTimer) {
    clearTimeout(seat.lockTimer);
    seat.lockTimer = null;
  }
  seat.status = 'booked';
  seat.lockedBy = null;
  seat.lockedAt = null;

  return { ok: true, message: `Seat ${id} booked successfully!` , seat };
}

/**
 * GET /seats
 * returns JSON object with each seat status
 */
app.get('/seats', (req, res) => {
  // return a small view to avoid sending timer objects
  const view = {};
  Object.keys(seats).forEach(k => {
    const s = seats[k];
    view[k] = {
      status: s.status,
      lockedBy: s.lockedBy ?? null,
      lockedAt: s.lockedAt ?? null
    };
  });
  res.json(view);
});

/**
 * POST /lock/:id
 * Optional: supply user id as header 'x-user-id' OR body.user OR ?user=...
 */
app.post('/lock/:id', (req, res) => {
  const id = req.params.id;
  const userId = req.header('x-user-id') || req.body?.user || req.query.user;
  const result = tryLockSeat(id, userId);
  if (result.ok) return res.status(200).json({ message: result.message });
  return res.status(400).json({ message: result.message });
});

/**
 * POST /confirm/:id
 * Optional: supply user id same way as lock
 */
app.post('/confirm/:id', (req, res) => {
  const id = req.params.id;
  const userId = req.header('x-user-id') || req.body?.user || req.query.user;
  const result = tryConfirmSeat(id, userId);
  if (result.ok) return res.status(200).json({ message: result.message });
  return res.status(400).json({ message: result.message });
});

/**
 * POST /unlock/:id  (admin or user can manually unlock)
 * This endpoint is optional but helpful during testing.
 */
app.post('/unlock/:id', (req, res) => {
  const id = req.params.id;
  const seat = seats[id];
  if (!seat) return res.status(404).json({ message: `Seat ${id} does not exist.` });
  if (seat.status !== 'locked') return res.status(400).json({ message: `Seat ${id} is not locked.` });

  if (seat.lockTimer) {
    clearTimeout(seat.lockTimer);
    seat.lockTimer = null;
  }
  seat.status = 'available';
  seat.lockedBy = null;
  seat.lockedAt = null;
  return res.json({ message: `Seat ${id} unlocked and returned to available.` });
});

app.listen(PORT, () => {
  console.log(`Ticket booking server listening on port ${PORT}`);
});
