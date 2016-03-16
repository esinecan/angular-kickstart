/**
 * Created by eren on 01.03.2016.
 */
$( document ).ready(function(){
    var assignmentId = $("<input />", {
        type : "hidden",
        name : "assgnId",
        value : getParameterByName('id')
    });
    $("#add-new-segment").append(assignmentId);
});
