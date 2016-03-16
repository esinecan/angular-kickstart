var nodemailer = require('nodemailer');
var mailServices = {};
function sendMail(mailParams, errorFunc, successFunc){
    var transporter = nodemailer.createTransport('smtps://dokratestest%40gmail.com:dokratestest1@smtp.gmail.com');

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: '"Dokrates" <esinecan@gmail.com>', // sender address
        to: mailParams.to, // list of receivers
        subject: mailParams.subject, // Subject line
        text: mailParams.text, // plaintext body
        html: '' // html body
    };

// send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            //TODO: Add logging
            errorFunc();
        }else{
            successFunc();
        }
    });
}

mailServices.sendAssignedMail = function (toAddress, errorFunc, successFunc){
    var mailOptions = {};
    mailOptions.to = toAddress;
    mailOptions.text = "A document has been assigned to you. Please visit Dokrates";
    mailOptions.subject = "new document yay!";
    sendMail(mailOptions, errorFunc, successFunc);
};
mailServices.sendReturnedMail = function (toAddress, errorFunc, successFunc){
    var mailOptions = {};
    mailOptions.to = toAddress;
    mailOptions.text = "A document you've assigned has been returned. Please visit Dokrates";
    mailOptions.subject = "returned doc hooray!";
    sendMail(mailOptions, errorFunc, successFunc);
};
mailServices.sendAcceptedMail = function (toAddress, errorFunc, successFunc){
    var mailOptions = {};
    mailOptions.to = toAddress;
    mailOptions.text = "A document you've returned has been accepted. Kudos m8.";
    mailOptions.subject = "returned assignment accepted :)";
    sendMail(mailOptions, errorFunc, successFunc);
};
mailServices.sendRejectedMail = function (toAddress, errorFunc, successFunc){
    var mailOptions = {};
    mailOptions.to = toAddress;
    mailOptions.text = "The assignment you returned has been rejected :( Please visit Dokrates";
    mailOptions.subject = "Got some bad news...";
    sendMail(mailOptions, errorFunc, successFunc);
};
module.exports = mailServices;