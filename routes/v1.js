const Router = require("express-promise-router");
const router = new Router();
const fetch = require("node-fetch");

/**
 * 
 * Sends game updates between two timestamps as server sent events. The replayer will replay from a set time until the current point, or 100,000 events, which ever comes first.
 * 
 * @route GET /replay
 * @group Game Updates
 * @summary Begin a replay from a time, to a time
 * @param {ISO-Timestamp} from - The start timestamp of the updates to replay.
 * @param {integer} interval - How long to take between each message in ms. Default: 4000
 * @param {integer} count - How many messages to send before ending the stream. Default: 100
 * @returns {text/event-stream} 200 - A series of server sent events, When updates end, the server will send an event with the data `end` to indicate the event stream should be closed. No more events will be sent after this.
 */
router.get("/replay",async (req, res)=>{
    if(!req.query.from) {
        res.status(400);
        res.send({error:"Require from paramater"});
        res.end();
        return;
    }
    let fromString = req.query.from.trim();
    let fromDate = new Date(fromString);
    if(isNaN(fromDate.getTime())){
        res.status(400);
        res.send({error:"from is not valid date"});
        return;
    }

    let nextdata = await fetch("https://api.sibr.dev/chronicler/v1/stream/updates?order=0&limit=100&after="+fromDate.toISOString()).then(async data=>data.json());

    let nextPage = nextdata.nextPage;
    let data = nextdata.data.map(data=>data.data);

    console.log("Starting stream");

    const headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    };
    res.writeHead(200, headers);
    res.write("\n");

    let interval = parseInt(req.query.interval) || 4000;

    let sent = 0;

    let i=0;
    let loading = false;
    let stream = setInterval(async (res)=>{
        if(loading) return;
        if(sent >= 100000 || data[i]==undefined){
            res.status(204);
            res.write("data: end\n\n");
            return clearInterval(stream);
        }
        // console.log("Sending Event",sent,data[i]);
        res.write("id: " + ++sent + "\n");
        res.write("data:"+JSON.stringify(data[i])+"\n\n");
        i++;
        if(i>=data.length){
            if(!nextPage){
                res.status(204);
                res.write("data: end\n\n");
                return clearInterval(stream);
            }
            loading=true;
            nextdata = await fetch("https://api.sibr.dev/chronicler/v1/stream/updates?order=0&page="+nextPage).then(async data=>data.json()).catch(console.error); 
            nextPage = nextdata.nextPage;
            data = nextdata.data.map(data=>data.data);
            i=0;
            console.log("Loaded Page:", nextPage);
            loading=false;
        }
    }, interval, res);

    req.on("close",()=>{console.log("Request Closed");clearInterval(stream);});
    req.on("end",()=>{console.log("Request Ended");clearInterval(stream);});

    // return res.sendStatus(200);
});

module.exports = router;
