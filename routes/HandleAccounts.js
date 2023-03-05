const express = require('express')
const router = express.Router()
const AccountsInfo = require('../data/accountinfo')
const EventInfo = require('../data/eventsinfo')
function mode(arr){
    return arr.sort((a,b) =>
          arr.filter(v => v===a).length
        - arr.filter(v => v===b).length
    ).pop();
}

const namelist = ["fred", "marco", "nick", "bob", "steve", "alvert", "seo", "kim", "user51321", "user"]

router.post('/wallet-connect/:walletAddress', async (req, res, next) => {
    try{
        var createNewAccount = false;
        const walletAddress = req.params.walletAddress
    
        await AccountsInfo.find({ walletAddress }).then(data => {
            if (data.length > 0) {
                return res.send(data[0]);
            }
            else {
                createNewAccount = true;
            }
    
        })
            .catch((err) => {
                return res.status(400).send('Something when wrong');
            });
    
        if (createNewAccount) {
    
            var dt = new Date().toUTCString()
            dt = new Date(dt)
            const { nickName, image, about, moneyWon, matchHistory, creationDate,  } = {
                nickName: namelist[Math.floor(Math.random() * namelist.length)],
                image: "https://images.unsplash.com/photo-1561211919-1947abbbb35b?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8YWJzdHJhY3QlMjBibHVlfGVufDB8fDB8fA%3D%3D&w=1000&q=80",
                about: "about", moneyWon: 0, matchHistory: {}, creationDate: dt
            }
            const accountInfo = new AccountsInfo({
                nickName,
                about,
                image,
                moneyWon,
                matchHistory,
                creationDate,
                walletAddress,
            })
    
            await accountInfo.save().then((result) => {
                return res.send(result);
            })
                .catch((err) => {
                    console.log("err ", err);
                    return res.status(400).send('Something when wrong');
                });
        }
    }
    catch(err){
        return res.status(400).send('Something when wrong');
    }
   
});



router.post('/update-address-info/:walletAddress', async (req, res, next) => {
    try{
        const walletAddress = req.params.walletAddress.toLowerCase()
        let query = {}
        if (req.body.nickName) {
            query["nickName"] = req.body.nickName
        }
        if (req.body.about) {
            query["about"] = req.body.about
        }
        if (req.body.image) {
            query["image"] = req.body.image
        }
    
        await AccountsInfo.findOneAndUpdate({ walletAddress: String(walletAddress) }, query, { new: true }).then(data => {
            if (data) return res.send(data)
            else return res.status(400).send('Account update failed');
        })
            .catch((err) => {
                return res.status(400).send('Account update failed');
            });
    
    }
    catch(err){
        return res.status(400).send('Account update failed');
    }
    
});
router.post('/update-address-history/:walletAddress', async (req, res, next) => {

    const walletAddress = req.params.walletAddress.toLowerCase()
    let newQuery = req.body
    newQuery.date = new Date(newQuery.date);
    console.log("new data to add ", newQuery)
    await AccountsInfo.findOne({walletAddress}).then(async (data) => {
        console.log("test data is ", data.matchHistory)
            data.matchHistory[newQuery._id] = newQuery
        

            await AccountsInfo.findOneAndUpdate({ walletAddress }, {matchHistory:data.matchHistory}, { new: true }).then(newData => {
                if (newData) res.send(newData.matchHistory)
                else res.send({ error: "address not found" }) 
            })
                .catch((err) => {
                    return res.send({ "error": "user ys found" });
                });
            })  
            .catch((err) => {
                return res.send({ "error": "user ys found" });
        });
     
});

router.get('/get-tickets/:walletAddress', async (req, res, next) => {
    try{
        console.log("test " , req.body)
        var dt = new Date().toUTCString()
        dt = new Date(dt)
        const cDate = dt
        const pastList = []
        const upcomingList = []
        const walletAddress = req.params.walletAddress.toLowerCase()
        await AccountsInfo.findOne({walletAddress}).then(async data => {
            const history = data.matchHistory
            console.log("h" , history)
            var holderEvent;
            for (const key in history) {

                // if (history[key].fund) ignore the event
           
                await EventInfo.findById(key).then(eventData => {
                    
                    holderEvent = eventData.toObject()
                    holderEvent["chosenAddress"] = history[key].chosenAddress
                    history[key] = holderEvent
                    console.log("event 1 ", holderEvent)
                if(history[key].date <  cDate && holderEvent.over){
              
                    pastList.push(history[key])
                    pastList.sort(function(a,b){
                        // Turn your strings into dates, and then subtract them
                        // to get a value that is either negative, positive, or zero.
                        return new Date(b.date) - new Date(a.date);
                      });
                }
                else{
                    upcomingList.push(holderEvent)
                    upcomingList.sort(function(a,b){
                        // Turn your strings into dates, and then subtract them
                        // to get a value that is either negative, positive, or zero.
                        return new Date(b.date) - new Date(a.date);
                      });
               
                }
            })
                
            }
       
            return res.json({"past":pastList,"future":upcomingList})
        })
            .catch((err) => {
                return res.status(400).send('Something when wrong');
            })
    }catch(err){
        return res.status(400).send('Something when wrong');
    }
    
  })
  router.get('/get-stats/:walletAddress', async (req, res, next) => {
    try{
        const cDate = new Date();
        let gamesWon = 0
        let gamesLose = 0
        let rank = "unranked"
        let mostCommon
        const  gameList = []
        const walletAddress = req.params.walletAddress.toLowerCase()
        await AccountsInfo.findOne({walletAddress}).then(data => {
            const history = data.matchHistory
            for (const key in history) {
               if(history[key].result=="won"){
                gamesWon +=1
               }
               else if (history[key].result=="lose"){
                gamesLose +=1
               }
               if(history[key].game){
                gameList.push(history[key].game)
               }
            }
            
            const winRate = gamesWon / (gamesLose+gamesWon)
            if (gamesLose+gamesWon <10){
                rank = "unranked"
            }
            else if (0<=winRate<= 0.3){
                rank = "bronze"
            }
            else if (0.3<winRate<= 0.55){
                rank = "silver"
            }
            else if ( 0.55<winRate<= 0.9){
                rank = "gold"
            }
            else if ( 0.9<winRate<= 1 ){
                rank = "diamond"
            }
            else {
                rank = "unranked"
            }
            mostCommon = mode(gameList);
            return res.json({"gamesWon":gamesWon,"favGame": mostCommon, "rank":rank })
        })
            .catch((err) => {
                return res.status(400).send('Something when wrong');
            })
    }catch(err){
        return res.status(400).send('Something when wrong');
    }
    
  })
module.exports = router;