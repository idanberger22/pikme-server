const express = require('express')
const router = express.Router()
const { generateOTP } = require("../util/otp")
const twilio = require('twilio')
const CreatorsInfo = require('../data/creatorInfo')
const keys = process.env.NODE_ENV === 'production' ? '' : require('../keys')
const accountSid = process.env.NODE_ENV === 'production' ? process.env.twilioSid : keys.twilioSid
const authToken = process.env.NODE_ENV === 'production' ? process.env.twilioAuth : keys.twilioAuth

router.post('/send-otp', async (req, res, next) => {
    try {
        const phone = req.body.phone
        const client = new twilio(accountSid, authToken)
        const data = await CreatorsInfo.find({ phone })
        const otp = generateOTP(6)
        const message = `Your pikmeCreators OTP is ${otp}`
        const contactNumber = phone
        if (data.length > 0) {
            data.otp = otp
            CreatorsInfo.findOneAndUpdate({ phone: contactNumber }, { otp: otp }, {
                new: true,
                upsert: true
            }).then(async () => {
                try {
                    await client.messages.create({
                        body: message,
                        from: '+19704108380',
                        to: "+" + contactNumber
                    })
                    return res.status(200).send({ "response": true });
                }
                catch (err) {
                    console.log("error", err);
                    return res.status(401).send({ "response": true });
                }
            }).
                catch((err) => {
                    console.log("err ", err);
                    return res.status(402).send('Something when wrong1');
                }
                )
        }
        else {
            const creatorInfo = new CreatorsInfo({
                nickName: "bob",
                phone: phone,
                otp: otp,
                image: "https://i.imgur.com/0y0XQ2I.png",
                creatorEvents: {},
                creationDate: new Date(),
                walletAddress: "0x0000000000000000000000000000000000000000",
                socialLink: "",
                proficiencyGame: "none",
                topAchievement: "none",
                region: "none",
                status: "none",
                experience: 2000,
                approvedCreator: false,
            })
            await creatorInfo.save()
            try {
                const r = await client.messages.create({
                    body: message,
                    from: '+19704108380',
                    to: "+" + contactNumber
                })
                return res.status(200).send({ "response": true });
            }
            catch (err) {
                console.log("err ", err);
                return res.status(200).send({ "response": false });
            }
        }
    }
    catch (err) {
        return res.status(403).send('Something when wrong');
    }
})

//get creator route
router.post('/get-creator/:phone', async (req, res, next) => {
    try {
        const phone = req.params.phone
        const userOtp = req.body.otp
        // check if the otp is correct
        await CreatorsInfo.find({
            phone
        }).then(data => {
            if (data.length > 0) {
                if (data[0].otp == userOtp) {
                    if (data[0].approvedCreator == false) {
                        return res.send(false)
                    }
                    return res.send(data[0]);
                }
                else {
                    return res.send("wrong otp");
                }
            }
            else {
                return res.status(400).send('Something when wrong');
            }
        })
            .catch((err) => {
                return res.status(400).send('Something when wrong');
            });
    }
    catch (err) {
        return res.status(400).send('Something when wrong');
    }
})

router.post('/add-creator/:walletAddress', async (req, res, next) => {
    try {
        var createNewAccount = false;
        var walletAddress = req.params.walletAddress
        // convert the wallet address to lowercase

        await CreatorsInfo.find({ walletAddress }).then(data => {
            if (data.length > 0) {
                // sort the events by date and if its over
                var events = data[0].creatorEvents
                var eventsArray = []
                for (var key in events) {
                    eventsArray.push(events[key])
                }
                eventsArray.sort(function (a, b) {
                    return new Date(b.date) - new Date(a.date);
                });

                data[0].creatorEvents = eventsArray

                return res.send(data[0])
            }
            else {
                createNewAccount = true
            }
        })
            .catch((err) => {
                res.status(404).send('Something went wrong')
            });

        if (createNewAccount) {

            var dt = new Date().toUTCString()
            dt = new Date(dt)
            const { nickName, image, creatorEvents, creationDate, walletAddress, socialLink, proficiencyGame, topAchievement, status, region, experience, approvedCreator } = {
                nickName: req.body.nickName,
                image: req.body.image,
                creatorEvents: {},
                creationDate: dt,
                walletAddress: req.params.walletAddress.toLocaleLowerCase(),
                socialLink: req.body.socialLink,
                proficiencyGame: req.body.proficiencyGame,
                topAchievement: req.body.topAchievement,
                status: req.body.status,
                region: req.body.region,
                experience: req.body.experience,
                approvedCreator: true
            }
            const creatorInfo = new CreatorsInfo({
                nickName,
                image,
                creatorEvents: {},
                creationDate,
                walletAddress,
                socialLink,
                proficiencyGame,
                topAchievement,
                status,
                region,
                experience,
                approvedCreator
            })
            await creatorInfo.save().then((result) => {
                return res.send(result);
            }).catch((err) => {
                console.log("err ", err);
                res.status(404).send('Something went wrong');;
            });
        }
    } catch (err) {
        console.log(err)
        res.status(404).send('Something went wrong');
    }
});

// gets event and pushes it to the creatorEvents array
router.post('/update-creator-events/:walletAddress', async (req, res, next) => {
    try {
        const walletAddress = req.params.walletAddress
        const event = req.body.event
        await CreatorsInfo.find({ walletAddress }).then(async data => {
            if (data.length > 0) {
                var creatorEvents = data[0].creatorEvents;
                creatorEvents[event._id] = event;
                await CreatorsInfo.findOneAndUpdate({ walletAddress }, { creatorEvents: creatorEvents }, { new: true }).then((result) => {
                    return res.send(result);
                }).catch((err) => {
                    console.log("err ", err);
                    res.status(404).send('Something went wrong');
                });
            }
            else {
                return res.status(404).send('Something went wrong');
            }
        })

    } catch (err) {
        console.log(err)
        res.status(404).send('Something went wrong');
    }
});

// remove event from creatorEvents array
router.post('/remove-creator-events/:walletAddress', async (req, res, next) => {
    try {
        const walletAddress = req.params.walletAddress
        const eventId = req.body.eventId
        await CreatorsInfo.find({ walletAddress }).then(async data => {
            if (data.length > 0) {
                var creatorEvents = data[0].creatorEvents;
                delete creatorEvents[eventId];
                await CreatorsInfo.findOneAndUpdate({ walletAddress }, { creatorEvents: creatorEvents }, { new: true }).then((result) => {
                    return res.send(result);
                }).catch((err) => {
                    console.log("err ", err);
                    res.status(404).send('Something went wrong');
                });
            }
            else {
                return res.status(404).send('Something went wrong');
            }
        })

    } catch (err) {
        console.log(err)
        res.status(404).send('Something went wrong');
    }
});



//gets all events and devide them to expired and not expired
router.get('/get-creator-events/:walletAddress', async (req, res, next) => {
    try {
        const walletAddress = req.params.walletAddress
        await CreatorsInfo.findOne({ walletAddress }).then(async data => {
            if (data) {
                var creatorEvents = data.creatorEvents;
                var expiredEvents = [];
                var notExpiredEvents = [];
                for (var i = 0; i < creatorEvents.length; i++) {
                    if (creatorEvents[i].expired) {
                        expiredEvents.push(creatorEvents[i]);
                    }
                    else {
                        notExpiredEvents.push(creatorEvents[i]);
                    }
                }
                return res.send({ "expired": expiredEvents, "upcoming": notExpiredEvents });
            }
            else {
                return res.status(404).send('Something went wrong');
            }
        })

    } catch (err) {
        console.log(err)
        res.status(404).send('Something went wrong');
    }
});




router.post('/update-info/:phone', async (req, res, next) => {
    try {
        const phone = req.params.phone
        let query = {}
        if (req.body.nickName) {
            query["nickName"] = req.body.nickName
        }
        if (req.body.status) {
            query["status"] = req.body.status
        }
        if (req.body.image) {
            query["image"] = req.body.image
        }
        if (req.body.socialLink) {
            query["socialLink"] = req.body.socialLink
        }
        if (req.body.proficiencyGame) {
            query["proficiencyGame"] = req.body.proficiencyGame
        }
        if (req.body.topAchievement) {
            query["topAchievement"] = req.body.topAchievement
        }
        //experience is the starting year of the creator
        if (req.body.experience) {
            query["experience"] = req.body.experience
        }
        // add address to the creator
        if (req.body.walletAddress) {
            query["walletAddress"] = req.body.walletAddress
        }
        if (req.body.region) {
            query["region"] = req.body.region
        }
        // if all required fields are filled, the creator is approved
        if (req.body.nickName && req.body.image && req.body.walletAddress && req.body.proficiencyGame && req.body.topAchievement && req.body.experience && req.body.region) {
            query["approvedCreator"] = true
        }


        await CreatorsInfo.findOneAndUpdate({ phone }, query, { new: true }).then(data => {
            if (data) res.send(data)
            else res.send({ error: "address not found" })
        })
            .catch((err) => {
                return res.status(404).send('Something went wrong');
            });

    }
    catch (err) {
        console.log(err)
        res.status(404).send('Something went wrong');
    }


});

// check if wallet adress already exist in the database
router.get('/check-wallet-address/:walletAddress', async (req, res, next) => {
    try {
        const walletAddress = req.params.walletAddress
        await CreatorsInfo.findOne({
            walletAddress
        }).then(data => {
            if (data) {
                return res.send({ "exist": true });
            }
            else {
                return res.send({ "exist": false });
            }
        })
    } catch (err) {
        console.log(err)
        res.status(404).send('Something went wrong');
    }
});


module.exports = router;