var FOLLY = {};
FOLLY.ref = {};                   // id -> div

FOLLY.Base = function(id, doc) {
    OP.Objection.call(this, id, doc);
};
FOLLY.Base.prototype = new OP.Objection;
FOLLY.Base.prototype.El = function() {
    if(!FOLLY.ref[this._id]) { FOLLY.ref[this._id] = this.create(); }
    this.update();
    return FOLLY.ref[this._id];
};
FOLLY.Base.prototype.create = function() {
    return $("<div>");
};
FOLLY.Base.prototype.update = function() {
    if(!FOLLY.ref[this._id]) { return }
};
FOLLY.Base.prototype.onchange = function() {
    this.update();
};

FOLLY.Project = function(id, doc) {
    FOLLY.Base.call(this, id, doc);
    this.story = this.story || [];
};
FOLLY.Project.prototype = new FOLLY.Base;
FOLLY.Project.prototype.deleteme = function() {
    var master = FOLLY.get_projects();
    master.projects.splice(master.projects.indexOf(this._id), 1);
    master.save();
    FOLLY.Base.prototype.deleteme.call(this);
};
FOLLY.Project.prototype.save = function() {
    var master = FOLLY.get_projects();

    var idx = master.projects.indexOf(this._id);
    var rename = false;

    // Update _id if name has changed.
    if(this._id !== this.normed_id()) {
        rename = true;
        this._id = this.normed_id();
        OP.Subjectification.obj[this._id] = this;
        if(idx !== -1) {
            master.projects[idx] = this._id;
            master.save();
        }
    }
    // Add to 'master' if not there already
    if(idx === -1) {
        master.projects.push(this._id);
        master.save();
    }
    FOLLY.Base.prototype.save.call(this);
};
FOLLY.Project.prototype.update = function() {
    if(!FOLLY.ref[this._id]) { return }
    var that = this;

    var $div = FOLLY.ref[this._id];
    var $title = $div.find("h2")
        .text(this.name);
    var $subhead = $div.find(".subhead")
        .text(this.subhead);

    var stories = [];

    var move = function(arr, o_idx, n_idx) {
        // remove from old position
        var rem = arr.splice(o_idx, 1);
        // update indexes
        if(n_idx > o_idx) {
            n_idx -= 1;
        }
        // and re-insert
        return arr.slice(0, n_idx)
            .concat(rem)
            .concat(arr.slice(n_idx));
    }

    // remove old handles
    $div.find(".handle").remove();
    // remove old removes
    $div.find(".remove").remove();

    this.getAll('story').forEach(function(item, orig_idx) {
        if(!item)
            return

        var $item = item.El();

        if(OP.app) {
            // Wrap linked $item in a closure
            (function($item) {
                var $remove = $("<div>")
                    .addClass('remove')
                    .text('x')
                    .appendTo($div)
                    .click(function() {
                        that.story.splice(orig_idx, 1);
                        item.deleteme();
                        that.save();
                        $item.remove();
                    });
                var $handle = $("<div>")
                    .addClass('handle')
                    .text('m')
                    .appendTo($div)
                    .mousedown(function(ev) {
                        ev.preventDefault();
                        var top = $(this).offset().top;
                        var m_y = ev.clientY;

                        // drag to re-order
                        window.onmousemove = function(ev) {
                            ev.preventDefault();

                            if(ev.clientY < 50) {
                                $("body").scrollTop(
                                    $("body").scrollTop()-10);
                                m_y += 10;
                            }
                            else if($("body").height() - ev.clientY < 50) {
                                $("body").scrollTop(
                                    $("body").scrollTop()+10);
                                m_y -= 10;
                            }

                            var dy = ev.clientY - m_y;

                            $item.offset({top: top + dy});
                            $handle.offset({top: top + dy});
                        }
                        window.onmouseup = function(ev) {
                            // Save
                            var cur_y = $item.offset().top;//ev.clientY;
                            for(var idx in stories) {
                                var $i = stories[idx];
                                var found = false;
                                if(cur_y < $i.offset().top) {
                                    // insert before
                                    console.log(that.story);
                                    that.story = move(that.story, orig_idx, idx);
                                    found = true;
                                    break;
                                }
                            }
                            if(!found) {
                                // end
                                that.story = move(that.story, orig_idx, stories.length);
                            }
                            console.log(that.story);
                            that.save();
                            $item
                                .css({position: "static"});
                            
                            // Unbind events
                            window.onmouseup = undefined;
                            window.onmousemove = undefined;
                        }
                    })
            })($item);
        }
        if(OP.app || !item.not_on_this_page) {
            $item.appendTo($div);
            stories.push($item);
        }
    });

    // make sure txt area is at bottom
    var $txt = $div.find("textarea")
        .appendTo($div);

    // and add a clearing element
    $div.find('.clear')
        .remove();
    var $clear = $("<div>")
        .addClass('clear')
        .addClass('typewriter')
        .html("&copy; " + (new Date().getFullYear()) + "?")
        .appendTo($div);
};
FOLLY.Project.prototype.create = function() {
    var that = this;

    var $div = $("<div>")
        .addClass("project");

    var $title = $("<h2>")
        .appendTo($div);
    var $subhead = $("<div>")
        .addClass('subhead')
        .addClass('typewriter')
        .appendTo($div);

    if(OP.app) {
        var editing_title = false;
        var editing_subhead = false;

        var $delete = $("<div>")
            .addClass('delete')
            .html('delete')
            .appendTo($div)
            .click(function() {
                that.deleteme();
                FOLLY.show_home();
            });

        $title
            .text(this.name || "___")
            .click(function() {
                if(editing_title) { return; }
                editing_title = true;
                var $input = $("<input>")
                    .val(that.name)
                    .appendTo($title.empty())
                    .focus()
                    .blur(function() {
                        editing_title = false;
                        that.name = $input.val();
                        that.save();
                        window.location.hash = "#/"+that._id;
                    })
                    .keypress(function(ev) {
                        if(ev.which === 13) { // enter
                            editing_title = false;
                            that.name = $input.val();
                            that.save();
                            window.location.hash = "#/"+that._id;
                        }
                    });
                
            })


        $subhead
            .text(this.subhead || "___")
            .click(function() {
                if(editing_subhead) { return; }
                editing_subhead = true;
                var $input = $("<input>")
                    .val(that.subhead)
                    .appendTo($subhead.empty())
                    .focus()
                    .blur(function() {
                        editing_subhead = false;
                        that.subhead = $input.val();
                        that.save();
                    })
                    .keypress(function(ev) {
                        if(ev.which === 13) { // enter
                            editing_subhead = false;
                            that.subhead = $input.val();
                            that.save();
                        }
                    });
            })


        // new text area
        var $txt = $("<textarea>")
            .text("drag image or type paragraph here")
            .click(function() {
                if($txt.val() == "drag image or type paragraph here") {
                    $txt.val('');
                }
            })
            .blur(function() {
                if($txt.val()) {
                    var txt = new FOLLY.Text('text_'+Math.random(),
                                           {html: $txt.val(),
                                            project: that._id});
                    txt.save();
                    that.story.push(txt._id);
                    that.save();

                    $txt.val('');
                }
            })
            .appendTo($div);

        var noop = function(ev) {
            // http://html5demos.com/drag-anything#view-source
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'copy';
            return false;
        };
        var dragEnter = noop;
        var dragExit = noop;
        var dragOver = noop;
        var drop = function(ev) {
            console.log('drop ev', ev);
            noop(ev);
            var files = ev.dataTransfer.files;
            console.log('drop files', files);
            for(var i=0; i<files.length; i++) {
                console.log('file', files[i].name);

                var reader = new FileReader();
                (function(file, reader) {
                    reader.onload = function () {
                        console.log('done loading');

                        // XXX: abstract into lib oppressive (?)
                        var imurl = qbridge.upload(file.name, reader.result);

                        console.log('qbridge returned', imurl);

                        // Create an Image object for this project.
                        var im = new FOLLY.Image(file.name, {
                            src: imurl,
                            project: that._id});
                        im.save();
                        // Add image to this project
                        that.story.push(im._id);
                        that.save();

                        // // ... and navigate to the new image, as if to celebrate
                        // window.location.hash = "#/" + file.name;
                    };
                })(files[i], reader)
                reader.readAsDataURL(files[i]);
            }
        };
        // watch dnd-land for file upload requests
        $txt[0].addEventListener("dragenter", dragEnter, false);
        $txt[0].addEventListener("dragexit", dragExit, false);
        $txt[0].addEventListener("dragover", dragOver, false);
        $txt[0].addEventListener("drop", drop, false);
    }

    return $div;
};
FOLLY.Project.prototype.normed_id = function() {
    return encodeURI(this.name.replace(/\s/g, '_'));
};
FOLLY.Text = function(id, doc) {
    FOLLY.Base.call(this, id, doc);
};
FOLLY.Text.prototype = new FOLLY.Base;
FOLLY.Text.prototype.create = function() {
    var that = this;
    var editing = false;
    var $div = $("<p>");
    if(OP.app) {
        $div
        .click(function() {
            if(editing) { return; }
            editing = true;
            // Make editable, if not already...
            var $edit = $("<div>")
                .appendTo($div.empty())
                .append($("<textarea>")
                        .text(that.html)
                        .focus()
                        .blur(function() {
                            editing = false;
                            that.html = $edit.find('textarea').val();
                            that.save();
                        }))
                .append($("<button>")
                        .html("save")
                        .click(function() {
                            editing = false;
                            that.html = $edit.find('textarea').val();
                            that.save();
                        }));
        });
    }
    return $div;
};
FOLLY.Text.prototype.update = function() {
    if(!FOLLY.ref[this._id]) { return }
    FOLLY.ref[this._id]
        .empty()
        .html(this.html);
};

FOLLY.Link = function(id, doc) {
    FOLLY.Base.call(this, id, doc);
};
FOLLY.Link.prototype = new FOLLY.Base;
FOLLY.Link.prototype.create = function() {
    return $("<div>")
        .addClass('link');
};
FOLLY.Link.prototype.update = function() {
    var that = this;
    if(!FOLLY.ref[this._id]) { return } // I forget why I need this ...
    var $el = FOLLY.ref[this._id];
    $el
        .empty()
        .append($("<a>")
                .attr("href", this.link)
                .attr("target", "_blank")
                .text(this.name));

    if(OP.app) {
        var editing = false;
        $el
            .click(function(ev) {
                if(editing)
                    return
                ev.preventDefault();
                editing = true;
                $('.tmp').remove();
                $el.empty();
                var $link = $("<input>")
                    .val(that.link || 'http://___')
                    .appendTo($el);
                var $name = $("<input>")
                    .val(that.name)
                    .appendTo($el);
                var $save = $("<button>")
                    .html("save")
                    .addClass('tmp')
                    .insertAfter($el)
                    .click(function() {
                        console.log('click?');
                        that.link = $link.val();
                        that.name = $name.val();
                        editing = false;
                        that.save();
                        console.log('rem.');
                    });
                var $del = $("<div>")
                    .addClass('remove')
                    .text('x')
                    .appendTo($el)
                    .click(function() {
                        that.deleteme();
                        FOLLY.show_links();
                    });
            });
    }
}

FOLLY.Projects = function(id, doc) {
    FOLLY.Base.call(this, id, doc);
}
FOLLY.Projects.prototype = new FOLLY.Base;
FOLLY.Projects.prototype.create = function() {
    return $("<div>");
};
FOLLY.Projects.prototype.update = function() {
    var that = this;

    if(!FOLLY.ref[this._id]) { return }
    var $el = FOLLY.ref[this._id];
    $el.empty();
    this.map = {};

    this.getAll('projects').forEach(function(project) {
        if(OP.app) {
            var projects = FOLLY.get_projects();
            var $up = $("<span>").text("^")
                .appendTo($el)
                .addClass('up')
                .click(function() {
                    var idx = projects.projects.indexOf(project._id);
                    if(idx === 0) { return }
                    projects.projects.splice(idx,1);
                    projects.projects = projects.projects.slice(0,idx-1)
                        .concat([project._id])
                        .concat(projects.projects.slice(idx-1));
                    projects.save();
                });
            var $down = $("<span>").text("v")
                .appendTo($el)
                .addClass('down')
                .click(function() {
                    var idx = projects.projects.indexOf(project._id);
                    if(idx === projects.projects.length-1) { return }
                    idx += 1;
                    var uid = projects.projects[idx];
                    projects.projects.splice(idx,1);
                    projects.projects = projects.projects.slice(0,idx-1)
                        .concat([uid])
                        .concat(projects.projects.slice(idx-1));
                    projects.save();
                });

        }
        var $proj = $("<a>", {href: "#/"+project._id})
            .text(project.name)
            .appendTo($el);
    });
    if(OP.app) {
        $el.find("input").remove();
        var $new = $("<input>")
            .appendTo($el)
            .change(function(ev) {
                var nproj = new FOLLY.Project($(this).val(), {name: $(this).val()});
                nproj.save();
                // Go to project
                window.location.hash = "#/" + $(this).val();
            });
    }

};
FOLLY.Projects.prototype.select = function(uid) {
    if(!FOLLY.ref[this._id]) { return }
    this.deselect();
    var idx = this.projects.indexOf(uid);
    this.El().find('a').eq(idx).addClass('select');
};
FOLLY.Projects.prototype.deselect = function() {
    $(".select").removeClass('select');
};

FOLLY.get_projects = function() {
    var ps = OP.Subjectification.all(FOLLY.Projects);
    if(ps.length === 0){
        // create a Projects object.
        var projs = OP.Subjectification.all(FOLLY.Project);
        var proj_ids = projs.map(function(X) { return X._id; });
        var PZ = new FOLLY.Projects("all_projects", {projects: proj_ids});
        PZ.save();
        return PZ;
    }
    return ps[0];
};

FOLLY.Links = function(id, doc) {
    FOLLY.Base.call(this, id, doc);
}
FOLLY.Links.prototype = new FOLLY.Base;

FOLLY.Image = function(id, doc) {
    FOLLY.Base.call(this, id, doc);
};
FOLLY.Image.prototype = new FOLLY.Base;
FOLLY.Image.prototype.create = function() {
    var $div = $("<div>")
        .addClass("image")
        .append($("<img>"))
        .append($("<div>")
                .addClass('caption')
                .addClass('typewriter'));

    if(OP.app) {
        $div.append($("<form>"));
    }

    return $div;
};
FOLLY.Image.prototype.update = function() {
    var that = this;

    if(!FOLLY.ref[this._id]) { return }
    FOLLY.ref[this._id]
        .find("img")
        .attr('src', 'img/sm/' + this.src);
    var $caption = FOLLY.ref[this._id]
        .find("div")
        .empty()
        .text(this.caption);
    if(OP.app) {
        $form = FOLLY.ref[this._id].find('form')
            .addClass('pickyimage')
            .empty()
            .append($("<input>", {type: "checkbox"})
                    .prop("checked", that.not_on_homepage)
                    .change(function() {
                        that.not_on_homepage = $(this).is(":checked");
                        that.save();
                    }))
            .append($("<span>").text("not on homepage"))
            .append($("<br>"))
            .append($("<input>", {type: "checkbox"})
                    .prop("checked", that.not_on_this_page)
                    .change(function() {
                        that.not_on_this_page = $(this).is(":checked");
                        that.save();
                    }))
            .append($("<span>").text("not on this page"));

        $caption
            .text(this.caption || "click to edit caption")
            .click(function() {
                var $inp = $("<input>")
                    .val(that.caption)
                    .appendTo($(this).empty())
                    .focus()
                    .blur(function() {
                        that.caption = $inp.val();
                        that.save();
                    })
                    .keypress(function(ev) {
                        if(ev.which === 13) { // enter
                            that.caption = $inp.val();
                            that.save();
                        }
                    });
            });
    }
};

FOLLY.show_portfolio_submenu = function() {
    // FOLLY.not_home();

    var $el = $("#column").fadeIn(500);
    $el.append(FOLLY.get_projects().El());

    $(window).scroll(function(){
        $('#column').css({
            'top': $(window).scrollTop() + 100
        });
    });

    // $("#page")
    //     .fadeOut(500)

    // XXX: hide?
};
FOLLY.show_project = function(project, img) {
    FOLLY.not_home();
    $("#page")
        .show()
        .children().detach();
    $("#page")
        .append(project.El());
};
FOLLY.show_links = function() {
    FOLLY.not_home();
    FOLLY.get_projects().deselect();

    $("#page")
        .show()
        .children().detach();
    OP.Subjectification.all(FOLLY.Link).forEach(function(link) {
        $("#page").append(link.El());
    });
    var $new = $("<div>")
        .appendTo($("#page"));
    if(OP.app) {
        var $link = $("<input>")
            .val('http://___')
            .appendTo($new);
        var $name = $("<input>")
            .val('___')
            .appendTo($new);
        var $save = $("<button>")
            .html("save")
            .appendTo($new)
            .click(function() {
                var link = new FOLLY.Link('link_'+Math.random(), // really?
                                        {link:$link.val(),
                                         name:$name.val()});
                link.save();
                FOLLY.show_links();
            });
    }
};
FOLLY.Home = {
    last: -1
};
FOLLY.Home.next = function() {
    var that = this; 

    $("#hwrap")
        .addClass('home');

    $("#page").hide();

    var projects = FOLLY.get_projects();
    var images = [];
    projects.getAll('projects')
        .forEach(function(project) {
            images = images.concat(
                project.getAll('story')
                    .filter(function(x) { 
                        if(x instanceof FOLLY.Image) {
                            if(OP.app) {
                                // XXX.. not the place for this... (side effects!)
                                if(x.project !== project._id) {
                                    x.project = project._id;
                                    x.save();
                                }
                            }
                            return !x.not_on_homepage;
                        }
                        return false;
                    }));
        });

    console.log("images", images);
    var random = Math.floor(Math.random() * images.length);
    while(this.last === random && images.length > 1) {
        random = Math.floor(Math.random() * images.length);
    }
    this.last = random;

    this.Img = images[random];

    this.$el = $("#home")
        .empty()
        .show();

    if(projects.projects.length == 0) {
        return;
    }
    var first_project_id = projects.projects[0];

    var $intro = $("<div>", {id: "intro"})
        .append($("<a>", {href:"#/"+first_project_id}).text("Portfolio"))
        .appendTo(this.$el);

    if(this.Img) {
        var $img = $("<img>", {src: 'img/big/'+this.Img.src})
            .appendTo(this.$el)
            .click(function() {
                // window.location.hash = "#/" + that.Img.project;
                that.next();
            })
        var $link = $("<a>", {href: "#/" + this.Img.project})
            .addClass('toproject')
            .text(this.Img.get('project').name)
            .appendTo(this.$el);
    }

    FOLLY.custom_layout();
};
FOLLY.show_home = function() {
    FOLLY.Home.next();
    FOLLY.custom_layout();
};
FOLLY.not_home = function() {
    $("#hwrap")
        .removeClass('home');
    $("#home")
        .fadeOut(500);
};
FOLLY.navigate_to_hash = function() {
    var hash = window.location.hash.slice(2);
    if(hash == "links") {
	    FOLLY.show_links();
    }
    else if(!hash || !OP.Subjectification.obj[hash]) {
        FOLLY.show_home();
    }
    else {
        var obj = OP.Subjectification.obj[hash];
        if(obj instanceof FOLLY.Project) {
            FOLLY.show_project(obj);
            FOLLY.get_projects().select(obj._id);
        }
        else if (obj instanceof FOLLY.Image) {
            var proj = obj.get('project');
            FOLLY.show_project(proj, obj);
        }
        // hide menu
        $(".pmenu").remove();
        document.body.scrollTop = 0;
    }
};
FOLLY.custom_layout = function() {
    var width = $(window).width();
    // right-align to -100px, but only if the page is big enough...
    var $el = $("#column");
    var item_width = $el.width();
    var left = Math.max(900, width - item_width - 100); // numerology
    $el.offset({left: left})

    var $im = $("#home").find('img');
    $im.width(width);

    var $intro = $("#intro");
    $intro.offset({left:width/2-$intro.width()/2, top: 200});

    // size the "header"
    $("#head").width(width-200);
};
