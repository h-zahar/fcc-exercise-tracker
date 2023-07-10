const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
require('dotenv').config()

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const mongoUri = process.env['DB_URI'].replace('<user>', process.env['DB_USER']).replace('<pass>', process.env['DB_PASS']).replace('<db>', process.env['DB_NAME']);

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

const logSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: String
}, { timestamps: true });

const exerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: String
}, { timestamps: true });

const Exercise = mongoose.model('Exercise', exerciseSchema);

const userSchema = new mongoose.Schema({
  username: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const fullLogSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [logSchema]
}, { timestamps: true });

const Log = mongoose.model('Log', fullLogSchema);


app.post('/api/users', (req, res) => {
  const { username } = req.body;
  
  const user = new User({ username });
  user.save()
  .then(data => {
      const username = JSON.parse(JSON.stringify(data));
      delete username['createdAt'];
      delete username['updatedAt'];
      delete username['__v'];
    res.json(username);
  })
  .catch(err => res.json(err));
});

app.get('/api/users', (req, res) => {
  User.find({}).select(['username', 'id']).exec()
  .then(data => res.json(data))
  .catch(err => res.json(err));
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  User.find({ _id })
  .then(data => {
    if (data.length === 0) return res.json({ error: "No user found!" });
    
    const { description, duration, date } = req.body;
    modifiedDate = (date === undefined || date === "" || date === "undefined") ? new Date().toDateString() : new Date(date).toDateString();
    
    const username = data[0].username;
    const createObj = {
      username,
      description,
      duration,
      date: modifiedDate
    };
    const exercise = new Exercise(createObj);
    exercise.save()
    .then(data => {
      const exercise = JSON.parse(JSON.stringify(data));
      delete exercise['createdAt'];
      delete exercise['updatedAt'];
      delete exercise['__v'];

      Log.findById({ _id })
      .then(data => {
        if (!data?._id) {
          const logObj = {
            _id,
            username: exercise.username,
            count: 1,
            log: [
              {
                _id: exercise._id,
                description: exercise.description,
                duration: exercise.duration,
                date: exercise.date,
              }
            ]
          };
          const log = new Log(logObj);
          log.save()
          .then(data => {
            console.log(data);
          })
          .catch(err => console.log(err));
        } else {
          data.count += 1;
          data.log.push(exercise);
          const log = new Log(data);
          log.save()
            .then(data => console.log(data))
            .catch(err => console.log(err));
        }
      })
      const userObj = JSON.parse(JSON.stringify(exercise));
      userObj._id = _id;
      res.json(userObj);
    })
    .catch(err => res.json(err));
  })
  .catch(err => res.json(err));
});

app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  Log.findById({ _id })
  .then(data => res.json(data))
  .catch(err => res.json(err));
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
