/**
 * (c) Copyright 2015 Gary McAdam
 */
chrome.extension.sendMessage({}, function(response) {
    // check every 10ms to see if the document is ready
    var readyStateCheckInterval = setInterval(function() {
        if (document.readyState === "complete") {
            // when the document is ready, cleanup the
            // interval and instanciate our plugin
            clearInterval(readyStateCheckInterval);
            new RedditLiveComments($('.comments-page'));
        }
    }, 10);
});

/**
 * Reddit Live Comments plugin for Google Chrome/Webkit Browsers
 * @param {jQuery} $parent The element with the class 'comments-page'
 */
function RedditLiveComments($parent) {

    /**
     * Parent DOM element
     * @type {jQuery}
     */
    this.$parent = $parent;

    /**
     * Seconds remaining until update
     * @type {Number}
     */
    this.secondsRemaining = 15;

    /**
     * The default page title when initialised
     * @type {String}
     */
    this.defaultTitle = '';

    /**
     * New comments since last focus
     * @type {Number}
     */
    this.totalNewComments = 0;

    /**
     * Indicates whether to update the title bar
     * with new comment count (i.e. is the tab not focused)
     * @type {Boolean}
     */
    this.notifyOnNew = false;

    /**
     * Config object
     * @type {Object}
     */
    this.config = {

        // menu item label
        menuItemLabel: 'live',

        // menu item class
        menuItemClass: 'redditLiveComments-menuItem',

        // update freq (miliseconds)
        updateFreq: 15000
    };

    // initialise the plugin
    this.init();
};

/**
 * Initialise the plugin
 * @return {void}
 */
RedditLiveComments.prototype.init = function() {
    // make a note of the current document title
    this.defaultTitle = document.title;
    // calculate the seconds remaining based on the update freq (miliseconds=>seconds)
    this.secondsRemaining = this.config.updateFreq/1000;
    // draw the menu item
    this.addMenuItem();
    // setup any window handlers
    this.addWindowHandlers();
};

/**
 * Setup any window handlers
 * @return {void}
 */
RedditLiveComments.prototype.addWindowHandlers = function() {
    var self = this;
    $(window).on('focus', function(){
        self.notifyOnNew = false;
        self.totalNewComments = 0;
        document.title = self.defaultTitle;
    });
    $(window).on('blur', function(){
        self.notifyOnNew = true;
    });
};

/**
 * Add UI controls to the screen
 * @return {void}
 */
RedditLiveComments.prototype.addUiControls = function() {
    var self = this;
    // render UI controls before the comments area
    var uiControls = $('<div class="redditLiveComments-controls" />')
        .append('<span class="redditLiveComments-label"><strong>LIVE</strong> Mode Enabled</span>')
        .append('<button type="button" class="redditLiveComments-control-stop">Stop</button>')
        .append('<button type="button" class="redditLiveComments-control-reload">Reload (<span class="redditLiveComments-control-stop-count">15</span>s)</button>')
    uiControls.insertBefore(this.$parent.find('.commentarea .nestedlisting'))
    // setup bindings on the UI elements here
    this.$parent.on('click', '.redditLiveComments-control-stop', function () {
        self.stopLiveMode();
    });
    this.$parent.on('click', '.redditLiveComments-control-reload', function () {
        self.reloadComments();
    });
};

/**
 * Add the menu item to the comments dropdown
 * @return {void}
 */
RedditLiveComments.prototype.addMenuItem = function() {
    var self = this;
    // remove the menu item if it exists already to prevent
    // duplication
    this.removeMenuItem();
    // add the element to the list
    this.$parent.find('.commentarea .lightdrop.drop-choices')
        .append($('<a />', {
            href: '#',
            class: 'choice ' + this.config.menuItemClass
        }).html(this.config.menuItemLabel));
    // setup any ui bindings
    this.$parent.on('click.redditLiveComments', '.'+this.config.menuItemClass, function(e){
        self.onMenuItemClick(e, this);
    });
};

/**
 * Remove the menu item from the dropdown list
 * @return {void}
 */
RedditLiveComments.prototype.removeMenuItem = function() {
    // cleanup any bindings
    this.$parent.off('click.redditLiveComments');
    // remove the element
    this.$parent.find('.commentarea .lightdrop.dropdown-choices ' +
            '.'+this.config.menuItemClass)
        .remove();
};

/**
 * When our menu item is clicked, start the live mode feature
 * @param  {event} e    
 * @param  {jQuery} elem
 * @return {void}
 */
RedditLiveComments.prototype.onMenuItemClick = function(e, elem) {
    e.preventDefault();
    this.initLiveMode();
};

/**
 * Start the live mode feature
 * @return {void}
 */
RedditLiveComments.prototype.initLiveMode = function() {
    // remove self post content and delete the current
    // comments - we're not interested in that any more
    this.hideSelfPostContent();
    this.hideDefaultComments();
    // scroll to the top of the window
    this.scrollToTop();
    // star the live mode fetching
    this.startLiveMode();
};

/**
 * Start livemode fetching
 * @return {void}
 */
RedditLiveComments.prototype.startLiveMode = function() {
    var self = this;
    // add our UI controls to let the user stop and reload etc.
    this.addUiControls();
    // update the UI every 1s - right now this is used
    // to simply show the countdown but we could utilise
    // this further for other things, at which point it
    // should probably be refactored out.
    this.uiUpdateInterval = setInterval(function() {
        self.secondsRemaining -= 1;
        self.updateUi();
    }, 1000);
    // start loading the comments
    this.reloadComments();
};

/**
 * Stops counting down and reloads the comments before
 * setting up a new countdown
 * @return {void}
 */
RedditLiveComments.prototype.reloadComments = function () {
    var self = this;
    // fetch the latest comments
    self.fetchComments();
    // cleanup the interval from the last countdown, if necessary
    clearInterval(this.liveModeUpdateInterval);
    // setup the new interval
    this.liveModeUpdateInterval = setInterval(function() {
        self.fetchComments();
    }, this.config.updateFreq);
};

/**
 * Update the UI
 * @return {void}
 */
RedditLiveComments.prototype.updateUi = function () {
    // show the amount of seconds until update
    this.$parent
        .find('.redditLiveComments-control-stop-count')
        .text(this.secondsRemaining);
};

/**
 * Stop the live mode
 * @return {void}
 */
RedditLiveComments.prototype.stopLiveMode = function() {
    // pretty lazy, but we just reload the window
    // for now as this is the quickest way to get the user
    // back to what they were previously doing without
    // having to worry about cleaning up our UI
    window.location.reload();
};

/**
 * Fetch the latest comments from the server
 * @return {void}
 */
RedditLiveComments.prototype.fetchComments = function() {
    var self = this;
    // reset the seconds remaining label
    self.secondsRemaining = self.config.updateFreq/1000;
    this.updateUi();
    // we get the latest comments as HTML
    // from the reddit comments page.
    // this is slightly less efficient than, say,
    // using the reddit api, but with the api
    // we're missing vital UI information, bindings,
    // classnames, IDs, etc. which means we can't
    // faithfully render a comment block, so we take
    // the laziest approach and fetch the HTML directly
    // sorry reddit!
    var url = [
        'http://www.reddit.com/',
        window.location.pathname,
        '/?sort=new'
    ].join('');
    // fetch the url, parse the contents from it and
    // render any new comments.
    $.get(url)
        .success(function(response) {
            self.renderNewComments(
                $(response)
                    .find('.nestedlisting > .thing.comment:not(.deleted)')
                    .get()
                    .reverse()
            );
        });
};

/**
 * Render any new comments from the server
 * @param  {array} comments Array of top-level comment elements
 * @return {void}
 */
RedditLiveComments.prototype.renderNewComments = function(comments) {
    var self = this,
        newComments = 0;
    $.each(comments, function(){
        var comment = $(this),
            existing = false,
            hilight = true,
            id = comment.data('fullname');
        // is this a new comment? if we have seen it before
        // then we just replace the existing html (this brings
        // in any updates, e.g. time, vote stauts, score, and
        // child comments)
        if (self.$parent.find('.id-'+id).length > 0) {
            existing = self.$parent.find('.id-'+id);
            hilight = false;
        } else {
            newComments = newComments + 1;
            hilight = true;
        }
        self.renderComment(comment, existing, hilight);
    });
    // update the total new comments count and show a notifcation
    // in the title bar if necessary
    this.totalNewComments = this.totalNewComments + newComments;
    this.notify();
};

/**
 * Update the title bar with the total new comments
 * @return {void}
 */
RedditLiveComments.prototype.notify = function () {
    if (!this.notifyOnNew || this.totalNewComments === 0) {
        return;
    }
    document.title = '(' + this.totalNewComments + ') ' + this.defaultTitle;
}

/**
 * Render a single comment to the list
 * @param  {jQuery} comment  Comment DOM element
 * @param  {jQuery} existing The jQuery DOM element where the existing comment lives,
 * if applicable
 * @param  {Boolean} hilight Whether to highilght this comment or not
 * @return {void}
 */
RedditLiveComments.prototype.renderComment = function(comment, existing, hilight) {
    // allow us to style and modify our own comments
    comment.addClass('redditLiveComments-comment');
    if(existing) {
        existing.replaceWith(comment);
    } else {
        this.$parent.find('.commentarea .sitetable.nestedlisting')
            .prepend(comment);    
    }
    if (hilight) {
        // hilight animation, majority of which
        // is handled in the CSS transition
        comment
            .addClass('redditLiveComments-hilight');
        setTimeout(function() {
            comment.removeClass('redditLiveComments-hilight');
        }, 1000);
    }
};

/**
 * Remove the existing comments
 * @return {jQuery}
 */
RedditLiveComments.prototype.hideDefaultComments = function() {
    return this.$parent.find('.commentarea .sitetable.nestedlisting').html('');
};

/**
 * Remove the self post comment (distraction)
 * @return {jQuery}
 */
RedditLiveComments.prototype.hideSelfPostContent = function() {
    return this.$parent.find('.entry .usertext-body').hide();
};

/**
 * Scroll, smoothly, to the top of the page
 * @return {jQuery}
 */
RedditLiveComments.prototype.scrollToTop = function () {
    return this.scrollTo($('html,body'),0);
};

/**
 * Utility metod to scroll to a position within a given element
 * @param  {jQuery} elem
 * @param  {Number} pos
 * @return {jQuery}
 */
RedditLiveComments.prototype.scrollTo = function(elem, pos) {
    return elem.animate({
        scrollTop: pos
    }, 1000);
};