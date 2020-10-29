const Router = require("express-promise-router");
const router = new Router();
const fetch = require("node-fetch");

/**
 * 
 * Sends game updates between two timestamps as server sent events. The replayer will replay a maximum of 100 updates before closing the stream.
 * 
 * @route GET /replay
 * @group Game Updates
 * @summary Begin a replay from a time, to a time
 * @param {ISO-Timestamp} from - The start timestamp of the updates to replay.
 * @param {integer} interval - How long to take between each message in ms. Default: 3000 
 * @returns {text/event-stream} 200 - A series of server sent events, When updates end, the server will send an event with the data `close` to indicate the event stream should be closed. No more events will be sent after this.
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

    let data = await fetch("https://api.sibr.dev/chronicler/v1/stream/updates?limit=100&after="+fromDate.toISOString()).then(async data=>data.json());

    data = data.data.map(data=>data.data).reverse();

    console.log("Starting stream");
    
    const headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    };
    res.writeHead(200, headers);
    res.write("\n");

    let interval = parseInt(req.query.interval) || 3000;

    let sent = 0;

    let i=0;
    let stream = setInterval((res)=>{
        if(sent >= 100){
            res.status(204);
            res.write("data: end\n\n");
            return clearInterval(stream);
        }
        console.log("Sending Event",i,data[i]);
        res.write("id: " + ++sent + "\n");
        res.write("data:"+JSON.stringify(data[i])+"\n\n");
        i++;
    }, interval, res);

    req.on("close",()=>{console.log("Request Closed");clearInterval(stream);});
    req.on("end",()=>{console.log("Request Ended");clearInterval(stream);});

    // return res.sendStatus(200);
});

module.exports = router;
