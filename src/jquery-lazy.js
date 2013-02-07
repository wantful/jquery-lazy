//     jquery-lazy.js 1.0.0
//     (c) 2012-2013 Hunter Bridges, Jeff Rafter, Wantful Inc.
//     jquery-lazy may be freely distributed under the MIT license.
//

// A functino
(function($, window) {
  var ratio = 1;
  if (window.devicePixelRatio !== undefined) ratio = window.devicePixelRatio;

  var $window = $(window);
  var $scroller = null;

  $.fn.lazy = function(options) {
    // Hate you
    if ($.browser.msie) {
      this.each(function() {
        $(this).attr("src", $(this).attr('data-original'));
      });
      return;
    }

    var opts = $.extend({}, $.fn.lazy.defaults, options);
    $.fn.lazy.images = $.map($.fn.lazy.images, function(item) {
      var contains = $(item).is('html *');
      if (contains) return item;
      return undefined;
    });
    var retval = this.each(function() {
      var $this = $(this);
      var o = $.meta ? $.extend({}, opts, $this.data()) : opts;

      $.fn.lazy.images.push(this);
    });

    if ($.fn.lazy.currentScrollHandler) {
      $window.unbind('scroll.lazy resize.lazy', $.fn.lazy.currentScrollHandler);
    }

    $.fn.lazy.currentScrollHandler = (function(o) {
      return function(e) {
        return $.fn.lazy.scrollAction(e, o);
      };
    }(opts));
    $window.bind('scroll.lazy resize.lazy', $.fn.lazy.currentScrollHandler);

    $.fn.lazy.scrollAction(null, opts);
    $.fn.lazy.images = $.unique($.fn.lazy.images);
    $.fn.lazy.arrayClean.apply($.fn.lazy.images, undefined);
    return retval;
  };

  $.fn.lazy.images = [];
  $.fn.lazy.loadedAlready = {};

  $.fn.lazy.arrayClean = function(deleteValue) {
    for (var i = 0; i < this.length; i++) {
      if (this[i] === deleteValue) {
        this.splice(i, 1);
        i--;
      }
    }
    return this;
  };

  $.fn.lazy.defaults = {
    fade: true
  };

  $.fn.lazy.scrollAction = function(e, o) {
    $scroller = $scroller || (($.browser.mozilla || $.browser.msie) ? $('html') : $('body'));
    for (var i = 0; i < $.fn.lazy.images.length; i++) {
      var image = $.fn.lazy.images[i];
      var $image = $(image);
      var imageTop = $image.offset().top;
      var imageBottom = imageTop + $image.height();

      var viewportTop = $scroller.scrollTop();
      var viewportBottom = $scroller.scrollTop() + $window.height();

      if (imageBottom < viewportTop) continue;
      if (imageTop > viewportBottom) continue;

      // Load!
      var visible = $image.is(':visible');
      var needsLoad = !$.fn.lazy.loadedAlready[$.fn.lazy.sourceToLoad(image)] &&
        visible;

      $image.attr('onerror', "$.fn.lazy.xReload(this, "+(o.fade?'true':'false')+");");
      $image.attr('onabort', "$.fn.lazy.xReset(this);");
      $image.attr('data-blank', $image.attr('src'));
      $image.attr('src', $.fn.lazy.sourceToLoad(image));
      if (needsLoad) {
        setTimeout(function () {
          var complete = image.complete || image.readyState === "complete";
          if (!complete) {
            $.fn.lazy.xHide(image, o.fade);
            $image.attr('onload', "$.fn.lazy.xShow(this, "+(o.fade?'true':'false')+");");
          }
          if (complete) $.fn.lazy.xShow(image, o.fade);
        }, 0);
        delete $.fn.lazy.images[i];
      }
    }
    $.fn.lazy.arrayClean.apply($.fn.lazy.images, undefined);
  };

  $.fn.lazy.xHide = function(image, fade) {
    var $image = $(image);
    if ($.support.opacity && fade) {
      $image.css('opacity', 0);
    }
    $image.css('visibility', 'hidden');
  };

  $.fn.lazy.xShow = function(image, fade, force) {
    // Expects `this` to be DOM image!
    var $image = $(image || this);
    var src = $.fn.lazy.sourceToLoad(image);
    if ($image.attr('src') !== src && !force) return;
    $.fn.lazy.loadedAlready[src] = true;

    if ($.support.opacity && fade) {
      $image.stop().animate({opacity: 1}, 300);
    }
    $image.css('visibility', 'visible');
  };

  $.fn.lazy.xReset = function(image) {
    var $image = $(image || this);
    $image.attr('src', $image.attr('data-blank'));
  };

  $.fn.lazy.xReload = function(image) {
    // Expects `this` to be DOM image!
    var $image = $(image || this);
    var retries = parseInt($image.attr('data-retries'), 10);
    $.fn.lazy.xHide(image || this);
    $image.attr('src', $image.attr('data-blank'));

    if (retries < 3) {
      setTimeout(function() {
        var d = new Date();
        $image.attr('src', $.fn.lazy.sourceToLoad(image) + '?' + d.getTime());
        retries++;
        $image.attr('data-retries', retries);
      }, 100);
    } else {
      setTimeout(function() {
        var d = new Date();
        var error_image = $image.attr('data-error');
        if (error_image && error_image !== "") {
          $image.attr('src', error_image + '?' + d.getTime());
          $.fn.lazy.xShow(image || this, false, true);
        } else {
          error_image = $image.attr('data-blank');
          $image.attr('src', error_image + '?' + d.getTime());
        }
      }, 100);
    }
  };

  $.fn.lazy.sourceToLoad = function(image) {
    var $image = $(image);
    if (ratio === 2 && $image.attr('data-retina-src'))
        return $image.attr('data-retina-src');
    return $image.attr('data-original');
  };

}(jQuery, window));
