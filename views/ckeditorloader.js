CKEDITOR.replace('editor1');
var htmlContent = "!{editable.content}";
CKEDITOR.instances.editor1.setData(htmlContent, function () {
    this.checkDirty();  // true
});