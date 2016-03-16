/**
 * Created by eren on 15.02.2016.
 */
function getSegmentDiv(assignment){
    var segmentTitle = $("<h3></h3>").text(assignment.title);
    var segmentContent = $('<div />').addClass('segment-content').html(assignment.content);
    var segmentDiv = $("<div></div>",
        {
            class: "segmentDiv",
            id: assignment._id ? assignment._id : assignment.id
        })
    if(assignment.rootSegment && assignment.rootSegment == assignment.segment._id){
        if(assignment.rejectNotes && assignment.rejectNotes.length > 0){
            var returnNote = $("<h3></h3>");
            returnNote.html("Reject notes: " + assignment.rejectNotes);
            segmentDiv.append(returnNote, $("<br>"), $("<br>"),segmentTitle, $("<br>"), $("<br>"), segmentContent, $("<br>"));
        }else{
            segmentDiv.append(segmentTitle, $("<br>"), $("<br>"), segmentContent, $("<br>"));
        }
        if(assignment.contributor){
            $("#contributorName").html(assignment.contributor);
            $("#backToDoc").attr("href", "/htmlViews/viewReturnedDoc/viewReturnedDoc.html?id=" + assignment.document._id);
            $("#accept").attr("href", "/returnedAssignmentAccept/" + assignment.id);
            $("#reject").attr("href", "/returnedAssignmentReject/" + assignment.id);
        }
    }else{
        segmentDiv.append(segmentTitle, $("<br>"), $("<br>"), segmentContent, $("<br>"));
    }

    if(assignment.level == 0){
        segmentDiv.css("background-color", "#ECABB3");
    }else if(assignment.level == 1){
        segmentDiv.css("background-color", "#ABCDEF");
    }else if(assignment.level == 2){
        segmentDiv.css("background-color", "#9BD292");
    }else{
        segmentDiv.css("background-color", "#FFFFFF");
    }

    return segmentDiv;
}
$( document ).ready(function(){
    $.get("/getOriginalSegmentForComparison/" + getParameterByName('segmentId'), function (data, status) {
        var rootSegment = data.data.segs[0];
        for(i=0; i<data.data.segs.length; i++){
            if(data.data.segs[i].level < rootSegment.level){
                rootSegment = data.data.segs[i];
            }
        }
        rootSegment = rootSegment.id;
        var segData = {};
        segData.data = {};
        segData.data.doc = data.data.doc;
        segData.data.segs = [];
        var i;
        for(i=0; i<data.data.segs.length; i++){
            var segment = data.data.segs[i];
            segment.segment = data.data.segs[i];
            segment.rootSegment = rootSegment;
            segment.segment._id = segment.segment.id;
            segData.data.segs.push(segment);
        }
        insertToContainerDiv(segData, status, "containerOriginal");
        $.get("/getReturnedSegmentForComparison/" + getParameterByName('assgnId'), function (data, status) {
            insertToContainerDiv(data, status, "containerAssignment");
        });
    });
});

function insertToContainerDiv (data, status, containerDiv) {
    data = data.data;
    var container = $('.' + containerDiv);
    var title = $("<h1></h1>").text(data.doc.title);
    var segmentUl = $("<div></div>",
        {
            class: "docContainer"
        });
    var i, j;
    var unhandledSegmentArr = [];
    var rootSegmentArr = [];
    for (i = 0; i < data.segs.length; i++) {
        var segment = data.segs[i];
        if (segment.rootSegment == segment.segment._id) {
            var segmentElement = $("<li></li>", {
                style: "list-style-type:none;"
            });
            segmentElement.append(getSegmentDiv(segment), $("<br>"));
            segmentUl.append(segmentElement, $("<br>"));
            rootSegmentArr.push(segment);
        } else {
            unhandledSegmentArr.push(segment);
        }
    }

    container.append(title, $("<br>"), segmentUl);
    var prevElement;
    for (i = 0; i < rootSegmentArr.length; i++) {
        var settledElements = [];
        for (j = 0; j < unhandledSegmentArr.length; j++) {
            if (rootSegmentArr[i].rootSegment == unhandledSegmentArr[j].rootSegment) {
                if (j == 0 || settledElements.length == 0) {
                    $('#' + (rootSegmentArr[i]._id ? rootSegmentArr[i]._id : rootSegmentArr[i].id)).append(getSegmentDiv(unhandledSegmentArr[j]));
                } else {
                    if (unhandledSegmentArr[j].level < unhandledSegmentArr[prevElement].level) {
                        var k;
                        var settled = false;
                        for (k = settledElements.length - 1; k >= 0; k--) {
                            if (settledElements[k].level == unhandledSegmentArr[j].level && !settled) {
                                getSegmentDiv(unhandledSegmentArr[j]).insertAfter($('#' + (settledElements[k]._id ? settledElements[k]._id : settledElements[k].id)));
                                settled = true;
                            } else if (settledElements[k].level < unhandledSegmentArr[j].level && !settled) {
                                $('#' + (settledElements[k]._id ? settledElements[k]._id : settledElements[k].id)).append(getSegmentDiv(unhandledSegmentArr[j]));
                                settled = true;
                            }
                        }
                        if (!settled) {
                            $('#' + (rootSegmentArr[i]._id ? rootSegmentArr[i]._id : rootSegmentArr[i].id)).append(getSegmentDiv(unhandledSegmentArr[j]));
                        }
                    } else if (unhandledSegmentArr[j].level == unhandledSegmentArr[prevElement].level) {
                        getSegmentDiv(unhandledSegmentArr[j]).insertAfter($('#' + (unhandledSegmentArr[prevElement]._id ? unhandledSegmentArr[prevElement]._id : unhandledSegmentArr[prevElement].id)));
                    } else if (unhandledSegmentArr[j].level > unhandledSegmentArr[prevElement].level) {
                        $('#' + (unhandledSegmentArr[prevElement]._id ? unhandledSegmentArr[prevElement]._id : unhandledSegmentArr[prevElement].id)).append(getSegmentDiv(unhandledSegmentArr[j]));
                    }
                }
                prevElement = j;
                settledElements.push(unhandledSegmentArr[j]);
            }
        }
        prevElement = 0;
    }
}