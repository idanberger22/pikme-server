const express = require('express')
const router = express.Router()
const EventInfo = require('../data/eventsinfo')
const Web3 = require('web3');
const ERC20TransferABI = [{ "inputs": [], "name": "PRICE_PER_TOKEN", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "uint256", "name": "confirmCodeNumber", "type": "uint256" }], "name": "buyTicket", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "confirmCode", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "saleIsActive", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address[]", "name": "sendTo", "type": "address[]" }, { "internalType": "uint256[]", "name": "amount", "type": "uint256[]" }], "name": "sendMoney", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }], "name": "setOwner", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "newPrice", "type": "uint256" }], "name": "setPrice", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bool", "name": "newState", "type": "bool" }], "name": "setSaleState", "outputs": [], "stateMutability": "nonpayable", "type": "function" }]
var web3 = new Web3(new Web3.providers.HttpProvider('https://bscrpc.com'));
const daiToken = new web3.eth.Contract(ERC20TransferABI, "0xc4e7146C0446D33aBb77Cc0cABfB0689bB68182D")
const CreatorsInfo = require('../data/creatorInfo')
const AccountsInfo = require('../data/accountinfo')
function containsObject(obj, list) {
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i].walletAddress == obj.walletAddress) {
      return true;
    }
  }

  return false;
}

router.get('/get-unapproved-events', async (req, res) => {
  try {
    var dt = new Date().toUTCString()
    dt = new Date(dt)
    const events = await EventInfo.find({ date: { $gt: dt }, approved: false })
    res.json(events)
  } catch (err) {
    res.json({ message: err })
  }
})

router.get('/get-most-popular-event', async (req, res) => {
  try {
    var dt = new Date().toUTCString()
    dt = new Date(dt)
    const events = await EventInfo.find({ date: { $gt: dt }, approved: true })
    let max = 0;
    let maxEvent;
    for (var i = 0; i < events.length; i++) {
      // sum all playersTickets values
      let sum = 0;
      for (var key in events[i].playersTickets) {
        sum += events[i].playersTickets[key];
      }

      if (sum > max) {
        max = sum;
        maxEvent = events[i];
      }
    }
    res.json(maxEvent)
  } catch (err) {
    res.json({ message: err })
  }
})



router.get('/get-events', async (req, res, next) => {
  var dt = new Date().toUTCString()
  dt = new Date(dt)
  let query = { approved: true, date: { $gte: dt } }

  const allLetters = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
  const possibleMistake = "aeiuock";
  try {
    if (req.query.search) {

      let posWord = req.query.search
      let posLetter;
      let posLetter2;
      let posLetter3;
      for (var i = 0; i < req.query.search.length; i++) {
        for (var j = 0; j < allLetters.length; j++) {
          if (i == 0) {
            posLetter2 = req.query.search.replace(req.query.search[i], allLetters[j] + req.query.search[i]);
            posLetter = req.query.search.replace(req.query.search[i], req.query.search[i] + allLetters[j]);
            posWord += " " + posLetter + " " + posLetter2;
          }
          else {
            posLetter = req.query.search.replace(req.query.search[i], req.query.search[i] + allLetters[j]);
            posWord += " " + posLetter
          }
        }
        if (possibleMistake.includes(req.query.search[i])) {
          for (var k = 0; k < possibleMistake.length; k++) {
            posLetter3 = req.query.search.replace(req.query.search[i], possibleMistake[k]);
            posWord += " " + posLetter3;
          }
        }
        posLetter = req.query.search.replace(req.query.search[i], '');
        posWord += " " + posLetter;
      }
      query["$text"] = { $search: posWord };

      let r = await EventInfo.find(query)
      return res.json(r)

    }
    else {
      EventInfo.find(query).then(data => {
        // remove all event that fund.current is bigger than fund.target
        for (var i = 0; i < data.length; i++) {
          if (data[i].fund) {
            if (data[i].fund.current >= data[i].fund.target) {
              data.splice(i, 1);
            }
          }
        }
        return res.json(data)
      })
    }
  } catch (err) {
    console.log(err)
    res.status(404).send('Something went wrong');
  }

})
// i think you should make youtube series about how you train your fundimentals as a pro player, people are searcing for value so it will help you grow your youtube

router.post('/create-event', async (req, res, next) => {
  try {
    const { player, shareWithCommunity, date, game, category } = req.body;
    const playerAddress = player.walletAddress;
    // if fund key exist in body add it to the event
    let eventInfo;
    if (req.body.fund) {
      let { fund } = req.body;
      if (fund.prize) {
        fund.prize = Number(fund.prize)
      }
      if (fund.target) {
        fund.target = Number(fund.target)
      }
      if (fund.current) {
        fund.current = Number(fund.current)
      }
      eventInfo = new EventInfo({
        players: [player],
        shareWithCommunity,
        date,
        game,
        category,
        over: false,
        viewers: {},
        likes: {},
        playersTickets: {},
        payed: false,
        teamTwoTickets: 0,
        approved: false,
        fund
      })
    } else {
      var initTickets = {}
      initTickets[playerAddress] = 0;
      const dt = new Date(date)
      eventInfo = new EventInfo({

        players: [player],

        shareWithCommunity,
        date: dt,
        game,
        category,
        over: false,
        viewers: {},
        likes: {},
        playersTickets: initTickets,
        payed: false,
        teamTwoTickets: 0,
        approved: false
      })
    }

    await eventInfo.save().then(async (eventRes) => {
      try {

        const event = eventRes
        await CreatorsInfo.find({ walletAddress: playerAddress }).then(async data => {
          if (data.length > 0) {
            var creatorEvents = data[0].creatorEvents;
            creatorEvents[event._id] = event;
            await CreatorsInfo.findOneAndUpdate({ walletAddress: playerAddress }, { creatorEvents }, { new: true }).then((result) => {
            }).catch((err) => {
              res.status(404).send('Something went wrong');
            });
          }
          else {
            return res.status(404).send('Something went wrong');
          }
        })


      } catch (err) {
        console.log(err)
        return res.status(404).send('Something went wrong');
      }
      return res.send(eventRes);
    })
      .catch((err) => {
        console.log("err ", err);
        res.status(404).send('Something went wrong');
      })
  } catch (err) {
    console.log(err)
    res.status(404).send('Something went wrong');
  }

})

//set the event over to true

router.post('/end-event/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // find the event and update over to true
    const event = await EventInfo.findOneAndUpdate({
      _id: eventId
    }, { $set: { over: true } }, { new: true }).then((result) => {
      if (result) {

        CreatorsInfo.find({}).then(creators => {
          for (let i = 0; i < creators.length; i++) {
            for (var key in creators[i].creatorEvents) {

              if (creators[i].creatorEvents[key]._id == eventId) {
                creators[i].creatorEvents[key] = result
              }
            }
            creators[i].markModified('creatorEvents');
            creators[i].save()
          }
        })
        return res.send(result);
      }
      else {
        return res.status(404).send('Something went wrong');

      }
    })
      .catch((err) => {
        console.log("err ", err);
        res.status(404).send('Something went wrong');
      }
      )
  }
  catch (err) {
    console.log(err)
    res.status(404).send('Something went wrong');
  }
}
)



// update player 2 object inside the event id that was sent from the pharams only if player2 is empty
router.put('/accept-event/:eventId', async (req, res, next) => {
  try {
    const { playerToAdd } = req.body;
    const playerAddress = playerToAdd.walletAddress;
    const id = req.params.eventId;
    await EventInfo.findById(id).then((result) => {
      const state = containsObject(playerToAdd, result.players);
      if (!state && playerToAdd && !result.approved) {

        var newReult = result;
        // push player to add to players array
        newReult.players.push(playerToAdd);
        // add player to tickets object
        newReult.playersTickets[playerToAdd.walletAddress] = 0;
        // FIND THE EVENT AND UPDATE IT
        EventInfo.findOneAndUpdate
          ({ _id: id }, { $set: newReult }, { new: true }).then(async (result) => {
            try {

              const event = result
              CreatorsInfo.find({}).then(async creators => {
                for (let i = 0; i < creators.length; i++) {
                  var creatorEvents;
                  for (var key in creators[i].creatorEvents) {

                    if (creators[i].creatorEvents[key]._id == id) {
                      console.log("found creator ", creators[i].walletAddress);
                      creatorEvents = creators[i].creatorEvents;
                      creatorEvents[event._id] = event;
                      creators[i].creatorEvents = creatorEvents
                      console.log("creatorEvents after ", creators[i].creatorEvents)
                      creators[i].markModified('creatorEvents');
                      creators[i].save()
                    }
                  }

                }
              })
              await CreatorsInfo.find({ walletAddress: playerAddress }).then(async data => {
                if (data.length > 0) {
                  var creatorEvents = data[0].creatorEvents;
                  creatorEvents[event._id] = event;
                  await CreatorsInfo.findOneAndUpdate({ walletAddress: playerAddress }, { creatorEvents: creatorEvents }, { new: true }).then((newResult1) => {
                  }).catch((err) => {
                    console.log("err ", err);
                    return res.status(404).send('Something went wrong');
                  });
                }
                else {
                  return res.status(404).send('Something went wrong');
                }
              })

            } catch (err) {
              console.log(err)

            }
            return res.send(result);

          })
          .catch((err) => {
            console.log("err ", err);
            return res.send(err);
          })
      }
      else {
        return res.status(200).send('user already accepted or you are the first player');
      }
    })
      .catch((err) => {
        console.log("err ", err);
        res.status(404).send('Something went wrong');
      })
  } catch (error) {
    console.log(error)
    res.status(404).send('Something went wrong');
  }
})

router.post("/invest-fund/:eventId", async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { amount, buyerAddress, confirmNumber } = req.body;
    let query = {}
    const smartConfrim = await daiToken.methods.confirmCode(buyerAddress).call()
    if (smartConfrim == confirmNumber) {
      const event = await EventInfo.findById(eventId).then(async (result) => {
        if (result) {
          if (result.fund) {
            let newFund = result.fund;
            // if fund current is not bigger then target
            if ((newFund.current + (0.01 * Number(amount))) <= newFund.target) {

              newFund.current = newFund.current + 0.01 * Number(amount);
              // update the fund.investors object with the address and new ammount 
              if (newFund.investors[buyerAddress]) {
                newFund.investors[buyerAddress] = newFund.investors[buyerAddress] + 0.01 * Number(amount);
              }
              else {
                newFund.investors[buyerAddress] = 0.01 * Number(amount);
              }
              query["fund"] = newFund;
              // update the event with query
              await EventInfo.findByIdAndUpdate(eventId, query, { new: true }).then(async (newDataEvent) => {
                if (newDataEvent) {
                  let newQuery = newDataEvent
                  newQuery["chosenAddress"] = newDataEvent.players[0].walletAddress
                  newQuery.date = new Date(newQuery.date);
                  // update the event on the creator object
                  await CreatorsInfo.findOne({ walletAddress: newDataEvent.players[0].walletAddress }).then(async creator => {
                    if (creator) {
                      let creatorEvents = creator.creatorEvents;
                      creatorEvents[newDataEvent._id] = newDataEvent;
                      await CreatorsInfo.findOneAndUpdate({ walletAddress: newDataEvent.players[0].walletAddress }, { creatorEvents: creatorEvents }, { new: true }).then(async (newDataCreator) => {
                        if (newDataCreator) {
                          // update the event on the buyer object

                          await AccountsInfo.findOne({ walletAddress: buyerAddress }).then(async (data) => {
                            data.matchHistory[newQuery._id] = newQuery
                            await AccountsInfo.findOneAndUpdate({ walletAddress: buyerAddress }, { matchHistory: data.matchHistory }, { new: true }).then(newData => {
                              if (newData) res.send(newQuery);
                              else res.status(400).send('problem');
                            })
                              .catch((err) => {
                                return res.send({ "error": "user 1s found" });
                              });
                          })
                            .catch((err) => {
                              return res.send({ "error": "user ys found" });
                            });

                        }
                      }).catch((err) => {
                        console.log("err ", err);
                        return res.status(404).send('Something went wrong');
                      }
                      );
                    }
                  }).catch((err) => {
                    console.log("err ", err);
                    return res.status(404).send('Something went wrong');
                  });
                }
                else res.status(400).send('update not found');
              })
            }
            else {
              return res.status(400).send('fund is full');
            }
          }
          else { return res.status(400).send('fund not found') }
          return res.status(400).send('fund not found');
        }
        else {
          return res.status(400).send('Event not found');
        }
      })
      return res.send(event);
    }
    else {
      return res.status(404).send('Something went wrong');
    }
  }
  catch (err) {
    console.log(err)
    res.status(404).send('Something went wrong');
  }
})

router.post('/sell-ticket/:eventId', async (req, res, next) => {
  //let client buy ticket and fill it in the db to know what team he choose what address he has and how many tickets he got ( called when payed to the blockchain)
  // confirm it with the block chain
  try {
    const eventId = req.params.eventId

    const { playerChosen, buyerAddress, confirmNumber, tickets } = req.body;
    let query = {}
    const smartConfrim = await daiToken.methods.confirmCode(buyerAddress).call()
    if (smartConfrim == confirmNumber) {
      await EventInfo.findById(eventId).then(async data => {
        let newViewers = data.viewers
        data.playersTickets[playerChosen] = data.playersTickets[playerChosen] + tickets
        query["playersTickets"] = data.playersTickets
        if (data.viewers[buyerAddress]) {
          if (data.viewers[buyerAddress].playerChosen != playerChosen) {
            data.playersTickets[playerChosen] = tickets + data.playersTickets[playerChosen] + data.viewers[buyerAddress].tickets
            data.playersTickets[data.viewers[buyerAddress].playerChosen] = data.playersTickets[data.viewers[buyerAddress].playerChosen] - data.viewers[buyerAddress].tickets
            query["playersTickets"] = data.playersTickets
          }
          newViewers[buyerAddress] = { playerChosen: playerChosen, tickets: tickets + data.viewers[buyerAddress].tickets }
        }
        else {
          newViewers[buyerAddress] = { playerChosen: playerChosen, tickets: tickets }
        }
        query["viewers"] = newViewers
        await EventInfo.findByIdAndUpdate(eventId, query, { new: true }).then(async (newDataEvent) => {
          if (newDataEvent) {
            let newQuery = newDataEvent
            newQuery["chosen"] = playerChosen
            newQuery.date = new Date(newQuery.date);
            await AccountsInfo.findOne({ walletAddress: buyerAddress }).then(async (data) => {
              data.matchHistory[newQuery._id] = newQuery
              await AccountsInfo.findOneAndUpdate({ walletAddress: buyerAddress }, { matchHistory: data.matchHistory }, { new: true }).then(newData => {
              })
                .catch((err) => {
                  return res.send({ "error": "user not found" });
                });
            })
              .catch((err) => {
                return res.send({ "error": "user not found" });
              });

            return res.send(newDataEvent)
          }
          else res.status(400).send('Event not found');
        })
          .catch((err) => {
            console.log("her", err)
            return res.status(400).send('Event not found');
          });
      })
        .catch((err) => {
          res.status(404).send('Something went wrong');
        });
    }
    else {
      res.status(404).send('Something went wrong');
    }
  } catch (err) {
    console.log(err)
    res.status(404).send('Something went wrong');
  }

});

router.post('/announce-winner/:eventId', async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    const { teamWon } = req.body;
    let query = {}
    let ticketCost = 20000000000000000;
    let moneyPerTicket = 0;
    let totalWon = 0;
    let winnersTickets = 0;
    await EventInfo.findById(eventId).then(async data => {
      let newViewers = data.viewers
      for (const [key, value] of Object.entries(newViewers)) {
        if (value.playerChosen != teamWon) {
          totalWon = totalWon + (value.tickets * ticketCost)
        }
        else {
          winnersTickets = winnersTickets + value.tickets
        }
      }
      if (winnersTickets != 0) {
        moneyPerTicket = (totalWon * 0.9) / winnersTickets
      }
      newViewers["0xae8B9A0e3759F32D36CDD80d998Bb18fB9Ccf53d"] = { playerChosen: teamWon, tickets: 0, moneyWon: 0.1 * totalWon }
      for (const [key, value] of Object.entries(data.viewers)) {
        if (value.playerChosen == teamWon) {
          newViewers[key] = { playerChosen: teamWon, tickets: value.tickets, moneyWon: (value.tickets * ticketCost + value.tickets * moneyPerTicket) }
        }
      }
      query["viewers"] = newViewers
      await EventInfo.findByIdAndUpdate(eventId, query, { new: true }).then(newData => {
        if (newData) {
          res.send(newData)
        }
        else res.status(400).send('Event not found');
      })
    })
  } catch (err) {
    console.log(err)
    res.status(404).send('Something went wrong');
  }
})

router.post('/announce-winner-fund/:eventId', async (req, res, next) => {
  try {
    const { prize } = req.body;
    const eventId = req.params.eventId;
    const event = await EventInfo.findById(eventId)
    const moneyToGive = {}
    const ratio = prize / event.fund.target
    const prizePool = prize - event.fund.target
    if (ratio >= 1) {
      for (const [key, value] of Object.entries(event.fund.investors)) {
        const part = value / event.fund.target
        moneyToGive[key] = { moneyWon: value + (part * prizePool * 0.9) }
      }
    }
    else {
      for (const [key, value] of Object.entries(event.fund.investors)) {
        moneyToGive[key] = { moneyWon: value * ratio }
      }
    }
    moneyToGive["0xae8B9A0e3759F32D36CDD80d998Bb18fB9Ccf53d"] = { moneyWon: 0.1 * prizePool }
    let query = {}
    query.viewers = moneyToGive
    await EventInfo.findByIdAndUpdate(eventId, query, { new: true })
    res.send(query)
  }

  catch (err) {
    res.status(400).send('Something went wrong');
  }
})

router.post('/get-results/:walletAddress', async (req, res, next) => {
  try {
    const walletAddress = req.params.walletAddress;
    const eventsIds = req.body;
    let events = {}
    for (var i = 0; i < eventsIds.length; i++) {
      await EventInfo.findById(eventsIds[i]).then(async data => {
        if (data.viewers[walletAddress].moneyWon > 0) {
          events[eventsIds[i]] = data.viewers[walletAddress].moneyWon
        }
        else {
          if (!data.payed) {
            events[eventsIds[i]] = 0
          }
          else {
            events[eventsIds[i]] = -1
          }
        }
      })
        .catch((err) => {
          return res.status(404).send('Something went wrong');
        });
    }
    return res.send(events)
  } catch (err) {
    console.log(err)
    return res.status(404).send('Something went wrong');
  }
});



// return spesific event viewers address into one list and money won into another list
router.get('/get-viewers/:eventId', async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    let viewers = []
    let moneyWon = []
    await EventInfo.findById(eventId).then(async data => {
      for (var key in data.viewers) {
        if (data.viewers[key].moneyWon > 0) {
          viewers.push(key)
          moneyWon.push(data.viewers[key].moneyWon)
        }

      }
      res.send({ viewers: viewers, moneyWon: moneyWon })
    })
      .catch((err) => {
        res.status(404).send('Something went wrong');
      });
  } catch (err) {
    console.log(err)
    res.status(404).send('Something went wrong');
  }
});


router.post('/make-like/:eventId', async (req, res, next) => {
  //let client buy ticket and fill it in the db to know what team he choose what address he has and how many tickets he got ( called when payed to the blockchain)
  // confirm it with the block chain
  try {
    const eventId = req.params.eventId
    const { buyerAddress, didLike } = req.body;
    let query = {}
    await EventInfo.findById(eventId).then(async data => {
      let newLikes = data.likes
      newLikes[buyerAddress] = didLike;
      query["likes"] = newLikes
      await EventInfo.findByIdAndUpdate(eventId, query, { new: true }).then(newData => {
        let countLikes = 0;
        let didLikeUser = false;

        if (newData) {
          for (var key in newData.likes) {
            if (newData.likes[key]) {
              countLikes += 1;
            }
          }
          if (newData.likes[buyerAddress]) {
            didLikeUser = true;
          }

          res.send({ "didLike": didLikeUser, "numberOfLikes": countLikes })
        }
        else res.status(400).send('not found')
      })
        .catch((err) => {
          res.status(404).send('Something went wrong')
        });
    })
      .catch((err) => {
        res.status(404).send('Something went wrong')
      });
  }
  catch (err) {
    console.log(err)
    res.status(404).send('Something went wrong')
  }

});

router.get('/wallet-connect/', async (req, res, next) => {
  const { team1, team2, shareWithCommunity, date, game, category } = req.params

  const eventInfo = new EventInfo({
    team1,
    team2,
    shareWithCommunity,
    date,
    game,
    category,
    approved: false

  });
  await eventInfo.save().then((result) => {
    return res.send(result);
  })
    .catch((err) => {
      console.log("err ", err)
      return res.send(err);
    });
});
router.get('/get-event-creator/:eventId', async (req, res, next) => {
  try {
    const id = req.params.eventId
    let dt = new Date();
    let query = { date: { $gte: dt } }
    query["_id"] = id
    EventInfo.find(query).then(data => {
      //if data empty return 404
      if (data.length == 0) {
        return res.status(404).send('Event not found')
      }
      return res.json(data[0])
    })
      .catch((err) => {
        res.status(404).send('Something went wrong')
      })
  } catch (err) {
    res.status(404).send('Something went wrong')
  }

})

router.get('/get-event/:eventId', async (req, res, next) => {
  try {
    const id = req.params.eventId
    let dt = new Date();
    let query = { approved: true, date: { $gte: dt } }
    query["_id"] = id
    EventInfo.find(query).then(data => {
      //if data empty return 404
      if (data.length == 0) {
        return res.status(404).send('Event not found')
      }
      return res.json(data[0])
    })
      .catch((err) => {
        res.status(404).send('Something went wrong')
      })
  } catch (err) {
    res.status(404).send('Something went wrong')
  }

})

// edit event details
router.post('/edit-event/:eventId', async (req, res, next) => {
  try {
    const eventId = req.params.eventId
    const { date, game, category, fund } = req.body;
    const dt = new Date(date)
    let query = {}
    query["date"] = dt
    query["game"] = game
    query["category"] = category
    query["fund"] = fund
    // fund to query

    await EventInfo.findByIdAndUpdate(eventId, query, { new: true }).then(newData => {

      if (newData) {
        CreatorsInfo.find({}).then(creators => {
          for (let i = 0; i < creators.length; i++) {
            for (var key in creators[i].creatorEvents) {

              if (creators[i].creatorEvents[key]._id == eventId) {
                creators[i].creatorEvents[key] = newData
              }
            }
            creators[i].markModified('creatorEvents');
            creators[i].save()
          }
        })
        return res.send(newData)
      }
      else res.status(400).send('Event not found');
    })

      .catch((err) => {
        res.status(400).send('Something went wrong');
      });
  } catch (err) {
    console.log(err)
    res.status(400).send('Something went wrong');
  }

});

// delete all unapproved events
router.post('/delete-unapproved-events', async (req, res, next) => {
  try {
    EventInfo.deleteMany({ approved: false }).then(data => {
      // delete from creators all events that are not approved
      CreatorsInfo.find({}).then(creators => {
        for (let i = 0; i < creators.length; i++) {
          let newEvents = {}
          for (var key in creators[i].creatorEvents) {

            if (creators[i].creatorEvents[key].approved) {
              newEvents[key] = creators[i].creatorEvents[key]
            }
          }
          creators[i].creatorEvents = newEvents
          creators[i].save()
        }
      })

      return res.status(200).send('Done')
    })
      .catch((err) => {

        res.status(404).send('Something went wrong')
      })
  } catch (err) {

    res.status(404).send('Something went wrong')
  }

})

// delete spesisfic unapproved event
router.post('/delete-unapproved-event/:eventId', async (req, res, next) => {
  try {
    const eventId = req.params.eventId
    EventInfo.findByIdAndDelete(eventId).then(data => {
      // delete from creators all events that are not approved\
      CreatorsInfo.find({}).then(creators => {
        for (let i = 0; i < creators.length; i++) {
          let newEvents = {}
          for (var key in creators[i].creatorEvents) {

            if (creators[i].creatorEvents[key]._id != eventId) {
              newEvents[key] = creators[i].creatorEvents[key]
            }
          }
          creators[i].creatorEvents = newEvents
          creators[i].save()
        }
      })

      return res.status(200).send('Done')
    })
      .catch((err) => {

        res.status(404).send('Something went wrong')
      })
  } catch (err) {

    res.status(404).send('Something went wrong')
  }

})



router.get('/get-event-stats/:eventId', async (req, res, next) => {
  //let client buy ticket and fill it in the db to know what team he choose what address he has and how many tickets he got ( called when payed to the blockchain)
  // confirm it with the block chain
  try {
    const eventId = req.params.eventId
    await EventInfo.find({ _id: String(eventId) }).then(async newData => {
      let ticketsSold = 0;

      if (newData && newData.length > 0) {
        newData = newData[0]
        var stats = {}
        for (var key in newData.playersTickets) {

          // get tickets sold by summing all players tickets
          ticketsSold += newData.playersTickets[key];
        }
        for (var key in newData.playersTickets) {
          var ratio;
          if (newData.playersTickets[key] > 0) {
            ratio = ((ticketsSold - newData.playersTickets[key]) / newData.playersTickets[key]) * 0.9 + 1
          }
          else {
            ratio = ((ticketsSold - newData.playersTickets[key]) / (newData.playersTickets[key] + 1)) * 0.9 + 1
          }
          stats[key] = ratio
          // if newdata.playerstickets length is 2 then calculate bet distribution
          if (Object.keys(newData.playersTickets).length == 2) {

            var percent;
            // if tickets sold is 0 then set it to 1 to avoid division by 0
            if (ticketsSold == 0) {
              percent = 50;
            }
            else if (newData.playersTickets[key] == 0) {
              percent = 0;
            }
            else {
              percent = (newData.playersTickets[key] / ticketsSold) * 100;
            }
            stats[key] = {
              ratio: ratio,
              percent: percent
            }
          }

        }
        stats["prizePool"] = ticketsSold * 0.02
        res.send(stats)

      }
      else res.status(400).send('Event not found')
    })

      .catch((err) => {
        res.status(400).send('Event f not found')
      });
  }
  catch (e) {
    res.status(404).send('Something went wrong')
  }


});

module.exports = router