/**
 * Created by eren on 30.12.2015.
 */
var sys = require('sys');
var fs = require('fs');
var exec = require('child_process').exec;

exports.createUserDir = function(user, errorCallback, successCallback){
    exec("mkdir " + user.username + "-documentsfol", {cwd: '/repos'} , function (error, stdout, stderr) {

            sys.print('stdout: ' + stdout);

            sys.print('stderr: ' + stderr);

            if (error !== null) {

                console.log('exec error: ' + error);
                errorCallback();
            }else{
                successCallback();
            }
        }
    );
};

exports.createSegment = function (segment, document, segmentContent, errorCallback, successCallback) {
    var workingDir = document.URI;
    var fileName = workingDir + "/segment-" + new Date().getTime();
    exec("mkdir " + fileName, {cwd: workingDir}, function (error, stdout, stderr) {

        sys.print('stdout: ' + stdout);

        sys.print('stderr: ' + stderr);

        if (error !== null) {
            errorCallback();
            console.log('exec error: ' + error);
        } else {
            exec("git init", {cwd: fileName}, function (error, stdout, stderr) {
                sys.print('stdout: ' + stdout);
                sys.print('stderr: ' + stderr);
                if (error !== null) {
                    errorCallback();
                    console.log('exec error: ' + error);
                } else {
                    exec("git init", {cwd: fileName}, function (error, stdout, stderr) {
                        sys.print('stdout: ' + stdout);
                        sys.print('stderr: ' + stderr);
                        if (error !== null) {
                            errorCallback();
                            console.log('exec error: ' + error);
                        } else {
                            fs.writeFileSync(fileName + "/segmentText.dokrates", segmentContent, "utf8");
                            exec('git add "*"', {cwd: fileName}, function (error, stdout, stderr) {
                                sys.print('stdout: ' + stdout);
                                sys.print('stderr: ' + stderr);
                                if (error !== null) {
                                    errorCallback();
                                    console.log('exec error: ' + error);
                                } else {
                                    exec('git commit -m "segment committed"', {cwd: fileName}, function (error, stdout, stderr) {
                                        sys.print('stdout: ' + stdout);
                                        sys.print('stderr: ' + stderr);
                                        if (error !== null) {
                                            errorCallback();
                                            console.log('exec error: ' + error);
                                        } else {
                                            successCallback(fileName + "/" + "segmentText.dokrates");
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
};

exports.createDocument = function (user, errorCallback, successCallback) {
    var workingDir = '/repos/'+user + "-documentsfol";
    var fileName = user + "-" + new Date().getTime();
    exec("mkdir " + fileName, {cwd: workingDir }, function (error, stdout, stderr) {

        sys.print('stdout: ' + stdout);

        sys.print('stderr: ' + stderr);

        if (error !== null) {
            errorCallback();
            console.log('exec error: ' + error);
        }else{
            successCallback(workingDir + "/" + fileName);
            if (false) {
                workingDir += "/" + fileName;
                fileName = user + "-seg1";
                exec("mkdir " + fileName, {cwd: workingDir}, function (error, stdout, stderr) {

                    sys.print('stdout: ' + stdout);

                    sys.print('stderr: ' + stderr);

                    if (error !== null) {
                        errorCallback();
                        console.log('exec error: ' + error);
                    } else {
                        exec("git init", {cwd: workingDir + "/" + fileName}, function (error, stdout, stderr) {
                            sys.print('stdout: ' + stdout);
                            sys.print('stderr: ' + stderr);
                            if (error !== null) {
                                errorCallback();
                                console.log('exec error: ' + error);
                            } else {
                                successCallback(workingDir);
                            }
                        });
                    }
                });
            }
        }
    });
}

