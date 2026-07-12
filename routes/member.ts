import { Router } from 'express';
import { addMember, getMembers, addPoint } from '../lib/db';
const router = Router();

// GET semua member
router.get('/members', (req, res) => {
  res.json(getMembers());
});

// POST tambah member baru
router.post('/members', (req, res) => {
  const { name, phone } = req.body;
  addMember(name, phone);
  res.json({ success: true, message: 'Member ditambahkan' });
});

// POST tambah 1 point
router.post('/members/:id/add-point', (req, res) => {
  addPoint(Number(req.params.id));
  res.json({ success: true, message: '+1 Point' });
});

export default router;
