const router = require("express").Router();
const NUM_OF_ROWS = 8;
const SEATS_PER_ROW = 12;
const assert = require("assert");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const { MONGO_URI } = process.env;
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};
const { getSeats, bookSeat, deleteBook, updateUser } = require("./handlers");

// Code that is generating the seats.
// ----------------------------------
const seats = {};
const row = ["A", "B", "C", "D", "E", "F", "G", "H"];
for (let r = 0; r < row.length; r++) {
  for (let s = 1; s < 13; s++) {
    seats[`${row[r]}-${s}`] = {
      _id: `${row[r]}-${s}`, // added _id, use this for database (won't affect frontend)
      price: 225,
      isBooked: false,
    };
    // push the seat to database
  }
}

//addSeats();

// ----------------------------------
//////// HELPERS
const getRowName = (rowIndex) => {
  return String.fromCharCode(65 + rowIndex);
};

const randomlyBookSeats = (num) => {
  const bookedSeats = {};

  while (num > 0) {
    const row = Math.floor(Math.random() * NUM_OF_ROWS);
    const seat = Math.floor(Math.random() * SEATS_PER_ROW);
    const seatId = `${getRowName(row)}-${seat + 1}`;

    bookedSeats[seatId] = true;
    num--;
  }

  return bookedSeats;
};

router.get("/api/seat-availability", getSeats);
router.post("/api/book-seat", bookSeat);
router.delete("/api/delete-book", deleteBook);
router.put("/api/update-user", updateUser);

module.exports = router;
