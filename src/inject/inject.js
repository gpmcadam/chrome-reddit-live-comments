class RedditLiveComments {
  constructor($parent) {
    this.$parent = $parent;

    this.secondsRemaining = 15;

    this.defaultTitle = "";

    this.totalNewComments = 0;

    this.notifyOnNew = false;

    this.config = {
      menuItemLabel: "live",
      menuItemClass: "redditLiveComments-menuItem",
      updateFreq: 15000,
    };

    this.init();
  }

  init() {
    this.defaultTitle = document.title;
    this.secondsRemaining = this.config.updateFreq / 1000;
    this.addMenuItem();
    this.addWindowHandlers();
  }

  addWindowHandlers() {
    var self = this;
    $(window).on("focus", function () {
      self.notifyOnNew = false;
      self.totalNewComments = 0;
      document.title = self.defaultTitle;
    });
    $(window).on("blur", function () {
      self.notifyOnNew = true;
    });
  }

  addUiControls() {
    var self = this;
    var uiControls = $('<div class="redditLiveComments-controls" />')
      .append(
        '<span class="redditLiveComments-label"><strong>LIVE</strong> Mode Enabled</span>'
      )
      .append(
        '<button type="button" class="redditLiveComments-control-stop">Stop</button>'
      )
      .append(
        '<button type="button" class="redditLiveComments-control-reload">Reload (<span class="redditLiveComments-control-stop-count">15</span>s)</button>'
      );
    uiControls.insertBefore(this.$parent.find(".commentarea .nestedlisting"));
    this.$parent.on("click", ".redditLiveComments-control-stop", function () {
      self.stopLiveMode();
    });
    this.$parent.on("click", ".redditLiveComments-control-reload", function () {
      self.reloadComments();
    });
  }

  addMenuItem() {
    var self = this;
    this.removeMenuItem();
    this.$parent.find(".commentarea .lightdrop.drop-choices").append(
      $("<a />", {
        href: "#",
        class: "choice " + this.config.menuItemClass,
      }).html(this.config.menuItemLabel)
    );
    this.$parent.on(
      "click.redditLiveComments",
      "." + this.config.menuItemClass,
      function (e) {
        self.onMenuItemClick(e, this);
      }
    );
  }

  removeMenuItem() {
    this.$parent.off("click.redditLiveComments");
    this.$parent
      .find(
        ".commentarea .lightdrop.dropdown-choices " +
          "." +
          this.config.menuItemClass
      )
      .remove();
  }

  onMenuItemClick(e) {
    e.preventDefault();
    this.initLiveMode();
  }

  initLiveMode() {
    this.hideSelfPostContent();
    this.hideDefaultComments();
    this.scrollToTop();
    this.startLiveMode();
  }

  startLiveMode() {
    var self = this;
    this.addUiControls();
    this.uiUpdateInterval = setInterval(function () {
      self.secondsRemaining -= 1;
      self.updateUi();
    }, 1000);
    this.reloadComments();
  }

  reloadComments() {
    var self = this;
    self.fetchComments();
    clearInterval(this.liveModeUpdateInterval);
    this.liveModeUpdateInterval = setInterval(function () {
      self.fetchComments();
    }, this.config.updateFreq);
  }

  updateUi() {
    this.$parent
      .find(".redditLiveComments-control-stop-count")
      .text(this.secondsRemaining);
  }

  stopLiveMode() {
    window.location.reload();
  }

  fetchComments() {
    var self = this;
    self.secondsRemaining = self.config.updateFreq / 1000;
    this.updateUi();
    var url = [window.location.pathname, "/?sort=new"].join("");

    $.get(url).success(function (response) {
      self.renderNewComments(
        $(response)
          .find(".nestedlisting > .thing.comment:not(.deleted)")
          .get()
          .reverse()
      );
    });
  }

  renderNewComments(comments) {
    var self = this,
      newComments = 0;
    $.each(comments, function () {
      var comment = $(this),
        existing = false,
        hilight = true,
        id = comment.data("fullname");
      if (self.$parent.find(".id-" + id).length > 0) {
        existing = self.$parent.find(".id-" + id);
        hilight = false;
      } else {
        newComments = newComments + 1;
        hilight = true;
      }
      self.renderComment(comment, existing, hilight);
    });
    this.totalNewComments = this.totalNewComments + newComments;
    this.notify();
  }

  notify() {
    if (!this.notifyOnNew || this.totalNewComments === 0) {
      return;
    }
    document.title = "(" + this.totalNewComments + ") " + this.defaultTitle;
  }

  renderComment(comment, existing, hilight) {
    comment.addClass("redditLiveComments-comment");
    if (existing) {
      existing.replaceWith(comment);
    } else {
      this.$parent
        .find(".commentarea .sitetable.nestedlisting")
        .prepend(comment);
    }
    if (hilight) {
      comment.addClass("redditLiveComments-hilight");
      setTimeout(function () {
        comment.removeClass("redditLiveComments-hilight");
      }, 1000);
    }
  }

  hideDefaultComments() {
    return this.$parent.find(".commentarea .sitetable.nestedlisting").html("");
  }

  hideSelfPostContent() {
    return this.$parent.find(".entry .usertext-body").hide();
  }

  scrollToTop() {
    return this.scrollTo($("html,body"), 0);
  }

  scrollTo(elem, pos) {
    return elem.animate(
      {
        scrollTop: pos,
      },
      1000
    );
  }
}

let initialised = false;

const log = (o) => console.log(`[Reddit Live Comments]`, o);

function __init__(target = document) {
  log(target.readyState);

  if (target.readyState === "complete") {
    const $check = $(".comments-page .commentarea .lightdrop.drop-choices");

    if ($check.length < 1) {
      log("could not detect comments");
      return;
    }

    if (!initialised) {
      initialised = new RedditLiveComments($(".comments-page"));
    }
  }
}

document.addEventListener("readystatechange", (event) => {
  __init__(event.target);
});

__init__();
log("init");
