//#3 setup DB models
const Sequelize = require("sequelize");
const bcrypt = require("bcrypt");

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
  db = new Sequelize("postgres://hackupstate@localhost:5432/blog", {
    logging: false,
  });
}

const User = require("./User")(db);
const Post = require("./Post")(db);

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

  Post.belongsTo(User, { foreignKey: "authorID" });
};

//#10 seeding the database
const createFirstUser = async () => {
  const users = await User.findAll({});
  if (users.length === 0) {
    User.create({
      email: "max",
      password: bcrypt.hashSync("supersecret", 10),
    });
  }
};

const createSecondUser = async () => {
  const secondUser = await User.findOne({
    where: { email: "testymctesterson" },
  });
  if (!secondUser) {
    User.create({
      email: "testymctesterson",
      password: bcrypt.hashSync("secret", 10),
    });
  }
};

// 1. connect and standup our tables
connectToDB().then(() => {
  // 2. and then create models
  createFirstUser();
  createSecondUser();
});

module.exports = { db, User, Post }; //#7 export out the DB & Model so we can use it else where in our code
