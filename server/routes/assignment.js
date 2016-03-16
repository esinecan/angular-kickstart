var sys = require('sys');
var sift = require("sift");
var async = require("async");
var fs = require('fs');
var busboy = require('connect-busboy');
var multer  = require('multer');
var exec = require('child_process').exec;
var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var Document = require('../models/document');
var Assignment = require('../models/assignment');
var Segment = require('../models/segment');
var router = express.Router();
var userController = require('../controllers/user-controller');
var documentController = require('../controllers/document-controller');
var segmentService = require('../services/segment-service');
var mailService = require('../services/mail-service');
var ObjectId = require('mongoose').Types.ObjectId;
var upload = multer({ dest: '../../public/img/' })
var logger = require('../utils/logger');
var execSync = require('execSync');
var Request = require('request');
var gitWrapper = require('../utils/git-wrapper');
var dbWrapper = require('../utils/db-wrapper');

router.get('/assignedDocs', function(req, res) {
    Assignment.find({contributor: req.user, returned: false}).populate({
        path:'segment',
        model:'segments'
    }).populate({
        path:'document',
        model:'documents'
    }).populate({
        path:'owner',
        model:'accounts'
    }).populate({
        path:'rootSegment',
        model:'segments'
    }).exec( function(err, assignmentarr){
        if(err){
            logger.log('err', req.user.username + ' encountered an error while browsing their assigned documents: ' + err);
        }else{
            logger.log('info', req.user.username + ' browsed their assigned documents');
        }
        var returnarr = [];
        var i;
        for (i=0; i<assignmentarr.length; i++){
            var alreadyContains = false;
            returnarr.forEach(function (docSegment){
                //TODO htmlize
                if(docSegment.rootSegment.id == assignmentarr[i].rootSegment.id || assignmentarr[i].document.deleted){
                    alreadyContains = true;
                }
            });
            var val = new Object();
            val.title = assignmentarr[i].segment.title + "- by " + assignmentarr[i].owner.username;
            val.href = "/htmlViews/viewAssignedDoc/viewAssignedDoc.html?id=" + assignmentarr[i].rootSegment.id;
            val.rootSegment = assignmentarr[i].rootSegment;
            if(!alreadyContains)
                returnarr.push(val);
        }

        res.render('assignedDocs', {assignmentlist : returnarr});
    });
});

router.get('/acceptedDocs', function(req, res) {
    Assignment.find({contributor: req.user, accepted: true}).populate({
        path:'segment',
        model:'segments'
    }).populate({
        path:'document',
        model:'documents'
    }).exec( function(err, assignmentarr){
        if(err){
            logger.log('err', req.user.username + ' encountered an error while browsing their assigned documents: ' + err);
        }else{
            logger.log('info', req.user.username + ' browsed their assigned documents');
        }
        var returnarr = [];
        var i;
        for (i=0; i<assignmentarr.length; i++){
            var alreadyContains = false;
            returnarr.forEach(function (docSegment){
                //TODO htmlize
                if(docSegment.href == ("/htmlViews/viewAcceptedDoc/viewAcceptedDoc.html?id=" + assignmentarr[i].document.id) || assignmentarr[i].document.deleted){
                    alreadyContains = true;
                }
            });
            var val = new Object();
            val.title = assignmentarr[i].document.title;
            val.href = "/htmlViews/viewAcceptedDoc/viewAcceptedDoc.html?id=" + assignmentarr[i].document.id;
            if(!alreadyContains)
                returnarr.push(val);
        }

        res.render('assignedDocs', {assignmentlist : returnarr});
    });
});

router.get('/returnedDocs', function(req, res) {
    Assignment.find({owner: req.user, returned: true, accepted: false}).populate({
        path:'segment',
        model:'segments'
    }).populate({
        path:'document',
        model:'documents'
    }).exec( function(err, assignmentarr){
        if(err){
            logger.log('err', req.user.username + ' encountered an error while browsing their assigned documents: ' + err);
        }else{
            logger.log('info', req.user.username + ' browsed their assigned documents');
        }
        var returnarr = [];
        var i;
        for (i=0; i<assignmentarr.length; i++){
            var alreadyContains = false;
            returnarr.forEach(function (docSegment){
                //TODO htmlize
                if(docSegment.href == ("/htmlViews/viewReturnedDoc/viewReturnedDoc.html?id=" + assignmentarr[i].document.id) || assignmentarr[i].document.deleted){
                    alreadyContains = true;
                }
            });
            var val = new Object();
            val.title = assignmentarr[i].document.title;
            val.href = "/htmlViews/viewReturnedDoc/viewReturnedDoc.html?id=" + assignmentarr[i].document.id;
            if(!alreadyContains)
                returnarr.push(val);
        }

        res.render('assignedDocs', {assignmentlist : returnarr});
    });
});

router.post('/addSubSegmentToAssignment', function(req, res){
    Assignment.findOne({_id: req.body.assgnId}).exec(function(err, parentAssgn){
        var tempSegment = new Segment();
        tempSegment.segmentType = 1;
        tempSegment.title = req.body.title;
        var segmentContent = req.body.editor1;
        tempSegment.URI = (parentAssgn.contributorURI.split("/").splice(0,4).join("/")) + "/segment-" + (new Date()).getTime() + "/segmentText.dokrates";
        var result = execSync.exec("mkdir " + (parentAssgn.contributorURI.split("/").splice(0,4).join("/")) + "/segment-" + (new Date()).getTime());
        console.log('return code ' + result.code);
        var document = {};
        document.URI = (parentAssgn.contributorURI.split("/").splice(0,4).join("/"));
        gitWrapper.createSegment(tempSegment, document, segmentContent, function() {
            res.render('messageTheUser', { message : "Segment Creation Failed"});
        }, function(segURI){
            tempSegment.URI = segURI;
            tempSegment.document = null;
            dbWrapper.createSegment(tempSegment, function() {
                res.render('messageTheUser', { message : "Segment Creation Failed"});
            }, function(newseg){
                  Assignment.find({document: parentAssgn.document, order: {$gt: parentAssgn.order}}).exec(function(err, downwardsTravellers){
                    var updateArr = [];
                    var i;
                    for(i = 0; i<downwardsTravellers.length; i++){
                        updateArr.push(downwardsTravellers[i].id);
                    }
                    var update = { $inc: { order: 1}};
                    var options = { multi: true };
                    Assignment.update({_id: {$in: updateArr}}, update, options, function(err, numDownwardsTravellers) {
                        if(err){
                            res.send(JSON.stringify({ success: false}));
                        }else{
                            var newAssignment = new Assignment();
                            newAssignment.contributor = parentAssgn.contributor;
                            newAssignment.owner = parentAssgn.owner;
                            newAssignment.document = parentAssgn.document;
                            newAssignment.segment = newseg;
                            newAssignment.segmentType = 1;
                            newAssignment.rootSegment = parentAssgn.rootSegment;
                            newAssignment.title = req.body.title;
                            var srcUrl = tempSegment.URI.split("/");
                            var builderIndex;
                            newAssignment.copyDocSrc = "";
                            for(builderIndex = 0; builderIndex < srcUrl.length; builderIndex++){
                                if(builderIndex != 2){
                                    newAssignment.copyDocSrc =newAssignment.copyDocSrc + "/" + srcUrl[builderIndex];
                                }
                            }
                            newAssignment.copyDocSrc = newAssignment.copyDocSrc.substr(1, newAssignment.copyDocSrc.length - 1);
                            newAssignment.order = parentAssgn.order + 1;
                            newAssignment.level = parentAssgn.level + 1;
                            newAssignment.copyDocTarget = tempSegment.URI;
                            newAssignment.contributorURI = tempSegment.URI;
                            newAssignment.save(function(err, assgn){
                                if(err){
                                    res.render('messageTheUser', { message : "Segment Creation Failed"});
                                }else{
                                    res.render('messageTheUser', { message : "Segment Creation Completed"});
                                }
                            });
                        }
                    });
                });
            });
        });
    });
});

router.get('/returnedDoc/:id', function (req, res) {
    Assignment.find({document : req.params.id, returned: true, accepted: false}).populate({
        path:'segment',
        model:'segments'
    }).populate({
        path:'document',
        model:'documents'
    }).sort({order: 1}).exec( function(err, assignmentarr){
        if(err){
            logger.log('err', req.user.username + ' encountered an error while browsing their assigned document ' + assignmentarr[0].document.title + ' : ' + err);
        }else{
            logger.log('info', req.user.username + ' browsed their assigned document ' + assignmentarr[0].document.title);
        }
        var mydoc = assignmentarr[0].document;
        var assignmentReturnArr = [];
        assignmentarr.forEach(function (docSegment){
            var assignmentObj = {};
            assignmentObj.title = docSegment.title;
            if(docSegment.segment.segmentType == 1){
                assignmentObj.href = "/htmlViews/editTextSegment.html?id=" + docSegment.id;
            }else if(docSegment.segment.segmentType == 2){
                assignmentObj.href = "/htmlViews/editPictureSegment.html?id=" + docSegment.id;
            }
            if(docSegment.rootAssignment == null){
                assignmentObj.assignmentHref = "/assignmentReturn/" + docSegment.id;
            }
            assignmentObj.content = fs.readFileSync(docSegment.contributorURI, 'utf8');
            assignmentObj.segment = docSegment.segment;
            assignmentObj.document = docSegment.document;
            assignmentObj.rootSegment = docSegment.rootSegment;
            assignmentObj.level = docSegment.level;
            assignmentObj.order = docSegment.order;
            assignmentObj.id = docSegment.id;
            assignmentObj.returnNotes = docSegment.returnNotes;
            assignmentReturnArr.push(assignmentObj);
        });
        res.send({data : {doc : mydoc, segs: assignmentReturnArr}});
    });
});

router.get('/assignedDoc/:id', function (req, res) {
    Assignment.find({rootSegment : req.params.id, contributor: req.user._id, returned: false, accepted: false}).populate({
        path:'segment',
        model:'segments'
    }).populate({
        path:'document',
        model:'documents'
    }).sort({order: 1}).exec( function(err, assignmentarr){
        if(err){
            logger.log('err', req.user.username + ' encountered an error while browsing their assigned document ' + assignmentarr[0].document.title + ' : ' + err);
        }else{
            logger.log('info', req.user.username + ' browsed their assigned document ' + assignmentarr[0].document.title);
        }
        var mydoc = assignmentarr[0].document;
        var assignmentReturnArr = [];
        assignmentarr.forEach(function (docSegment){
            var assignmentObj = {};
            assignmentObj.title = docSegment.title;
            if(docSegment.segment.segmentType == 1){
                assignmentObj.href = "/htmlViews/editTextSegment.html?id=" + docSegment.id;
            }else if(docSegment.segment.segmentType == 2){
                assignmentObj.href = "/htmlViews/editPictureSegment.html?id=" + docSegment.id;
            }
            if(docSegment.rootAssignment == null){
                assignmentObj.assignmentHref = "/assignmentReturn/" + docSegment.id;
            }
            assignmentObj.content = fs.readFileSync(docSegment.contributorURI, 'utf8');
            assignmentObj.segment = docSegment.segment;
            assignmentObj.document = docSegment.document;
            assignmentObj.rootSegment = docSegment.rootSegment;
            assignmentObj.level = docSegment.level;
            assignmentObj.order = docSegment.order;
            assignmentObj.rejectNotes = docSegment.rejectNotes;
            assignmentObj.id = docSegment.id;
            assignmentReturnArr.push(assignmentObj);
        });
        res.send({data : {doc : mydoc, segs: assignmentReturnArr}});
    });
});

router.get('/acceptedDoc/:id', function (req, res) {
    Assignment.find({document : req.params.id, contributor: req.user._id, accepted: true}).populate({
        path:'segment',
        model:'segments'
    }).populate({
        path:'document',
        model:'documents'
    }).sort({order: 1}).exec( function(err, assignmentarr2){
        var acceptedRootIds = [];
        var i = 0;
        for(i = 0; i<assignmentarr2.length; i++){
            acceptedRootIds.push(assignmentarr2[i].segment.id);
        }
        Assignment.find({rootSegment: {$in: acceptedRootIds}}).populate({
            path:'segment',
            model:'segments'
        }).populate({
            path:'document',
            model:'documents'
        }).sort({order: 1}).exec( function(err, assignmentarr){
            if(err){
                logger.log('err', req.user.username + ' encountered an error while browsing their assigned document ' + assignmentarr[0].document.title + ' : ' + err);
            }else{
                logger.log('info', req.user.username + ' browsed their assigned document ' + assignmentarr[0].document.title);
            }
            var mydoc = assignmentarr[0].document;
            var assignmentReturnArr = [];
            assignmentarr.forEach(function (docSegment){
                var assignmentObj = {};
                assignmentObj.title = docSegment.segment.title;
                if(docSegment.segment.segmentType == 1){
                    assignmentObj.href = "/htmlViews/editTextSegment.html?id=" + docSegment.id;
                }else if(docSegment.segment.segmentType == 2){
                    assignmentObj.href = "/htmlViews/editPictureSegment.html?id=" + docSegment.id;
                }
                if(docSegment.rootAssignment == null){
                    assignmentObj.assignmentHref = "/assignmentReturn/" + docSegment.id;
                }
                assignmentObj.content = fs.readFileSync(docSegment.contributorURI, 'utf8');
                assignmentObj.segment = docSegment.segment;
                assignmentObj.document = docSegment.document;
                assignmentObj.rootSegment = docSegment.rootSegment;
                assignmentObj.level = docSegment.level;
                assignmentObj.order = docSegment.order;
                assignmentObj.rejectNotes = docSegment.rejectNotes;
                assignmentObj.id = docSegment.id;
                assignmentReturnArr.push(assignmentObj);
            });
            res.send({data : {doc : mydoc, segs: assignmentReturnArr}});
        });
    });
});

router.get('/getReturnedSegmentForComparison/:assgnId', function (req, res) {
    Assignment.findOne({_id : req.params.assgnId}).exec( function(err, theRoot){
        Assignment.find({rootSegment : theRoot.rootSegment, contributor: theRoot.contributor}).populate({
            path:'segment',
            model:'segments'
        }).populate({
            path:'document',
            model:'documents'
        }).sort({order: 1}).exec( function(err, assignmentarr2){
            var acceptedRootIds = [];
            var i = 0;
            for(i = 0; i<assignmentarr2.length; i++){
                acceptedRootIds.push(assignmentarr2[i].segment.id);
            }
            Assignment.find({rootSegment: {$in: acceptedRootIds}}).populate({
                path:'segment',
                model:'segments'
            }).populate({
                path:'document',
                model:'documents'
            }).populate({
                path:'contributor',
                model:'accounts'
            }).sort({order: 1}).exec( function(err, assignmentarr){
                if(err){
                    logger.log('err', req.user.username + ' encountered an error while browsing their assigned document ' + assignmentarr[0].document.title + ' : ' + err);
                }else{
                    logger.log('info', req.user.username + ' browsed their assigned document ' + assignmentarr[0].document.title);
                }
                var mydoc = assignmentarr[0].document;
                var assignmentReturnArr = [];
                assignmentarr.forEach(function (docSegment){
                    var assignmentObj = {};
                    assignmentObj.title = docSegment.title;
                    if(docSegment.segment.segmentType == 1){
                        assignmentObj.href = "/htmlViews/editTextSegment.html?id=" + docSegment.id;
                    }else if(docSegment.segment.segmentType == 2){
                        assignmentObj.href = "/htmlViews/editPictureSegment.html?id=" + docSegment.id;
                    }
                    if(docSegment.rootAssignment == null){
                        assignmentObj.assignmentHref = "/assignmentReturn/" + docSegment.id;
                    }
                    assignmentObj.content = fs.readFileSync(docSegment.contributorURI, 'utf8');
                    assignmentObj.segment = docSegment.segment;
                    assignmentObj.document = docSegment.document;
                    assignmentObj.rootSegment = docSegment.rootSegment;
                    assignmentObj.contributor = docSegment.contributor.username;
                    assignmentObj.level = docSegment.level;
                    assignmentObj.order = docSegment.order;
                    assignmentObj.rejectNotes = docSegment.rejectNotes;
                    assignmentObj.id = docSegment.id;
                    assignmentReturnArr.push(assignmentObj);
                });
                res.send({data : {doc : mydoc, segs: assignmentReturnArr}});
            });
        });
    });
});

router.get('/returnedAssignment', function (req, res) { //TODO: handle assignment case
    Assignment.find({owner: req.user, accepted:false}).populate({
        path:'segment',
        model:'segments'
    }).populate({
        path:'document',
        model:'documents'
    }).exec( function(err, assignmentarr){
        if(err){
            logger.log('err', req.user.username + ' encountered an error while returning their assignment on document ' + assignmentarr[0].document.title + ' and segment ' + assignmentarr[0].segment.title + ' : ' + err);
        }else{
            logger.log('info', req.user.username + ' returned their assignment on document ' + assignmentarr[0].document.title + ' and segment ' + assignmentarr[0].segment.title);
        }
        var assgnObjarr = [];
        assignmentarr.forEach(function (assgn){
            assgnObj = new Object();

            assgnObj.acceptHref = '/returnedAssignmentAccept/' + assgn.id
            assgnObj.rejectHref = '/returnedAssignmentReject/' + assgn.id
            assgnObj.doctitle = assgn.document.title;
            assgnObj.title = assgn.title;
            assgnObj.content = fs.readFileSync(assgn.contributorURI, 'utf8');
            assgnObj.returnNotes = assgn.returnNotes;
            assgnObjarr.push(assgnObj);
        });
        res.render('viewReturnedAssignments', {segs: assgnObjarr});
    });
});

router.get('/returnedAssignmentAccept/:id', function (req, res) { //TODO: handle assignment case
    Assignment.findOne({_id: req.params.id}).populate({
        path:'segment',
        model:'segments'
    }).exec( function(err, assgnmnt) {
        Assignment.find({rootSegment: assgnmnt.rootSegment, contributor: assgnmnt.contributor}).sort({order: -1}).exec(function(err, assgnArr){
            segmentService.getSegmentWithChildren(assgnmnt.rootSegment,function(segmentFamily){
                var lastOrderSeg = segmentFamily[segmentFamily.length - 1].order;
                var lastOrderAssgn = assgnArr[0].order;
                var increment = lastOrderAssgn - lastOrderSeg;
                var update = {$inc: {order: increment}}
                    , options = {multi: true};
                Segment.update({'order': {'$gt': lastOrderSeg}, 'document' : assgnmnt.document}, update, options, function (err) {
                    if (err) {
                        res.render('messageTheUser', {message: "Segment could not be accepted"});
                    }else{
                        recursiveAccepter(assgnArr, req, res);
                    }
                });
            })
        });
    });
});

function recursiveAccepter(assignmentArr, req, res){
    if(!assignmentArr || assignmentArr.length == 0){
        Assignment.findOne({_id: req.params.id}).populate({
            path:'contributor',
            model:'accounts'
        }).exec( function(err, assgn){
            mailService.sendAcceptedMail(assgn.contributor.email,
                function(){res.render('messageTheUser', {message: "Segment is accepted. But an error occured while sending the mail."});},
                function(){res.render('messageTheUser', {message: "Segment is accepted"});});
        });
    }else{
        if (!fs.existsSync(assignmentArr[0].copyDocSrc)){
            var urlPieces = assignmentArr[0].contributorURI.split("/");
            urlPieces[2] = urlPieces[3].split("-")[0] + "-documentsfol";
            assignmentArr[0].copyDocSrc = urlPieces.splice(0,urlPieces.length-1).join("/");
            if (!fs.existsSync(assignmentArr[0].copyDocSrc)){
                fs.mkdirSync(assignmentArr[0].copyDocSrc);
            }
        }
        execSync.exec("cp -avr " + assignmentArr[0].contributorURI +  " " + assignmentArr[0].copyDocSrc);
        Assignment.findByIdAndUpdate(assignmentArr[0].id, {$set: {accepted: true, returned: false}}, function(err, assgnmnt) {
            Assignment.findOne({_id: assignmentArr[0].id}).populate({
                path:'segment',
                model:'segments'
            }).populate({
                path:'document',
                model:'documents'
            }).exec( function(err, assgn){
                var update;
                if(assgn.segment.document == null){
                    var segpieces = assignmentArr[0].contributorURI.split("/");
                    var segmentURI = assignmentArr[0].copyDocSrc + "/" + (segpieces[segpieces.length - 1]);
                    var newSegOrder = assgn.order;
                    var level = assgn.level;
                    update = {document: assgn.document.id, URI: segmentURI, level: level, order: newSegOrder, title: assignmentArr[0].title};
                }else{
                    var newSegOrder = assgn.order;
                    var level = assgn.level;
                    update = {level: level, order: newSegOrder, title: assignmentArr[0].title};
                }
                Segment.findByIdAndUpdate(assgn.segment.id, {$set: update}, function(err, sgmnt) {
                    if(err){
                        res.send(JSON.stringify({ success: false}));
                    }else{
                        var i;
                        var newAssignmentArr = [];
                        for(i = 1; i< assignmentArr.length; i++){
                            newAssignmentArr.push(assignmentArr[i]);
                        }
                        recursiveAccepter(newAssignmentArr, req, res);
                    }
                });
            });
        });
    }
}

router.get('/returnedAssignmentReject/:id', function (req, res) {
    res.render('assignmentReject', {assignment: req.params.id});
});

router.post('/returnedAssignmentReject/:id', function (req, res) { //TODO: handle assignment case
    Assignment.findByIdAndUpdate(req.params.id, {$set: {accepted: false, returned: false, rejectNotes: req.body.returnnote}}, function(err, assgn) {
        assgn.save(function (err){
            if(err){
                logger.log('err', req.user.username + ' encountered an error while accepting their assignment ' + assgn.id + ' : ' + err);
            }else{
                logger.log('info', req.user.username + ' accepted their assignment ' + assgn.id);
            }
            var conditions = { rootSegment: assgn.rootSegment};
            var update = { returned: false, rejected: true};
            var options = { multi: true };
            Assignment.update(conditions, update, options, function(err, upwardsTravellers) {
                if (err) {
                    res.send(JSON.stringify({success: false}));
                } else {
                    Assignment.findOne({_id: req.params.id}).populate({
                        path:'contributor',
                        model:'accounts'
                    }).exec( function(err, assgn){
                        mailService.sendRejectedMail(assgn.contributor.email,
                            function(){res.render('messageTheUser', {message: "Segment is rejected. But an error occured while sending the mail."});},
                            function(){res.render('messageTheUser', {message: "Segment is rejected"});});
                    });
                }
            });
        });
    });
});

router.get('/assignmentReturn/:id', function (req, res) { //TODO: handle assignment case
    res.render('assignmentReturn', {assignment: req.params.id});
});

router.post('/assignmentReturn/:id', function (req, res) { //TODO: handle assignment case
    Assignment.findByIdAndUpdate(req.params.id, {$set: {returned: true, returnNotes: req.body.returnnote}}, function(err, assgn) {
        if(err){
            logger.log('err', req.user.username + ' encountered an error while returning their assignment ' + assgn.id + ' : ' + err);
        }else{
            logger.log('info', req.user.username + ' returned their assignment ' + assgn.id);
        }
        var conditions = { rootSegment: assgn.rootSegment};
        var update = { returned: true};
        var options = { multi: true };
        Assignment.update(conditions, update, options, function(err, upwardsTravellers) {
            if (err) {
                res.send(JSON.stringify({success: false}));
            } else {
                Assignment.findOne({_id: req.params.id}).populate({
                    path:'owner',
                    model:'accounts'
                }).exec( function(err, assgn){
                    mailService.sendReturnedMail(assgn.owner.email,
                        function(){res.render('messageTheUser', {message: "Segment is returned. But an error occured while sending the mail."});},
                        function(){res.render('messageTheUser', {message: "Segment is returned"});});
                });
            }
        });
        /*assgn.isReturned = true;
         assgn.accepted = false;
         assgn.returnNotes = req.body.returnnote;
         assgn.save(function(err){
         assgn.owner;
         res.render('messageTheUser', { message : "Segment is returned"});
         });*/
        /*
         var assgnObj = assgn.toObject();
         delete assgnObj._id;
         Assignment.update({_id: assgnObj.id}, assgnObj, {upsert: true}, function(err){
         res.render('messageTheUser', { message : "Segment is returned"});
         });
         * */
    });
});

router.get('/editAssignedSegment/:id', function (req, res) { //TODO: handle assignment case
    Assignment.find({_id : req.params.id, returned: false}).populate({
        path:'segment',
        model:'segments'
    }).populate({
        path:'document',
        model:'documents'
    }).exec( function(err, assignmentarr){
        if(err){
            logger.log('err', req.user.username + ' encountered an error while editing their assignment ' + assgn.id + ' : ' + err);
        }else{
            logger.log('info', req.user.username + ' accessed their assignment ' + assignmentarr[0].id + ' to edit.');
        }
        if(assignmentarr && assignmentarr.length == 0){
            res.render('messageTheUser', { message : "That segment seems to be a figment of your imagination"});
        }else{
            var editable = new Object();
            if(assignmentarr){
                editable.title = assignmentarr[0].title;
                editable.docid = assignmentarr[0].document.id;
                editable.doctitle = assignmentarr[0].document.title;
                editable.assgnid = assignmentarr[0].id;
                editable.content = fs.readFileSync(assignmentarr[0].contributorURI, 'utf8');
                editable.pictureSegmentLayout = assignmentarr[0].segment.pictureSegmentLayout;
            }
            res.send(JSON.stringify({ editable : editable}));
        }
    });
});

router.post('/editAssignedSegment/:id', upload.single('displayImage'), function (req, res) { //TODO: handle assignment case
    var segmentContent = req.body.editor1;
    Assignment.findOne({_id: req.params.id}).exec( function(err, assgn){
        if(err){
            logger.log('err', req.user.username + ' encountered an error while editing their assignment ' + assgn.id + ' : ' + err);
        }else{
            logger.log('info', req.user.username + ' edited their assignment ' + assgn.id);
        }
        if(req.file){
            var newfilename = new Date().getTime() + ".jpg";
            var newPath = "/images/" + newfilename;
            fs.createReadStream(req.file.path).pipe(fs.createWriteStream(__dirname.split("/").splice(0,__dirname.split("/").length -1).join("/") + "/public/images/" + newfilename).on('close', function (err) {
                var segmentContent = "<p>";
                if(req.body.pictureSegmentLayout == 1){
                    segmentContent += "<label>" + req.body.displayText + "</label>";
                    segmentContent += "<br/>";
                    segmentContent += '<img src="' + newPath + '"/>';
                } else if(req.body.pictureSegmentLayout == 2){
                    segmentContent += '<img src="' + newPath + '"/>';
                    segmentContent += "<br/>";
                    segmentContent += "<label>" + req.body.displayText + "</label>";
                } else if(req.body.pictureSegmentLayout == 3){
                    segmentContent += '<img src="' + newPath + '"/>';
                    segmentContent += "<label>" + req.body.displayText + "</label>";
                }
                segmentContent += "</p>";
                fs.writeFileSync(assgn.contributorURI, segmentContent, "utf8");
            }));
        }else{
            fs.writeFileSync(assgn.contributorURI, segmentContent, "utf8");
        }
        Assignment.findByIdAndUpdate(req.params.id, {$set: {title: req.body.title}}, function(err, assgnmnt) {
            res.render('messageTheUser', { message : "Segment updated"});
        });
    });
});

router.get('/assign/:id', function (req, res) {
    res.render('assignDoc', { segment : req.params.id});
});

router.post('/assign', function (req, res) {
    if(req.body.title){
        Account.findOne({ username: req.body.title}, function(err, account) {
            segmentService.getSegmentWithChildren(req.body.target, function(segmentFamily){
                if(segmentFamily && segmentFamily.length && segmentFamily.length > 0){
                    var i;
                    var filledAssignmentArr = [];
                    Assignment.find({document : segmentFamily[0].document._id, contributor: account._id, segment: segmentFamily[0]._id, accepted:false}).populate({
                        path:'segment',
                        model:'segments'
                    }).populate({
                        path:'document',
                        model:'documents'
                    }).exec( function(err, assignmentarr) {
                        if (assignmentarr.length == 0) {
                            for(i=0; i<segmentFamily.length; i++){
                                var newAssignment = {};
                                newAssignment.contributor = account._id;
                                newAssignment.owner = req.user._id;
                                newAssignment.document = segmentFamily[i].document._id;
                                newAssignment.segment = segmentFamily[i]._id;
                                newAssignment.segmentType = segmentFamily[i].segmentType;
                                newAssignment.title = segmentFamily[i].title;
                                newAssignment.pictureSegmentLayout = segmentFamily[i].pictureSegmentLayout;
                                //newAssignment.rootAssignment = rootAssgn._id;
                                newAssignment.rootSegment = segmentFamily[0]._id;
                                var newAssignmentSegmentURIPieces = segmentFamily[i].URI.split('/');
                                var newAssignmentCopyDocSrc = newAssignmentSegmentURIPieces.slice(0, 5).join("/");
                                newAssignment.copyDocSrc = newAssignmentCopyDocSrc;
                                newAssignment.order = segmentFamily[i].order;
                                newAssignment.level = segmentFamily[i].level;
                                newAssignmentSegmentURIPieces[2] = account.username + "-documentsfol";
                                var newAssignmentCopyDocTarget = newAssignmentSegmentURIPieces.slice(0, 5).join("/");
                                var copyDocTargetDir = newAssignmentSegmentURIPieces.slice(0, 4).join("/");
                                newAssignment.copyDocTarget = newAssignmentCopyDocTarget;
                                newAssignment.contributorURI = newAssignmentSegmentURIPieces.join("/");
                                if (!fs.existsSync(copyDocTargetDir)){
                                    fs.mkdirSync(copyDocTargetDir);
                                }
                                filledAssignmentArr.push(newAssignment);
                            }
                            Assignment.create(filledAssignmentArr, function (err, docs) {
                                if (err) {
                                    res.render('index', { user : req.user, userMessageErr    : "Could not assign document's children"});
                                } else {
                                    console.info('%d segments were successfully stored.', docs.length);
                                    var copyFuncArr = [];
                                    for(i = 0; i < docs.length; i++){
                                        //TODO This should be used instead: https://github.com/caolan/async#paralleltasks-callback;
                                        //copyFuncArr.push(function(){exec("cp -avr " + docs[i].copyDocSrc +  " " + docs[i].copyDocTarget , function (error, stdout, stderr) {sys.print('stdout: ' + stdout);})});
                                        var result = execSync.exec("cp -avr " + docs[i].copyDocSrc +  " " + docs[i].copyDocTarget);
                                        console.log('return code ' + result.code);
                                    }
                                    //async.parallel(copyFuncArr, function(){res.render('index', { user : req.user, userMessage : "Document assigned successfully"});});
                                    mailService.sendAssignedMail(account.email, function(){res.render('messageTheUser', { message : "Assignment could not be performed."});},
                                    function(){res.render('index', { user : req.user, userMessage : "Document assigned successfully"});})
                                }
                            });
                        }else{
                            res.render('messageTheUser', { message : "Assignment could not be performed."});
                        }
                    });
                }else{
                    res.render('messageTheUser', { message : "Assignment could not be performed."});
                }
            });
        });
    }else{
        res.render('index', { user : req.user });
    }
});

router.post('/goNorthAssgn', function(req, res) {
    Assignment.findOne({_id: req.body.id}).exec(function(uperr, segment1) {
        if(uperr){
            res.send(JSON.stringify({ success: false}));
        }else{
            Assignment.findOne({level : segment1.level, order : {$lt: segment1.order}, rootSegment: segment1.rootSegment
            }).sort({order: -1}).exec(function(err, previousSibling) {
                if(err){
                    res.send(JSON.stringify({ success: false}));
                }else{
                    Assignment.find({level: {$lt: segment1.level}, order: {$gt: previousSibling.order, $lt: segment1.order}, rootSegment: segment1.rootSegment}).sort({order:1}).exec(function (err, prevCandidate) {
                        if(previousSibling && !(prevCandidate && prevCandidate.length > 0)){
                            Assignment.find({order: {$gte: previousSibling.order, $lt: segment1.order}, rootSegment: segment1.rootSegment}).sort({order:1}).exec(function(err, downwardsTravellers) {
                                if(err){
                                    res.send(JSON.stringify({ success: false}));
                                } else{
                                    Assignment.findOne({level : segment1.level, order : {$gt: segment1.order}, rootSegment: segment1.rootSegment
                                    }).sort({order: 1}).exec(function(err, nextSibling) {
                                        if(err){
                                            res.send(JSON.stringify({ success: false}));
                                        }else{
                                            var conditions, update, options;
                                            if(nextSibling){
                                                conditions = { order: {$gte: segment1.order, $lt: nextSibling.order }, rootSegment: segment1.rootSegment};
                                            }else{
                                                conditions = { order: {$gte: segment1.order}, rootSegment: segment1.rootSegment};
                                            }
                                            update = { $inc: { order: (-1*downwardsTravellers.length) }};
                                            options = { multi: true };
                                            Assignment.find(conditions).sort({order:1}).exec(function(err, upwardsTravellers) {
                                                if(err){
                                                    res.send(JSON.stringify({ success: false}));
                                                }else{
                                                    var i;
                                                    var updateArr = [];
                                                    for(i = 0; i<upwardsTravellers.length; i++){
                                                        updateArr.push(upwardsTravellers[i].id);
                                                    }
                                                    Assignment.update({_id: {$in: updateArr}, rootSegment: segment1.rootSegment}, update, options, function(err, numUpwardsTravellers) {
                                                        if(err){
                                                            res.send(JSON.stringify({ success: false}));
                                                        }else{
                                                            var updateArr = [];
                                                            for(i = 0; i<downwardsTravellers.length; i++){
                                                                updateArr.push(downwardsTravellers[i].id);
                                                            }
                                                            update = { $inc: { order: upwardsTravellers.length}};
                                                            Assignment.update({_id: {$in: updateArr}, rootSegment: segment1.rootSegment}, update, options, function(err, numDownwardsTravellers) {
                                                                if(err){
                                                                    res.send(JSON.stringify({ success: false}));
                                                                }else{
                                                                    res.send(JSON.stringify({ success: true}));
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }else{
                            res.send(JSON.stringify({ success: false}));
                        }
                    });
                }
            });
        }
    });
});

router.post('/goSouthAssgn', function(req, res) {
    Assignment.findOne({_id: req.body.id}).exec(function(uperr, segment1) {
        if(uperr){
            res.send(JSON.stringify({ success: false}));
        }else{
            Assignment.findOne({level : segment1.level, order : {$gt: segment1.order}, rootSegment: segment1.rootSegment
            }).
            sort({ order: 1 }).exec(function(err, nextSibling) {
                Assignment.find({level: {$lt: segment1.level}, order: {$gt: segment1.order, $lt: nextSibling.order}, rootSegment: segment1.rootSegment}).
                sort({ order: 1 }).exec(function (err, nextCandidate) {
                    if(err){
                        res.send(JSON.stringify({ success: false}));
                    }else{
                        if(nextSibling && !(nextCandidate && nextCandidate.length > 0)){
                            Assignment.findOne({level : {$lte: nextSibling.level}, order : {$gt: nextSibling.order}, rootSegment: segment1.rootSegment
                            }).sort({order:1}).exec(function(err, nextNextSibling) {
                                if(err){
                                    res.send(JSON.stringify({ success: false}));
                                }else{
                                    var condition
                                    if(nextNextSibling){
                                        condition = {order : {$gte: nextSibling.order, $lt: nextNextSibling.order}, rootSegment: segment1.rootSegment};
                                    }else{
                                        condition = {order : {$gte: nextSibling.order}, rootSegment: segment1.rootSegment};
                                    }
                                    Assignment.find(condition).sort({order:1}).exec(function(err, upwardsTravellers){
                                        if(err){
                                            res.send(JSON.stringify({ success: false}));
                                        }else{
                                            Assignment.find({order : {$gte: segment1.order, $lt: nextSibling.order}, rootSegment: segment1.rootSegment}).exec(function(err, downwardsTravellers){
                                                if(err){
                                                    res.send(JSON.stringify({ success: false}));
                                                }else{
                                                    var i;
                                                    var updateArr = [];
                                                    for(i = 0; i<upwardsTravellers.length; i++){
                                                        updateArr.push(upwardsTravellers[i].id);
                                                    }
                                                    var update = { $inc: { order: (-1*downwardsTravellers.length) }};
                                                    var options = { multi: true };
                                                    Assignment.update({_id: {$in: updateArr}, rootSegment: segment1.rootSegment}, update, options, function(err, numUpwardsTravellers) {
                                                        if(err){
                                                            res.send(JSON.stringify({ success: false}));
                                                        }else{
                                                            updateArr = [];
                                                            for(i = 0; i<downwardsTravellers.length; i++){
                                                                updateArr.push(downwardsTravellers[i].id);
                                                            }
                                                            var update = { $inc: { order: (upwardsTravellers.length) }};
                                                            Assignment.update({_id: {$in: updateArr}, rootSegment: segment1.rootSegment}, update, options, function(err, numUpwardsTravellers) {
                                                                if(err){
                                                                    res.send(JSON.stringify({ success: false}));
                                                                }else{
                                                                    res.send(JSON.stringify({ success: true}));
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }else{
                            res.send(JSON.stringify({ success: false}));
                        }
                    }
                });
            });
        }
    });
});

router.post('/goEastAssgn', function(req, res) {
    Assignment.findOne({_id: req.body.id}).exec(function(uperr, segment1) {
        if(uperr || !segment1){
            res.send(JSON.stringify({ success: false}));
        }else{
            Assignment.findOne({level : {$lte: segment1.level}, order : {$lt: segment1.order}, rootSegment: segment1.rootSegment
            }).sort({order: -1}).exec(function(err, previousSibling) {
                if(err || !previousSibling){
                    res.send(JSON.stringify({ success: false}));
                }else{
                    if(segment1.level - previousSibling.level > 0){
                        res.send(JSON.stringify({ success: false}));
                    }else{
                        Assignment.findOne({level : {$lte: segment1.level}, order : {$gt: segment1.order}, rootSegment: segment1.rootSegment
                        }).sort({order:1}).exec(function(err, nextSibling) {
                            if(err){
                                res.send(JSON.stringify({ success: false}));
                            }else{
                                var condition;
                                if(nextSibling){
                                    condition = {order: {$gte: segment1.order, $lt: nextSibling.order}, rootSegment: segment1.rootSegment};
                                }else{
                                    condition = {order: {$gte: segment1.order}, rootSegment: segment1.rootSegment};
                                }
                                var update = { $inc: { level: 1 }};
                                var options = { multi: true };
                                Assignment.update(condition, update, options, function(err, numEastTravellers) {
                                    if(err){
                                        res.send(JSON.stringify({ success: false}));
                                    }else{
                                        res.send(JSON.stringify({ success: true}));
                                    }
                                });
                            }
                        });
                    }
                }
            });
        }
    });
});

router.post('/goWestAssgn', function(req, res) {
    Assignment.findOne({_id: req.body.id}).populate({
        path:'rootSegment',
        model:'segments'
    }).exec(function(uperr, segment1) {
        if(uperr || !segment1){
            res.send(JSON.stringify({ success: false}));
        }else{
            Assignment.findOne({level : (segment1.level - 1), order : {$lt: segment1.order}, rootSegment: segment1.rootSegment
            }).populate({
                path:'segment',
                model:'segments'
            }).sort({'order': -1}).exec(function(err, parentSegment) {
                if(err || !parentSegment || parentSegment.segment.id == segment1.rootSegment.id){
                    res.send(JSON.stringify({ success: false}));
                }else{
                    Assignment.findOne({level : {$lte: segment1.level}, order : {$gt: segment1.order}, rootSegment: segment1.rootSegment
                    }).sort({order: 1}).exec(function(err, nextSibling) {
                        if(err){
                            res.send(JSON.stringify({ success: false}));
                        }else{
                            var condition;
                            if(nextSibling){
                                condition = {order: {$gte: segment1.order, $lt: nextSibling.order}, rootSegment: segment1.rootSegment};
                            }else{
                                condition = {order: {$gte: segment1.order}, rootSegment: segment1.rootSegment};
                            }
                            var update = { $inc: { level: -1 }};
                            var options = { multi: true };
                            Assignment.update(condition, update, options, function(err, numWestTravellers) {
                                if(err){
                                    res.send(JSON.stringify({ success: false}));
                                }else{
                                    res.send(JSON.stringify({ success: true}));
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

module.exports = router;