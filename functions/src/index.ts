import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as cors from "cors";

admin.initializeApp();
const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

app.get("/", (req, res) => {
  return res.status(200).send("drunk api");
});

app.get("/room", async (req, res) => {
  return res.status(404).send("Are you looking for /rooms ?");
});

app.get("/rooms", async (req, res) => {
  const snapshot = await admin
    .database()
    .ref("rooms")
    .once("value");
  return res.status(200).send(snapshot.val());
});

app.get("/rooms/:roomid", async (req, res) => {
  const snapshot = await admin
    .database()
    .ref(`rooms/${req.params.roomid}`)
    .once("value");
  return res.status(200).send(snapshot.val());
});

app.get("/rooms/:roomid/events", async (req, res) => {
  const snapshot = await admin
    .database()
    .ref(`rooms/${req.params.roomid}/events`)
    .once("value");
  return res.status(200).send(snapshot.val());
});

app.post("/rooms/:roomid/events", async (req, res) => {
  let snapshot = await admin
    .database()
    .ref(`rooms/${req.params.roomid}/events`)
    .once("value");
  let events = snapshot.val();
  const amount = 1;
  const { playerId, type } = req.body;

  if (!snapshot || !events) {
    events = [];
  }
  events.push({ amount, playerId, type });

  snapshot = await admin
    .database()
    .ref(`rooms/${req.params.roomid}/players`)
    .once("value");
  let players = snapshot.val();
  let keys = Object.keys(players);

  if (keys.indexOf(playerId) < 0) {
    return res
      .status(400)
      .send(`playerId ${playerId} not found in this room ${req.params.roomid}`);
  }
  for (let key of keys) {
    if (key === playerId) {
      players[key].progress += amount;
    } else {
      players[key].shots = Number(players[key].shots) + Number(amount);
    }
  }
  const eventSnapshot = await admin
    .database()
    .ref(`rooms/${req.params.roomid}`)
    .update({ events: events });
  const playersSnapshot = await admin
    .database()
    .ref(`rooms/${req.params.roomid}`)
    .update({ players: players });
  return res
    .status(200)
    .send({ eventSnapshot, playersSnapshot, events, players });
});

app.use("/room/*", (req, res) => {
  return res.status(404).send("Are you looking for /rooms ?");
});

app.use("*", (req, res) => {
  return res.status(404).send("404 Not Found");
});

// Expose Express API as a single Cloud Function:
exports.api = functions.https.onRequest(app);
