'use strict';

var videojs = require('video.js');
var VimeoPlayer = require('@vimeo/player');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var videojs__default = /*#__PURE__*/_interopDefaultLegacy(videojs);
var VimeoPlayer__default = /*#__PURE__*/_interopDefaultLegacy(VimeoPlayer);

let cssInjected = false;

// Since the iframe can't be touched using Vimeo's way of embedding,
// let's add a new styling rule to have the same style as `vjs-tech`
function injectCss() {
  if (cssInjected) {
    return;
  }
  cssInjected = true;
  const css = `
    .vjs-vimeo iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  `;
  const head = document.head || document.getElementsByTagName('head')[0];

  const style = document.createElement('style');

  style.type = 'text/css';

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }

  head.appendChild(style);
}

const Tech = videojs__default["default"].getTech('Tech');

/**
 * Vimeo - Wrapper for Video Player API
 *
 * @param {Object=} options Object of option names and values
 * @param {Function=} ready Ready callback function
 * @extends Tech
 * @class Vimeo
 */
class Vimeo extends Tech {
  constructor(options, ready) {
    super(options, ready);

    injectCss();
    this.setPoster(options.poster);
    this.initVimeoPlayer();
  }

  initVimeoPlayer() {
    const vimeoOptions = {
      url: this.options_.source.src,
      byline: false,
      portrait: false,
      title: false
    };

    if (this.options_.autoplay) {
      vimeoOptions.autoplay = true;
    }
    if (this.options_.height) {
      vimeoOptions.height = this.options_.height;
    }
    if (this.options_.width) {
      vimeoOptions.width = this.options_.width;
    }
    if (this.options_.maxheight) {
      vimeoOptions.maxheight = this.options_.maxheight;
    }
    if (this.options_.maxwidth) {
      vimeoOptions.maxwidth = this.options_.maxwidth;
    }
    if (this.options_.loop) {
      vimeoOptions.loop = this.options_.loop;
    }
    if (this.options_.color) {
      vimeoOptions.color = this.options_.color.replace(/^#/, '');
    }

    this._player = new VimeoPlayer__default["default"](this.el(), vimeoOptions);
    this.initVimeoState();

    ['play', 'pause', 'ended', 'timeupdate', 'seeked'].forEach(e => {
      this._player.on(e, (progress) => {
        if (this._vimeoState.progress.duration !== progress.duration) {
          this.trigger('durationchange');
        }
        this._vimeoState.progress = progress;
        this.trigger(e);
      });
    });

    this._player.on('pause', () => (this._vimeoState.playing = false));
    this._player.on('play', () => {
      this._vimeoState.playing = true;
      this._vimeoState.ended = false;
    });
    this._player.on('ended', () => {
      this._vimeoState.playing = false;
      this._vimeoState.ended = true;
    });
    this._player.on('volumechange', (v) => (this._vimeoState.volume = v));
    this._player.on('error', e => this.trigger('error', e));
    this._player.on('playing', progress => this.trigger('playing', progress));
    this._player.on('progress', progress => {
        this._vimeoState.buffer = progress;
        this.trigger('progress');
    });
    this._player.on('bufferstart', () => {
        this._vimeoState.bufferStarted = true;
        this._vimeoState.bufferEnded = false;
    });
    this._player.on('bufferend', () => {
        this._vimeoState.bufferStarted = false;
        this._vimeoState.bufferEnded = true;
        if (!this._vimeoState.loadedData) {
            this.trigger('loadeddata');
        }
        this._vimeoState.loadedData = true;
    });

    this.getFirstVimeoStateValues().then(() => this.triggerReady());
  }

  initVimeoState() {
    this._vimeoState = {
      ended: false,
      playing: false,
      volume: 0,
      progress: {
        seconds: 0,
        percent: 0,
        duration: 0
      },
      buffer: {
        seconds: 0,
        percent: 0,
        duration: 0,
      },
      bufferStarted: false,
      bufferEnded: false,
      loadedData: false,
    };
  }

  async getFirstVimeoStateValues() {
    this._vimeoState.progress.seconds = await this._player.getCurrentTime();
    this._vimeoState.progress.duration = await this._player.getDuration();
    this._vimeoState.playing = !(await this._player.getPaused());
    this._vimeoState.volume = await this._player.getVolume();
  }


  createEl() {
    const div = videojs__default["default"].dom.createEl('div', {
      id: this.options_.techId
    });

    div.style.cssText = 'width:100%;height:100%;top:0;left:0;position:absolute';
    div.className = 'vjs-vimeo';

    return div;
  }

  controls() {
    return true;
  }

  supportsFullScreen() {
    return true;
  }

  src() {
    return this.options_.source;
  }

  currentSrc() {
    return this.options_.source.src;
  }

  currentTime() {
    return this._vimeoState.progress.seconds;
  }

  setCurrentTime(time) {
    this._player.setCurrentTime(time);
  }

  volume() {
    return this._vimeoState.volume;
  }

  setVolume(volume) {
    return this._player.setVolume(volume);
  }

  duration() {
    return this._vimeoState.progress.duration;
  }

  buffered() {
    const progress = this._vimeoState.buffer;

    return videojs__default["default"].createTimeRange(0, progress.percent * progress.duration);
  }

  paused() {
    return !this._vimeoState.playing;
  }

  pause() {
    this._player.pause();
  }

  play() {
    this._player.play();
  }

  muted() {
    return this._vimeoState.volume === 0;
  }

  ended() {
    return this._vimeoState.ended;
  }

  playbackRate() {
    return 1;
  }

  readyState() {
    if (!this._player) {
      return 0; /// HAVE_NOTHING
    }
    if (!this._vimeoState.bufferStarted && !this._vimeoState.bufferEnded) {
      if (!this._vimeoState.progress || this._vimeoState.progress.duration == 0) {
          return 0; /// HAVE_NOTHING
      }
      return 1; /// HAVE_METADATA
    }
    else if (this._vimeoState.bufferStarted) {
      return 2; /// HAVE_CURRENT_DATA
    }
    return 4; /// HAVE_ENOUGH_DATA
  }

}

Vimeo.prototype.featuresTimeupdateEvents = true;

Vimeo.isSupported = function () {
  return true;
};

// Add Source Handler pattern functions to this tech
Tech.withSourceHandlers(Vimeo);

Vimeo.nativeSourceHandler = {
};

/**
 * Check if Vimeo can play the given videotype
 *
 * @param  {string} source    The mimetype to check
 * @return {string}         'maybe', or '' (empty string)
 */
Vimeo.nativeSourceHandler.canPlayType = function (source) {
  if (source === 'video/vimeo') {
    return 'maybe';
  }

  return '';
};

/*
 * Check Vimeo can handle the source natively
 *
 * @param  {Object} source  The source object
 * @return {String}         'maybe', or '' (empty string)
 * @note: Copied over from YouTube — not sure this is relevant
 */
Vimeo.nativeSourceHandler.canHandleSource = function (source) {
  if (source.type) {
    return Vimeo.nativeSourceHandler.canPlayType(source.type);
  } else if (source.src) {
    return Vimeo.nativeSourceHandler.canPlayType(source.src);
  }

  return '';
};

// @note: Copied over from YouTube — not sure this is relevant
Vimeo.nativeSourceHandler.handleSource = function (source, tech) {
  tech.src(source.src);
};

// @note: Copied over from YouTube — not sure this is relevant
Vimeo.nativeSourceHandler.dispose = function () { };

Vimeo.registerSourceHandler(Vimeo.nativeSourceHandler);

// Older versions of VJS5 doesn't have the registerTech function
if (typeof videojs__default["default"].registerTech !== 'undefined') {
  videojs__default["default"].registerTech('Vimeo', Vimeo);
} else {
  videojs__default["default"].registerComponent('Vimeo', Vimeo);
}

// Include the version number.
Vimeo.VERSION = '0.0.1';

module.exports = Vimeo;
