/**
 * Created by eren on 01.02.2016.
 */
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
    var segmentContent = $('<div />').addClass('segment-content').html(segment.content);
    var segmentDiv = $("<div></div>",
        {
            class: "segmentDiv",
            id: segment.id
        })
    segmentDiv.append(segmentTitle);
    return segmentDiv;
}
$( document ).ready(function(){
    $.get("/ownedDoc/" + getParameterByName('id'),function(data, status){
        data = data.data;
        var container = $('.container');
        var backToMainLink = $("<a />", {
            href : "/",
            text : "(Back to main) "
        });
        var title = $("<h1></h1>").text(data.doc.title);
        var segmentLink = $("<a />", {
            href : "/addNewSegmentToDoc/" + getParameterByName('id'),
            text : "(Add new segment) "
        });
        var layoutLink = $("<a />", {
            href : "/editLayout.html?id=" + getParameterByName('id'),
            text : "(Edit document layout) "
        });
        var deleteLink = $("<a />", {
            href : "/deleteDocument/" + getParameterByName('id'),
            text : "(DeleteDocument) "
        });
        var segmentUl = $("<div></div>",
            {
                class: "docContainer"
            }).text("test");
        var unhandledSegmentArr = [];
        for(i = 0; i < data.segs.length; i++){
            var segment = data.segs[i];
            if(segment.parent == null){
                var segmentElement = $("<li></li>", {
                    style: "list-style-type:none;"
                });
                segmentElement.append(getSegmentDiv(segment), $("<br>"));
                segmentUl.append(segmentElement, $("<br>"));
            }else{
                unhandledSegmentArr.push(segment);
            }
        }
        var swapButton = $("<a />", {
            href : "/",
            text : "(SWAP) ",
            style: "font-weight: bold"
        });
        container.append(title, backToMainLink, segmentLink, layoutLink, deleteLink,
            $("<br>"), segmentUl);
        while(unhandledSegmentArr.length > 0){
            var unhandledSegmentArrTracker = [];
            for(i = 0; i < unhandledSegmentArr.length; i++){
                if($('#' + unhandledSegmentArr[i].parent._id).length > 0){
                    $('#' + unhandledSegmentArr[i].parent._id).append($("<br>"), getSegmentDiv(unhandledSegmentArr[i]));
                }else{
                    unhandledSegmentArrTracker.push(unhandledSegmentArr[i]);
                }
            }
            unhandledSegmentArr = unhandledSegmentArrTracker;
            j++;
        }
            $( ".segmentDiv" ).draggable();
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
            });
    });
});