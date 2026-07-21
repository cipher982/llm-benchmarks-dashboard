const mongoose = require('mongoose');

describe('database boundary', () => {
  test('an unconnected model operation fails promptly instead of buffering', async () => {
    const name = `NoBuffer${Date.now()}`;
    const Model = mongoose.model(name, new mongoose.Schema({ value: String }));
    const started = Date.now();

    await expect(Model.findOne({ value: 'test' }).exec()).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
