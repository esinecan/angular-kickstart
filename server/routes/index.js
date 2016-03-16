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
var ObjectId = require('mongoose').Types.ObjectId;
var upload = multer({ dest: '../../public/img/' })
var logger = require('../utils/logger');
var execSync = require('execSync');
var Request = require('request');


router.get('/', function (req, res) {
    logger.log('info', 'guest arrived at main page');
    res.render('index', { user : req.user });
});

router.get('/addNewSegmentToDoc/:id', function(req, res) {
    Document.find({_id: req.params.id, deleted: false}).exec( function(err, docarr){
        res.render('selectSegmentType', {doc : docarr[0], wedone: false, subSegment: false});
    });
});

router.get('/addNewSubSegmentToDoc/:segId', function(req, res) {
    Segment.find({_id: req.params.segId}).exec( function(err, docarr){
        res.render('selectSegmentType', {doc : docarr[0], wedone: false, subSegment: true});
    });
});

router.post('/selectSegmentType', function(req, res) {
    Document.find({_id: req.body.docId, deleted: false}).exec( function(err, docarr){
        if(err){
            logger.log('err', req.user.username + ' encountered an error while selecting a segment type for document ' + docarr[0].title + ' : ' + err);
        }
        if(req.body.segmentType == 1){
            res.render('addNewSegment', {doc : docarr[0], wedone: false});
        }else if(req.body.segmentType == 2){
            res.render('addNewPictureSegment', {doc : docarr[0], wedone: false});
        }
    });
});

router.post('/selectSubSegmentType', function(req, res) {
    Segment.find({_id: req.body.docId}).populate({
        path:'document',
        model:'documents'
    }).exec( function(err, docarr){
        if(err){
            logger.log('err', req.user.username + ' encountered an error while selecting a segment type for document ' + docarr[0].title + ' : ' + err);
        }
        if(req.body.segmentType == 1){
            res.render('addNewSegment', {doc : docarr[0], wedone: false, subSegment: true});
        }else if(req.body.segmentType == 2){
            res.render('addNewPictureSegment', {doc : docarr[0], wedone: false, subSegment: true});
        }
    });
});

router.post('/addNewPictureSegment', upload.single('displayImage'), function(req, res) { //TODO: refactor
    if(req.body.segId){
        addNewPictureSubSegment(req, res)
    }else{
        Document.find({_id: req.body.docId, deleted: false}).exec( function(err, docarr){
            Segment.find({document: req.body.docId}, {
                skip:0, // Starting Row
                limit:1, // Ending Row
                sort:{
                    order: -1 //Sort by Order DESC
                }
            }).populate({
                path:'document',
                model:'documents'
            }).exec( function(err, segarr){
                if(err){
                    logger.log('err', req.user.username + ' encountered an error while adding a picture segment to document ' + docarr[0].title + ' : ' + err);
                }
                var seg = new Segment();
                seg.document = docarr[0];
                seg.title = req.body.title;
                seg.segmentType = 2;
                seg.level = 0;
                if(segarr && segarr.length > 0){
                    seg.order = segarr[0].order + 1;
                }else{
                    seg.order = 0;
                }
                seg.pictureSegmentLayout = req.body.pictureSegmentLayout;
                var newfilename = new Date().getTime() + ".jpg";
                var newPath = "/images/" + newfilename;
                fs.createReadStream(req.file.path).pipe(fs.createWriteStream(__dirname.split("/").splice(0,__dirname.split("/").length -1).join("/") + "/public/images/" + newfilename).on('close', function (err) {
                    var segmentContent = "<p>";
                    if(seg.pictureSegmentLayout == 1){
                        segmentContent += "<label>" + req.body.displayText + "</label>";
                        segmentContent += "<br/>";
                        segmentContent += '<img src="' + newPath + '"/>';
                    } else if(seg.pictureSegmentLayout == 1){
                        segmentContent += '<img src="' + newPath + '"/>';
                        segmentContent += "<br/>";
                        segmentContent += "<label>" + req.body.displayText + "</label>";
                    } else if(seg.pictureSegmentLayout == 1){
                        segmentContent += '<img src="' + newPath + '"/>';
                        segmentContent += "<label>" + req.body.displayText + "</label>";
                    }
                    segmentContent += "</p>";
                    documentController.createSegment(seg, docarr[0], segmentContent, function(){console.log("ERROR WHILE CREATING SEGMENT")}, function(newseg){
                        if(segarr.length > 0){
                            res.render('addNewSegment', {doc : docarr[0], wedone: true});
                        }else{
                            res.render('addNewSegment', {doc : docarr[0], wedone: true});
                        }
                    });
                }));
            });
        });
    }
});
function addNewPictureSubSegment (req, res) {
    Segment.find({_id: req.body.segId}).populate({
        path:'document',
        model:'documents'
    }).exec( function(err, docarr){
        /*
         Segment.findByIdAndUpdate(req.body.childId, {$set: {parent: segment.id}}, function(err, sgmnt) {
             if(err){
                res.send(JSON.stringify({ success: false}));
             }else{
                res.send(JSON.stringify({ success: true}));
             }
         });
        * */
        Segment.findOne({level: docarr[0].level}).where('order').gt(docarr[0].order).populate({
            path:'document',
            model:'documents'
        }).exec(function(err, segment) {
            Segment.find({document: req.body.docId}, {
                skip:0, // Starting Row
                limit:1, // Ending Row
                sort:{
                    order: -1 //Sort by Order DESC
                }
            }).populate({
                path:'document',
                model:'documents'
            }).exec( function(err, segarr){
                var newSegOrder;
                if(segment){
                    newSegOrder = segment.order;
                }else{
                    newSegOrder = segarr[0].order + 1;
                }
                var conditions = {$where: function() {
                    return (this.order >= segment.order); }}
                    , update = { $inc: { order: 1 }}
                    , options = { multi: true };
                Segment.update(conditions, update, options, function(err){
                    if(err){
                        logger.log('err', req.user.username + ' encountered an error while adding a picture segment to document ' + docarr[0].title + ' : ' + err);
                    }
                    var seg = new Segment();
                    seg.order = newSegOrder;
                    seg.document = docarr[0].document;
                    seg.title = req.body.title;
                    seg.segmentType = 2;
                    seg.level = docarr[0].level + 1;
                    seg.pictureSegmentLayout = req.body.pictureSegmentLayout;
                    var newfilename = new Date().getTime() + ".jpg";
                    var newPath = "/images/" + newfilename;
                    fs.createReadStream(req.file.path).pipe(fs.createWriteStream(__dirname.split("/").splice(0,__dirname.split("/").length -1).join("/") + "/public/images/" + newfilename).on('close', function (err) {
                        var segmentContent = "<p>";
                        if(seg.pictureSegmentLayout == 1){
                            segmentContent += "<label>" + req.body.displayText + "</label>";
                            segmentContent += "<br/>";
                            segmentContent += '<img src="' + newPath + '"/>';
                        } else if(seg.pictureSegmentLayout == 1){
                            segmentContent += '<img src="' + newPath + '"/>';
                            segmentContent += "<br/>";
                            segmentContent += "<label>" + req.body.displayText + "</label>";
                        } else if(seg.pictureSegmentLayout == 1){
                            segmentContent += '<img src="' + newPath + '"/>';
                            segmentContent += "<label>" + req.body.displayText + "</label>";
                        }
                        segmentContent += "</p>";
                        documentController.createSegment(seg, docarr[0].document, segmentContent, function(){console.log("ERROR WHILE CREATING SEGMENT")}, function(newseg){
                            res.render('addNewSegment', {doc : docarr[0].document, wedone: true, subSegment: true});
                        });
                    }));
                });
            });
        });
    });
};

router.get('/editSegment/:id', function (req, res) { //TODO: handle assignment case
    Segment.find({_id : req.params.id}).populate({
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
                editable.content = fs.readFileSync(assignmentarr[0].URI, 'utf8');
                editable.pictureSegmentLayout = assignmentarr[0].pictureSegmentLayout;
            }
            res.send(JSON.stringify({ editable : editable}));
        }
    });
});

router.post('/editSegment/:id', upload.single('displayImage'), function (req, res) { //TODO: handle assignment case
    var segmentContent = req.body.editor1;
    Segment.findOne({_id: req.params.id}).exec( function(err, assgn){
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
                fs.writeFileSync(assgn.URI, segmentContent, "utf8");
            }));
        }else{
            fs.writeFileSync(assgn.URI, segmentContent, "utf8");
        }
        Segment.findByIdAndUpdate(req.params.id, {$set: {title: req.body.title}}, function(err, sgmnt) {
            if(err){
                res.render('messageTheUser', { message : "Segment could not be updated"});
            }else{
                res.render('messageTheUser', { message : "Segment updated"});
            }
        });
    });
});

router.post('/deleteSegment', function(req, res){
    segmentService.getSegmentWithChildren(req.body.id, function(deleteCandidateSegs){
        var deleteCandidateCount = deleteCandidateSegs.length;
        var biggestOrder= 0;
        var i;
        var document = deleteCandidateSegs[0].document._id;
        var deleteArr = [];
        for(i = 0; i< deleteCandidateSegs.length; i++){
            if(deleteCandidateSegs[i].order > biggestOrder){
                biggestOrder = deleteCandidateSegs[i].order;
            }
            deleteArr.push(deleteCandidateSegs[i].id);
        }
        Segment.find({_id: {$in: deleteArr}}).remove().exec(function(err, deletedSegs){
            if(err){
                res.send(JSON.stringify({ success: false}));
            }else{
                var conditions = { order: {$gte: biggestOrder}, document: document};
                var update = { $inc: { order: (-1*deleteCandidateCount) }};
                var options = { multi: true };
                Segment.update(conditions, update, options, function(err, numUpwardsTravellers) {
                    if(err){
                        res.send(JSON.stringify({ success: false}));
                    }else{
                        res.send(JSON.stringify({ success: true}));
                    }
                });
            }
        });
    });
});

router.get('/addNewSibSegmentToDoc/:segId', function(req, res) {
    Segment.find({_id: req.params.segId}).populate({
        path:'document',
        model:'documents'
    }).exec( function(err, docarr){
        res.render('addNewSegment', {doc : docarr[0], wedone: false, sibSegment: true});
    });
});

router.post('/addNewSegmentToDoc/:id', function(req, res) {
    if(req.body.segId){
        if(req.body.isSibling){
            addSibSeg(req, res);
        }else{
            addSubSeg(req, res);
        }
    }else{
        Document.find({_id: req.params.id, deleted: false}).exec( function(err, docarr){
            Segment.find({document: req.body.docId}).limit(1).
            sort({ order: -1 }).populate({
                path:'document',
                model:'documents'
            }).exec( function(err, segarr){
                var seg = new Segment();
                seg.document = docarr[0];
                seg.title = req.body.title;
                seg.level = 0;
                if(segarr && segarr.length > 0){
                    seg.order = segarr[0].order + 1;
                }else{
                    seg.order = 0;
                }
                seg.segmentType = 1;
                var segmentContent = req.body.editor1;
                documentController.createSegment(seg, docarr[0], segmentContent, function(){console.log("ERROR WHILE CREATING SEGMENT")}, function(newseg, createErr){
                    if(newseg && newseg.id){
                        if(createErr){
                            res.send(JSON.stringify({ success: false}));
                        }else{
                            res.render('addNewSegment', {doc : docarr[0], wedone: true});
                        }
                    } else{
                        res.render('addNewSegment', {doc : docarr[0], wedone: true});
                    }
                });
            });
        });
    }
});

function addSibSeg (req, res) {
    segmentService.getSegmentWithChildren(req.body.segId, function(segmentFamily){
        var update = {$inc: {order: 1}}
            , options = {multi: true};
        Segment.update({'order': {'$gt': segmentFamily[segmentFamily.length - 1].order}}, update, options, function (err) {
            if (err) {
                logger.log('err', req.user.username + ' encountered an error while adding a picture segment to document ' + docarr[0].title + ' : ' + err);
            }else{
                var seg = new Segment();
                seg.document = segmentFamily[0].document;
                seg.order = segmentFamily[segmentFamily.length - 1].order;
                seg.level = segmentFamily[0].level;
                seg.title = req.body.title;
                seg.segmentType = 1;
                var segmentContent = req.body.editor1;
                documentController.createSegment(seg, segmentFamily[0].document, segmentContent, function(){console.log("ERROR WHILE CREATING SEGMENT")}, function(newseg){
                    res.render('addNewSegment', {doc : segmentFamily[0].document, wedone: true, subSegment: true});
                });
            }
        });
    });
}

function addSubSeg(req, res) {
    Segment.find({_id: req.body.segId}).populate({
        path:'document',
        model:'documents'
    }).exec( function(err, docarr) {
        /*
         Segment.findByIdAndUpdate(req.body.childId, {$set: {parent: segment.id}}, function(err, sgmnt) {
         if(err){
         res.send(JSON.stringify({ success: false}));
         }else{
         res.send(JSON.stringify({ success: true}));
         }
         });
         * */
        var newSegOrder = docarr[0].order + 1
        var update = {$inc: {order: 1}}
            , options = {multi: true};
        Segment.update({'order': {'$gte': newSegOrder}}, update, options, function (err) { //TODO burada bug olabilir. Dökümanı da condition'a koymak lazım sanırım ama şu an kafam durmuş da olabilir.
            if (err) {
                logger.log('err', req.user.username + ' encountered an error while adding a picture segment to document ' + docarr[0].title + ' : ' + err);
            }else{
                var seg = new Segment();
                seg.document = docarr[0].document;
                seg.order = newSegOrder;
                seg.level = docarr[0].level + 1;
                seg.title = req.body.title;
                seg.segmentType = 1;
                var segmentContent = req.body.editor1;
                documentController.createSegment(seg, docarr[0].document, segmentContent, function(){console.log("ERROR WHILE CREATING SEGMENT")}, function(newseg){
                    res.render('addNewSegment', {doc : docarr[0].document, wedone: true, subSegment: true});
                });
            }
        });
    });
};

router.get('/ownedDoc/:id', function(req, res) {
    console.log(req.params.id);
    Document.find({_id: req.params.id, deleted: false}).exec( function(err, docarr){
        if(docarr.length > 0){
            console.log(docarr[0].title);
            docarr[0].href = "/addNewSegmentToDoc/" + docarr[0].id;
            docarr[0].deleteHref = "/deleteDocument/" + docarr[0].id;
            Segment.find({ document: docarr[0] }).sort({'order': 1}).exec(function(err, segmentarr) {
                console.log("Following segments found:");
                var segmentReturnArr = [];
                if(segmentarr){
                    segmentarr.forEach(function (docSegment){
                        console.log(docSegment.title);
                        var tempSegment = {};
                        tempSegment.href = "/htmlViews/editOwnedTextSegment.html?id=" + docSegment.id;
                        tempSegment.assignmentHref = "/assign/" + docSegment.id;
                        tempSegment.content = fs.readFileSync(docSegment.URI, 'utf8');
                        tempSegment.title = docSegment.title;
                        tempSegment.order = docSegment.order;
                        tempSegment.level = docSegment.level;
                        tempSegment.id = docSegment._id;
                        segmentReturnArr.push(tempSegment);
                    });
                }
                //res.render('viewOwnedDoc', {doc : docarr[0], segs: segmentarr});
                res.send({data : {doc : docarr[0], segs: segmentReturnArr}});
            });
        }
    });
});

router.get('/deleteDocument/:id', function(req, res) {
    Document.findByIdAndUpdate(req.params.id, {$set: {deleted: true}}, function(err, assgnmnt) {
        res.render('messageTheUser', { message : "Document has been deleted successfully"});
    });
});

router.post('/goNorth', function(req, res) {
    segmentService.getSegmentWithChildren(req.body.id, function(segmentFamilyToGoUp){
        segmentService.getPreviousSiblingWithChildren(req.body.id, function(segmentFamilyToGoDown){
            if(segmentFamilyToGoDown && segmentFamilyToGoUp && segmentFamilyToGoDown.length > 0 && segmentFamilyToGoUp.length > 0){
                var updateToGoDown = { $inc: { order: segmentFamilyToGoUp.length }};
                var updateToGoUp = { $inc: { order: ((-1) * segmentFamilyToGoDown.length)}};
                var options = { multi: true };
                var updateArrToGoDown = [];
                var updateArrToGoUp = [];
                for(i = 0; i<segmentFamilyToGoDown.length; i++){
                    updateArrToGoDown.push(segmentFamilyToGoDown[i].id);
                }
                for(i = 0; i<segmentFamilyToGoUp.length; i++){
                    updateArrToGoUp.push(segmentFamilyToGoUp[i].id);
                }
                Segment.update({_id: {$in: updateArrToGoDown}}, updateToGoDown, options, function(err, numUpwardsTravellers) {
                    if (err) {
                        res.send(JSON.stringify({ success: false}));
                    }else{
                        Segment.update({_id: {$in: updateArrToGoUp}}, updateToGoUp, options, function(err, numUpwardsTravellers) {
                            if (err) {
                                res.send(JSON.stringify({ success: false}));
                            }else{
                                res.send(JSON.stringify({ success: true}));
                            }
                        });
                    }
                });
            }else{
                res.send(JSON.stringify({ success: false}));
            }
        });
    });
});

router.post('/goSouth', function(req, res) {
    segmentService.getSegmentWithChildren(req.body.id, function(segmentFamilyToGoDown){
        segmentService.getNextSiblingWithChildren(req.body.id, function(segmentFamilyToGoUp){
            if(segmentFamilyToGoDown && segmentFamilyToGoUp && segmentFamilyToGoDown.length > 0 && segmentFamilyToGoUp.length > 0){
                var updateToGoDown = { $inc: { order: segmentFamilyToGoUp.length }};
                var updateToGoUp = { $inc: { order: ((-1) * segmentFamilyToGoDown.length)}};
                var options = { multi: true };
                var updateArrToGoDown = [];
                var updateArrToGoUp = [];
                for(i = 0; i<segmentFamilyToGoDown.length; i++){
                    updateArrToGoDown.push(segmentFamilyToGoDown[i].id);
                }
                for(i = 0; i<segmentFamilyToGoUp.length; i++){
                    updateArrToGoUp.push(segmentFamilyToGoUp[i].id);
                }
                Segment.update({_id: {$in: updateArrToGoDown}}, updateToGoDown, options, function(err, numUpwardsTravellers) {
                    if (err) {
                        res.send(JSON.stringify({ success: false}));
                    }else{
                        Segment.update({_id: {$in: updateArrToGoUp}}, updateToGoUp, options, function(err, numUpwardsTravellers) {
                            if (err) {
                                res.send(JSON.stringify({ success: false}));
                            }else{
                                res.send(JSON.stringify({ success: true}));
                            }
                        });
                    }
                });
            }else{
                res.send(JSON.stringify({ success: false}));
            }
        });
    });
});

router.get('/getOriginalSegmentForComparison/:id', function(req, res) {
    segmentService.getSegmentWithChildren(req.params.id, function(segmentFamily){
        Document.findOne({_id: segmentFamily[0].document}).exec( function(err, myDoc){
            if(segmentFamily.length > 0){
                var segmentReturnArr = [];
                segmentFamily.forEach(function (docSegment){
                    console.log(docSegment.title);
                    var tempSegment = {};
                    tempSegment.href = "/htmlViews/editOwnedTextSegment.html?id=" + docSegment.id;
                    tempSegment.assignmentHref = "/assign/" + docSegment.id;
                    tempSegment.content = fs.readFileSync(docSegment.URI, 'utf8');
                    tempSegment.title = docSegment.title;
                    tempSegment.order = docSegment.order;
                    tempSegment.level = docSegment.level;
                    tempSegment.id = docSegment._id;
                    segmentReturnArr.push(tempSegment);
                });
                res.send({data : {doc : myDoc, segs: segmentReturnArr}});
            }
        });
    })
});

router.post('/goEast', function(req, res) {
    Segment.findOne({_id: req.body.id}).exec(function(uperr, segment1) {
        if(uperr || !segment1){
            res.send(JSON.stringify({ success: false}));
        }else{
            Segment.findOne({level : {$lte: segment1.level}, order : {$lt: segment1.order}, document: segment1.document
            }).sort({order:-1}).exec(function(err, previousSibling) {
                if(err || !previousSibling){
                    res.send(JSON.stringify({ success: false}));
                }else{
                    if(segment1.level - previousSibling.level > 0){
                        res.send(JSON.stringify({ success: false}));
                    }else{
                        Segment.findOne({level : {$lte: segment1.level}, order : {$gt: segment1.order}, document: segment1.document
                        }).sort({order: 1}).exec(function(err, nextSibling) {
                            if(err){
                                res.send(JSON.stringify({ success: false}));
                            }else{
                                var condition;
                                if(nextSibling){
                                    condition = {order: {$gte: segment1.order, $lt: nextSibling.order}, document: segment1.document};
                                }else{
                                    condition = {order: {$gte: segment1.order}, document: segment1.document};
                                }
                                var update = { $inc: { level: 1 }};
                                var options = { multi: true };
                                Segment.update(condition, update, options, function(err, numEastTravellers) {
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

router.post('/goWest', function(req, res) {
    Segment.findOne({_id: req.body.id}).exec(function(uperr, segment1) {
        if(uperr || !segment1){
            res.send(JSON.stringify({ success: false}));
        }else{
            Segment.findOne({level : (segment1.level - 1), order : {$lt: segment1.order}, document: segment1.document
            }).sort({'order': -1}).exec(function(err, parentSegment) {
                if(err || !parentSegment){
                    res.send(JSON.stringify({ success: false}));
                }else{
                    Segment.findOne({level : {$lte: segment1.level}, order : {$gt: segment1.order}, document: segment1.document
                    }).sort({order: 1}).exec(function(err, nextSibling) {
                        if(err){
                            res.send(JSON.stringify({ success: false}));
                        }else{
                            var condition;
                            if(nextSibling){
                                condition = {order: {$gte: segment1.order, $lt: nextSibling.order}, document: segment1.document};
                            }else{
                                condition = {order: {$gte: segment1.order}, document: segment1.document};
                            }
                            var update = { $inc: { level: -1 }};
                            var options = { multi: true };
                            Segment.update(condition, update, options, function(err, numWestTravellers) {
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

router.get('/ownedDocs', function(req, res) {
    Document.find({owner: req.user, deleted: false}).exec( function(err, docarr){
        var returnarr = [];
        var i;
        for (i=0; i<docarr.length; i++){
            var valstr = new Object();
            valstr.href = "/htmlViews/viewOwnedDoc/viewOwnedDoc.html?id=" + docarr[i].id + '&timestamp=' + (new Date()).getTime();
            valstr.title = docarr[i].title;
            valstr.created = docarr[i].created;
            returnarr.push(valstr);
        }
        res.render('ownedDocs', {doclist : returnarr});
    });
});

router.get('/newDoc', function (req, res) {
    res.render('newDoc', { user : req.user });
});

router.post('/newDoc', function (req, res) {
    var newDoc = new Document();
    newDoc.owner = req.user;
    newDoc.title = req.body.title;
    documentController.createDocument(req.user.username, newDoc, function(){res.render('index', { use1r : req.user, userMessageErr : "An error occured, but your process"});}, function (newDoc) {
        res.render('index', { user : req.user, userCreateMessage : "Document created successfully", doc: newDoc});
    });
});

router.get('/register', function(req, res) {
    res.render('register', { });
});

router.post('/register', function(req, res, next) {
    userController.createUser(new Account({ username : req.body.username }), req.body.password, req.body.email,
        function(){return res.render("register", {info: "An error occured, try again. (Did you try to register an existing username?)"})},
        function(){ userController.logUserIn(req, res, function () {
            req.session.save(function (err) {
                if (err) {
                    return next(err);
                }
                res.redirect('/');
            });
        })
        }
    );
});


router.get('/login', function(req, res) {
    res.render('login', { user : req.user });
});

router.post('/login', passport.authenticate('local'), function(req, res, next) {
    userController.logUserIn(req, res, function () {
        req.session.save(function (err) {
            if (err) {
                return next(err);
            }
            res.render('index', { user : req.user });
        });
    })
});

router.get('/logout', function(req, res, next) {
    req.logout();
    req.session.save(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

router.get('/ping', function(req, res){
    res.status(200).send("pong!");
});

router.get('/init/:username', function(req, res){
    //TODO Test purposes only. Must not see light of day in production.
    Request.post({url:req.protocol + '://' + req.get('host') + '/register', form: {username:req.params.username, password:req.params.username, email:"dokratestest@gmail.com"}}, function(err,linearResponse,body){
        if(err){
            logger.log('info', req.params.username + ' probably exists');
        }

        Request.post({url:req.protocol + '://' + req.get('host') + '/login', form: {username:req.params.username, password:req.params.username}}, function(err,linearResponse,body){
            if(err){
                logger.log('info', 'we failed man');
            }else{
                Account.findOne({ username: req.params.username}, function(err, account) {
                    //((new Date()).getTime()).toString()
                    var newDoc = new Document();
                    newDoc.owner = account;
                    newDoc.title = ((new Date()).getTime()).toString();
                    var loremIpsum = "Phasellizzle interdizzle volutpat tellus. Ut semper yo lorizzle. Donizzle non est. Nulla sapizzle massa, ultricizzle nec, accumsan crazy, boom shackalack quizzle, pede. Dizzle nizzle libero. Etizzle we gonna chung gangster ante. Doggy fo. Vestibulizzle ut pede varius nibh go to hizzle commodo. Da bomb ipsizzle fo shizzle sizzle check it out, consectetuer own yo' elit. Sizzle izzle crazy. Quisque mi sizzle, sodales et, yo mamma mammasay mammasa mamma oo sa, doggy a, elit.";
                    documentController.createDocument(req.params.username, newDoc, function(){res.render('index', { use1r : req.user, userMessageErr : "An error occured, but your process"});}, function (docCreated) {
                        //segId, title, editor1
                        Request.post({url:req.protocol + '://' + req.get('host') + '/addNewSegmentToDoc/' + docCreated, form: {segId:null, docId: docCreated, editor1:loremIpsum, title: "1"}}, function(err,linearResponse,body){
                            if(err){
                                logger.log('info', req.params.username + ' probably exists');
                            }else{

                                Request.post({url:req.protocol + '://' + req.get('host') + '/addNewSegmentToDoc/' + docCreated, form: {segId:null, docId: docCreated, editor1:loremIpsum, title: "2"}}, function(err,linearResponse,body){
                                    if(err){
                                        logger.log('info', req.params.username + ' probably exists');
                                    }else{

                                        Request.post({url:req.protocol + '://' + req.get('host') + '/addNewSegmentToDoc/' + docCreated, form: {segId:null, docId: docCreated, editor1:loremIpsum, title: "3"}}, function(err,linearResponse,body){
                                            if(err){
                                                logger.log('info', req.params.username + ' probably exists');
                                            }else{

                                                Request.post({url:req.protocol + '://' + req.get('host') + '/addNewSegmentToDoc/' + docCreated, form: {segId:null, docId: docCreated, editor1:loremIpsum, title: "4"}}, function(err,linearResponse,body){
                                                    if(err){
                                                        logger.log('info', req.params.username + ' probably exists');
                                                    }else{

                                                        Request.post({url:req.protocol + '://' + req.get('host') + '/addNewSegmentToDoc/' + docCreated, form: {segId:null, docId: docCreated, editor1:loremIpsum, title: "5"}}, function(err,linearResponse,body){
                                                            if(err){
                                                                logger.log('info', req.params.username + ' probably exists');
                                                            }else{
                                                                Segment.find({document: docCreated}).exec( function(err, segarr){
                                                                    var parent1 = segarr[0].id;
                                                                    var parent2 = segarr[4].id;
                                                                    Request.post({url:req.protocol + '://' + req.get('host') + '/addNewSegmentToDoc/' + docCreated, form: {segId:parent1, docId: docCreated, editor1:loremIpsum, title: "1.2"}}, function(err,linearResponse,body){
                                                                        if(err){
                                                                            logger.log('info', req.params.username + ' probably exists');
                                                                        }else{

                                                                            Request.post({url:req.protocol + '://' + req.get('host') + '/addNewSegmentToDoc/' + docCreated, form: {segId:parent1, docId: docCreated, editor1:loremIpsum, title: "1.1"}}, function(err,linearResponse,body){
                                                                                if(err){
                                                                                    logger.log('info', req.params.username + ' probably exists');
                                                                                }else{

                                                                                    Request.post({url:req.protocol + '://' + req.get('host') + '/addNewSegmentToDoc/' + docCreated, form: {segId:parent2, docId: docCreated, editor1:loremIpsum, title: "5.2"}}, function(err,linearResponse,body){
                                                                                        if(err){
                                                                                            logger.log('info', req.params.username + ' probably exists');
                                                                                        }else{

                                                                                            Request.post({url:req.protocol + '://' + req.get('host') + '/addNewSegmentToDoc/' + docCreated, form: {segId:parent2, docId: docCreated, editor1:loremIpsum, title: "5.1"}}, function(err,linearResponse,body){
                                                                                                if(err){
                                                                                                    logger.log('info', req.params.username + ' probably exists');
                                                                                                }else{
                                                                                                    Segment.find({document: docCreated}).exec( function(err, segarr2){
                                                                                                        var lastParent = segarr2[segarr2.length - 1].id;
                                                                                                        Request.post({url:req.protocol + '://' + req.get('host') + '/addNewSegmentToDoc/' + docCreated, form: {segId:lastParent, docId: docCreated, editor1:loremIpsum, title: "5.1.1"}}, function(err,linearResponse,body){
                                                                                                            if(err){
                                                                                                                logger.log('info', req.params.username + ' probably exists');
                                                                                                            }else{
                                                                                                                res.render('messageTheUser', { message : "Test user created: " + req.params.username});
                                                                                                            }
                                                                                                        });
                                                                                                    });
                                                                                                }
                                                                                            });

                                                                                        }
                                                                                    });

                                                                                }
                                                                            });

                                                                        }
                                                                    });
                                                                });
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
                    });
                });
            }
        });
    });
/*
    Request.post({url:req.protocol + '://' + req.get('host') + '/register', form: {username:req.params.username, password:req.params.username}}, function(err,linearResponse,body){
        if(err){
            logger.log('info', req.params.username + ' probably exists');
        }else{

        }
    });
*/
});

module.exports = router;
