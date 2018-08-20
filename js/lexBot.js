
var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
var lexruntime = new AWS.LexRuntime();

exports.handler = (event, context, callback) => {
    try {
        // By default, treat the user request as coming from the America/New_York time zone.
        var userInput = event.messages;

        console.log("userInput " + userInput);

        var params = {
            botAlias: '$LATEST', // required, has to be '$LATEST'
            botName: 'cloudProject', // required, the name of you bot
            inputText: userInput, // required, your text
            userId: event.refid, // required, arbitrary identifier
            sessionAttributes: {
            someKey: 'STRING_VALUE',
        }
