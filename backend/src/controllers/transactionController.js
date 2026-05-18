import { db } from '../config/fileDB.js';

export const addTransaction = (req, res) => {
  const { userId, userRole, type, amount, note, referenceId } = req.body;
  try {
    if (!userId || !userRole || !type || amount === undefined) {
      return res.status(400).json({ message: 'Missing required transaction fields.' });
    }

    const transaction = db.create('transactions', {
      userId,
      userRole,
      type,
      amount: Number(amount),
      note: note || '',
      referenceId: referenceId || '',
      addedBy: req.user?.id || 'admin',
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ message: 'Transaction added successfully', transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTransaction = (req, res) => {
  const { id } = req.params;
  const { amount, note, referenceId } = req.body;
  try {
    const existing = db.findById('transactions', id);
    if (!existing) return res.status(404).json({ message: 'Transaction not found.' });

    const updates = {};
    if (amount !== undefined) updates.amount = Number(amount);
    if (note !== undefined) updates.note = note;
    if (referenceId !== undefined) updates.referenceId = referenceId;
    
    updates.updatedAt = new Date().toISOString();

    const updated = db.updateById('transactions', id, updates);
    res.json({ message: 'Transaction updated successfully', transaction: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTransaction = (req, res) => {
  const { id } = req.params;
  try {
    db.deleteById('transactions', id);
    res.json({ message: 'Transaction deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetTransactions = (req, res) => {
  const { userId } = req.params;
  try {
    const transactions = db.findAll('transactions').filter(t => t.userId === userId);
    transactions.forEach(t => db.deleteById('transactions', t._id));
    res.json({ message: 'All transactions reset for this user.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserTransactions = (req, res) => {
  const { userId } = req.params;
  try {
    const transactions = db.findAll('transactions')
                           .filter(t => t.userId === userId)
                           .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyTransactions = (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = db.findAll('transactions')
                           .filter(t => t.userId === userId)
                           .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
