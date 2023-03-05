const express = require('express')
const app = express()
const morgan = require('morgan')
const bodyParser1 = require('body-parser')
const mongoose = require('mongoose')
const { RtcTokenBuilder, RtcRole } = require('agora-access-token')
const HandleAccounts = require('./routes/HandleAccounts')
const HandleCreators = require('./routes/HandleCreators')
const HandleEvent = require('./routes/HandleEvents')
const cors = require('cors')

let keys = process.env.NODE_ENV === 'production' ? '' : require('./keys')
let password = process.env.NODE_ENV === 'production' ? process.env.mongo : keys.mongo
const uri = `mongodb+srv://homeric:${password}@cluster0.gclzigv.mongodb.net/?retryWrites=true&w=majority`

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() =>
  console.log("Connected to mongoDb"))
  .catch((err) =>
    console.log("DATABASE CONNECTION FAILED", err))

app.set('view engine', 'ejs')
app.use(morgan('dev'))
app.use(bodyParser1.urlencoded({ extended: false }))
app.use(bodyParser1.json())

const corsOptions = {
  origin: ['http://127.0.0.1:8080', 'http://localhost:8080', 'http://127.0.0.1:3000', 'http://localhost:3000'],
  credentials: true
}
app.use(cors())

const generateRTCToken = (req, resp) => {
  const channelName = req.params.channel;
  if (!channelName) {
    return resp.status(500).json({ 'error': 'channel is required' });
  }

  let uid = req.params.uid;
  if (!uid || uid === '') {
    return resp.status(500).json({ 'error': 'uid is required' });
  }
  let role;

  if (req.params.role === 'host') {
    role = RtcRole.PUBLISHER;
  } else if (req.params.role === 'audience') {
    role = RtcRole.SUBSCRIBER
  } else {
    return resp.status(500).json({ 'error': 'role is incorrect' });
  }

  let expireTime = req.query.expiry;
  if (!expireTime || expireTime === '') {
    expireTime = 72000;
  } else {
    expireTime = parseInt(expireTime, 10);
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expireTime;
  let token;

  if (req.params.tokentype === 'userAccount') {
    token = RtcTokenBuilder.buildTokenWithAccount("a917d14afed34934a2f185b47e97eb0a", "63399e63c1ce49889642043b5610921c", channelName, uid, role, privilegeExpireTime)
  } else if (req.params.tokentype === 'uid') {

    token = RtcTokenBuilder.buildTokenWithUid("a917d14afed34934a2f185b47e97eb0a", "63399e63c1ce49889642043b5610921c", channelName, uid, role, privilegeExpireTime)
  } else {

    return resp.status(500).json({ 'error': 'token type is invalid' })
  }
  return resp.send({ 'rtcToken': token });
}

app.use('/handle-event', HandleEvent)
app.use('/handle-account', HandleAccounts)
app.use('/handle-creator', HandleCreators)
app.get('/rtc/:channel/:role/:tokentype/:uid', generateRTCToken);

app.use((req, res, next) => {
  const error = new Error('Not fsound')
  error.status = 404
  next(error)
});
app.use((error, req, res, next) => {
  res.status(error.status || 500)
  res.json({
    error: {
      mesage: error.mesage
    }
  });
});

module.exports = app 