const express = require('express');
const router = express.Router()
const { generateOTP, fast2sms } = require("../util/otp");
const twilio = require('twilio');
const CreatorsInfo = require('../data/creatorInfo')

const accountSid = 'AC75e9e9d2b51dd2021fed64e4a6f5c588';
const authToken = 'c07bd1677c3b5331de7719a113a898f9';
const client = new twilio(accountSid, authToken);
function mode(arr) {
    return arr.sort((a, b) =>
        arr.filter(v => v === a).length
        - arr.filter(v => v === b).length
    ).pop();
}

// returns if the walletaddress ]is already in the database
// generate otp and send it to the phone number
router.post('/send-otp', async (req, res, next) => {
    try {

        const phone = req.body.phone
        console.log("phone ", phone)
        CreatorsInfo.find({ phone  }).then(async data => {
            console.log("data ", data[0]);
            const otp = generateOTP(6)
            const message = `Your OTP is ${otp}`
            const contactNumber = phone
            console.log("contactNumber ", contactNumber)
            console.log("message ", message)
            if (data.length > 0) {
              
                data.otp = otp
                CreatorsInfo.findOneAndUpdate({ phone: contactNumber }, {otp:otp}, {
                    new: true,
                    upsert: true
                }).then(async (result) => {
                    console.log("result ", result);
                    try {
                        console.log("here 1", message, contactNumber);
                        const r = await client.messages.create({
                            body: message,
                            from: '+19704108380',
                            to: "+" + contactNumber
                        })
                        
                        console.log("here ", r);
                    } 
                    catch (err) {
                        console.log("fffff " , err);
                    }
                   
                   
                    return res.status(200).send({"response":true});
                }).
                    catch((err) => {
                        console.log("err ", err);
                        return res.status(400).send('Something when wrong1');
                    }
                    )

            }
            else{
                // create new account
                console.log("create new account");
            
                const creatorInfo = new CreatorsInfo({
                    nickName:"bob",
                    phone: phone,
                    otp: otp,
                    image: "https://i.imgur.com/0y0XQ2I.png",
                    creatorEvents: {},
                    creationDate: new Date(),
                    walletAddress: "0x0000000000000000000000000000000000000000",
                    socialLink: "",
                    proficiencyGame:"none",
                    topAchievement:"none",
                    region:"none",
                    status:"none",
                    experience:2000,
                    approvedCreator: false,
                })
                await creatorInfo.save()
                
                try{
                    const r = await client.messages.create({
                        body: message,
                        from: '+19704108380',
                        to: "+" + contactNumber
                    })
                    console.log("r ", r);
                    return res.status(200).send({"response":true});
                }
                catch(err){
                    console.log("err ", err);
                    return res.status(200).send({"response":false});
                }
         
              
            }
        
    })
    }
    catch (err) {
        return res.status(400).send('Something when wrong');
    }
})

//get creator route
router.post('/get-creator/:phone', async (req, res, next) => {
    try {
        const phone = req.params.phone
        const userOtp = req.body.otp
        // check if the otp is correct
        await CreatorsInfo.find({ phone
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
            console.log("phone ", walletAddress)
            if (data.length > 0) {
                console.log("found creator")
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
                console.log("did not find creator")
                createNewAccount = true
            }
        })
            .catch((err) => {
                res.status(404).send('Something went wrong')
            });

        if (createNewAccount) {

            var dt = new Date().toUTCString()
            dt = new Date(dt)
            //create new creator account
            /*
            example of creator account
            {
                nickName : "nick",
                image : "https://images.unsplash.com/photo-1561211919-1947abbbb35b?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8YWJzdHJhY3QlMjBibHVlfGVufDB8fDB8fA%3D%3D&w=1000&q=80",
                creatorEvents : {},
                walletAddress : "0x1234567890",
                socialLinks : "https://www.youtube.com/channel/UCJ5v_MCY6GNUBTO8-D3XoAg",
                proficiencyGame : "Fortnite",
                topAchievement : "top 10 in the world",
                status: "pro player",
                region: "NA",
                experience: "2021",
    
            }
            */
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
                console.log("found creator");
                var creatorEvents = data[0].creatorEvents;
                console.log("creatorEvents before ", creatorEvents)
                creatorEvents[event._id] = event;
                console.log("creatorEvents after ", creatorEvents)
                await CreatorsInfo.findOneAndUpdate({walletAddress}, {creatorEvents:creatorEvents}, { new: true }).then((result) => {
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
        console.log("remove-creator-events")
        const walletAddress = req.params.walletAddress
        const eventId = req.body.eventId
        await CreatorsInfo.find({ walletAddress }).then(async data => {
            if (data.length > 0) {
                console.log("found creator");
                var creatorEvents = data[0].creatorEvents;
                console.log("creatorEvents before ", creatorEvents)
                delete creatorEvents[eventId];
                console.log("creatorEvents after ", creatorEvents)
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
                console.log("found creator");
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
        if (req.body.nickName  && req.body.image && req.body.walletAddress  && req.body.proficiencyGame && req.body.topAchievement && req.body.experience && req.body.region)
        {
            query["approvedCreator"] = true
        }
        

        await CreatorsInfo.findOneAndUpdate({phone }, query, { new: true }).then(data => {
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