/**
 * Created by eren on 15.02.2016.
 */
function getSegmentDiv(assignment){
    var segmentTitle = $("<h3></h3>").text(assignment.title);
    var segmentEditLink = $("<a />", {
        href : "/htmlViews/editTextSegment.html?id=" + assignment.id,
        text : " (Edit Segment in New Tab) ",
        target: "_blank"
    });
    var segmentReturnLink = $("<a />", {
        href : "/assignmentReturn/" + assignment.id,
        text : " (Return Segment) ",
        target: "_blank"
    });
    var subSegmentLink = $("<a />", {
        href : "/htmlViews/addSubSegmentToAssignment/addSubSegmentToAssignment.html?id=" + assignment.id,
        text : " (Add new subsegment) ",
        target: "_blank"
    });

    var goNorthLink = $("<a />", {
        href : "#",
        text : "(go up) ",
        class: "directionlink",
        direction: "goNorth",
        segId: assignment.id
    });

    var goSouthLink = $("<a />", {
        href : "#",
        text : "(go down) ",
        class: "directionlink",
        direction: "goSouth",
        segId: assignment.id
    });

    var goWestLink = $("<a />", {
        href : "#",
        text : "(go left) ",
        class: "directionlink",
        direction: "goWest",
        segId: assignment.id
    });

    var goEastLink = $("<a />", {
        href : "#",
        text : "(go right) ",
        class: "directionlink",
        direction: "goEast",
        segId: assignment.id
    });

    var segmentContent = $('<div />').addClass('segment-content').html(assignment.content);
    var segmentDiv = $("<div></div>",
        {
            class: "segmentDiv",
            id: assignment.segment._id
        })
    if(assignment.rootSegment == assignment.segment._id){
        segmentEditLink = $("<a />", {
            href : "/htmlViews/editTextSegment.html?id=" + assignment.id + "&root=true",
            text : " (Edit Segment in New Tab) ",
            target: "_blank"
        });
        if(assignment.rejectNotes && assignment.rejectNotes.length > 0){
            var returnNote = $("<h3></h3>");
            returnNote.html("Reject notes: " + assignment.rejectNotes);
            segmentDiv.append(returnNote, $("<br>"), $("<br>"),segmentTitle, segmentEditLink, subSegmentLink, segmentReturnLink, $("<br>"), $("<br>"), segmentContent, $("<br>"));
        }else{
            segmentDiv.append(segmentTitle, segmentEditLink, subSegmentLink, segmentReturnLink, $("<br>"), $("<br>"), segmentContent, $("<br>"));
        }
    }else{
        segmentDiv.append(segmentTitle, segmentEditLink, subSegmentLink, $("<br>"), $("<br>"), goNorthLink, goSouthLink, goWestLink, goEastLink, $("<br>"), $("<br>"), segmentContent, $("<br>"));
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
    $.get("/assignedDoc/" + getParameterByName('id'),function(data, status){
        data = data.data;
        var container = $('.container');
        var backToMainLink = $("<a />", {
            href : "/",
            text : "(Back to main) "
        });
        var title = $("<h1></h1>").text(data.doc.title);
        var segmentUl = $("<div></div>",
            {
                class: "docContainer"
            });
        var i,j;
        var unhandledSegmentArr = [];
        var rootSegmentArr = [];
        for(i = 0; i < data.segs.length; i++){
            var segment = data.segs[i];
            if(segment.rootSegment == segment.segment._id){
                var segmentElement = $("<li></li>", {
                    style: "list-style-type:none;"
                });
                segmentElement.append(getSegmentDiv(segment), $("<br>"));
                segmentUl.append(segmentElement, $("<br>"));
                rootSegmentArr.push(segment);
            }else{
                unhandledSegmentArr.push(segment);
            }
        }

        container.append(title, backToMainLink, $("<br>"), segmentUl);
        var prevElement;
        for(i = 0; i < rootSegmentArr.length; i++){
            var settledElements = [];
            for(j = 0; j < unhandledSegmentArr.length; j++){
                if(rootSegmentArr[i].rootSegment == unhandledSegmentArr[j].rootSegment){
                    if(j==0 || settledElements.length == 0){
                        $('#'+ rootSegmentArr[i].segment._id).append(getSegmentDiv(unhandledSegmentArr[j]));
                    }else{
                        if(unhandledSegmentArr[j].level < unhandledSegmentArr[prevElement].level){
                            var k;
                            var settled = false;
                            for(k=settledElements.length - 1; k>=0; k--){
                                if(settledElements[k].level == unhandledSegmentArr[j].level && !settled){
                                    getSegmentDiv(unhandledSegmentArr[j]).insertAfter($('#'+ settledElements[k].segment._id));
                                    settled = true;
                                }else if(settledElements[k].level < unhandledSegmentArr[j].level && !settled){
                                    $('#'+ settledElements[k].segment._id).append(getSegmentDiv(unhandledSegmentArr[j]));
                                    settled = true;
                                }
                            }
                            if(!settled){
                                $('#'+ rootSegmentArr[i].segment._id).append(getSegmentDiv(unhandledSegmentArr[j]));
                            }
                        } else if(unhandledSegmentArr[j].level == unhandledSegmentArr[prevElement].level){
                            getSegmentDiv(unhandledSegmentArr[j]).insertAfter($('#'+ unhandledSegmentArr[prevElement].segment._id));
                        } else if(unhandledSegmentArr[j].level > unhandledSegmentArr[prevElement].level){
                            $('#'+ unhandledSegmentArr[prevElement].segment._id).append(getSegmentDiv(unhandledSegmentArr[j]));
                        }
                    }
                    prevElement = j;
                    settledElements.push(unhandledSegmentArr[j]);
                }
            }
            prevElement = 0;
        }
        $( ".directionlink" ).click(function(e) {
            $.post("/" + e.target.attributes.direction.value + "Assgn", {id: e.target.attributes.segId.value}, function (data) {
                var data = JSON.parse(data);
                if (data.success) {
                    if (window.confirm('Segment moved successfully')) {
                        location.reload();
                    }
                    else {
                        location.reload();
                    }
                } else {
                    if (window.confirm('Segment can not move in that direction')) {
                        location.reload();
                    }
                    else {
                        location.reload();
                    }
                }
            });
        });
    });
});
