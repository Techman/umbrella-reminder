# Umbrella Reminder
This Node.js program will return weather information and optionally send text message alerts to a specified phone number regarding precipitation.

## Configuration
An empty config file can be found in `config.default.json`. Please copy this to `config.json` and modify values there to be recognized by the program. **Comments are not permitted in the configuration file.**

### Options
* `darksky.key`: DarkSky API key
* `latitude`: Latitude of the weather location
* `longitude`: Longitude of the weather location
* `phone`: Phone number to send alerts to (e.g. `+18001234567`)
* `port`: Port number for web server to listen on, for use of Twilio webhooks
* `twilio.phone`: Phone number to send alerts from, formatted same as above
* `twilio.sid`: Twilio account SID
* `twilio.token`: Twilio project token

## SMS Commands
These are available when the app is started normally, e.g. `node index.js`:
* **weather [tomorrow]** - Summary weather
* **sunrise [tomorrow]** - Sunrise time
* **sunset [tomorrow]** - Sunset time
* **temperature [tomorrow]** - Temperature

## Umbrella Reminder/Alert
When app is started with `sms` as a command line argument (`node index.js sms`), the SMS commands will be unavailable. Instead, if the chance of precipitation is >= 50%, a single reminder is sent to the `phone` configured to bring an umbrella. The program exits afterward. The reminder will also report the actual percentage.

### Example use of reminder/alert
Below is syntax you can place into a crontab to send an umbrella reminder at 7 AM each day:
```cron
0 7 * * * node path/to/index.js sms
```
