//#1 - express setup (cors, body-parser, bcrypt, sessions)
const express = require("express");
const server = express();
const cors = require("cors");
server.use(
  cors({
    credentials: true,
    origin: [
      "http://localhost:3000",
      "https://www.checkballapp.com/",
      "https://checkballapp.com",
    ],
  })
);
const bodyParser = require("body-parser");
server.use(bodyParser.json());
const bcrypt = require("bcrypt");

const apiKey = require("./sendgridAPIkey");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(apiKey);

const sessions = require("express-session");
const { db, User, Post } = require("./db/db.js"); //#2, #8 DB setup
const sequelizeStore = require("connect-session-sequelize")(sessions.Store);
const oneMonth = 1000 * 60 * 60 * 24 * 30;
server.use(
  sessions({
    secret: "nathanssecretpassword",
    store: new sequelizeStore({ db }),
    cookie: { maxAge: oneMonth },
  })
);

server.get("/", (req, res) => {
  res.send({ my_name_is: "nathan" });
});

server.post("/login", async (req, res) => {
  const user = await User.findOne(
    { where: { email: req.body.username } },
    { raw: true }
  );
  if (!user) {
    res.send({ error: "email not found" });
  } else {
    const matchingPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (matchingPassword) {
      req.session.user = user;
      res.send({ success: true, message: "open sesame" });
    } else {
      res.send({ error: "no go. passwords don't match." });
    }
  }
});

server.post("/forgotPassword", async (req, res) => {
  const user = await User.findOne({ where: { email: req.body.email } });
  if (user) {
    const { nanoid } = await import("nanoid");

    user.passwordResetToken = nanoid();
    await user.save();

    const url = process.env.DATABASE_URL
      ? "https://myherokuappCHANGETHIS.heroku.com" //blog-frontend URL
      : "http://localhost:3000";

    const msg = {
      to: user.email,
      from: "maxm@hackupstate.com", // Use the email address or domain you verified above
      subject: "You Needed a Reset, Huh?",
      html: `Click <a href="${url}/setPassword?token=${user.passwordResetToken}">here</a> to reset your password.`,
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error(error);

      if (error.response) {
        console.error(error.response.body);
      }
    }

    res.send({
      message: "Password is ready to be reset. Go check your email",
    });
  } else {
    res.send({ error: "You don't have an account to reset a password on" });
  }
});

server.post("/setPassword", async (req, res) => {
  const user = await User.findOne({
    where: { passwordResetToken: req.body.token },
  });
  if (user) {
    // set the password
    user.password = bcrypt.hashSync(req.body.password, 10);
    user.passwordResetToken = null;
    await user.save();
    req.session.user = user;
    res.send({ success: true });
  } else {
    res.send({ error: "You don't have an account to reset a password on" });
  }
});

server.post("/createAccount", async (req, res) => {
  const userWithThisEmail = await User.findOne({
    where: { email: req.body.email },
  });
  if (userWithThisEmail) {
    res.send({
      error: "Email is already taken. Go fish!",
    });
  } else {
    User.create({
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 10),
    });
    res.send({ success: true });
  }
});

server.get("/loginStatus", (req, res) => {
  if (req.session.user) {
    res.send({ isLoggedIn: true });
  } else {
    res.send({ isLoggedIn: false });
  }
});

server.get("/logout", (req, res) => {
  req.session.destroy();
  res.send({ isLoggedIn: false });
});

const authRequired = (req, res, next) => {
  if (!req.session.user) {
    res.send({ error: "You're not signed in. No posting for you!" });
  } else {
    next();
  }
};

server.post("/post", authRequired, async (req, res) => {
  await Post.create({
    title: req.body.title,
    content: req.body.content,
    authorID: req.session?.user?.id,
  });
  res.send({ post: "created" });
});

server.patch("/post/:id", authRequired, async (req, res) => {
  const post = await Post.findByPk(req.params.id);
  post.content = req.body.content;
  post.title = req.body.title;
  await post.save();
  res.send({ success: true, message: "It's been edited" });
});

server.delete("/post/:id", authRequired, async (req, res) => {
  await Post.destroy({ where: { id: req.params.id } });
  res.send({ success: true, message: "That post is outta here" });
});

server.get("/posts", async (req, res) => {
  res.send({
    posts: await Post.findAll({
      order: [["id", "DESC"]],
      include: [{ model: User, attributes: ["email"] }],
    }),
  });
});

server.get("/post/:id", async (req, res) => {
  res.send({ post: await Post.findByPk(req.params.id) });
});

server.get("/authors", async (req, res) => {
  res.send({
    authors: await User.findAll({ attributes: ["id", "email"] }),
  });
});

server.get("/author/:id", async (req, res) => {
  res.send({
    posts: await Post.findAll({ where: { authorID: req.params.id } }),
    user: await User.findByPk(req.params.id, {
      attributes: ["email"],
    }),
  });
});

let port = 3001;
if (process.env.PORT) {
  port = process.env.PORT;
}

//#9 run express API server in background to listen for incoming requests
server.listen(port, () => {
  console.log("Server running.");
});
