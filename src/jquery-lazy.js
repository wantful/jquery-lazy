//     jquery-lazy.js 1.0.0
//     (c) 2012-2013 Hunter Bridges, Jeff Rafter, Wantful Inc.
//     jquery-lazy may be freely distributed under the MIT license.
//
// [About this plugin](../index.html)

(function($, window) {
  // For browsers that support it, access the device pixel ratio.
  // For those that don't, default to 1.
  var devicePixelRatio = 1;
  if (window.devicePixelRatio !== undefined)
    devicePixelRatio = window.devicePixelRatio;

  // Create reference to jQuery-wrapped `window` and a forward reference
  // to the element that handles scrolling (different per browser).
  var $window = $(window);
  var $scroller = null;

  // `lazy`
  // ------
  // _The main, chainable `lazy` method. For all intensive purposes,
  // this is the only “public” API._
  $.fn.lazy = function(options) {
    var opts = $.extend({}, $.fn.lazy.defaults, options);

    // Go through the images we already have. Remove orphan images from
    // the `images` array.
    $.fn.lazy.images = $.map($.fn.lazy.images, function(item) {
      var contains = $(item).is('html *');
      if (contains) return item;
      return undefined;
    });

    // Push selected images into `images` array.
    this.each(function() {
      $.fn.lazy.images.push(this);
    });

    // Manage `scroll` and `resize` callbacks.
    if ($.fn.lazy.currentScrollHandler) {
      $window.unbind('scroll.lazy resize.lazy', $.fn.lazy.currentScrollHandler);
    }

    $.fn.lazy.currentScrollHandler = (function(o) {
      return function(e) {
        return $.fn.lazy.scrollAction(e, o);
      };
    }(opts));

    $window.bind('scroll.lazy resize.lazy', $.fn.lazy.currentScrollHandler);

    // Clean up the `images` array.
    $.fn.lazy.images = $.unique($.fn.lazy.images);
    $.fn.lazy.arrayClean.apply($.fn.lazy.images, undefined);

    // Artificially invoke a “scroll.”
    $.fn.lazy.scrollAction(null, opts);

    return this;
  };

  // `defaults`
  // ----------
  // _The defaults_
  $.fn.lazy.defaults = {
    fade: true
  };

  // `images`
  // --------
  // _Stores `<img>` DOM elements that `lazy` tracks._
  $.fn.lazy.images = [];

  // `loadedAlready`
  // ---------------
  // _For tracking whether `lazy` has loaded a given URL or not._
  $.fn.lazy.loadedAlready = {};

  // `arrayClean`
  // ------------
  // _Utility function for removing unwanted objects from an array en masse._
  $.fn.lazy.arrayClean = function(deleteValue) {
    for (var i = 0; i < this.length; i++) {
      if (this[i] === deleteValue) {
        this.splice(i, 1);
        i--;
      }
    }
    return this;
  };

  // `scrollAction`
  // --------------
  // _The function from which `scroll` and `resize` callbacks are built._
  $.fn.lazy.scrollAction = function(e, o) {
    // Make sure `$scroller` is set.
    $scroller = $scroller ||
        (($.browser.mozilla || $.browser.msie) ? $('html') : $('body'));

    var checkCache = [];
    for (var i = 0; i < $.fn.lazy.images.length; i++) {
      // Grab the DOM element, create a jQuery-wrapped version,
      // determine the scroll position of its top and bottom.
      var image = $.fn.lazy.images[i];
      var $image = $(image);
      var imageTop = $image.offset().top;
      var imageBottom = imageTop + $image.height();

      var viewportTop = $scroller.scrollTop();
      var viewportBottom = $scroller.scrollTop() + $window.height();

      // Check if the image is on screen.
      if (imageBottom < viewportTop) continue;
      if (imageTop > viewportBottom) continue;

      // Make sure the image is visible and hasn't been loaded already.
      var visible = $image.is(':visible');
      var needsLoad =
          !$.fn.lazy.loadedAlready[$.fn.lazy.sourceToLoad(image)] && visible;

      // This is kind of nasty. Browsers handle binds to the `error`, `abort`,
      // and `load` events inconsistently in respect to `<img>` tags.
      // For maximum cross-browser support, we are going to use this approach
      // instead of a proper `bind`.
      $image.attr('onerror',
                  "$.fn.lazy.xReload(this, "+(o.fade?'true':'false')+");");
      $image.attr('onabort', "$.fn.lazy.xReset(this);");

      // Swap the `blank` image out, replace it with the target image URL.
      $image.attr('data-blank', $image.attr('src'));
      $image.attr('src', $.fn.lazy.sourceToLoad(image));

      // Jumping through lots of hoops here to deal with browser caches.
      // If the image URL has been loaded already or the element is hidden,
      // go on with the loop after `src` is set.
      if (!needsLoad) continue;

      checkCache.push(image);
      delete $.fn.lazy.images[i];
    }

    // Oh the humanity! We are actually exploiting `setTimeout`'s ability
    // to resolve the call stack so we can get an accurate read from the
    // browser cache.
    setTimeout(function () {
      for (var i = 0; i < checkCache.length; i++) {
        var image = checkCache[i];
        var complete = image.complete || image.readyState === "complete";
        if (complete) {
          $.fn.lazy.xShow(image, o.fade);
          continue;
        }

        $.fn.lazy.xHide(image, o.fade);
        var $image = $(image);
        $image.attr('onload',
                    "$.fn.lazy.xShow(this, "+(o.fade?'true':'false')+");");
      }
    }, 0);

    // Clean up the `images` array.
    $.fn.lazy.arrayClean.apply($.fn.lazy.images, undefined);
  };

  // `xHide`
  // -------
  // _A cross-browser hide function._
  $.fn.lazy.xHide = function(image, fade) {
    var $image = $(image);
    if ($.support.opacity && fade) {
      $image.css('opacity', 0);
    }
    $image.css('visibility', 'hidden');
  };

  // `xShow`
  // -------
  // _A cross-browser show function, with
  // the option to fade in._
  //
  // _Expects `this` to be DOM image. Can be used in HTML `onload`_
  $.fn.lazy.xShow = function(image, fade, force) {
    var $image = $(image || this);
    var src = $.fn.lazy.sourceToLoad(image);
    if ($image.attr('src') !== src && !force) return;
    $.fn.lazy.loadedAlready[src] = true;

    if ($.support.opacity && fade) {
      $image.stop().animate({opacity: 1}, 300);
    }
    $image.css('visibility', 'visible');
  };

  // `xReset`
  // -------
  // _Resets image `src` to its `blank` URL._
  //
  // _Expects `this` to be DOM image._
  $.fn.lazy.xReset = function(image) {
    var $image = $(image || this);
    $image.attr('src', $image.attr('data-blank'));
  };

  // `xReload`
  // -------
  // _Retry to load a failed image, up to three times._
  //
  // _Expects `this` to be DOM image. Can be used in HTML `onerror`_
  $.fn.lazy.xReload = function(image) {
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

  // `sourceToLoad`
  // --------------
  // _Returns the `retina-src` if available and the device supports it.
  // Otherwise, returns the `original`_
  $.fn.lazy.sourceToLoad = function(image) {
    var $image = $(image);
    if (devicePixelRatio === 2 && $image.attr('data-retina-src'))
        return $image.attr('data-retina-src');
    return $image.attr('data-original');
  };

// Use the safe external reference to `jQuery`
}(jQuery, window));
