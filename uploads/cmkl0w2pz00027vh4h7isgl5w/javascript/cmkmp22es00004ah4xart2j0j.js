async function publishScheduled({ model, statusField, scheduledValue, publishedValue, limit }) {
  const now = new Date();

  const query = {
    [statusField]: scheduledValue,
    publishAt: { $lte: now }
  };

  const items = await model.find(query).sort({ publishAt: 1 }).limit(limit).select("_id");

  if (!items.length) return;

  const ids = items.map((i) => i._id);

  await model.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        [statusField]: publishedValue,
        publishedAt: now
      }
    }
  );
}
module.exports = publishScheduled;
