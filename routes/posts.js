const express = require("express");
const client = require("../db");
const postList = require("../views/postList");
const postDetails = require("../views/postDetails");

const app = express.Router();
module.exports = app;

const baseQuery = "SELECT posts.*, users.name, counting.upvotes FROM posts INNER JOIN users ON users.id = posts.userId LEFT JOIN (SELECT postId, COUNT(*) as upvotes FROM upvotes GROUP BY postId) AS counting ON posts.id = counting.postId\n";

app.get("/", async (req, res, next) => {
  try {
    const data = await client.query(baseQuery);
    res.send(postList(data.rows));
  } catch (error) { next(error) }
});

app.post('/', async(req, res, next)=> {
  try {
    const { name, title, content } = req.body;

    let response = await client.query(`
      SELECT id 
      FROM users
      WHERE name=$1
    `, [ name] );
    let userId;
    if(response.rows.length){
      userId = response.rows[0].id;
    }
    else {
      response = await client.query(`
        INSERT INTO users(name) VALUES($1) RETURNING *
      `, [ name ]);
      userId = response.rows[0].id;
    }
    response = await client.query(`
      INSERT INTO posts(title, content, userId) VALUES($1, $2, $3) RETURNING *
    `, [ title, content, userId ]);
    res.redirect(`/posts/${response.rows[0].id}`);
  }
  catch(ex){
    next(ex);
  }

});
app.get('/add', (req, res)=> {
  res.send(`
    <html>
  <head>
    <title>Wizard News</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <div class="news-list">
      <header><img src="/logo.png"/>Wizard News</header>
      <form method="post" action="/posts">
        <label for="name">Author</label>
        <input type="text" name="name" />
        <label for="title">Title</label>
        <input type="text" name="title" />
        <textarea name="content"></textarea>
        <button type="submit">Submit</button>
      </form>
    </div>
  </body>
  </html>
  `);
});

app.get("/:id", async (req, res, next) => {
  try {
    const data = await client.query(baseQuery + "WHERE posts.id = $1", [req.params.id]);
    const post = data.rows[0];
    res.send(postDetails(post));
  } catch (error) { next(error) }
});
