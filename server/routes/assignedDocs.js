var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var Assignment = require('../models/assignment');
var router = express.Router();

router.get('/assignedDocs', function(req, res) {
    Assignment.find({contributor: req.user}).populate({
        path:'segment',
        model:'segments'
    }).populate({
        path:'document',
        model:'documents'
    }).exec( function(err, assignmentarr){
        var returnarr = [];
        var i;
        for (i=0; i<assignmentarr.length; i++){
            var val = new Object();
            Segment.findOne({ObjectId : assignmentarr[i].segment}, function(err, segment){
                assignmentarr[i].segment = segment;
                val.title = assignmentarr[i].segment.title;
                var valstr = 'the segment' + val.segmentTitle + 'from the document' + val.documentTitle + "by user " + val.ownername + " was assigned to you on: " + val.assignmentdate;
                returnarr.push(valstr);
                res.render('assignedDocs', {assignmentlist : returnarr});
            });
        }
    })
});

module.exports = router;
