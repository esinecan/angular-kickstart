/**
 * Created by eren on 28.12.2015.
 */
exec("mkdir " + req.body.username + "-documentsfol", {cwd: '/repos'} , function (error, stdout, stderr) {

    sys.print('stdout: ' + stdout);

    sys.print('stderr: ' + stderr);

    if (error !== null) {

        console.log('exec error: ' + error);

    }

    exec("mkdir " + req.body.username + "-doc1", {cwd: '/repos/'+req.body.username + "-documentsfol" }, function (error, stdout, stderr) {

        sys.print('stdout: ' + stdout);

        sys.print('stderr: ' + stderr);

        if (error !== null) {

            console.log('exec error: ' + error);

        }

        exec("mkdir " + req.body.username + "-seg1",{cwd: '/repos/'+req.body.username + "-documentsfol/"+req.body.username + "-doc1" } ,function (error, stdout, stderr) {

            sys.print('stdout: ' + stdout);

            sys.print('stderr: ' + stderr);

            if (error !== null) {

                console.log('exec error: ' + error);

            }

            exec("git init", {cwd: '/repos/'+req.body.username + "-documentsfol/"+req.body.username + "-doc1/" + req.body.username + "-seg1"}, function (error, stdout, stderr) {

                sys.print('stdout: ' + stdout);

                sys.print('stderr: ' + stderr);

                if (error !== null) {

                    console.log('exec error: ' + error);

                }

            });

        });

    });

});





Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
    if (err) {
        return res.render("register", {info: "An error occured, try again. (Did you try to register an existing username?)"});
    }

    /**
     * Created by eren on 28.12.2015.
     */
    exec("mkdir " + req.body.username + "-documentsfol", {cwd: '/repos'} , function (error, stdout, stderr) {

        sys.print('stdout: ' + stdout);

        sys.print('stderr: ' + stderr);

        if (error !== null) {

            console.log('exec error: ' + error);

        }

        exec("mkdir " + req.body.username + "-doc1", {cwd: '/repos/'+req.body.username + "-documentsfol" }, function (error, stdout, stderr) {

            sys.print('stdout: ' + stdout);

            sys.print('stderr: ' + stderr);

            if (error !== null) {

                console.log('exec error: ' + error);

            }

            exec("mkdir " + req.body.username + "-seg1",{cwd: '/repos/'+req.body.username + "-documentsfol/"+req.body.username + "-doc1" } ,function (error, stdout, stderr) {

                sys.print('stdout: ' + stdout);

                sys.print('stderr: ' + stderr);

                if (error !== null) {

                    console.log('exec error: ' + error);

                }

                exec("git init", {cwd: '/repos/'+req.body.username + "-documentsfol/"+req.body.username + "-doc1/" + req.body.username + "-seg1"}, function (error, stdout, stderr) {

                    sys.print('stdout: ' + stdout);

                    sys.print('stderr: ' + stderr);

                    if (error !== null) {

                        console.log('exec error: ' + error);

                    }
                });
            });
        });
    });
});



Account.findOne({ username: req.user.username }, function(err, account) {
    if(err){
        console.log("Could not find user");
    }else{
        var document = new Document();
        document.title = "Doc1";
        document.URI = '/repos/'+req.body.username + "-documentsfol/"+req.body.username + "-doc1";
        document.owner = account;
        document.save(function(err, saveddoc) {
            var segment = new Segment();
            segment.document = saveddoc;
            segment.title = "seg1 by " + req.user.username;
            segment.save();
        });
    }
});

p
a(href="/ownedDoc/" + doc.id ) (Back to document)
