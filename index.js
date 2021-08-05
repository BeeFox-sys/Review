const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const app = express();

const cors = require("cors");
const bodyParser = require("body-parser");

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

const expressSwagger = require("express-swagger-generator")(app);

expressSwagger({
    swaggerDefinition: {
        info: {
            description: "The SIBR api for replaying server sent events",
            title: "Review",
            version: "0.1.0"
        },
        host: process.env.HOST,
        basePath: "/v1",
        produces: [
            "application/json"
        ],
        schemes: ["https"],
    },
    basedir: __dirname,
    files: ["./routes/**/*.js"],
    route: {
        url: "",
        docs: "/docs.json",
    }
});


const routes = require("./routes/v1");

app.use("/v1", routes);


app.listen(process.env.PORT, ()=>console.log("Listening on",process.env.PORT));