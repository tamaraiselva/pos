const { MongoClient } = require("mongodb");

(async () => {
  const client = new MongoClient("mongodb://127.0.0.1:27017/?directConnection=true");
  await client.connect();
  const admin = client.db("admin");
  try {
    const status = await admin.command({ replSetGetStatus: 1 });
    console.log("Replica set already initialized:", status.set, status.myState);
  } catch (e) {
    if (e.codeName === "NotYetInitialized") {
      const result = await admin.command({
        replSetInitiate: {
          _id: "rs0",
          members: [{ _id: 0, host: "127.0.0.1:27017" }],
        },
      });
      console.log("Initiated:", JSON.stringify(result));
    } else {
      throw e;
    }
  }
  await client.close();
})().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
