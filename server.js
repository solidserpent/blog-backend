import express from "express";
import cors from "cors";
import { db, Post, User } from "./db/db.js";
import bcrypt from "bcrypt";
import sessions from "express-session";
import connectSession from "connect-session-sequelize";

const server = express();
server.use(cors({ credentials: true, origin: ["http://localhost:3000"] }));
server.use(express.json());
const sequelizeStore = connectSession(sessions.Store);
server.use(
  sessions({
    secret: "mysecretkey",
    store: new sequelizeStore({ db }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 },
  })
);

server.get("/", (req, res) => {
  res.send({ my_name_is: "Brian" });
});

server.post("/newPost", async (req, res) => {
  if (!req.session.user) {
    res.status(401).send({ error: true, message: "you little hacker" });
  } else {
    await Post.create({ ...req.body, userID: req.session.user.id });
    res.send({ status: "ok" });
  }
});

server.get("/posts", async (req, res) => {
  const posts = await Post.findAll({
    include: [{ model: User, attributes: ["firstName"] }],
  });
  res.send({ posts });
});

server.get("/post/:id", async (req, res) => {
  const post = await Post.findByPk(req.params.id);
  res.send({ post });
});

server.delete("/post/:id", async (req, res) => {
  const post = await Post.findByPk(req.params.id);
  await post.destroy();
  res.send({ deleted: "he's dead, jim 🖖" });
});

server.post("/login", async (req, res) => {
  const user = await User.findOne(
    {
      where: { email: req.body.email },
    },
    { raw: true }
  );
  if (!user) {
    res.send({ error: "email not found" });
  } else {
    const matchingPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!matchingPassword) {
      res.send({ error: "password is incorrect" });
    } else {
      req.session.user = user;
      res.send({ loggedIn: true });
    }
  }
});

server.get("/logout", (req, res) => {
  req.session.destroy();
  res.send({ loggedIn: false });
});

server.get("/authStatus", async (req, res) => {
  if (req.session.user) {
    res.send({ loggedIn: true });
  } else {
    res.send({ loggedIn: false });
  }
});

const serverStarted = async () => {
  const user = await User.findOne({ where: { email: "brian@brian.tech" } });
  if (!user) {
    await User.create({
      email: "brian@brian.tech",
      firstName: "Brian",
      password: bcrypt.hashSync("qwerty", 10),
    });
  }
};
serverStarted();

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
