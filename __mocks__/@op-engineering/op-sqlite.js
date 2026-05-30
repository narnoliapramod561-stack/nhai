const createResult = () => ({
  rows: [],
  rowsAffected: 0,
});

const db = {
  close: jest.fn(),
  closeAsync: jest.fn(async () => undefined),
  execute: jest.fn(async () => createResult()),
  executeSync: jest.fn(() => createResult()),
  transaction: jest.fn(async (fn) => fn(db)),
};

module.exports = {
  open: jest.fn(() => db),
  openAsync: jest.fn(async () => db),
};
