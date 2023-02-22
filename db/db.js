import Sequelize from "sequelize";
import PostModel from "./Post.js";
import UserModel from "./User.js";

const db = new Sequelize("postgres://bkh@localhost:5432/blog", {
  logging: false,
});
const Post = PostModel(db);
const User = UserModel(db);

const connectToDB = async () => {
  try {
    await db.authenticate();
    console.log("Connected to DB successfully");

    db.sync({ force: false });
  } catch (error) {
    console.error(error);
    console.error("PANIC! DB PROBLEM!");
  }

  Post.belongsTo(User, { foreignKey: "userID" });
};

connectToDB();

export { db, Post, User };
