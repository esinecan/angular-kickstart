/**
 * Created by eren on 30.12.2015.
 */
var sys = require('sys');
var exec = require('child_process').exec;
var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var Document = require('../models/document');
var Assignment = require('../models/assignment');
var Segment = require('../models/segment');
var router = express.Router();

exports.createUser = function(user, pwd, email, errorCallback, successCallback){
    Account.register(user, pwd, function(err, account) {
        if (err) {
            errorCallback();
        }else{
            Account.findByIdAndUpdate(account.id, {$set: {email: email}}, function(err, accountSaved) {
                if (err) {
                    errorCallback();
                }else{
                    successCallback();
                }
            });
        }
    });
};

exports.logUserIn = function(req, res, successCallback){
    passport.authenticate('local')(req, res, function(){successCallback();});
};

exports.createDocument = function(username, newDocument, errorCallback, successCallback){
    newDocument.save(function(err, saveddoc) {
        if(err){
            errorCallback();
        }else{
            successCallback(saveddoc.id);
            if (false) {
                var segment = new Segment();
                segment.document = saveddoc;
                segment.title = "seg1 by " + username;
                segment.save(function (errSeg, savedseg) {
                    if (errSeg) {
                        errorCallback();
                    } else {
                        successCallback();
                    }
                });
            }
        }
    });
};

exports.createSegment = function (segment, errorCallback, successCallback){
    segment.save(function (err, newseg) {
        if(err){
            errorCallback();
        }else{
            successCallback(newseg);
        }
    });
};