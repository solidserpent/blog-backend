import Sequelize from "sequelize";
import PostModel from "./Post.js";
import UserModel from "./User.js";
import bcrypt from "bcrypt";

let db;
if (process.env.RDS_HOSTNAME) {
  console.log("Connecting to RDS", process.env.RDS_HOSTNAME);
  // if we're running on elasticbeanstalk, use elasticbeanstalk connection
  db = new Sequelize(
    `postgres://${process.env.RDS_USERNAME}:${process.env.RDS_PASSWORD}@${process.env.RDS_HOSTNAME}:${process.env.RDS_PORT}/${process.env.RDS_DB_NAME}`,
    {
      logging: false,
    }
  );
} else {
  console.log("Connecting to local database");
  // if we're running locally, use the localhost connection
  db = new Sequelize("postgres://bkh@localhost:5432/blog", {
    logging: false,
  });
}

const Post = PostModel(db);
const User = UserModel(db);

//#5 connect and sync to DB
const connectToDB = async () => {
  try {
    await db.authenticate();
    console.log("Connected successfully");
    await db.sync(); //#6 sync by creating the tables based off our models if they don't exist already
  } catch (error) {
    console.error(error);
    console.error("PANIC! DB PROBLEMS!");
  }

  Post.belongsTo(User, { foreignKey: "userID" });
};

//#10 seeding the database
const createFirstUser = async () => {
  const users = await User.findAll({});
  if (users.length === 0) {
    User.create({
      email: "a@a",
      password: bcrypt.hashSync("qwerty", 10),
    });
  }
};

const createSecondUser = async () => {
  const secondUser = await User.findOne({
    where: { email: "b@b" },
  });
  if (!secondUser) {
    User.create({
      email: "b@b",
      password: bcrypt.hashSync("qwerty", 10),
    });
  }
};

// // 1. connect and standup our tables
connectToDB().then(() => {
  // 2. and then create models
  createFirstUser();
  createSecondUser();
});

// connectToDB();

export { db, Post, User };
