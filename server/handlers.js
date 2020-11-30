"use strict";
const assert = require("assert");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const delay = require("delay");
const { MONGO_URI } = process.env;
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// helpers
const connectMongo = async () => {
  // return the db
  // function connect to mongo
  const client = await MongoClient(MONGO_URI, options);
  await client.connect();

  return client;
};
const disConnect = (client) => {
  // function to disconnect from the database, take client
  client.close();
};
const convertArr = (arr) => {
  const r = {};
  arr.forEach((ele) => {
    r[ele._id] = { ...ele };
  });
  return r;
};
// function to get seats from the database
const getSeats = async (req, res) => {
  // get all seat data
  const client = await connectMongo();
  const db = client.db("TicketBooker");

  // get the result and filter for booked
  let r = await db.collection("TicketBooker").find().toArray();
  let booked = r.filter((ele) => ele.isBooked);

  // convert to the form the front end needed
  r = convertArr(r);
  booked = convertArr(booked);

  // disconnect & return
  disConnect(client);
  return res.json({
    seats: r,
    bookedSeats: booked,
    numOfRows: 8,
    seatsPerRow: 12,
  });
};

// function to book a seat
const bookSeat = async (req, res) => {
  // get variables
  console.log(req.body);
  const { seatId, creditCard, expiration, fullName, email } = req.body;
  console.log(seatId);
  if (!seatId || !creditCard || !expiration) {
    res
      .status(400)
      .json({ status: 400, error: "The necessary information is not given." });
    return;
  }

  // connect to database
  const client = await connectMongo();
  const db = client.db("TicketBooker");

  // cause a delay
  await delay(Math.random() * 3000);

  // check credit and expiration
  if (!creditCard || !expiration) {
    disConnect(client);
    return res.status(400).json({
      status: 400,
      message: "Please provide credit card information!",
      success: false,
    });
  }

  //get info from database (check if avaible or not)
  let r;
  try {
    r = await db.collection("TicketBooker").findOne({ _id: seatId });
    // check if r is booked or not
    if (r.isBooked) {
      return res.status(400).json({
        status: 400,
        data: req.body,
        error: `The seat ${seatId} is already booked!`,
        success: false,
      });
    }
  } catch (err) {
    console.log(err);
    disConnect(client);
    return res.status(404).json({
      status: 404,
      message: `Something went wrong during the process!`,
      success: false,
    });
  }

  // modify & send back to the server
  try {
    //console.log(r);
    const re = await db
      .collection("TicketBooker")
      .updateOne({ _id: seatId }, { $set: { isBooked: true } });
    assert.strictEqual(1, re.modifiedCount);
    const re_u = await db.collection("users").insertOne({
      _id: email.toLowerCase(),
      fullName: fullName.toLowerCase(),
      email: email.toLowerCase(),
      seatId: seatId,
    });
    assert.strictEqual(1, re_u.insertedCount);
    res.status(200).json({ status: 200, data: req.body, success: true });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      status: 400,
      data: req.body,
      error: "Something went wrong in updating.",
      success: false,
    });
  }

  disConnect(client);
  return;
};
// function to delete booking from database
const deleteBook = async (req, res) => {
  // get info from persumed body
  const { seatId, email } = req.body;
  if (!seatId || !email) {
    res
      .status(400)
      .json({ status: 400, error: "The necessary information is not given." });
    return;
  }
  // connect to db
  const client = await connectMongo();
  const db = client.db("TicketBooker");

  // get the checking information needed
  try {
    const u = await db.collection("users").findOne({ seatId: seatId });
    const s = await db.collection("TicketBooker").findOne({ _id: seatId });
    //console.log(u, s);

    // check if it's booked by a user
    if (!u || !s) {
      disConnect(client);
      res.status(400).json({
        status: 400,
        data: req.body,
        error: `The user didn't book the seat ${seatId}! Or the wrong seat information!`,
        success: false,
      });
      return;
    }

    // check the user information
    if (u.email.toLowerCase() !== email.toLowerCase()) {
      disConnect(client);
      res.status(409).json({
        status: 409,
        data: req.body,
        error: `The email doesn't match the record. The user didn't book the seat ${seatId}.`,
        success: false,
      });
      return;
    }

    // delete the user and booking
    const r_u = await db.collection("users").deleteOne({ seatId: seatId });
    const s_u = await db
      .collection("TicketBooker")
      .updateOne({ _id: seatId }, { $set: { isBooked: false } });
    assert.strictEqual(1, r_u.deletedCount);
    assert.strictEqual(1, s_u.modifiedCount);

    // send response
    res.status(202).json({
      status: 202,
      data: req.body,
      error: "Successfully removed the booking!",
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      status: 400,
      data: req.body,
      error: "Something went wrong in updating.",
      success: false,
    });
  }
  disConnect(client);
  return;
};

// function to update the name and email of the user
const updateUser = async (req, res) => {
  const { seatId, fullName, newName, email, newEmail } = req.body;
  // null if not needed

  if (!seatId || !fullName) {
    res
      .status(400)
      .json({ status: 400, error: "The necessary information is not given." });
    return;
  }
  const client = await connectMongo();
  const db = client.db("TicketBooker");

  try {
    const u = await db.collection("users").findOne({
      seatId: seatId,
      fullName: fullName.toLowerCase(),
      email: email.toLowerCase(),
    });
    if (!u) {
      res.status(404).json({
        status: 404,
        data: req.body,
        error: "We didn't find the user in our database.",
        success: false,
      });
    }
    // change and update
    const new_u = { ...u };
    if (newName) {
      new_u.fullName = newName.toLowerCase();
    }
    if (newEmail) {
      new_u.email = newEmail.toLowerCase();
      new_u._id = newEmail.toLowerCase();
    }

    const re = await db.collection("users").insertOne(new_u);
    assert.strictEqual(1, re.insertedCount);
    const re_r = await db.collection("users").deleteOne({ _id: email }); // remove the old user
    assert.strictEqual(1, re_r.deletedCount);
    //Question: noticed when there is an error in the middle, the database won't update
    res
      .status(202)
      .json({ status: 202, data: req.body, message: "Successfully updated!" });
    return;
    console.log(new_u);
  } catch (err) {
    console.log(err);
    res.status(400).json({
      status: 400,
      data: req.body,
      error: "Something went wrong in updating.",
      success: false,
    });
  }

  disConnect(client);
};

// functions to push seats to the mongo database
const addSeats = async () => {
  const row = ["A", "B", "C", "D", "E", "F", "G", "H"];
  for (let r = 0; r < row.length; r++) {
    for (let s = 1; s < 13; s++) {
      const seat = {
        _id: `${row[r]}-${s}`, // added _id, use this for database (won't affect frontend)
        price: 225,
        isBooked: false,
      };
      // push the seat to database
      try {
        const r = await addSeat(seat);
      } catch (err) {}
    }
  }
};

// functions to add seats to the mongo database
const addSeat = async (seat) => {
  const client = await connectMongo();
  const db = client.db("TicketBooker");

  try {
    const r = await db.collection("TicketBooker").insertOne(seat);
    assert.strictEqual(1, r.intertedCount);
  } catch (err) {
    console.log(err);
  }

  disConnect(client);
};

module.exports = { getSeats, bookSeat, deleteBook, updateUser };
