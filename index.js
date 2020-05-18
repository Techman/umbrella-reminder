/**
 * Umbrella Reminder: Send weather information and/or rain alerts to your
 * phone
 *
 * Copyright (C) 2020 Michael Hazell <michaelhazell@hotmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

const BodyParser = require("body-parser");
const Config = require("./config.json");
const DarkSky = require("forecast.io");
const Express = require("express");
const Schedule = require("node-schedule");
const Twilio = require("twilio");

// Set up the dependencies the way we need it
let app = Express();
app.use(BodyParser.urlencoded({ extended: false }));
let client = new Twilio(Config.twilio.sid, Config.twilio.token);
const MessagingResponse = require("twilio").twiml.MessagingResponse;
let darksky = new DarkSky({ APIKey: Config.darksky.key });

// Fetch and store DarkSky information
// After it has some information it will call main, which may need the results
// instantly if called to just send the umbrella reminder and exit
let darkSkyResponse = undefined;
darksky.get(Config.latitude, Config.longitude, (error, response, data) => {
    darkSkyResponse = data;
    main();
});

// This logic is for the webhook portion of the project
app.post("/sms", (request, response) => {

    const twiml = new MessagingResponse();
    let responseText = "";

    // Helpful DarkSky alises
    let currently = darkSkyResponse["currently"];
    let today = darkSkyResponse["daily"]["data"]["0"];
    let tomorrow = darkSkyResponse["daily"]["data"]["1"];

    // Helpful Twilio aliases
    let destNumber = request.body.To;
    let fromNumber = request.body.From;
    let messageBody = request.body.Body.toLowerCase();

    let args = messageBody.split(" ");
    let command = args[0];
    let checkTomorrow = args[1] === "tomorrow";
    switch (command) {
        case "weather":
            responseText = "Summary weather:\n";
            if (checkTomorrow) {
                responseText += tomorrow["summary"] + "\n" +
                    "High: " + tomorrow["temperatureHigh"] + "\n" +
                    "Low: " + tomorrow["temperatureLow"] + "\n" +
                    "Precipitation: " + (tomorrow["precipProbability"] * 100) + "%";
            } else {
                responseText += currently["summary"] + "\n" +
                    currently["temperature"] + "\n" +
                    "Precipitation: " + (currently["precipProbability"] * 100) + "%";
            }
            break;

        case "sunrise":
            responseText = "Sunrise information:\n";
            if (checkTomorrow) {
                let date = new Date(tomorrow["sunriseTime"] * 1000);
                responseText += date.toLocaleTimeString();
            } else {
                let date = new Date(today["sunriseTime"] * 1000);
                responseText += date.toLocaleTimeString();
            }
            break;

        case "sunset":
            responseText = "Sunset information:\n";
            if (checkTomorrow) {
                let date = new Date(tomorrow["sunsetTime"] * 1000);
                responseText += date.toLocaleTimeString();
            } else {
                let date = new Date(today["sunsetTime"] * 1000);
                responseText += date.toLocaleTimeString();
            }
            break;

        case "temp":
        case "temperature":
            responseText = "Temperature information:\n";
            if (checkTomorrow) {
                responseText += "High: " + tomorrow["temperatureHigh"] + "\n" +
                    "Low: " + tomorrow["temperatureLow"];
            } else {
                responseText += currently["temperature"];
            }
            break;

        default:
            // Send the commands
            responseText = "Commands:\nweather [tomorrow]\nsunrise [tomorrow]\nsunset [tomorrow]\ntemperature [tomorrow]";
            break;
    }
    response.set("Content-Type", "text/xml");
    twiml.message(responseText);
    response.send(twiml.toString());
});

// Main function
// The logic to decide whether to send an SMS alert or start the Express app
// is here. By this point, DarkSky information will be present.
function main() {
    // If 'sms' is passed in, don't start the web server. Just send the umbrella message.
    if (process.argv[2] === "sms") {
        let today = darkSkyResponse["daily"]["data"]["0"];
        if (today["precipProbability"] >= 0.50) {
            let body = "Today's chance of rain will be " + (today["precipProbability"] * 100) + "%!\n" +
                "Bring an umbrella!";
            client.messages.create({
                body: body,
                to: Config.phone,
                from: Config.twilio.phone
            });
        }
    } else {
        // Start the express app
        app.listen(Config.port);

        // Create a timer to refresh weather information every day
        let dailyFetch = Schedule.scheduleJob("0 0 * * *",
            darksky.get(Config.latitude, Config.longitude, (error, response, data) => {
                darkSkyResponse = data;
            }));
    }
}
