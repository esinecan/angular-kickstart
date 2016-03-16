/**
 * Created by eren on 30.12.2015.
 */
var dbWrapper = require('../utils/db-wrapper');
var gitWrapper = require('../utils/git-wrapper');

exports.createDocument = function (username, newDocument, errorCallback, successCallback){
    gitWrapper.createDocument(username, errorCallback, function(docURI){
        newDocument.URI = docURI;
        dbWrapper.createDocument(username, newDocument, errorCallback, successCallback);
    });
};

exports.createSegment = function (segment, document, segmentContent, errorCallback, successCallback) {
    gitWrapper.createSegment(segment, document, segmentContent, errorCallback, function(segURI){
        segment.URI = segURI;
        dbWrapper.createSegment(segment, errorCallback, successCallback);
    });
};

exports.assignSegment = function (segment) {

};

exports.returnSegment = function (assignment) {

};

exports.acceptSegment = function (assignment) {

};

exports.rejectSegment = function (assignment) {

};