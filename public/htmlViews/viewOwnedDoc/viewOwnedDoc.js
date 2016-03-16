/**
 * Created by eren on 01.02.2016.
 */
function getContentsDiv(segment){
    if(!segment || !segment.title || segment.title.length == 0){
        return "";
    }else{

        var contentTitle = $("<a />", {
            href : "#" + segment.id,
            text : segment.title,
        });
        var contentDiv = $("<div></div>",
            {
                class: "contentsDiv",
                id: "con-" + segment.id
            })
        contentDiv.append(contentTitle);
        return contentDiv;
    }
}
function getSegmentDiv(segment){
    var segmentTitle = $("<h3></h3>").text(segment.title);
    var segmentAssignLink = $("<a />", {
        href : "/assign/" + segment.id,
        text : " (Assign Segment to User) "
    });
    var createSubSegmentLink = $("<a />", {
        href : "/addNewSubSegmentToDoc/" + segment.id,
        text : "(Add new SubSegment) "
    });

    var createSibSegmentLink = $("<a />", {
        href : "/addNewSibSegmentToDoc/" + segment.id,
        text : "(Add new Sibling) "
    });

    var deleteLink = $("<a />", {
        href : "#",
        text : "(Delete Segment) ",
        class: "directionlink",
        direction: "deleteSegment",
        segId: segment.id
    });
    var segmentEditLink = $("<a />", {
        href : "/htmlViews/editTextSegment.html?id=" + segment.id + "&seg=true",
        text : " (Edit Segment in New Tab) ",
        target: "_blank"
    });

    var goNorthLink = $("<a />", {
        href : "#",
        text : "(go up) ",
        class: "directionlink",
        direction: "goNorth",
        segId: segment.id
    });

    var goSouthLink = $("<a />", {
        href : "#",
        text : "(go down) ",
        class: "directionlink",
        direction: "goSouth",
        segId: segment.id
    });

    var goWestLink = $("<a />", {
        href : "#",
        text : "(go left) ",
        class: "directionlink",
        direction: "goWest",
        segId: segment.id
    });

    var goEastLink = $("<a />", {
        href : "#",
        text : "(go right) ",
        class: "directionlink",
        direction: "goEast",
        segId: segment.id
    });

    var segmentContent = $('<div />').addClass('segment-content').html(segment.content);
    var segmentDiv = $("<div></div>",
        {
            class: "segmentDiv",
            id: segment.id
        })
    segmentDiv.append(segmentTitle, segmentAssignLink, createSubSegmentLink, createSibSegmentLink, deleteLink, segmentEditLink, $("<br>"), $("<br>"), goNorthLink, goSouthLink, goWestLink, goEastLink, $("<br>"), $("<br>"), segmentContent, $("<br>"));
    return segmentDiv;
}
$( document ).ready(function(){
    $.get("/ownedDoc/" + getParameterByName('id'),function(data, status){
        data = data.data;
        var container = $('.container');
        var contents = $('.contents');
        var backToMainLink = $("<a />", {
            href : "/",
            text : "(Back to main) "
        });
        var title = $("<h1></h1>").text(data.doc.title);
        var segmentLink = $("<a />", {
            href : "/addNewSegmentToDoc/" + getParameterByName('id'),
            text : "(Add new segment) "
        });
        var deleteLink = $("<a />", {
            href : "/deleteDocument/" + getParameterByName('id'),
            text : "(DeleteDocument) "
        });
        var segmentUl = $("<div></div>",
            {
                class: "docContainer"
            }).text("test");

        var contentsUl = $("<div></div>",
            {
                class: "docContainer"
            });
        container.append(title, backToMainLink, segmentLink, deleteLink,
            $("<br>"), segmentUl);
        contents.append(contentsUl);
        var previousElement;
        if(data.segs.length > 0){
            previousElement = data.segs[0];
            var segmentElement = $("<li></li>", {
                style: "list-style-type:none;"
            });
            var contentsElement = $("<li></li>", {
                style: "list-style-type:none;"
            });

            segmentElement.append(getSegmentDiv(previousElement), $("<br>"));
            segmentElement.css("background-color", "#ECABB3");
            segmentUl.append(segmentElement, $("<br>"));

            contentsElement.append(getContentsDiv(previousElement), $("<br>"));
            contentsUl.append(contentsElement, $("<br>"));
            if(data.segs.length > 1){
                var i;
                for(i = 1; i < data.segs.length; i++){
                    segmentElement = $("<li></li>", {
                        style: "list-style-type:none;"
                    });
                    contentsElement = $("<li></li>", {
                        style: "list-style-type:none;"
                    });

                    if(previousElement.level > data.segs[i].level){
                        var settled = false;
                        var tracker = i-1;
                        while(!settled){
                            if(data.segs[tracker].level == data.segs[i].level){
                                $(getSegmentDiv(data.segs[i])).insertAfter($('#' + data.segs[tracker].id));
                                $("<br>").insertAfter($('#' + data.segs[i].id));
                                $(getContentsDiv(data.segs[i])).insertAfter($('#con-' + data.segs[tracker].id));
                                $("<br>").insertAfter($('#con-' + data.segs[i].id));
                                settled =true;
                            }
                            if(tracker == 0){
                                settled = true;
                            }
                            tracker = tracker - 1;
                        }
                    }
                    else if(previousElement.level < data.segs[i].level){
                        $('#' + previousElement.id).append($("<br>"), getSegmentDiv(data.segs[i]));
                        $('#con-' + previousElement.id).append($("<br>"), getContentsDiv(data.segs[i]));
                    }
                    else if(previousElement.level == data.segs[i].level){
                        $(getSegmentDiv(data.segs[i])).insertAfter($('#' + previousElement.id));
                        $("<br>").insertAfter($('#' + data.segs[i].id));

                        $(getContentsDiv(data.segs[i])).insertAfter($('#con-' + previousElement.id));
                        $("<br>").insertAfter($('#con-' + data.segs[i].id));
                    }

                    if(data.segs[i].level == 0){
                        $('#' + data.segs[i].id).css("background-color", "#ECABB3");
                    }else if(data.segs[i].level == 1){
                        $('#' + data.segs[i].id).css("background-color", "#ABCDEF");
                    }else if(data.segs[i].level == 2){
                        $('#' + data.segs[i].id).css("background-color", "#9BD292");
                    }else{
                        $('#' + data.segs[i].id).css("background-color", "#FFFFFF");
                    }

                    /*
                    segmentElement.append(getSegmentDiv(segment), $("<br>"));
                    segmentElement.css("background-color", "#ECABB3");
                    segmentUl.append(segmentElement, $("<br>"));

                    contentsElement.append(getContentsDiv(segment), $("<br>"));
                    contentsUl.append(contentsElement, $("<br>"));
                    */

                    previousElement = data.segs[i];
                }
            }
        }

        $( ".directionlink" ).click(function(e) {
            $.post("/" + e.target.attributes.direction.value, {id: e.target.attributes.segId.value}, function (data) {
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

            /*$( ".segmentDiv" ).draggable();
            $( ".segmentDiv" ).droppable({
                greedy:true,
                drop: function( event, ui ) {
                    $( this )
                        .addClass( "ui-state-highlight" )
                        .find( "p" )
                        .html( "Dropped!" );

                    $.post( "/changeSegmentParent", { parentId: event.target.id, childId: ui.draggable.attr('id') }, function( data ) {
                        location.reload();
                    });
                }
            });*/
    });
});