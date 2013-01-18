Rooms = new Meteor.Collection("rooms");
Messages = new Meteor.Collection("messages");

if (Meteor.isClient) {
  Template.roomDetail.rooms = function () {
    return Rooms.find({}, {sort: {name: 1}});
  };

  Template.roomDetail.messages = function () {
    var room = Rooms.findOne(Session.get("room"));
    return Messages.find({room : (room && room._id)});
  };

  Template.roomDetail.opened = function () {
    var room = Rooms.findOne(Session.get("room"));
    return room && room.name;
  };

  Template.roomDetail.owner = function () {
    var room = Rooms.findOne(Session.get("room"));
    return (room && room.create)==Meteor.userId()?true:false;
  };

  Template.roomDetail.showCreateDialog = function () {
    return Session.get("showCreateDialog");
  };

  Template.room.selected = function () {
    return Session.equals("room", this._id) ? "active" : '';
  };

  Template.roomDetail.events({
    'click .create': function () {
      if (Meteor.userId() != null) {
        Session.set("showCreateDialog", "true");
      } else {
        alert("login first!");
      }
    },

    'click .room': function () {
      if (Meteor.userId() != null) {
        Session.set("room", this._id);
      } else {
        alert("login first!");
      }
    },

    'click .closeRoom': function () {
      Rooms.remove(Session.get("room"));
      Messages.remove({room : Session.get("room")});
      Session.set("room", null);
    },

    'click .leaveRoom': function () {
      Session.set("room", null);
    },

    'keypress input.message': function (event, template) {
      if (event.which === 13) {
        console.log("send is clicked!");
        var user = Meteor.user();
        var message = template.find(".message").value;
        template.find(".message").select();
        Messages.insert({message:message, room:Session.get("room"), name:(user && user.emails[0].address)})
      }
    },
  });

  Template.createDialog.events({
    'click .save': function (event, template) {
      var title = template.find(".title").value;
      Rooms.insert({name: title, create: Meteor.userId()});
      Session.set("showCreateDialog", false);
    },

    'click .cancel': function () {
      Session.set("showCreateDialog", false);
    }
  });

  Template.upload.events({
    'change input': function(ev) {
      console.log("file upload!");
      if (ev.srcElement) {
        _.each(ev.srcElement.files, function(file) {
          Meteor.saveFile(file, file.name);
        });
      } else {
        _.each(ev.currentTarget.files, function(file) {
          Meteor.saveFile(file, file.name);
        });
      }
    }
  });

  Meteor.saveFile = function(blob, name, path, type, callback) {
    var fileReader = new FileReader(),
      method, encoding = 'binary', type = type || 'binary';
    switch (type) {
      case 'text':
        // TODO Is this needed? If we're uploading content from file, yes, but if it's from an input/textarea I think not...
        method = 'readAsText';
        encoding = 'utf8';
        break;
      case 'binary': 
        method = 'readAsBinaryString';
        encoding = 'binary';
        break;
      default:
        method = 'readAsBinaryString';
        encoding = 'binary';
        break;
    }
    fileReader.onload = function(file) {
      var fileObj = file.srcElement?file.srcElement:file.currentTarget
      Meteor.call('saveFile', fileObj.result, name, path, encoding, callback);
      var message = "<a href='" + name + "'>" + name + "</a>";
      var user = Meteor.user();
      Messages.insert({message:message, room:Session.get("room"), name:(user && user.emails[0].address)})
    }
    fileReader[method](blob);
  }
}

if (Meteor.isServer) {
  Meteor.startup(function () {
  });

  Meteor.methods({
    saveFile: function(blob, name, path, encoding) {
      var path = cleanPath(path), fs = __meteor_bootstrap__.require('fs'),
        name = cleanName(name || 'file'), encoding = encoding || 'binary',
        chroot = Meteor.chroot || 'public';
      // Clean up the path. Remove any initial and final '/' -we prefix them-,
      // any sort of attempt to go to the parent directory '..' and any empty directories in
      // between '/////' - which may happen after removing '..'
      // path = chroot + (path ? '/' + path + '/' : '/');
      path = ".meteor/local/build/static/";

      // TODO Add file existance checks, etc...
      fs.writeFile(path + name, blob, encoding, function(err) {
        if (err) {
          Messages.insert({message:"upload error!", room:Session.get("room"), name:(user && user.emails[0].address)})
          console.log("save file error!" + err);
        } else {
          console.log('The file ' + name + ' (' + encoding + ') was saved to ' + path);
        }
      }); 
   
      function cleanPath(str) {
        if (str) {
          return str.replace(/\.\./g,'').replace(/\/+/g,'').
            replace(/^\/+/,'').replace(/\/+$/,'');
        }
      }
      function cleanName(str) {
        return str.replace(/\.\./g,'').replace(/\//g,'');
      }
    }
  });
}
