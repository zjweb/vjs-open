(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"min-document":1}],3:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _videoJs = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

var _videoJs2 = _interopRequireDefault(_videoJs);

// Default options for the plugin.
var defaults = {};

/**
 * Function to invoke when the player is ready.
 *
 * This is a great place for your plugin to initialize itself. When this
 * function is called, the player will have its DOM and child components
 * in place.
 *
 * @function onPlayerReady
 * @param    {Player} player
 * @param    {Object} [options={}]
 */
var onPlayerReady = function onPlayerReady(player, options) {
	player.addClass('vjs-open');
};

/**
 * A video.js plugin.
 *
 * In the plugin function, the value of `this` is a video.js `Player`
 * instance. You cannot rely on the player being in a "ready" state here,
 * depending on how the plugin is invoked. This may or may not be important
 * to you; if not, remove the wait for "ready"!
 *
 * @function open
 * @param    {Object} [options={}]
 *           An object of options left to the plugin author to define.
 */
var open = function open(options) {
	var _this = this;

	this.ready(function () {
		onPlayerReady(_this, _videoJs2['default'].mergeOptions(defaults, options));
	});
};

/**
 * 分辨率
 * @param {[type]} options [description]
 * return {[type]}  [description]
 */
var videoJsResolutionSwitcher = function videoJsResolutionSwitcher(options) {

	/**
  * Initialize the plugin.
  * @param {object} [options] configuration for the plugin
  */

	var settings = _videoJs2['default'].mergeOptions(defaults, options),
	    player = this,
	    groupedSrc = {},
	    currentSources = {},
	    currentResolutionState = {};

	/**
  * Updates player sources or returns current source URL
  * @param   {Array}  [src] array of sources [{src: '', type: '', label: '', res: ''}]
  * @returns {Object|String|Array} videojs player object if used as setter or current source URL, object, or array of sources
  */
	player.updateSrc = function (src) {
		//Return current src if src is not given
		if (!src) {
			return player.src();
		}

		// Only add those sources which we can (maybe) play
		src = src.filter(function (source) {
			try {
				return player.canPlayType(source.type) !== '';
			} catch (e) {
				// If a Tech doesn't yet have canPlayType just add it
				return true;
			}
		});
		//Sort sources
		this.currentSources = src.sort(compareResolutions);
		this.groupedSrc = bucketSources(this.currentSources);
		// Pick one by default
		var chosen = chooseSrc(this.groupedSrc, this.currentSources);
		this.currentResolutionState = {
			label: chosen.label,
			sources: chosen.sources
		};

		player.trigger('updateSources');
		player.setSourcesSanitized(chosen.sources, chosen.label);
		player.trigger('resolutionchange');
		return player;
	};

	/**
  * Returns current resolution or sets one when label is specified
  * @param {String}   [label]         label name
  * @param {Function} [customSourcePicker] custom function to choose source. Takes 2 arguments: sources, label. Must return player object.
  * @returns {Object}   current resolution object {label: '', sources: []} if used as getter or player object if used as setter
  */
	player.currentResolution = function (label, customSourcePicker) {
		if (label == null) {
			return this.currentResolutionState;
		}

		// Lookup sources for label
		if (!this.groupedSrc || !this.groupedSrc.label || !this.groupedSrc.label[label]) {
			return;
		}
		var sources = this.groupedSrc.label[label];
		// Remember player state
		var currentTime = player.currentTime();
		var isPaused = player.paused();

		// Hide bigPlayButton
		if (!isPaused && this.player_.options_.bigPlayButton) {
			this.player_.bigPlayButton.hide();
		}

		// Change player source and wait for loadeddata event, then play video
		// loadedmetadata doesn't work right now for flash.
		// Probably because of https://github.com/videojs/video-js-swf/issues/124
		// If player preload is 'none' and then loadeddata not fired. So, we need timeupdate event for seek handle (timeupdate doesn't work properly with flash)
		var handleSeekEvent = 'loadeddata';
		if (this.player_.techName_ !== 'Youtube' && this.player_.preload() === 'none' && this.player_.techName_ !== 'Flash') {
			handleSeekEvent = 'timeupdate';
		}
		player.setSourcesSanitized(sources, label, customSourcePicker || settings.customSourcePicker).one(handleSeekEvent, function () {
			player.currentTime(currentTime);
			player.handleTechSeeked_();
			if (!isPaused) {
				// Start playing and hide loadingSpinner (flash issue ?)
				player.play().handleTechSeeked_();
			}
			player.trigger('resolutionchange');
		});
		return player;
	};

	/**
  * Returns grouped sources by label, resolution and type
  * @returns {Object} grouped sources: { label: { key: [] }, res: { key: [] }, type: { key: [] } }
  */
	player.getGroupedSrc = function () {
		return this.groupedSrc;
	};
	player.setSourcesSanitized = function (sources, label, customSourcePicker) {
		this.currentResolutionState = {
			label: label,
			sources: sources
		};

		if (typeof customSourcePicker === 'function') {
			return customSourcePicker(player, sources, label);
		}
		player.src(sources.map(function (src) {
			return {
				src: src.src,
				type: src.type,
				res: src.res
			};
		}));

		$(".vjs-resolution-button-label").html(label);
		return player;
	};

	/**
  * Method used for sorting list of sources
  * @param   {Object} a - source object with res property
  * @param   {Object} b - source object with res property
  * @returns {Number} result of comparation
  */
	function compareResolutions(a, b) {
		if (!a.res || !b.res) {
			return 0;
		}
		return +b.res - +a.res;
	}

	/**
  * Group sources by label, resolution and type
  * @param   {Array}  src Array of sources
  * @returns {Object} grouped sources: { label: { key: [] }, res: { key: [] }, type: { key: [] } }
  */
	function bucketSources(src) {
		var resolutions = {
			label: {},
			res: {},
			type: {}
		};
		src.map(function (source) {
			initResolutionKey(resolutions, 'label', source);
			initResolutionKey(resolutions, 'res', source);
			initResolutionKey(resolutions, 'type', source);

			appendSourceToKey(resolutions, 'label', source);
			appendSourceToKey(resolutions, 'res', source);
			appendSourceToKey(resolutions, 'type', source);
		});
		return resolutions;
	}

	function initResolutionKey(resolutions, key, source) {
		if (resolutions[key][source[key]] == null) {
			resolutions[key][source[key]] = [];
		}
	}

	function appendSourceToKey(resolutions, key, source) {
		resolutions[key][source[key]].push(source);
	}

	/**
  * Choose src if option.default is specified
  * @param   {Object} groupedSrc {res: { key: [] }}
  * @param   {Array}  src Array of sources sorted by resolution used to find high and low res
  * @returns {Object} {res: string, sources: []}
  */
	function chooseSrc(groupedSrc, src) {
		var selectedRes = settings['default']; // use array access as default is a reserved keyword
		var selectedLabel = '';
		if (selectedRes === 'high') {
			selectedRes = src[0].res;
			selectedLabel = src[0].label;
		} else if (selectedRes === 'low' || selectedRes == null || !groupedSrc.res[selectedRes]) {
			// Select low-res if default is low or not set
			selectedRes = src[src.length - 1].res;
			selectedLabel = src[src.length - 1].label;
		} else if (groupedSrc.res[selectedRes]) {
			selectedLabel = groupedSrc.res[selectedRes][0].label;
		}
		return {
			res: selectedRes,
			label: selectedLabel,
			sources: groupedSrc.res[selectedRes]
		};
	}

	function initResolutionForYt(player) {
		// Map youtube qualities names
		var _yts = {
			highres: {
				res: 1080,
				label: '1080',
				yt: 'highres'
			},
			hd1080: {
				res: 1080,
				label: '1080',
				yt: 'hd1080'
			},
			hd720: {
				res: 720,
				label: '720',
				yt: 'hd720'
			},
			large: {
				res: 480,
				label: '480',
				yt: 'large'
			},
			medium: {
				res: 360,
				label: '360',
				yt: 'medium'
			},
			small: {
				res: 240,
				label: '240',
				yt: 'small'
			},
			tiny: {
				res: 144,
				label: '144',
				yt: 'tiny'
			},
			auto: {
				res: 0,
				label: 'auto',
				yt: 'auto'
			}
		};
		// Overwrite default sourcePicker function
		var _customSourcePicker = function _customSourcePicker(_player, _sources, _label) {
			// Note that setPlayebackQuality is a suggestion. YT does not always obey it.
			player.tech_.ytPlayer.setPlaybackQuality(_sources[0]._yt);
			player.trigger('updateSources');
			return player;
		};
		settings.customSourcePicker = _customSourcePicker;

		// Init resolution
		player.tech_.ytPlayer.setPlaybackQuality('auto');

		// This is triggered when the resolution actually changes
		player.tech_.ytPlayer.addEventListener('onPlaybackQualityChange', function (event) {
			for (var res in _yts) {
				if (res.yt === event.data) {
					player.currentResolution(res.label, _customSourcePicker);
					return;
				}
			}
		});

		// We must wait for play event
		player.one('play', function () {
			var qualities = player.tech_.ytPlayer.getAvailableQualityLevels();
			var _sources = [];

			qualities.map(function (q) {
				_sources.push({
					src: player.src().src,
					type: player.src().type,
					label: _yts[q].label,
					res: _yts[q].res,
					_yt: _yts[q].yt
				});
			});

			player.groupedSrc = bucketSources(_sources);
			var chosen = {
				label: 'auto',
				res: 0,
				sources: player.groupedSrc.label.auto
			};

			this.currentResolutionState = {
				label: chosen.label,
				sources: chosen.sources
			};

			player.trigger('updateSources');
			player.setSourcesSanitized(chosen.sources, chosen.label, _customSourcePicker);
		});
	}

	player.ready(function () {
		if (settings.ui) {
			var menuButton = new ResolutionMenuButton(player, settings);
			player.controlBar.resolutionSwitcher = player.controlBar.el_.insertBefore(menuButton.el_, player.controlBar.getChild('fullscreenToggle').el_);
			player.controlBar.resolutionSwitcher.dispose = function () {
				this.parentNode.removeChild(this);
			};
		}
		if (player.options_.sources.length > 1) {
			// tech: Html5 and Flash
			// Create resolution switcher for videos form <source> tag inside <video>
			player.updateSrc(player.options_.sources);
		}

		if (player.techName_ === 'Youtube') {
			// tech: YouTube
			initResolutionForYt(player);
		}
	});

	var videoJsResolutionSwitcher,
	    defaults = {
		ui: true
	};

	/*
  * Resolution menu item
  */
	var MenuItem = _videoJs2['default'].getComponent('MenuItem');
	var ResolutionMenuItem = _videoJs2['default'].extend(MenuItem, {
		constructor: function constructor(player, options) {
			options.selectable = true;
			// Sets this.player_, this.options_ and initializes the component
			MenuItem.call(this, player, options);
			this.src = options.src;

			player.on('resolutionchange', _videoJs2['default'].bind(this, this.update));
		}
	});
	ResolutionMenuItem.prototype.handleClick = function (event) {
		MenuItem.prototype.handleClick.call(this, event);
		this.player_.currentResolution(this.options_.label);
	};
	ResolutionMenuItem.prototype.update = function () {
		var selection = this.player_.currentResolution();
		this.selected(this.options_.label === selection.label);
	};
	MenuItem.registerComponent('ResolutionMenuItem', ResolutionMenuItem);

	/*
  * Resolution menu button
  */
	var MenuButton = _videoJs2['default'].getComponent('MenuButton');
	var ResolutionMenuButton = _videoJs2['default'].extend(MenuButton, {
		constructor: function constructor(player, options) {
			this.label = document.createElement('span');
			options.label = 'Quality';
			// Sets this.player_, this.options_ and initializes the component
			MenuButton.call(this, player, options);
			this.el().setAttribute('aria-label', 'Quality');
			this.controlText('Quality');

			if (options.dynamicLabel) {
				_videoJs2['default'].addClass(this.label, 'vjs-resolution-button-label');
				this.el().appendChild(this.label);
			} else {
				var staticLabel = document.createElement('span');
				_videoJs2['default'].addClass(staticLabel, 'vjs-menu-icon');
				this.el().appendChild(staticLabel);
			}
			player.on('updateSources', _videoJs2['default'].bind(this, this.update));
		}
	});
	ResolutionMenuButton.prototype.createItems = function () {
		var menuItems = [];
		var labels = this.sources && this.sources.label || {};

		// FIXME order is not guaranteed here.
		for (var key in labels) {
			if (labels.hasOwnProperty(key)) {
				menuItems.push(new ResolutionMenuItem(this.player_, {
					label: key,
					src: labels[key],
					selected: key === (this.currentSelection ? this.currentSelection.label : false)
				}));
			}
		}
		return menuItems;
	};
	ResolutionMenuButton.prototype.update = function () {
		this.sources = this.player_.getGroupedSrc();
		this.currentSelection = this.player_.currentResolution();
		this.label.innerHTML = this.currentSelection ? this.currentSelection.label : '';
		return MenuButton.prototype.update.call(this);
	};
	ResolutionMenuButton.prototype.buildCSSClass = function () {
		return MenuButton.prototype.buildCSSClass.call(this) + ' vjs-resolution-button';
	};
	MenuButton.registerComponent('ResolutionMenuButton', ResolutionMenuButton);
};

/**
 * 禁用滚动条拖动
 * @param {[type]} options [description]
 * return {[type]}  [description]
 */
var disableProgress = function disableProgress(options) {
	var
	/**
  * Copies properties from one or more objects onto an original.
  */
	extend = function extend(obj /*, arg1, arg2, ... */) {
		var arg, i, k;
		for (i = 1; i < arguments.length; i++) {
			arg = arguments[i];
			for (k in arg) {
				if (arg.hasOwnProperty(k)) {
					obj[k] = arg[k];
				}
			}
		}
		return obj;
	},
	   

	// define some reasonable defaults for this sweet plugin
	defaults = {
		autoDisable: false
	};

	var
	// save a reference to the player instance
	player = this,
	    state = false,
	   

	// merge options and defaults
	settings = extend({}, defaults, options || {});

	// disable / enable methods
	player.disableProgress = {
		disable: function disable() {
			state = true;
			player.controlBar.progressControl.seekBar.off("focus");
			player.controlBar.progressControl.seekBar.off("mousedown");
			player.controlBar.progressControl.seekBar.off("touchstart");
			player.controlBar.progressControl.seekBar.off("click");
		},
		enable: function enable() {
			state = false;
			player.controlBar.progressControl.seekBar.on("focus", player.controlBar.progressControl.seekBar.handleFocus);
			player.controlBar.progressControl.seekBar.on("mousedown", player.controlBar.progressControl.seekBar.handleMouseDown);
			player.controlBar.progressControl.seekBar.on("touchstart", player.controlBar.progressControl.seekBar.handleMouseDown);
			player.controlBar.progressControl.seekBar.on("click", player.controlBar.progressControl.seekBar.handleClick);
		},
		getState: function getState() {
			return state;
		}
	};

	if (settings.autoDisable) {
		player.disableProgress.disable();
	}
};

/**
 * 打点
 * @param {[type]} options [description]
 * return {[type]}  [description]
 */
var markers = function markers(options) {
	//default setting
	var defaultSetting = {
		markerStyle: {
			'width': '8px',
			'border-radius': '20%',
			'background-color': 'rgba(255,0,0,.5)'
		},
		markerTip: {
			display: true,
			text: function text(marker) {
				return marker.text;
			},
			time: function time(marker) {
				return marker.time;
			}
		},
		breakOverlay: {
			display: true,
			displayTime: 1,
			text: function text(marker) {
				return marker.overlayText;
			},
			style: {
				'width': '100%',
				'height': 'calc(100% - 36px)',
				'background-color': 'rgba(0,0,0,0.7)',
				'color': 'white',
				'font-size': '17px'
			}
		},
		onMarkerClick: function onMarkerClick(marker) {
			return false;
		},
		onMarkerReached: function onMarkerReached(marker) {},
		markers: []
	};

	// create a non-colliding random number
	function generateUUID() {
		var d = new Date().getTime();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			var r = (d + Math.random() * 16) % 16 | 0;
			d = Math.floor(d / 16);
			return (c == 'x' ? r : r & 0x3 | 0x8).toString(16);
		});
		return uuid;
	};
	/**
  * register the markers plugin (dependent on jquery)
  */
	var setting = $.extend(true, {}, defaultSetting, options),
	    markersMap = {},
	    markersList = [],
	    // list of markers sorted by time
	videoWrapper = $(this.el()),
	    currentMarkerIndex = -1,
	    player = this,
	    markerTip = null,
	    breakOverlay = null,
	    overlayIndex = -1;

	function sortMarkersList() {
		// sort the list by time in asc order
		markersList.sort(function (a, b) {
			return setting.markerTip.time(a) - setting.markerTip.time(b);
		});
	}

	function addMarkers(newMarkers) {
		// create the markers
		$.each(newMarkers, function (index, marker) {
			marker.key = generateUUID();

			videoWrapper.find('.vjs-progress-control').append(createMarkerDiv(marker));

			// store marker in an internal hash map
			markersMap[marker.key] = marker;
			markersList.push(marker);
		});

		sortMarkersList();
	}

	function getPosition(marker) {
		return setting.markerTip.time(marker) / player.duration() * 100;
	}

	function createMarkerDiv(marker, duration) {
		var markerDiv = $("<div class='vjs-marker'></div>");
		var marg = parseInt(videoWrapper.find('.vjs-progress-control .vjs-slider').css('marginLeft'));
		markerDiv.css(setting.markerStyle).css({
			"margin-left": marg - parseFloat(markerDiv.css("width")) / 2 + 'px',
			"left": getPosition(marker) + '%'
		}).attr("data-marker-key", marker.key).attr("data-marker-time", setting.markerTip.time(marker));

		// add user-defined class to marker
		if (marker['class']) {
			markerDiv.addClass(marker['class']);
		}

		// bind click event to seek to marker time
		markerDiv.on('click', function (e) {

			var preventDefault = false;
			if (typeof setting.onMarkerClick === "function") {
				// if return false, prevent default behavior
				preventDefault = setting.onMarkerClick(marker) == false;
			}

			if (!preventDefault) {
				var key = $(this).data('marker-key');
				player.currentTime(setting.markerTip.time(markersMap[key]));
			}
		});

		if (setting.markerTip.display) {
			registerMarkerTipHandler(markerDiv);
		}

		return markerDiv;
	}

	function updateMarkers() {
		// update UI for markers whose time changed

		for (var i = 0; i < markersList.length; i++) {
			var marker = markersList[i];
			var markerDiv = videoWrapper.find(".vjs-marker[data-marker-key='" + marker.key + "']");
			var markerTime = setting.markerTip.time(marker);

			if (markerDiv.data('marker-time') != markerTime) {
				markerDiv.css({
					"left": getPosition(marker) + '%'
				}).attr("data-marker-time", markerTime);
			}
		}
		sortMarkersList();
	}

	function removeMarkers(indexArray) {
		// reset overlay
		if (breakOverlay) {
			overlayIndex = -1;
			breakOverlay.css("visibility", "hidden");
		}
		currentMarkerIndex = -1;

		for (var i = 0; i < indexArray.length; i++) {
			var index = indexArray[i];
			var marker = markersList[index];
			if (marker) {
				// delete from memory
				delete markersMap[marker.key];
				markersList[index] = null;

				// delete from dom
				videoWrapper.find(".vjs-marker[data-marker-key='" + marker.key + "']").remove();
			}
		}

		// clean up array
		for (var i = markersList.length - 1; i >= 0; i--) {
			if (markersList[i] === null) {
				markersList.splice(i, 1);
			}
		}

		// sort again
		sortMarkersList();
	}

	// attach hover event handler
	function registerMarkerTipHandler(markerDiv) {

		markerDiv.on('mouseover', function () {
			var marker = markersMap[$(this).data('marker-key')];

			markerTip.find('.vjs-tip-inner').html(setting.markerTip.text(marker));

			// margin-left needs to minus the padding length to align correctly with the marker
			markerTip.css({
				"left": getPosition(marker) + '%',
				"margin-left": -parseFloat(markerTip.css("width")) / 2 - 5 + 'px',
				"visibility": "visible"
			});
		}).on('mouseout', function () {
			markerTip.css("visibility", "hidden");
		});
	}

	function initializeMarkerTip() {
		markerTip = $("<div class='vjs-tip'><div class='vjs-tip-arrow'></div><div class='vjs-tip-inner'></div></div>");
		videoWrapper.find('.vjs-progress-control').append(markerTip);
	}

	// show or hide break overlays
	function updateBreakOverlay() {
		if (!setting.breakOverlay.display || currentMarkerIndex < 0) {
			return;
		}

		var currentTime = player.currentTime();
		var marker = markersList[currentMarkerIndex];
		var markerTime = setting.markerTip.time(marker);

		if (currentTime >= markerTime && currentTime <= markerTime + setting.breakOverlay.displayTime) {
			if (overlayIndex != currentMarkerIndex) {
				overlayIndex = currentMarkerIndex;
				breakOverlay.find('.vjs-break-overlay-text').html(setting.breakOverlay.text(marker));
			}

			breakOverlay.css('visibility', "visible");
		} else {
			overlayIndex = -1;
			breakOverlay.css("visibility", "hidden");
		}
	}

	// problem when the next marker is within the overlay display time from the previous marker
	function initializeOverlay() {
		breakOverlay = $("<div class='vjs-break-overlay'><div class='vjs-break-overlay-text'></div></div>").css(setting.breakOverlay.style);
		videoWrapper.append(breakOverlay);
		overlayIndex = -1;
	}

	function onTimeUpdate() {
		onUpdateMarker();
		updateBreakOverlay();
	}

	function onUpdateMarker() {
		/*
      check marker reached in between markers
      the logic here is that it triggers a new marker reached event only if the player 
      enters a new marker range (e.g. from marker 1 to marker 2). Thus, if player is on marker 1 and user clicked on marker 1 again, no new reached event is triggered)
  */

		var getNextMarkerTime = function getNextMarkerTime(index) {
			if (index < markersList.length - 1) {
				return setting.markerTip.time(markersList[index + 1]);
			}
			// next marker time of last marker would be end of video time
			return player.duration();
		};
		var currentTime = player.currentTime();
		var newMarkerIndex;

		if (currentMarkerIndex != -1) {
			// check if staying at same marker
			var nextMarkerTime = getNextMarkerTime(currentMarkerIndex);
			if (currentTime >= setting.markerTip.time(markersList[currentMarkerIndex]) && currentTime < nextMarkerTime) {
				return;
			}

			// check for ending (at the end current time equals player duration)
			if (currentMarkerIndex === markersList.length - 1 && currentTime === player.duration()) {
				return;
			}
		}

		// check first marker, no marker is selected
		if (markersList.length > 0 && currentTime < setting.markerTip.time(markersList[0])) {
			newMarkerIndex = -1;
		} else {
			// look for new index
			for (var i = 0; i < markersList.length; i++) {
				nextMarkerTime = getNextMarkerTime(i);

				if (currentTime >= setting.markerTip.time(markersList[i]) && currentTime < nextMarkerTime) {
					newMarkerIndex = i;
					break;
				}
			}
		}

		// set new marker index
		if (newMarkerIndex != currentMarkerIndex) {
			// trigger event
			if (newMarkerIndex != -1 && options.onMarkerReached) {
				options.onMarkerReached(markersList[newMarkerIndex]);
			}
			currentMarkerIndex = newMarkerIndex;
		}
	}

	// setup the whole thing
	function initialize() {
		if (setting.markerTip.display) {
			initializeMarkerTip();
		}

		// remove existing markers if already initialized
		player.markers.removeAll();
		addMarkers(options.markers);

		if (setting.breakOverlay.display) {
			initializeOverlay();
		}
		onTimeUpdate();
		player.on("timeupdate", onTimeUpdate);
	}

	// setup the plugin after we loaded video's meta data
	player.on("loadedmetadata", function () {
		initialize();
	});

	// exposed plugin API
	player.markers = {
		getMarkers: function getMarkers() {
			return markersList;
		},
		next: function next() {
			// go to the next marker from current timestamp
			var currentTime = player.currentTime();
			for (var i = 0; i < markersList.length; i++) {
				var markerTime = setting.markerTip.time(markersList[i]);
				if (markerTime > currentTime) {
					player.currentTime(markerTime);
					break;
				}
			}
		},
		prev: function prev() {
			// go to previous marker
			var currentTime = player.currentTime();
			for (var i = markersList.length - 1; i >= 0; i--) {
				var markerTime = setting.markerTip.time(markersList[i]);
				// add a threshold
				if (markerTime + 0.5 < currentTime) {
					player.currentTime(markerTime);
					break;
				}
			}
		},
		add: function add(newMarkers) {
			// add new markers given an array of index
			addMarkers(newMarkers);
		},
		remove: function remove(indexArray) {
			// remove markers given an array of index
			removeMarkers(indexArray);
		},
		removeAll: function removeAll() {
			var indexArray = [];
			for (var i = 0; i < markersList.length; i++) {
				indexArray.push(i);
			}
			removeMarkers(indexArray);
		},
		updateTime: function updateTime() {
			// notify the plugin to update the UI for changes in marker times
			updateMarkers();
		},
		reset: function reset(newMarkers) {
			// remove all the existing markers and add new ones
			player.markers.removeAll();
			addMarkers(newMarkers);
		},
		destroy: function destroy() {
			// unregister the plugins and clean up even handlers
			player.markers.removeAll();
			breakOverlay.remove();
			markerTip.remove();
			player.off("timeupdate", updateBreakOverlay);
			delete player.markers;
		}
	};
};

/**
 * 水印
 * @param {[type]} options [description]
 * return {[type]}  [description]
 */
var waterMark = function waterMark(settings) {
	var defaults = {
		file: 'logo.png',
		xpos: 0,
		ypos: 0,
		xrepeat: 0,
		opacity: 100,
		clickable: false,
		url: "",
		className: 'vjs-watermark',
		text: false,
		debug: false
	},
	    extend = function extend() {
		var args, target, i, object, property;
		args = Array.prototype.slice.call(arguments);
		target = args.shift() || {};
		for (i in args) {
			object = args[i];
			for (property in object) {
				if (object.hasOwnProperty(property)) {
					if (typeof object[property] === 'object') {
						target[property] = extend(target[property], object[property]);
					} else {
						target[property] = object[property];
					}
				}
			}
		}
		return target;
	};

	//! global varible containing reference to the DOM element
	var div;

	// var settings = $.extend(true, {}, defaults, options);

	if (settings.debug) console.log('watermark: Register init');

	var options, player, video, img, link;
	options = extend(defaults, settings);

	/* Grab the necessary DOM elements */
	player = this.el();
	video = this.el().getElementsByTagName('video')[0];

	// create the watermark element
	if (!div) {
		div = document.createElement('div');
		div.className = options.className;
	} else {
		//! if div already exists, empty it
		div.innerHTML = '';
	}

	// if text is set, display text
	if (options.text) div.textContent = options.text;

	// if img is set, add img
	if (options.file) {
		img = document.createElement('img');
		div.appendChild(img);
		div.style.display = "inline-block";
		div.style.position = "absolute";
		div.style.zIndex = 0;
		img.src = options.file;
	}
	//img.style.bottom = "0";
	//img.style.right = "0";
	if (options.ypos === 0 && options.xpos === 0) // Top left
		{
			div.style.top = "0px";
			div.style.left = "0px";
		} else if (options.ypos === 0 && options.xpos === 100) // Top right
		{
			div.style.top = "0px";
			div.style.right = "0px";
		} else if (options.ypos === 100 && options.xpos === 100) // Bottom right
		{
			div.style.bottom = "36px";
			div.style.right = "0px";
		} else if (options.ypos === 100 && options.xpos === 0) // Bottom left
		{
			div.style.bottom = "36px";
			div.style.left = "0px";
		} else if (options.ypos === 50 && options.xpos === 50) // Center
		{
			if (options.debug) console.log('watermark: player:' + player.width + 'x' + player.height);
			if (options.debug) console.log('watermark: video:' + video.videoWidth + 'x' + video.videoHeight);
			if (options.debug) console.log('watermark: image:' + img.width + 'x' + img.height);
			div.style.top = this.height() / 2 + "px";
			div.style.left = this.width() / 2 + "px";
		}
	div.style.opacity = options.opacity;

	//div.style.backgroundImage = "url("+options.file+")";
	//div.style.backgroundPosition.x = options.xpos+"%";
	//div.style.backgroundPosition.y = options.ypos+"%";
	//div.style.backgroundRepeat = options.xrepeat;
	//div.style.opacity = (options.opacity/100);

	//if user wants watermark to be clickable, add anchor elem
	//todo: check if options.url is an actual url?
	if (options.clickable && options.url !== "") {
		link = document.createElement("a");
		link.href = options.url;
		link.target = "_blank";
		link.appendChild(div);
		//add clickable watermark to the player
		player.appendChild(link);
	} else {
		//add normal watermark to the player
		player.appendChild(div);
	}

	if (options.debug) console.log('watermark: Register end');
};

// Register the plugin with video.js.
_videoJs2['default'].plugin('open', open);
_videoJs2['default'].plugin('videoJsResolutionSwitcher', videoJsResolutionSwitcher);
_videoJs2['default'].plugin('disableProgress', disableProgress);
_videoJs2['default'].plugin('markers', markers);
_videoJs2['default'].plugin('waterMark', waterMark);

// Include the version number.
open.VERSION = '1.0.0';

exports['default'] = open;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],4:[function(require,module,exports){
(function (global){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _globalDocument = require('global/document');

var _globalDocument2 = _interopRequireDefault(_globalDocument);

var _qunit = (typeof window !== "undefined" ? window['QUnit'] : typeof global !== "undefined" ? global['QUnit'] : null);

var _qunit2 = _interopRequireDefault(_qunit);

var _sinon = (typeof window !== "undefined" ? window['sinon'] : typeof global !== "undefined" ? global['sinon'] : null);

var _sinon2 = _interopRequireDefault(_sinon);

var _videoJs = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

var _videoJs2 = _interopRequireDefault(_videoJs);

var _srcPlugin = require('../src/plugin');

var _srcPlugin2 = _interopRequireDefault(_srcPlugin);

var Player = _videoJs2['default'].getComponent('Player');

_qunit2['default'].test('the environment is sane', function (assert) {
  assert.strictEqual(typeof Array.isArray, 'function', 'es5 exists');
  assert.strictEqual(typeof _sinon2['default'], 'object', 'sinon exists');
  assert.strictEqual(typeof _videoJs2['default'], 'function', 'videojs exists');
  assert.strictEqual(typeof _srcPlugin2['default'], 'function', 'plugin is a function');
});

_qunit2['default'].module('videojs-open', {

  beforeEach: function beforeEach() {

    // Mock the environment's timers because certain things - particularly
    // player readiness - are asynchronous in video.js 5. This MUST come
    // before any player is created; otherwise, timers could get created
    // with the actual timer methods!
    this.clock = _sinon2['default'].useFakeTimers();

    this.fixture = _globalDocument2['default'].getElementById('qunit-fixture');
    this.video = _globalDocument2['default'].createElement('video');
    this.fixture.appendChild(this.video);
    this.player = (0, _videoJs2['default'])(this.video);
  },

  afterEach: function afterEach() {
    this.player.dispose();
    this.clock.restore();
  }
});

_qunit2['default'].test('registers itself with video.js', function (assert) {
  assert.expect(2);

  assert.strictEqual(Player.prototype.open, _srcPlugin2['default'], 'videojs-open plugin was registered');

  this.player.open();

  // Tick the clock forward enough to trigger the player to be "ready".
  this.clock.tick(1);

  assert.ok(this.player.hasClass('vjs-open'), 'the plugin adds a class to the player');
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../src/plugin":3,"global/document":2}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIi9Vc2Vycy9vcGVuL0RvY3VtZW50cy9Xb3JrL1NvdXJjZVRyZWUvdmpzLW9wZW4vc3JjL3BsdWdpbi5qcyIsIi9Vc2Vycy9vcGVuL0RvY3VtZW50cy9Xb3JrL1NvdXJjZVRyZWUvdmpzLW9wZW4vdGVzdC9wbHVnaW4udGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozt1QkNmb0IsVUFBVTs7Ozs7QUFHOUIsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDOzs7Ozs7Ozs7Ozs7O0FBYXBCLElBQU0sYUFBYSxHQUFHLFNBQWhCLGFBQWEsQ0FBSSxNQUFNLEVBQUUsT0FBTyxFQUFLO0FBQzFDLE9BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7Q0FFNUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7QUFjRixJQUFNLElBQUksR0FBRyxTQUFQLElBQUksQ0FBWSxPQUFPLEVBQUU7OztBQUM5QixLQUFJLENBQUMsS0FBSyxDQUFDLFlBQU07QUFDaEIsZUFBYSxRQUFPLHFCQUFRLFlBQVksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztFQUM3RCxDQUFDLENBQUM7Q0FDSCxDQUFDOzs7Ozs7O0FBT0YsSUFBTSx5QkFBeUIsR0FBRyxtQ0FBUyxPQUFPLEVBQUU7Ozs7Ozs7QUFPbkQsS0FBSSxRQUFRLEdBQUcscUJBQVEsWUFBWSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7S0FDckQsTUFBTSxHQUFHLElBQUk7S0FDYixVQUFVLEdBQUcsRUFBRTtLQUNmLGNB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QUFNLENBQUMsU0FBUyxDQUFDLElBQUksMEJBRXJCLG9DQUFvQyxDQUNyQyxDQUFDOztBQUVGLE1BQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7OztBQUduQixNQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFbkIsUUFBTSxDQUFDLEVBQUUsQ0FDUCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFDaEMsdUNBQXVDLENBQ3hDLENBQUM7Q0FDSCxDQUFDLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiIiwidmFyIHRvcExldmVsID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOlxuICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDoge31cbnZhciBtaW5Eb2MgPSByZXF1aXJlKCdtaW4tZG9jdW1lbnQnKTtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY3VtZW50O1xufSBlbHNlIHtcbiAgICB2YXIgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddO1xuXG4gICAgaWYgKCFkb2NjeSkge1xuICAgICAgICBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J10gPSBtaW5Eb2M7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2NjeTtcbn1cbiIsImltcG9ydCB2aWRlb2pzIGZyb20gJ3ZpZGVvLmpzJztcblxuLy8gRGVmYXVsdCBvcHRpb25zIGZvciB0aGUgcGx1Z2luLlxuY29uc3QgZGVmYXVsdHMgPSB7fTtcblxuLyoqXG4gKiBGdW5jdGlvbiB0byBpbnZva2Ugd2hlbiB0aGUgcGxheWVyIGlzIHJlYWR5LlxuICpcbiAqIFRoaXMgaXMgYSBncmVhdCBwbGFjZSBmb3IgeW91ciBwbHVnaW4gdG8gaW5pdGlhbGl6ZSBpdHNlbGYuIFdoZW4gdGhpc1xuICogZnVuY3Rpb24gaXMgY2FsbGVkLCB0aGUgcGxheWVyIHdpbGwgaGF2ZSBpdHMgRE9NIGFuZCBjaGlsZCBjb21wb25lbnRzXG4gKiBpbiBwbGFjZS5cbiAqXG4gKiBAZnVuY3Rpb24gb25QbGF5ZXJSZWFkeVxuICogQHBhcmFtICAgIHtQbGF5ZXJ9IHBsYXllclxuICogQHBhcmFtICAgIHtPYmplY3R9IFtvcHRpb25zPXt9XVxuICovXG5jb25zdCBvblBsYXllclJlYWR5ID0gKHBsYXllciwgb3B0aW9ucykgPT4ge1xuXHRwbGF5ZXIuYWRkQ2xhc3MoJ3Zqcy1vcGVuJyk7XG5cbn07XG5cbi8qKlxuICogQSB2aWRlby5qcyBwbHVnaW4uXG4gKlxuICogSW4gdGhlIHBsdWdpbiBmdW5jdGlvbiwgdGhlIHZhbHVlIG9mIGB0aGlzYCBpcyBhIHZpZGVvLmpzIGBQbGF5ZXJgXG4gKiBpbnN0YW5jZS4gWW91IGNhbm5vdCByZWx5IG9uIHRoZSBwbGF5ZXIgYmVpbmcgaW4gYSBcInJlYWR5XCIgc3RhdGUgaGVyZSxcbiAqIGRlcGVuZGluZyBvbiBob3cgdGhlIHBsdWdpbiBpcyBpbnZva2VkLiBUaGlzIG1heSBvciBtYXkgbm90IGJlIGltcG9ydGFudFxuICogdG8geW91OyBpZiBub3QsIHJlbW92ZSB0aGUgd2FpdCBmb3IgXCJyZWFkeVwiIVxuICpcbiAqIEBmdW5jdGlvbiBvcGVuXG4gKiBAcGFyYW0gICAge09iamVjdH0gW29wdGlvbnM9e31dXG4gKiAgICAgICAgICAgQW4gb2JqZWN0IG9mIG9wdGlvbnMgbGVmdCB0byB0aGUgcGx1Z2luIGF1dGhvciB0byBkZWZpbmUuXG4gKi9cbmNvbnN0IG9wZW4gPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdHRoaXMucmVhZHkoKCkgPT4ge1xuXHRcdG9uUGxheWVyUmVhZHkodGhpcywgdmlkZW9qcy5tZXJnZU9wdGlvbnMoZGVmYXVsdHMsIG9wdGlvbnMpKTtcblx0fSk7XG59O1xuXG4vKipcbiAqIOWIhui+qOeOh1xuICogQHBhcmFtIHtbdHlwZV19IG9wdGlvbnMgW2Rlc2NyaXB0aW9uXVxuICogcmV0dXJuIHtbdHlwZV19ICBbZGVzY3JpcHRpb25dXG4gKi9cbmNvbnN0IHZpZGVvSnNSZXNvbHV0aW9uU3dpdGNoZXIgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cblx0LyoqXG5cdCAqIEluaXRpYWxpemUgdGhlIHBsdWdpbi5cblx0ICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXSBjb25maWd1cmF0aW9uIGZvciB0aGUgcGx1Z2luXG5cdCAqL1xuXG5cdHZhciBzZXR0aW5ncyA9IHZpZGVvanMubWVyZ2VPcHRpb25zKGRlZmF1bHRzLCBvcHRpb25zKSxcblx0XHRwbGF5ZXIgPSB0aGlzLFxuXHRcdGdyb3VwZWRTcmMgPSB7fSxcblx0XHRjdXJyZW50U291cmNlcyA9IHt9LFxuXHRcdGN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7fTtcblxuXHQvKipcblx0ICogVXBkYXRlcyBwbGF5ZXIgc291cmNlcyBvciByZXR1cm5zIGN1cnJlbnQgc291cmNlIFVSTFxuXHQgKiBAcGFyYW0gICB7QXJyYXl9ICBbc3JjXSBhcnJheSBvZiBzb3VyY2VzIFt7c3JjOiAnJywgdHlwZTogJycsIGxhYmVsOiAnJywgcmVzOiAnJ31dXG5cdCAqIEByZXR1cm5zIHtPYmplY3R8U3RyaW5nfEFycmF5fSB2aWRlb2pzIHBsYXllciBvYmplY3QgaWYgdXNlZCBhcyBzZXR0ZXIgb3IgY3VycmVudCBzb3VyY2UgVVJMLCBvYmplY3QsIG9yIGFycmF5IG9mIHNvdXJjZXNcblx0ICovXG5cdHBsYXllci51cGRhdGVTcmMgPSBmdW5jdGlvbihzcmMpIHtcblx0XHQvL1JldHVybiBjdXJyZW50IHNyYyBpZiBzcmMgaXMgbm90IGdpdmVuXG5cdFx0aWYgKCFzcmMpIHtcblx0XHRcdHJldHVybiBwbGF5ZXIuc3JjKCk7XG5cdFx0fVxuXG5cdFx0Ly8gT25seSBhZGQgdGhvc2Ugc291cmNlcyB3aGljaCB3ZSBjYW4gKG1heWJlKSBwbGF5XG5cdFx0c3JjID0gc3JjLmZpbHRlcihmdW5jdGlvbihzb3VyY2UpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHJldHVybiAocGxheWVyLmNhblBsYXlUeXBlKHNvdXJjZS50eXBlKSAhPT0gJycpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHQvLyBJZiBhIFRlY2ggZG9lc24ndCB5ZXQgaGF2ZSBjYW5QbGF5VHlwZSBqdXN0IGFkZCBpdFxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHQvL1NvcnQgc291cmNlc1xuXHRcdHRoaXMuY3VycmVudFNvdXJjZXMgPSBzcmMuc29ydChjb21wYXJlUmVzb2x1dGlvbnMpO1xuXHRcdHRoaXMuZ3JvdXBlZFNyYyA9IGJ1Y2tldFNvdXJjZXModGhpcy5jdXJyZW50U291cmNlcyk7XG5cdFx0Ly8gUGljayBvbmUgYnkgZGVmYXVsdFxuXHRcdHZhciBjaG9zZW4gPSBjaG9vc2VTcmModGhpcy5ncm91cGVkU3JjLCB0aGlzLmN1cnJlbnRTb3VyY2VzKTtcblx0XHR0aGlzLmN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7XG5cdFx0XHRsYWJlbDogY2hvc2VuLmxhYmVsLFxuXHRcdFx0c291cmNlczogY2hvc2VuLnNvdXJjZXNcblx0XHR9O1xuXG5cdFx0cGxheWVyLnRyaWdnZXIoJ3VwZGF0ZVNvdXJjZXMnKTtcblx0XHRwbGF5ZXIuc2V0U291cmNlc1Nhbml0aXplZChjaG9zZW4uc291cmNlcywgY2hvc2VuLmxhYmVsKTtcblx0XHRwbGF5ZXIudHJpZ2dlcigncmVzb2x1dGlvbmNoYW5nZScpO1xuXHRcdHJldHVybiBwbGF5ZXI7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJldHVybnMgY3VycmVudCByZXNvbHV0aW9uIG9yIHNldHMgb25lIHdoZW4gbGFiZWwgaXMgc3BlY2lmaWVkXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSAgIFtsYWJlbF0gICAgICAgICBsYWJlbCBuYW1lXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IFtjdXN0b21Tb3VyY2VQaWNrZXJdIGN1c3RvbSBmdW5jdGlvbiB0byBjaG9vc2Ugc291cmNlLiBUYWtlcyAyIGFyZ3VtZW50czogc291cmNlcywgbGFiZWwuIE11c3QgcmV0dXJuIHBsYXllciBvYmplY3QuXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9ICAgY3VycmVudCByZXNvbHV0aW9uIG9iamVjdCB7bGFiZWw6ICcnLCBzb3VyY2VzOiBbXX0gaWYgdXNlZCBhcyBnZXR0ZXIgb3IgcGxheWVyIG9iamVjdCBpZiB1c2VkIGFzIHNldHRlclxuXHQgKi9cblx0cGxheWVyLmN1cnJlbnRSZXNvbHV0aW9uID0gZnVuY3Rpb24obGFiZWwsIGN1c3RvbVNvdXJjZVBpY2tlcikge1xuXHRcdGlmIChsYWJlbCA9PSBudWxsKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlO1xuXHRcdH1cblxuXHRcdC8vIExvb2t1cCBzb3VyY2VzIGZvciBsYWJlbFxuXHRcdGlmICghdGhpcy5ncm91cGVkU3JjIHx8ICF0aGlzLmdyb3VwZWRTcmMubGFiZWwgfHwgIXRoaXMuZ3JvdXBlZFNyYy5sYWJlbFtsYWJlbF0pIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dmFyIHNvdXJjZXMgPSB0aGlzLmdyb3VwZWRTcmMubGFiZWxbbGFiZWxdO1xuXHRcdC8vIFJlbWVtYmVyIHBsYXllciBzdGF0ZVxuXHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdHZhciBpc1BhdXNlZCA9IHBsYXllci5wYXVzZWQoKTtcblxuXHRcdC8vIEhpZGUgYmlnUGxheUJ1dHRvblxuXHRcdGlmICghaXNQYXVzZWQgJiYgdGhpcy5wbGF5ZXJfLm9wdGlvbnNfLmJpZ1BsYXlCdXR0b24pIHtcblx0XHRcdHRoaXMucGxheWVyXy5iaWdQbGF5QnV0dG9uLmhpZGUoKTtcblx0XHR9XG5cblx0XHQvLyBDaGFuZ2UgcGxheWVyIHNvdXJjZSBhbmQgd2FpdCBmb3IgbG9hZGVkZGF0YSBldmVudCwgdGhlbiBwbGF5IHZpZGVvXG5cdFx0Ly8gbG9hZGVkbWV0YWRhdGEgZG9lc24ndCB3b3JrIHJpZ2h0IG5vdyBmb3IgZmxhc2guXG5cdFx0Ly8gUHJvYmFibHkgYmVjYXVzZSBvZiBodHRwczovL2dpdGh1Yi5jb20vdmlkZW9qcy92aWRlby1qcy1zd2YvaXNzdWVzLzEyNFxuXHRcdC8vIElmIHBsYXllciBwcmVsb2FkIGlzICdub25lJyBhbmQgdGhlbiBsb2FkZWRkYXRhIG5vdCBmaXJlZC4gU28sIHdlIG5lZWQgdGltZXVwZGF0ZSBldmVudCBmb3Igc2VlayBoYW5kbGUgKHRpbWV1cGRhdGUgZG9lc24ndCB3b3JrIHByb3Blcmx5IHdpdGggZmxhc2gpXG5cdFx0dmFyIGhhbmRsZVNlZWtFdmVudCA9ICdsb2FkZWRkYXRhJztcblx0XHRpZiAodGhpcy5wbGF5ZXJfLnRlY2hOYW1lXyAhPT0gJ1lvdXR1YmUnICYmIHRoaXMucGxheWVyXy5wcmVsb2FkKCkgPT09ICdub25lJyAmJiB0aGlzLnBsYXllcl8udGVjaE5hbWVfICE9PSAnRmxhc2gnKSB7XG5cdFx0XHRoYW5kbGVTZWVrRXZlbnQgPSAndGltZXVwZGF0ZSc7XG5cdFx0fVxuXHRcdHBsYXllclxuXHRcdFx0LnNldFNvdXJjZXNTYW5pdGl6ZWQoc291cmNlcywgbGFiZWwsIGN1c3RvbVNvdXJjZVBpY2tlciB8fCBzZXR0aW5ncy5jdXN0b21Tb3VyY2VQaWNrZXIpXG5cdFx0XHQub25lKGhhbmRsZVNlZWtFdmVudCwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShjdXJyZW50VGltZSk7XG5cdFx0XHRcdHBsYXllci5oYW5kbGVUZWNoU2Vla2VkXygpO1xuXHRcdFx0XHRpZiAoIWlzUGF1c2VkKSB7XG5cdFx0XHRcdFx0Ly8gU3RhcnQgcGxheWluZyBhbmQgaGlkZSBsb2FkaW5nU3Bpbm5lciAoZmxhc2ggaXNzdWUgPylcblx0XHRcdFx0XHRwbGF5ZXIucGxheSgpLmhhbmRsZVRlY2hTZWVrZWRfKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cGxheWVyLnRyaWdnZXIoJ3Jlc29sdXRpb25jaGFuZ2UnKTtcblx0XHRcdH0pO1xuXHRcdHJldHVybiBwbGF5ZXI7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJldHVybnMgZ3JvdXBlZCBzb3VyY2VzIGJ5IGxhYmVsLCByZXNvbHV0aW9uIGFuZCB0eXBlXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IGdyb3VwZWQgc291cmNlczogeyBsYWJlbDogeyBrZXk6IFtdIH0sIHJlczogeyBrZXk6IFtdIH0sIHR5cGU6IHsga2V5OiBbXSB9IH1cblx0ICovXG5cdHBsYXllci5nZXRHcm91cGVkU3JjID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuZ3JvdXBlZFNyYztcblx0fTtcblx0cGxheWVyLnNldFNvdXJjZXNTYW5pdGl6ZWQgPSBmdW5jdGlvbihzb3VyY2VzLCBsYWJlbCwgY3VzdG9tU291cmNlUGlja2VyKSB7XG5cdFx0dGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge1xuXHRcdFx0bGFiZWw6IGxhYmVsLFxuXHRcdFx0c291cmNlczogc291cmNlc1xuXHRcdH07XG5cblx0XHRpZiAodHlwZW9mIGN1c3RvbVNvdXJjZVBpY2tlciA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0cmV0dXJuIGN1c3RvbVNvdXJjZVBpY2tlcihwbGF5ZXIsIHNvdXJjZXMsIGxhYmVsKTtcblx0XHR9XG5cdFx0cGxheWVyLnNyYyhzb3VyY2VzLm1hcChmdW5jdGlvbihzcmMpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHNyYzogc3JjLnNyYyxcblx0XHRcdFx0dHlwZTogc3JjLnR5cGUsXG5cdFx0XHRcdHJlczogc3JjLnJlc1xuXHRcdFx0fTtcblx0XHR9KSk7XG5cblx0XHQkKFwiLnZqcy1yZXNvbHV0aW9uLWJ1dHRvbi1sYWJlbFwiKS5odG1sKGxhYmVsKTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBNZXRob2QgdXNlZCBmb3Igc29ydGluZyBsaXN0IG9mIHNvdXJjZXNcblx0ICogQHBhcmFtICAge09iamVjdH0gYSAtIHNvdXJjZSBvYmplY3Qgd2l0aCByZXMgcHJvcGVydHlcblx0ICogQHBhcmFtICAge09iamVjdH0gYiAtIHNvdXJjZSBvYmplY3Qgd2l0aCByZXMgcHJvcGVydHlcblx0ICogQHJldHVybnMge051bWJlcn0gcmVzdWx0IG9mIGNvbXBhcmF0aW9uXG5cdCAqL1xuXHRmdW5jdGlvbiBjb21wYXJlUmVzb2x1dGlvbnMoYSwgYikge1xuXHRcdGlmICghYS5yZXMgfHwgIWIucmVzKSB7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0cmV0dXJuICgrYi5yZXMpIC0gKCthLnJlcyk7XG5cdH1cblxuXHQvKipcblx0ICogR3JvdXAgc291cmNlcyBieSBsYWJlbCwgcmVzb2x1dGlvbiBhbmQgdHlwZVxuXHQgKiBAcGFyYW0gICB7QXJyYXl9ICBzcmMgQXJyYXkgb2Ygc291cmNlc1xuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSBncm91cGVkIHNvdXJjZXM6IHsgbGFiZWw6IHsga2V5OiBbXSB9LCByZXM6IHsga2V5OiBbXSB9LCB0eXBlOiB7IGtleTogW10gfSB9XG5cdCAqL1xuXHRmdW5jdGlvbiBidWNrZXRTb3VyY2VzKHNyYykge1xuXHRcdHZhciByZXNvbHV0aW9ucyA9IHtcblx0XHRcdGxhYmVsOiB7fSxcblx0XHRcdHJlczoge30sXG5cdFx0XHR0eXBlOiB7fVxuXHRcdH07XG5cdFx0c3JjLm1hcChmdW5jdGlvbihzb3VyY2UpIHtcblx0XHRcdGluaXRSZXNvbHV0aW9uS2V5KHJlc29sdXRpb25zLCAnbGFiZWwnLCBzb3VyY2UpO1xuXHRcdFx0aW5pdFJlc29sdXRpb25LZXkocmVzb2x1dGlvbnMsICdyZXMnLCBzb3VyY2UpO1xuXHRcdFx0aW5pdFJlc29sdXRpb25LZXkocmVzb2x1dGlvbnMsICd0eXBlJywgc291cmNlKTtcblxuXHRcdFx0YXBwZW5kU291cmNlVG9LZXkocmVzb2x1dGlvbnMsICdsYWJlbCcsIHNvdXJjZSk7XG5cdFx0XHRhcHBlbmRTb3VyY2VUb0tleShyZXNvbHV0aW9ucywgJ3JlcycsIHNvdXJjZSk7XG5cdFx0XHRhcHBlbmRTb3VyY2VUb0tleShyZXNvbHV0aW9ucywgJ3R5cGUnLCBzb3VyY2UpO1xuXHRcdH0pO1xuXHRcdHJldHVybiByZXNvbHV0aW9ucztcblx0fVxuXG5cdGZ1bmN0aW9uIGluaXRSZXNvbHV0aW9uS2V5KHJlc29sdXRpb25zLCBrZXksIHNvdXJjZSkge1xuXHRcdGlmIChyZXNvbHV0aW9uc1trZXldW3NvdXJjZVtrZXldXSA9PSBudWxsKSB7XG5cdFx0XHRyZXNvbHV0aW9uc1trZXldW3NvdXJjZVtrZXldXSA9IFtdO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGFwcGVuZFNvdXJjZVRvS2V5KHJlc29sdXRpb25zLCBrZXksIHNvdXJjZSkge1xuXHRcdHJlc29sdXRpb25zW2tleV1bc291cmNlW2tleV1dLnB1c2goc291cmNlKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDaG9vc2Ugc3JjIGlmIG9wdGlvbi5kZWZhdWx0IGlzIHNwZWNpZmllZFxuXHQgKiBAcGFyYW0gICB7T2JqZWN0fSBncm91cGVkU3JjIHtyZXM6IHsga2V5OiBbXSB9fVxuXHQgKiBAcGFyYW0gICB7QXJyYXl9ICBzcmMgQXJyYXkgb2Ygc291cmNlcyBzb3J0ZWQgYnkgcmVzb2x1dGlvbiB1c2VkIHRvIGZpbmQgaGlnaCBhbmQgbG93IHJlc1xuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSB7cmVzOiBzdHJpbmcsIHNvdXJjZXM6IFtdfVxuXHQgKi9cblx0ZnVuY3Rpb24gY2hvb3NlU3JjKGdyb3VwZWRTcmMsIHNyYykge1xuXHRcdHZhciBzZWxlY3RlZFJlcyA9IHNldHRpbmdzWydkZWZhdWx0J107IC8vIHVzZSBhcnJheSBhY2Nlc3MgYXMgZGVmYXVsdCBpcyBhIHJlc2VydmVkIGtleXdvcmRcblx0XHR2YXIgc2VsZWN0ZWRMYWJlbCA9ICcnO1xuXHRcdGlmIChzZWxlY3RlZFJlcyA9PT0gJ2hpZ2gnKSB7XG5cdFx0XHRzZWxlY3RlZFJlcyA9IHNyY1swXS5yZXM7XG5cdFx0XHRzZWxlY3RlZExhYmVsID0gc3JjWzBdLmxhYmVsO1xuXHRcdH0gZWxzZSBpZiAoc2VsZWN0ZWRSZXMgPT09ICdsb3cnIHx8IHNlbGVjdGVkUmVzID09IG51bGwgfHwgIWdyb3VwZWRTcmMucmVzW3NlbGVjdGVkUmVzXSkge1xuXHRcdFx0Ly8gU2VsZWN0IGxvdy1yZXMgaWYgZGVmYXVsdCBpcyBsb3cgb3Igbm90IHNldFxuXHRcdFx0c2VsZWN0ZWRSZXMgPSBzcmNbc3JjLmxlbmd0aCAtIDFdLnJlcztcblx0XHRcdHNlbGVjdGVkTGFiZWwgPSBzcmNbc3JjLmxlbmd0aCAtIDFdLmxhYmVsO1xuXHRcdH0gZWxzZSBpZiAoZ3JvdXBlZFNyYy5yZXNbc2VsZWN0ZWRSZXNdKSB7XG5cdFx0XHRzZWxlY3RlZExhYmVsID0gZ3JvdXBlZFNyYy5yZXNbc2VsZWN0ZWRSZXNdWzBdLmxhYmVsO1xuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzOiBzZWxlY3RlZFJlcyxcblx0XHRcdGxhYmVsOiBzZWxlY3RlZExhYmVsLFxuXHRcdFx0c291cmNlczogZ3JvdXBlZFNyYy5yZXNbc2VsZWN0ZWRSZXNdXG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluaXRSZXNvbHV0aW9uRm9yWXQocGxheWVyKSB7XG5cdFx0Ly8gTWFwIHlvdXR1YmUgcXVhbGl0aWVzIG5hbWVzXG5cdFx0dmFyIF95dHMgPSB7XG5cdFx0XHRoaWdocmVzOiB7XG5cdFx0XHRcdHJlczogMTA4MCxcblx0XHRcdFx0bGFiZWw6ICcxMDgwJyxcblx0XHRcdFx0eXQ6ICdoaWdocmVzJ1xuXHRcdFx0fSxcblx0XHRcdGhkMTA4MDoge1xuXHRcdFx0XHRyZXM6IDEwODAsXG5cdFx0XHRcdGxhYmVsOiAnMTA4MCcsXG5cdFx0XHRcdHl0OiAnaGQxMDgwJ1xuXHRcdFx0fSxcblx0XHRcdGhkNzIwOiB7XG5cdFx0XHRcdHJlczogNzIwLFxuXHRcdFx0XHRsYWJlbDogJzcyMCcsXG5cdFx0XHRcdHl0OiAnaGQ3MjAnXG5cdFx0XHR9LFxuXHRcdFx0bGFyZ2U6IHtcblx0XHRcdFx0cmVzOiA0ODAsXG5cdFx0XHRcdGxhYmVsOiAnNDgwJyxcblx0XHRcdFx0eXQ6ICdsYXJnZSdcblx0XHRcdH0sXG5cdFx0XHRtZWRpdW06IHtcblx0XHRcdFx0cmVzOiAzNjAsXG5cdFx0XHRcdGxhYmVsOiAnMzYwJyxcblx0XHRcdFx0eXQ6ICdtZWRpdW0nXG5cdFx0XHR9LFxuXHRcdFx0c21hbGw6IHtcblx0XHRcdFx0cmVzOiAyNDAsXG5cdFx0XHRcdGxhYmVsOiAnMjQwJyxcblx0XHRcdFx0eXQ6ICdzbWFsbCdcblx0XHRcdH0sXG5cdFx0XHR0aW55OiB7XG5cdFx0XHRcdHJlczogMTQ0LFxuXHRcdFx0XHRsYWJlbDogJzE0NCcsXG5cdFx0XHRcdHl0OiAndGlueSdcblx0XHRcdH0sXG5cdFx0XHRhdXRvOiB7XG5cdFx0XHRcdHJlczogMCxcblx0XHRcdFx0bGFiZWw6ICdhdXRvJyxcblx0XHRcdFx0eXQ6ICdhdXRvJ1xuXHRcdFx0fVxuXHRcdH07XG5cdFx0Ly8gT3ZlcndyaXRlIGRlZmF1bHQgc291cmNlUGlja2VyIGZ1bmN0aW9uXG5cdFx0dmFyIF9jdXN0b21Tb3VyY2VQaWNrZXIgPSBmdW5jdGlvbihfcGxheWVyLCBfc291cmNlcywgX2xhYmVsKSB7XG5cdFx0XHQvLyBOb3RlIHRoYXQgc2V0UGxheWViYWNrUXVhbGl0eSBpcyBhIHN1Z2dlc3Rpb24uIFlUIGRvZXMgbm90IGFsd2F5cyBvYmV5IGl0LlxuXHRcdFx0cGxheWVyLnRlY2hfLnl0UGxheWVyLnNldFBsYXliYWNrUXVhbGl0eShfc291cmNlc1swXS5feXQpO1xuXHRcdFx0cGxheWVyLnRyaWdnZXIoJ3VwZGF0ZVNvdXJjZXMnKTtcblx0XHRcdHJldHVybiBwbGF5ZXI7XG5cdFx0fTtcblx0XHRzZXR0aW5ncy5jdXN0b21Tb3VyY2VQaWNrZXIgPSBfY3VzdG9tU291cmNlUGlja2VyO1xuXG5cdFx0Ly8gSW5pdCByZXNvbHV0aW9uXG5cdFx0cGxheWVyLnRlY2hfLnl0UGxheWVyLnNldFBsYXliYWNrUXVhbGl0eSgnYXV0bycpO1xuXG5cdFx0Ly8gVGhpcyBpcyB0cmlnZ2VyZWQgd2hlbiB0aGUgcmVzb2x1dGlvbiBhY3R1YWxseSBjaGFuZ2VzXG5cdFx0cGxheWVyLnRlY2hfLnl0UGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoJ29uUGxheWJhY2tRdWFsaXR5Q2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdGZvciAodmFyIHJlcyBpbiBfeXRzKSB7XG5cdFx0XHRcdGlmIChyZXMueXQgPT09IGV2ZW50LmRhdGEpIHtcblx0XHRcdFx0XHRwbGF5ZXIuY3VycmVudFJlc29sdXRpb24ocmVzLmxhYmVsLCBfY3VzdG9tU291cmNlUGlja2VyKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIFdlIG11c3Qgd2FpdCBmb3IgcGxheSBldmVudFxuXHRcdHBsYXllci5vbmUoJ3BsYXknLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBxdWFsaXRpZXMgPSBwbGF5ZXIudGVjaF8ueXRQbGF5ZXIuZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscygpO1xuXHRcdFx0dmFyIF9zb3VyY2VzID0gW107XG5cblx0XHRcdHF1YWxpdGllcy5tYXAoZnVuY3Rpb24ocSkge1xuXHRcdFx0XHRfc291cmNlcy5wdXNoKHtcblx0XHRcdFx0XHRzcmM6IHBsYXllci5zcmMoKS5zcmMsXG5cdFx0XHRcdFx0dHlwZTogcGxheWVyLnNyYygpLnR5cGUsXG5cdFx0XHRcdFx0bGFiZWw6IF95dHNbcV0ubGFiZWwsXG5cdFx0XHRcdFx0cmVzOiBfeXRzW3FdLnJlcyxcblx0XHRcdFx0XHRfeXQ6IF95dHNbcV0ueXRcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cGxheWVyLmdyb3VwZWRTcmMgPSBidWNrZXRTb3VyY2VzKF9zb3VyY2VzKTtcblx0XHRcdHZhciBjaG9zZW4gPSB7XG5cdFx0XHRcdGxhYmVsOiAnYXV0bycsXG5cdFx0XHRcdHJlczogMCxcblx0XHRcdFx0c291cmNlczogcGxheWVyLmdyb3VwZWRTcmMubGFiZWwuYXV0b1xuXHRcdFx0fTtcblxuXHRcdFx0dGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge1xuXHRcdFx0XHRsYWJlbDogY2hvc2VuLmxhYmVsLFxuXHRcdFx0XHRzb3VyY2VzOiBjaG9zZW4uc291cmNlc1xuXHRcdFx0fTtcblxuXHRcdFx0cGxheWVyLnRyaWdnZXIoJ3VwZGF0ZVNvdXJjZXMnKTtcblx0XHRcdHBsYXllci5zZXRTb3VyY2VzU2FuaXRpemVkKGNob3Nlbi5zb3VyY2VzLCBjaG9zZW4ubGFiZWwsIF9jdXN0b21Tb3VyY2VQaWNrZXIpO1xuXHRcdH0pO1xuXHR9XG5cblx0cGxheWVyLnJlYWR5KGZ1bmN0aW9uKCkge1xuXHRcdGlmIChzZXR0aW5ncy51aSkge1xuXHRcdFx0dmFyIG1lbnVCdXR0b24gPSBuZXcgUmVzb2x1dGlvbk1lbnVCdXR0b24ocGxheWVyLCBzZXR0aW5ncyk7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5yZXNvbHV0aW9uU3dpdGNoZXIgPSBwbGF5ZXIuY29udHJvbEJhci5lbF8uaW5zZXJ0QmVmb3JlKG1lbnVCdXR0b24uZWxfLCBwbGF5ZXIuY29udHJvbEJhci5nZXRDaGlsZCgnZnVsbHNjcmVlblRvZ2dsZScpLmVsXyk7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5yZXNvbHV0aW9uU3dpdGNoZXIuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR0aGlzLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcyk7XG5cdFx0XHR9O1xuXHRcdH1cblx0XHRpZiAocGxheWVyLm9wdGlvbnNfLnNvdXJjZXMubGVuZ3RoID4gMSkge1xuXHRcdFx0Ly8gdGVjaDogSHRtbDUgYW5kIEZsYXNoXG5cdFx0XHQvLyBDcmVhdGUgcmVzb2x1dGlvbiBzd2l0Y2hlciBmb3IgdmlkZW9zIGZvcm0gPHNvdXJjZT4gdGFnIGluc2lkZSA8dmlkZW8+XG5cdFx0XHRwbGF5ZXIudXBkYXRlU3JjKHBsYXllci5vcHRpb25zXy5zb3VyY2VzKTtcblx0XHR9XG5cblx0XHRpZiAocGxheWVyLnRlY2hOYW1lXyA9PT0gJ1lvdXR1YmUnKSB7XG5cdFx0XHQvLyB0ZWNoOiBZb3VUdWJlXG5cdFx0XHRpbml0UmVzb2x1dGlvbkZvcll0KHBsYXllcik7XG5cdFx0fVxuXHR9KTtcblxuXHR2YXIgdmlkZW9Kc1Jlc29sdXRpb25Td2l0Y2hlcixcblx0XHRkZWZhdWx0cyA9IHtcblx0XHRcdHVpOiB0cnVlXG5cdFx0fTtcblxuXHQvKlxuXHQgKiBSZXNvbHV0aW9uIG1lbnUgaXRlbVxuXHQgKi9cblx0dmFyIE1lbnVJdGVtID0gdmlkZW9qcy5nZXRDb21wb25lbnQoJ01lbnVJdGVtJyk7XG5cdHZhciBSZXNvbHV0aW9uTWVudUl0ZW0gPSB2aWRlb2pzLmV4dGVuZChNZW51SXRlbSwge1xuXHRcdGNvbnN0cnVjdG9yOiBmdW5jdGlvbihwbGF5ZXIsIG9wdGlvbnMpIHtcblx0XHRcdG9wdGlvbnMuc2VsZWN0YWJsZSA9IHRydWU7XG5cdFx0XHQvLyBTZXRzIHRoaXMucGxheWVyXywgdGhpcy5vcHRpb25zXyBhbmQgaW5pdGlhbGl6ZXMgdGhlIGNvbXBvbmVudFxuXHRcdFx0TWVudUl0ZW0uY2FsbCh0aGlzLCBwbGF5ZXIsIG9wdGlvbnMpO1xuXHRcdFx0dGhpcy5zcmMgPSBvcHRpb25zLnNyYztcblxuXHRcdFx0cGxheWVyLm9uKCdyZXNvbHV0aW9uY2hhbmdlJywgdmlkZW9qcy5iaW5kKHRoaXMsIHRoaXMudXBkYXRlKSk7XG5cdFx0fVxuXHR9KTtcblx0UmVzb2x1dGlvbk1lbnVJdGVtLnByb3RvdHlwZS5oYW5kbGVDbGljayA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0TWVudUl0ZW0ucHJvdG90eXBlLmhhbmRsZUNsaWNrLmNhbGwodGhpcywgZXZlbnQpO1xuXHRcdHRoaXMucGxheWVyXy5jdXJyZW50UmVzb2x1dGlvbih0aGlzLm9wdGlvbnNfLmxhYmVsKTtcblx0fTtcblx0UmVzb2x1dGlvbk1lbnVJdGVtLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZWN0aW9uID0gdGhpcy5wbGF5ZXJfLmN1cnJlbnRSZXNvbHV0aW9uKCk7XG5cdFx0dGhpcy5zZWxlY3RlZCh0aGlzLm9wdGlvbnNfLmxhYmVsID09PSBzZWxlY3Rpb24ubGFiZWwpO1xuXHR9O1xuXHRNZW51SXRlbS5yZWdpc3RlckNvbXBvbmVudCgnUmVzb2x1dGlvbk1lbnVJdGVtJywgUmVzb2x1dGlvbk1lbnVJdGVtKTtcblxuXHQvKlxuXHQgKiBSZXNvbHV0aW9uIG1lbnUgYnV0dG9uXG5cdCAqL1xuXHR2YXIgTWVudUJ1dHRvbiA9IHZpZGVvanMuZ2V0Q29tcG9uZW50KCdNZW51QnV0dG9uJyk7XG5cdHZhciBSZXNvbHV0aW9uTWVudUJ1dHRvbiA9IHZpZGVvanMuZXh0ZW5kKE1lbnVCdXR0b24sIHtcblx0XHRjb25zdHJ1Y3RvcjogZnVuY3Rpb24ocGxheWVyLCBvcHRpb25zKSB7XG5cdFx0XHR0aGlzLmxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRcdFx0b3B0aW9ucy5sYWJlbCA9ICdRdWFsaXR5Jztcblx0XHRcdC8vIFNldHMgdGhpcy5wbGF5ZXJfLCB0aGlzLm9wdGlvbnNfIGFuZCBpbml0aWFsaXplcyB0aGUgY29tcG9uZW50XG5cdFx0XHRNZW51QnV0dG9uLmNhbGwodGhpcywgcGxheWVyLCBvcHRpb25zKTtcblx0XHRcdHRoaXMuZWwoKS5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCAnUXVhbGl0eScpO1xuXHRcdFx0dGhpcy5jb250cm9sVGV4dCgnUXVhbGl0eScpO1xuXG5cdFx0XHRpZiAob3B0aW9ucy5keW5hbWljTGFiZWwpIHtcblx0XHRcdFx0dmlkZW9qcy5hZGRDbGFzcyh0aGlzLmxhYmVsLCAndmpzLXJlc29sdXRpb24tYnV0dG9uLWxhYmVsJyk7XG5cdFx0XHRcdHRoaXMuZWwoKS5hcHBlbmRDaGlsZCh0aGlzLmxhYmVsKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhciBzdGF0aWNMYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdFx0dmlkZW9qcy5hZGRDbGFzcyhzdGF0aWNMYWJlbCwgJ3Zqcy1tZW51LWljb24nKTtcblx0XHRcdFx0dGhpcy5lbCgpLmFwcGVuZENoaWxkKHN0YXRpY0xhYmVsKTtcblx0XHRcdH1cblx0XHRcdHBsYXllci5vbigndXBkYXRlU291cmNlcycsIHZpZGVvanMuYmluZCh0aGlzLCB0aGlzLnVwZGF0ZSkpO1xuXHRcdH1cblx0fSk7XG5cdFJlc29sdXRpb25NZW51QnV0dG9uLnByb3RvdHlwZS5jcmVhdGVJdGVtcyA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBtZW51SXRlbXMgPSBbXTtcblx0XHR2YXIgbGFiZWxzID0gKHRoaXMuc291cmNlcyAmJiB0aGlzLnNvdXJjZXMubGFiZWwpIHx8IHt9O1xuXG5cdFx0Ly8gRklYTUUgb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQgaGVyZS5cblx0XHRmb3IgKHZhciBrZXkgaW4gbGFiZWxzKSB7XG5cdFx0XHRpZiAobGFiZWxzLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0bWVudUl0ZW1zLnB1c2gobmV3IFJlc29sdXRpb25NZW51SXRlbShcblx0XHRcdFx0XHR0aGlzLnBsYXllcl8sIHtcblx0XHRcdFx0XHRcdGxhYmVsOiBrZXksXG5cdFx0XHRcdFx0XHRzcmM6IGxhYmVsc1trZXldLFxuXHRcdFx0XHRcdFx0c2VsZWN0ZWQ6IGtleSA9PT0gKHRoaXMuY3VycmVudFNlbGVjdGlvbiA/IHRoaXMuY3VycmVudFNlbGVjdGlvbi5sYWJlbCA6IGZhbHNlKVxuXHRcdFx0XHRcdH0pKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG1lbnVJdGVtcztcblx0fTtcblx0UmVzb2x1dGlvbk1lbnVCdXR0b24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuc291cmNlcyA9IHRoaXMucGxheWVyXy5nZXRHcm91cGVkU3JjKCk7XG5cdFx0dGhpcy5jdXJyZW50U2VsZWN0aW9uID0gdGhpcy5wbGF5ZXJfLmN1cnJlbnRSZXNvbHV0aW9uKCk7XG5cdFx0dGhpcy5sYWJlbC5pbm5lckhUTUwgPSB0aGlzLmN1cnJlbnRTZWxlY3Rpb24gPyB0aGlzLmN1cnJlbnRTZWxlY3Rpb24ubGFiZWwgOiAnJztcblx0XHRyZXR1cm4gTWVudUJ1dHRvbi5wcm90b3R5cGUudXBkYXRlLmNhbGwodGhpcyk7XG5cdH07XG5cdFJlc29sdXRpb25NZW51QnV0dG9uLnByb3RvdHlwZS5idWlsZENTU0NsYXNzID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIE1lbnVCdXR0b24ucHJvdG90eXBlLmJ1aWxkQ1NTQ2xhc3MuY2FsbCh0aGlzKSArICcgdmpzLXJlc29sdXRpb24tYnV0dG9uJztcblx0fTtcblx0TWVudUJ1dHRvbi5yZWdpc3RlckNvbXBvbmVudCgnUmVzb2x1dGlvbk1lbnVCdXR0b24nLCBSZXNvbHV0aW9uTWVudUJ1dHRvbik7XG59O1xuXG4vKipcbiAqIOemgeeUqOa7muWKqOadoeaLluWKqFxuICogQHBhcmFtIHtbdHlwZV19IG9wdGlvbnMgW2Rlc2NyaXB0aW9uXVxuICogcmV0dXJuIHtbdHlwZV19ICBbZGVzY3JpcHRpb25dXG4gKi9cbmNvbnN0IGRpc2FibGVQcm9ncmVzcyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0dmFyXG5cdC8qKlxuXHQgKiBDb3BpZXMgcHJvcGVydGllcyBmcm9tIG9uZSBvciBtb3JlIG9iamVjdHMgb250byBhbiBvcmlnaW5hbC5cblx0ICovXG5cdFx0ZXh0ZW5kID0gZnVuY3Rpb24ob2JqIC8qLCBhcmcxLCBhcmcyLCAuLi4gKi8gKSB7XG5cdFx0XHR2YXIgYXJnLCBpLCBrO1xuXHRcdFx0Zm9yIChpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRhcmcgPSBhcmd1bWVudHNbaV07XG5cdFx0XHRcdGZvciAoayBpbiBhcmcpIHtcblx0XHRcdFx0XHRpZiAoYXJnLmhhc093blByb3BlcnR5KGspKSB7XG5cdFx0XHRcdFx0XHRvYmpba10gPSBhcmdba107XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gb2JqO1xuXHRcdH0sXG5cblx0XHQvLyBkZWZpbmUgc29tZSByZWFzb25hYmxlIGRlZmF1bHRzIGZvciB0aGlzIHN3ZWV0IHBsdWdpblxuXHRcdGRlZmF1bHRzID0ge1xuXHRcdFx0YXV0b0Rpc2FibGU6IGZhbHNlXG5cdFx0fTtcblxuXG5cdHZhclxuXHQvLyBzYXZlIGEgcmVmZXJlbmNlIHRvIHRoZSBwbGF5ZXIgaW5zdGFuY2Vcblx0XHRwbGF5ZXIgPSB0aGlzLFxuXHRcdHN0YXRlID0gZmFsc2UsXG5cblx0XHQvLyBtZXJnZSBvcHRpb25zIGFuZCBkZWZhdWx0c1xuXHRcdHNldHRpbmdzID0gZXh0ZW5kKHt9LCBkZWZhdWx0cywgb3B0aW9ucyB8fCB7fSk7XG5cblx0Ly8gZGlzYWJsZSAvIGVuYWJsZSBtZXRob2RzXG5cdHBsYXllci5kaXNhYmxlUHJvZ3Jlc3MgPSB7XG5cdFx0ZGlzYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRzdGF0ZSA9IHRydWU7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJmb2N1c1wiKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9mZihcIm1vdXNlZG93blwiKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9mZihcInRvdWNoc3RhcnRcIik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJjbGlja1wiKTtcblx0XHR9LFxuXHRcdGVuYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRzdGF0ZSA9IGZhbHNlO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJmb2N1c1wiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVGb2N1cyk7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vbihcIm1vdXNlZG93blwiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVNb3VzZURvd24pO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJ0b3VjaHN0YXJ0XCIsIHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLmhhbmRsZU1vdXNlRG93bik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vbihcImNsaWNrXCIsIHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLmhhbmRsZUNsaWNrKTtcblx0XHR9LFxuXHRcdGdldFN0YXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBzdGF0ZTtcblx0XHR9XG5cdH07XG5cblx0aWYgKHNldHRpbmdzLmF1dG9EaXNhYmxlKSB7XG5cdFx0cGxheWVyLmRpc2FibGVQcm9ncmVzcy5kaXNhYmxlKCk7XG5cdH1cbn07XG5cbi8qKlxuICog5omT54K5XG4gKiBAcGFyYW0ge1t0eXBlXX0gb3B0aW9ucyBbZGVzY3JpcHRpb25dXG4gKiByZXR1cm4ge1t0eXBlXX0gIFtkZXNjcmlwdGlvbl1cbiAqL1xuY29uc3QgbWFya2VycyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0Ly9kZWZhdWx0IHNldHRpbmdcblx0dmFyIGRlZmF1bHRTZXR0aW5nID0ge1xuXHRcdG1hcmtlclN0eWxlOiB7XG5cdFx0XHQnd2lkdGgnOiAnOHB4Jyxcblx0XHRcdCdib3JkZXItcmFkaXVzJzogJzIwJScsXG5cdFx0XHQnYmFja2dyb3VuZC1jb2xvcic6ICdyZ2JhKDI1NSwwLDAsLjUpJ1xuXHRcdH0sXG5cdFx0bWFya2VyVGlwOiB7XG5cdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0dGV4dDogZnVuY3Rpb24obWFya2VyKSB7XG5cdFx0XHRcdHJldHVybiBtYXJrZXIudGV4dDtcblx0XHRcdH0sXG5cdFx0XHR0aW1lOiBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHRcdFx0cmV0dXJuIG1hcmtlci50aW1lO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0YnJlYWtPdmVybGF5OiB7XG5cdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0ZGlzcGxheVRpbWU6IDEsXG5cdFx0XHR0ZXh0OiBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHRcdFx0cmV0dXJuIG1hcmtlci5vdmVybGF5VGV4dDtcblx0XHRcdH0sXG5cdFx0XHRzdHlsZToge1xuXHRcdFx0XHQnd2lkdGgnOiAnMTAwJScsXG5cdFx0XHRcdCdoZWlnaHQnOiAnY2FsYygxMDAlIC0gMzZweCknLFxuXHRcdFx0XHQnYmFja2dyb3VuZC1jb2xvcic6ICdyZ2JhKDAsMCwwLDAuNyknLFxuXHRcdFx0XHQnY29sb3InOiAnd2hpdGUnLFxuXHRcdFx0XHQnZm9udC1zaXplJzogJzE3cHgnXG5cdFx0XHR9XG5cdFx0fSxcblx0XHRvbk1hcmtlckNsaWNrOiBmdW5jdGlvbihtYXJrZXIpIHsgcmV0dXJuIGZhbHNlfSxcblx0XHRvbk1hcmtlclJlYWNoZWQ6IGZ1bmN0aW9uKG1hcmtlcikge30sXG5cdFx0bWFya2VyczogW11cblx0fTtcblxuXHQvLyBjcmVhdGUgYSBub24tY29sbGlkaW5nIHJhbmRvbSBudW1iZXJcblx0ZnVuY3Rpb24gZ2VuZXJhdGVVVUlEKCkge1xuXHRcdHZhciBkID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0dmFyIHV1aWQgPSAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uKGMpIHtcblx0XHRcdHZhciByID0gKGQgKyBNYXRoLnJhbmRvbSgpICogMTYpICUgMTYgfCAwO1xuXHRcdFx0ZCA9IE1hdGguZmxvb3IoZCAvIDE2KTtcblx0XHRcdHJldHVybiAoYyA9PSAneCcgPyByIDogKHIgJiAweDMgfCAweDgpKS50b1N0cmluZygxNik7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHV1aWQ7XG5cdH07XG5cdC8qKlxuXHQgKiByZWdpc3RlciB0aGUgbWFya2VycyBwbHVnaW4gKGRlcGVuZGVudCBvbiBqcXVlcnkpXG5cdCAqL1xuXHR2YXIgc2V0dGluZyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0U2V0dGluZywgb3B0aW9ucyksXG5cdFx0bWFya2Vyc01hcCA9IHt9LFxuXHRcdG1hcmtlcnNMaXN0ID0gW10sIC8vIGxpc3Qgb2YgbWFya2VycyBzb3J0ZWQgYnkgdGltZVxuXHRcdHZpZGVvV3JhcHBlciA9ICQodGhpcy5lbCgpKSxcblx0XHRjdXJyZW50TWFya2VySW5kZXggPSAtMSxcblx0XHRwbGF5ZXIgPSB0aGlzLFxuXHRcdG1hcmtlclRpcCA9IG51bGwsXG5cdFx0YnJlYWtPdmVybGF5ID0gbnVsbCxcblx0XHRvdmVybGF5SW5kZXggPSAtMTtcblxuXHRmdW5jdGlvbiBzb3J0TWFya2Vyc0xpc3QoKSB7XG5cdFx0Ly8gc29ydCB0aGUgbGlzdCBieSB0aW1lIGluIGFzYyBvcmRlclxuXHRcdG1hcmtlcnNMaXN0LnNvcnQoZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0cmV0dXJuIHNldHRpbmcubWFya2VyVGlwLnRpbWUoYSkgLSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKGIpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gYWRkTWFya2VycyhuZXdNYXJrZXJzKSB7XG5cdFx0Ly8gY3JlYXRlIHRoZSBtYXJrZXJzXG5cdFx0JC5lYWNoKG5ld01hcmtlcnMsIGZ1bmN0aW9uKGluZGV4LCBtYXJrZXIpIHtcblx0XHRcdG1hcmtlci5rZXkgPSBnZW5lcmF0ZVVVSUQoKTtcblxuXHRcdFx0dmlkZW9XcmFwcGVyLmZpbmQoJy52anMtcHJvZ3Jlc3MtY29udHJvbCcpLmFwcGVuZChcblx0XHRcdFx0Y3JlYXRlTWFya2VyRGl2KG1hcmtlcikpO1xuXG5cdFx0XHQvLyBzdG9yZSBtYXJrZXIgaW4gYW4gaW50ZXJuYWwgaGFzaCBtYXBcblx0XHRcdG1hcmtlcnNNYXBbbWFya2VyLmtleV0gPSBtYXJrZXI7XG5cdFx0XHRtYXJrZXJzTGlzdC5wdXNoKG1hcmtlcik7XG5cdFx0fSk7XG5cblx0XHRzb3J0TWFya2Vyc0xpc3QoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldFBvc2l0aW9uKG1hcmtlcikge1xuXHRcdHJldHVybiAoc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXIpIC8gcGxheWVyLmR1cmF0aW9uKCkpICogMTAwXG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVNYXJrZXJEaXYobWFya2VyLCBkdXJhdGlvbikge1xuXHRcdHZhciBtYXJrZXJEaXYgPSAkKFwiPGRpdiBjbGFzcz0ndmpzLW1hcmtlcic+PC9kaXY+XCIpO1xuXHRcdHZhciBtYXJnID0gcGFyc2VJbnQodmlkZW9XcmFwcGVyLmZpbmQoJy52anMtcHJvZ3Jlc3MtY29udHJvbCAudmpzLXNsaWRlcicpLmNzcygnbWFyZ2luTGVmdCcpKTtcblx0XHRtYXJrZXJEaXYuY3NzKHNldHRpbmcubWFya2VyU3R5bGUpXG5cdFx0XHQuY3NzKHtcblx0XHRcdFx0XCJtYXJnaW4tbGVmdFwiOiBtYXJnIC0gcGFyc2VGbG9hdChtYXJrZXJEaXYuY3NzKFwid2lkdGhcIikpLzIgKyAncHgnLFxuXHRcdFx0XHRcImxlZnRcIjogZ2V0UG9zaXRpb24obWFya2VyKSArICclJ1xuXHRcdFx0fSlcblx0XHRcdC5hdHRyKFwiZGF0YS1tYXJrZXIta2V5XCIsIG1hcmtlci5rZXkpXG5cdFx0XHQuYXR0cihcImRhdGEtbWFya2VyLXRpbWVcIiwgc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXIpKTtcblxuXHRcdC8vIGFkZCB1c2VyLWRlZmluZWQgY2xhc3MgdG8gbWFya2VyXG5cdFx0aWYgKG1hcmtlci5jbGFzcykge1xuXHRcdFx0bWFya2VyRGl2LmFkZENsYXNzKG1hcmtlci5jbGFzcyk7XG5cdFx0fVxuXG5cdFx0Ly8gYmluZCBjbGljayBldmVudCB0byBzZWVrIHRvIG1hcmtlciB0aW1lXG5cdFx0bWFya2VyRGl2Lm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblxuXHRcdFx0dmFyIHByZXZlbnREZWZhdWx0ID0gZmFsc2U7XG5cdFx0XHRpZiAodHlwZW9mIHNldHRpbmcub25NYXJrZXJDbGljayA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdC8vIGlmIHJldHVybiBmYWxzZSwgcHJldmVudCBkZWZhdWx0IGJlaGF2aW9yXG5cdFx0XHRcdHByZXZlbnREZWZhdWx0ID0gc2V0dGluZy5vbk1hcmtlckNsaWNrKG1hcmtlcikgPT0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghcHJldmVudERlZmF1bHQpIHtcblx0XHRcdFx0dmFyIGtleSA9ICQodGhpcykuZGF0YSgnbWFya2VyLWtleScpO1xuXHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUoc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTWFwW2tleV0pKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGlmIChzZXR0aW5nLm1hcmtlclRpcC5kaXNwbGF5KSB7XG5cdFx0XHRyZWdpc3Rlck1hcmtlclRpcEhhbmRsZXIobWFya2VyRGl2KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gbWFya2VyRGl2O1xuXHR9XG5cblx0ZnVuY3Rpb24gdXBkYXRlTWFya2VycygpIHtcblx0XHQvLyB1cGRhdGUgVUkgZm9yIG1hcmtlcnMgd2hvc2UgdGltZSBjaGFuZ2VkXG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtlcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgbWFya2VyID0gbWFya2Vyc0xpc3RbaV07XG5cdFx0XHR2YXIgbWFya2VyRGl2ID0gdmlkZW9XcmFwcGVyLmZpbmQoXCIudmpzLW1hcmtlcltkYXRhLW1hcmtlci1rZXk9J1wiICsgbWFya2VyLmtleSArIFwiJ11cIik7XG5cdFx0XHR2YXIgbWFya2VyVGltZSA9IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2VyKTtcblxuXHRcdFx0aWYgKG1hcmtlckRpdi5kYXRhKCdtYXJrZXItdGltZScpICE9IG1hcmtlclRpbWUpIHtcblx0XHRcdFx0bWFya2VyRGl2LmNzcyh7XG5cdFx0XHRcdFx0XHRcImxlZnRcIjogZ2V0UG9zaXRpb24obWFya2VyKSArICclJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmF0dHIoXCJkYXRhLW1hcmtlci10aW1lXCIsIG1hcmtlclRpbWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRzb3J0TWFya2Vyc0xpc3QoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHJlbW92ZU1hcmtlcnMoaW5kZXhBcnJheSkge1xuXHRcdC8vIHJlc2V0IG92ZXJsYXlcblx0XHRpZiAoYnJlYWtPdmVybGF5KSB7XG5cdFx0XHRvdmVybGF5SW5kZXggPSAtMTtcblx0XHRcdGJyZWFrT3ZlcmxheS5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdH1cblx0XHRjdXJyZW50TWFya2VySW5kZXggPSAtMTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaW5kZXhBcnJheS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGluZGV4ID0gaW5kZXhBcnJheVtpXTtcblx0XHRcdHZhciBtYXJrZXIgPSBtYXJrZXJzTGlzdFtpbmRleF07XG5cdFx0XHRpZiAobWFya2VyKSB7XG5cdFx0XHRcdC8vIGRlbGV0ZSBmcm9tIG1lbW9yeVxuXHRcdFx0XHRkZWxldGUgbWFya2Vyc01hcFttYXJrZXIua2V5XTtcblx0XHRcdFx0bWFya2Vyc0xpc3RbaW5kZXhdID0gbnVsbDtcblxuXHRcdFx0XHQvLyBkZWxldGUgZnJvbSBkb21cblx0XHRcdFx0dmlkZW9XcmFwcGVyLmZpbmQoXCIudmpzLW1hcmtlcltkYXRhLW1hcmtlci1rZXk9J1wiICsgbWFya2VyLmtleSArIFwiJ11cIikucmVtb3ZlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gY2xlYW4gdXAgYXJyYXlcblx0XHRmb3IgKHZhciBpID0gbWFya2Vyc0xpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdGlmIChtYXJrZXJzTGlzdFtpXSA9PT0gbnVsbCkge1xuXHRcdFx0XHRtYXJrZXJzTGlzdC5zcGxpY2UoaSwgMSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc29ydCBhZ2FpblxuXHRcdHNvcnRNYXJrZXJzTGlzdCgpO1xuXHR9XG5cblxuXHQvLyBhdHRhY2ggaG92ZXIgZXZlbnQgaGFuZGxlclxuXHRmdW5jdGlvbiByZWdpc3Rlck1hcmtlclRpcEhhbmRsZXIobWFya2VyRGl2KSB7XG5cblx0XHRtYXJrZXJEaXYub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG1hcmtlciA9IG1hcmtlcnNNYXBbJCh0aGlzKS5kYXRhKCdtYXJrZXIta2V5JyldO1xuXG5cdFx0XHRtYXJrZXJUaXAuZmluZCgnLnZqcy10aXAtaW5uZXInKS5odG1sKHNldHRpbmcubWFya2VyVGlwLnRleHQobWFya2VyKSk7XG5cblx0XHRcdC8vIG1hcmdpbi1sZWZ0IG5lZWRzIHRvIG1pbnVzIHRoZSBwYWRkaW5nIGxlbmd0aCB0byBhbGlnbiBjb3JyZWN0bHkgd2l0aCB0aGUgbWFya2VyXG5cdFx0XHRtYXJrZXJUaXAuY3NzKHtcblx0XHRcdFx0XCJsZWZ0XCI6IGdldFBvc2l0aW9uKG1hcmtlcikgKyAnJScsXG5cdFx0XHRcdFwibWFyZ2luLWxlZnRcIjogLXBhcnNlRmxvYXQobWFya2VyVGlwLmNzcyhcIndpZHRoXCIpKSAvIDIgLSA1ICsgJ3B4Jyxcblx0XHRcdFx0XCJ2aXNpYmlsaXR5XCI6IFwidmlzaWJsZVwiXG5cdFx0XHR9KTtcblxuXHRcdH0pLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0bWFya2VyVGlwLmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0aWFsaXplTWFya2VyVGlwKCkge1xuXHRcdG1hcmtlclRpcCA9ICQoXCI8ZGl2IGNsYXNzPSd2anMtdGlwJz48ZGl2IGNsYXNzPSd2anMtdGlwLWFycm93Jz48L2Rpdj48ZGl2IGNsYXNzPSd2anMtdGlwLWlubmVyJz48L2Rpdj48L2Rpdj5cIik7XG5cdFx0dmlkZW9XcmFwcGVyLmZpbmQoJy52anMtcHJvZ3Jlc3MtY29udHJvbCcpLmFwcGVuZChtYXJrZXJUaXApO1xuXHR9XG5cblx0Ly8gc2hvdyBvciBoaWRlIGJyZWFrIG92ZXJsYXlzXG5cdGZ1bmN0aW9uIHVwZGF0ZUJyZWFrT3ZlcmxheSgpIHtcblx0XHRpZiAoIXNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXkgfHwgY3VycmVudE1hcmtlckluZGV4IDwgMCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdHZhciBtYXJrZXIgPSBtYXJrZXJzTGlzdFtjdXJyZW50TWFya2VySW5kZXhdO1xuXHRcdHZhciBtYXJrZXJUaW1lID0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXIpO1xuXG5cdFx0aWYgKGN1cnJlbnRUaW1lID49IG1hcmtlclRpbWUgJiZcblx0XHRcdGN1cnJlbnRUaW1lIDw9IChtYXJrZXJUaW1lICsgc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheVRpbWUpKSB7XG5cdFx0XHRpZiAob3ZlcmxheUluZGV4ICE9IGN1cnJlbnRNYXJrZXJJbmRleCkge1xuXHRcdFx0XHRvdmVybGF5SW5kZXggPSBjdXJyZW50TWFya2VySW5kZXg7XG5cdFx0XHRcdGJyZWFrT3ZlcmxheS5maW5kKCcudmpzLWJyZWFrLW92ZXJsYXktdGV4dCcpLmh0bWwoc2V0dGluZy5icmVha092ZXJsYXkudGV4dChtYXJrZXIpKTtcblx0XHRcdH1cblxuXHRcdFx0YnJlYWtPdmVybGF5LmNzcygndmlzaWJpbGl0eScsIFwidmlzaWJsZVwiKTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRvdmVybGF5SW5kZXggPSAtMTtcblx0XHRcdGJyZWFrT3ZlcmxheS5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdH1cblx0fVxuXG5cdC8vIHByb2JsZW0gd2hlbiB0aGUgbmV4dCBtYXJrZXIgaXMgd2l0aGluIHRoZSBvdmVybGF5IGRpc3BsYXkgdGltZSBmcm9tIHRoZSBwcmV2aW91cyBtYXJrZXJcblx0ZnVuY3Rpb24gaW5pdGlhbGl6ZU92ZXJsYXkoKSB7XG5cdFx0YnJlYWtPdmVybGF5ID0gJChcIjxkaXYgY2xhc3M9J3Zqcy1icmVhay1vdmVybGF5Jz48ZGl2IGNsYXNzPSd2anMtYnJlYWstb3ZlcmxheS10ZXh0Jz48L2Rpdj48L2Rpdj5cIilcblx0XHRcdC5jc3Moc2V0dGluZy5icmVha092ZXJsYXkuc3R5bGUpO1xuXHRcdHZpZGVvV3JhcHBlci5hcHBlbmQoYnJlYWtPdmVybGF5KTtcblx0XHRvdmVybGF5SW5kZXggPSAtMTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uVGltZVVwZGF0ZSgpIHtcblx0XHRvblVwZGF0ZU1hcmtlcigpO1xuXHRcdHVwZGF0ZUJyZWFrT3ZlcmxheSgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25VcGRhdGVNYXJrZXIoKSB7XG5cdFx0Lypcblx0XHQgICAgY2hlY2sgbWFya2VyIHJlYWNoZWQgaW4gYmV0d2VlbiBtYXJrZXJzXG5cdFx0ICAgIHRoZSBsb2dpYyBoZXJlIGlzIHRoYXQgaXQgdHJpZ2dlcnMgYSBuZXcgbWFya2VyIHJlYWNoZWQgZXZlbnQgb25seSBpZiB0aGUgcGxheWVyIFxuXHRcdCAgICBlbnRlcnMgYSBuZXcgbWFya2VyIHJhbmdlIChlLmcuIGZyb20gbWFya2VyIDEgdG8gbWFya2VyIDIpLiBUaHVzLCBpZiBwbGF5ZXIgaXMgb24gbWFya2VyIDEgYW5kIHVzZXIgY2xpY2tlZCBvbiBtYXJrZXIgMSBhZ2Fpbiwgbm8gbmV3IHJlYWNoZWQgZXZlbnQgaXMgdHJpZ2dlcmVkKVxuXHRcdCovXG5cblx0XHR2YXIgZ2V0TmV4dE1hcmtlclRpbWUgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0aWYgKGluZGV4IDwgbWFya2Vyc0xpc3QubGVuZ3RoIC0gMSkge1xuXHRcdFx0XHRyZXR1cm4gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpbmRleCArIDFdKTtcblx0XHRcdH1cblx0XHRcdC8vIG5leHQgbWFya2VyIHRpbWUgb2YgbGFzdCBtYXJrZXIgd291bGQgYmUgZW5kIG9mIHZpZGVvIHRpbWVcblx0XHRcdHJldHVybiBwbGF5ZXIuZHVyYXRpb24oKTtcblx0XHR9XG5cdFx0dmFyIGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0dmFyIG5ld01hcmtlckluZGV4O1xuXG5cdFx0aWYgKGN1cnJlbnRNYXJrZXJJbmRleCAhPSAtMSkge1xuXHRcdFx0Ly8gY2hlY2sgaWYgc3RheWluZyBhdCBzYW1lIG1hcmtlclxuXHRcdFx0dmFyIG5leHRNYXJrZXJUaW1lID0gZ2V0TmV4dE1hcmtlclRpbWUoY3VycmVudE1hcmtlckluZGV4KTtcblx0XHRcdGlmIChjdXJyZW50VGltZSA+PSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2N1cnJlbnRNYXJrZXJJbmRleF0pICYmXG5cdFx0XHRcdGN1cnJlbnRUaW1lIDwgbmV4dE1hcmtlclRpbWUpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBjaGVjayBmb3IgZW5kaW5nIChhdCB0aGUgZW5kIGN1cnJlbnQgdGltZSBlcXVhbHMgcGxheWVyIGR1cmF0aW9uKVxuXHRcdFx0aWYgKGN1cnJlbnRNYXJrZXJJbmRleCA9PT0gbWFya2Vyc0xpc3QubGVuZ3RoIC0gMSAmJlxuXHRcdFx0XHRjdXJyZW50VGltZSA9PT0gcGxheWVyLmR1cmF0aW9uKCkpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIGNoZWNrIGZpcnN0IG1hcmtlciwgbm8gbWFya2VyIGlzIHNlbGVjdGVkXG5cdFx0aWYgKG1hcmtlcnNMaXN0Lmxlbmd0aCA+IDAgJiZcblx0XHRcdGN1cnJlbnRUaW1lIDwgc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFswXSkpIHtcblx0XHRcdG5ld01hcmtlckluZGV4ID0gLTE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIGxvb2sgZm9yIG5ldyBpbmRleFxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXJrZXJzTGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRuZXh0TWFya2VyVGltZSA9IGdldE5leHRNYXJrZXJUaW1lKGkpO1xuXG5cdFx0XHRcdGlmIChjdXJyZW50VGltZSA+PSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2ldKSAmJlxuXHRcdFx0XHRcdGN1cnJlbnRUaW1lIDwgbmV4dE1hcmtlclRpbWUpIHtcblx0XHRcdFx0XHRuZXdNYXJrZXJJbmRleCA9IGk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzZXQgbmV3IG1hcmtlciBpbmRleFxuXHRcdGlmIChuZXdNYXJrZXJJbmRleCAhPSBjdXJyZW50TWFya2VySW5kZXgpIHtcblx0XHRcdC8vIHRyaWdnZXIgZXZlbnRcblx0XHRcdGlmIChuZXdNYXJrZXJJbmRleCAhPSAtMSAmJiBvcHRpb25zLm9uTWFya2VyUmVhY2hlZCkge1xuXHRcdFx0XHRvcHRpb25zLm9uTWFya2VyUmVhY2hlZChtYXJrZXJzTGlzdFtuZXdNYXJrZXJJbmRleF0pO1xuXHRcdFx0fVxuXHRcdFx0Y3VycmVudE1hcmtlckluZGV4ID0gbmV3TWFya2VySW5kZXg7XG5cdFx0fVxuXG5cdH1cblxuXHQvLyBzZXR1cCB0aGUgd2hvbGUgdGhpbmdcblx0ZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcblx0XHRpZiAoc2V0dGluZy5tYXJrZXJUaXAuZGlzcGxheSkge1xuXHRcdFx0aW5pdGlhbGl6ZU1hcmtlclRpcCgpO1xuXHRcdH1cblxuXHRcdC8vIHJlbW92ZSBleGlzdGluZyBtYXJrZXJzIGlmIGFscmVhZHkgaW5pdGlhbGl6ZWRcblx0XHRwbGF5ZXIubWFya2Vycy5yZW1vdmVBbGwoKTtcblx0XHRhZGRNYXJrZXJzKG9wdGlvbnMubWFya2Vycyk7XG5cblx0XHRpZiAoc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheSkge1xuXHRcdFx0aW5pdGlhbGl6ZU92ZXJsYXkoKTtcblx0XHR9XG5cdFx0b25UaW1lVXBkYXRlKCk7XG5cdFx0cGxheWVyLm9uKFwidGltZXVwZGF0ZVwiLCBvblRpbWVVcGRhdGUpO1xuXHR9XG5cblx0Ly8gc2V0dXAgdGhlIHBsdWdpbiBhZnRlciB3ZSBsb2FkZWQgdmlkZW8ncyBtZXRhIGRhdGFcblx0cGxheWVyLm9uKFwibG9hZGVkbWV0YWRhdGFcIiwgZnVuY3Rpb24oKSB7XG5cdFx0aW5pdGlhbGl6ZSgpO1xuXHR9KTtcblxuXHQvLyBleHBvc2VkIHBsdWdpbiBBUElcblx0cGxheWVyLm1hcmtlcnMgPSB7XG5cdFx0Z2V0TWFya2VyczogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gbWFya2Vyc0xpc3Q7XG5cdFx0fSxcblx0XHRuZXh0OiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIGdvIHRvIHRoZSBuZXh0IG1hcmtlciBmcm9tIGN1cnJlbnQgdGltZXN0YW1wXG5cdFx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWFya2Vyc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dmFyIG1hcmtlclRpbWUgPSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2ldKTtcblx0XHRcdFx0aWYgKG1hcmtlclRpbWUgPiBjdXJyZW50VGltZSkge1xuXHRcdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShtYXJrZXJUaW1lKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0cHJldjogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBnbyB0byBwcmV2aW91cyBtYXJrZXJcblx0XHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdFx0Zm9yICh2YXIgaSA9IG1hcmtlcnNMaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRcdHZhciBtYXJrZXJUaW1lID0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpXSk7XG5cdFx0XHRcdC8vIGFkZCBhIHRocmVzaG9sZFxuXHRcdFx0XHRpZiAobWFya2VyVGltZSArIDAuNSA8IGN1cnJlbnRUaW1lKSB7XG5cdFx0XHRcdFx0cGxheWVyLmN1cnJlbnRUaW1lKG1hcmtlclRpbWUpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRhZGQ6IGZ1bmN0aW9uKG5ld01hcmtlcnMpIHtcblx0XHRcdC8vIGFkZCBuZXcgbWFya2VycyBnaXZlbiBhbiBhcnJheSBvZiBpbmRleFxuXHRcdFx0YWRkTWFya2VycyhuZXdNYXJrZXJzKTtcblx0XHR9LFxuXHRcdHJlbW92ZTogZnVuY3Rpb24oaW5kZXhBcnJheSkge1xuXHRcdFx0Ly8gcmVtb3ZlIG1hcmtlcnMgZ2l2ZW4gYW4gYXJyYXkgb2YgaW5kZXhcblx0XHRcdHJlbW92ZU1hcmtlcnMoaW5kZXhBcnJheSk7XG5cdFx0fSxcblx0XHRyZW1vdmVBbGw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGluZGV4QXJyYXkgPSBbXTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWFya2Vyc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aW5kZXhBcnJheS5wdXNoKGkpO1xuXHRcdFx0fVxuXHRcdFx0cmVtb3ZlTWFya2VycyhpbmRleEFycmF5KTtcblx0XHR9LFxuXHRcdHVwZGF0ZVRpbWU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gbm90aWZ5IHRoZSBwbHVnaW4gdG8gdXBkYXRlIHRoZSBVSSBmb3IgY2hhbmdlcyBpbiBtYXJrZXIgdGltZXMgXG5cdFx0XHR1cGRhdGVNYXJrZXJzKCk7XG5cdFx0fSxcblx0XHRyZXNldDogZnVuY3Rpb24obmV3TWFya2Vycykge1xuXHRcdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgZXhpc3RpbmcgbWFya2VycyBhbmQgYWRkIG5ldyBvbmVzXG5cdFx0XHRwbGF5ZXIubWFya2Vycy5yZW1vdmVBbGwoKTtcblx0XHRcdGFkZE1hcmtlcnMobmV3TWFya2Vycyk7XG5cdFx0fSxcblx0XHRkZXN0cm95OiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIHVucmVnaXN0ZXIgdGhlIHBsdWdpbnMgYW5kIGNsZWFuIHVwIGV2ZW4gaGFuZGxlcnNcblx0XHRcdHBsYXllci5tYXJrZXJzLnJlbW92ZUFsbCgpO1xuXHRcdFx0YnJlYWtPdmVybGF5LnJlbW92ZSgpO1xuXHRcdFx0bWFya2VyVGlwLnJlbW92ZSgpO1xuXHRcdFx0cGxheWVyLm9mZihcInRpbWV1cGRhdGVcIiwgdXBkYXRlQnJlYWtPdmVybGF5KTtcblx0XHRcdGRlbGV0ZSBwbGF5ZXIubWFya2Vycztcblx0XHR9LFxuXHR9O1xufTtcblxuLyoqXG4gKiDmsLTljbBcbiAqIEBwYXJhbSB7W3R5cGVdfSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cbiAqIHJldHVybiB7W3R5cGVdfSAgW2Rlc2NyaXB0aW9uXVxuICovXG5jb25zdCB3YXRlck1hcmsgPSBmdW5jdGlvbihzZXR0aW5ncykge1xuXHR2YXIgZGVmYXVsdHMgPSB7XG5cdFx0XHRmaWxlOiAnbG9nby5wbmcnLFxuXHRcdFx0eHBvczogMCxcblx0XHRcdHlwb3M6IDAsXG5cdFx0XHR4cmVwZWF0OiAwLFxuXHRcdFx0b3BhY2l0eTogMTAwLFxuXHRcdFx0Y2xpY2thYmxlOiBmYWxzZSxcblx0XHRcdHVybDogXCJcIixcblx0XHRcdGNsYXNzTmFtZTogJ3Zqcy13YXRlcm1hcmsnLFxuXHRcdFx0dGV4dDogZmFsc2UsXG5cdFx0XHRkZWJ1ZzogZmFsc2Vcblx0XHR9LFxuXHRcdGV4dGVuZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGFyZ3MsIHRhcmdldCwgaSwgb2JqZWN0LCBwcm9wZXJ0eTtcblx0XHRcdGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXHRcdFx0dGFyZ2V0ID0gYXJncy5zaGlmdCgpIHx8IHt9O1xuXHRcdFx0Zm9yIChpIGluIGFyZ3MpIHtcblx0XHRcdFx0b2JqZWN0ID0gYXJnc1tpXTtcblx0XHRcdFx0Zm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcblx0XHRcdFx0XHRpZiAob2JqZWN0Lmhhc093blByb3BlcnR5KHByb3BlcnR5KSkge1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBvYmplY3RbcHJvcGVydHldID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcHJvcGVydHldID0gZXh0ZW5kKHRhcmdldFtwcm9wZXJ0eV0sIG9iamVjdFtwcm9wZXJ0eV0pO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Byb3BlcnR5XSA9IG9iamVjdFtwcm9wZXJ0eV07XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGFyZ2V0O1xuXHRcdH07XG5cblx0Ly8hIGdsb2JhbCB2YXJpYmxlIGNvbnRhaW5pbmcgcmVmZXJlbmNlIHRvIHRoZSBET00gZWxlbWVudFxuXHR2YXIgZGl2O1xuXG5cdC8vIHZhciBzZXR0aW5ncyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cdFxuXHRpZiAoc2V0dGluZ3MuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IFJlZ2lzdGVyIGluaXQnKTtcblxuXHR2YXIgb3B0aW9ucywgcGxheWVyLCB2aWRlbywgaW1nLCBsaW5rO1xuXHRvcHRpb25zID0gZXh0ZW5kKGRlZmF1bHRzLCBzZXR0aW5ncyk7XG5cblx0LyogR3JhYiB0aGUgbmVjZXNzYXJ5IERPTSBlbGVtZW50cyAqL1xuXHRwbGF5ZXIgPSB0aGlzLmVsKCk7XG5cdHZpZGVvID0gdGhpcy5lbCgpLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd2aWRlbycpWzBdO1xuXG5cdC8vIGNyZWF0ZSB0aGUgd2F0ZXJtYXJrIGVsZW1lbnRcblx0aWYgKCFkaXYpIHtcblx0XHRkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRkaXYuY2xhc3NOYW1lID0gb3B0aW9ucy5jbGFzc05hbWU7XG5cdH0gZWxzZSB7XG5cdFx0Ly8hIGlmIGRpdiBhbHJlYWR5IGV4aXN0cywgZW1wdHkgaXRcblx0XHRkaXYuaW5uZXJIVE1MID0gJyc7XG5cdH1cblxuXHQvLyBpZiB0ZXh0IGlzIHNldCwgZGlzcGxheSB0ZXh0XG5cdGlmIChvcHRpb25zLnRleHQpXG5cdFx0ZGl2LnRleHRDb250ZW50ID0gb3B0aW9ucy50ZXh0O1xuXG5cdC8vIGlmIGltZyBpcyBzZXQsIGFkZCBpbWdcblx0aWYgKG9wdGlvbnMuZmlsZSkge1xuXHRcdGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdGRpdi5hcHBlbmRDaGlsZChpbWcpO1xuXHRcdGRpdi5zdHlsZS5kaXNwbGF5ID0gXCJpbmxpbmUtYmxvY2tcIjtcblx0XHRkaXYuc3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG5cdFx0ZGl2LnN0eWxlLnpJbmRleCA9IDA7XG5cdFx0aW1nLnNyYyA9IG9wdGlvbnMuZmlsZTtcblx0fVxuXHQvL2ltZy5zdHlsZS5ib3R0b20gPSBcIjBcIjtcblx0Ly9pbWcuc3R5bGUucmlnaHQgPSBcIjBcIjtcblx0aWYgKChvcHRpb25zLnlwb3MgPT09IDApICYmIChvcHRpb25zLnhwb3MgPT09IDApKSAvLyBUb3AgbGVmdFxuXHR7XG5cdFx0ZGl2LnN0eWxlLnRvcCA9IFwiMHB4XCI7XG5cdFx0ZGl2LnN0eWxlLmxlZnQgPSBcIjBweFwiO1xuXHR9IGVsc2UgaWYgKChvcHRpb25zLnlwb3MgPT09IDApICYmIChvcHRpb25zLnhwb3MgPT09IDEwMCkpIC8vIFRvcCByaWdodFxuXHR7XG5cdFx0ZGl2LnN0eWxlLnRvcCA9IFwiMHB4XCI7XG5cdFx0ZGl2LnN0eWxlLnJpZ2h0ID0gXCIwcHhcIjtcblx0fSBlbHNlIGlmICgob3B0aW9ucy55cG9zID09PSAxMDApICYmIChvcHRpb25zLnhwb3MgPT09IDEwMCkpIC8vIEJvdHRvbSByaWdodFxuXHR7XG5cdFx0ZGl2LnN0eWxlLmJvdHRvbSA9IFwiMzZweFwiO1xuXHRcdGRpdi5zdHlsZS5yaWdodCA9IFwiMHB4XCI7XG5cdH0gZWxzZSBpZiAoKG9wdGlvbnMueXBvcyA9PT0gMTAwKSAmJiAob3B0aW9ucy54cG9zID09PSAwKSkgLy8gQm90dG9tIGxlZnRcblx0e1xuXHRcdGRpdi5zdHlsZS5ib3R0b20gPSBcIjM2cHhcIjtcblx0XHRkaXYuc3R5bGUubGVmdCA9IFwiMHB4XCI7XG5cdH0gZWxzZSBpZiAoKG9wdGlvbnMueXBvcyA9PT0gNTApICYmIChvcHRpb25zLnhwb3MgPT09IDUwKSkgLy8gQ2VudGVyXG5cdHtcblx0XHRpZiAob3B0aW9ucy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogcGxheWVyOicgKyBwbGF5ZXIud2lkdGggKyAneCcgKyBwbGF5ZXIuaGVpZ2h0KTtcblx0XHRpZiAob3B0aW9ucy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogdmlkZW86JyArIHZpZGVvLnZpZGVvV2lkdGggKyAneCcgKyB2aWRlby52aWRlb0hlaWdodCk7XG5cdFx0aWYgKG9wdGlvbnMuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IGltYWdlOicgKyBpbWcud2lkdGggKyAneCcgKyBpbWcuaGVpZ2h0KTtcblx0XHRkaXYuc3R5bGUudG9wID0gKHRoaXMuaGVpZ2h0KCkgLyAyKSArIFwicHhcIjtcblx0XHRkaXYuc3R5bGUubGVmdCA9ICh0aGlzLndpZHRoKCkgLyAyKSArIFwicHhcIjtcblx0fVxuXHRkaXYuc3R5bGUub3BhY2l0eSA9IG9wdGlvbnMub3BhY2l0eTtcblxuXHQvL2Rpdi5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPSBcInVybChcIitvcHRpb25zLmZpbGUrXCIpXCI7XG5cdC8vZGl2LnN0eWxlLmJhY2tncm91bmRQb3NpdGlvbi54ID0gb3B0aW9ucy54cG9zK1wiJVwiO1xuXHQvL2Rpdi5zdHlsZS5iYWNrZ3JvdW5kUG9zaXRpb24ueSA9IG9wdGlvbnMueXBvcytcIiVcIjtcblx0Ly9kaXYuc3R5bGUuYmFja2dyb3VuZFJlcGVhdCA9IG9wdGlvbnMueHJlcGVhdDtcblx0Ly9kaXYuc3R5bGUub3BhY2l0eSA9IChvcHRpb25zLm9wYWNpdHkvMTAwKTtcblxuXHQvL2lmIHVzZXIgd2FudHMgd2F0ZXJtYXJrIHRvIGJlIGNsaWNrYWJsZSwgYWRkIGFuY2hvciBlbGVtXG5cdC8vdG9kbzogY2hlY2sgaWYgb3B0aW9ucy51cmwgaXMgYW4gYWN0dWFsIHVybD9cblx0aWYgKG9wdGlvbnMuY2xpY2thYmxlICYmIG9wdGlvbnMudXJsICE9PSBcIlwiKSB7XG5cdFx0bGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuXHRcdGxpbmsuaHJlZiA9IG9wdGlvbnMudXJsO1xuXHRcdGxpbmsudGFyZ2V0ID0gXCJfYmxhbmtcIjtcblx0XHRsaW5rLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0Ly9hZGQgY2xpY2thYmxlIHdhdGVybWFyayB0byB0aGUgcGxheWVyXG5cdFx0cGxheWVyLmFwcGVuZENoaWxkKGxpbmspO1xuXHR9IGVsc2Uge1xuXHRcdC8vYWRkIG5vcm1hbCB3YXRlcm1hcmsgdG8gdGhlIHBsYXllclxuXHRcdHBsYXllci5hcHBlbmRDaGlsZChkaXYpO1xuXHR9XG5cblx0aWYgKG9wdGlvbnMuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IFJlZ2lzdGVyIGVuZCcpO1xufTtcblxuLy8gUmVnaXN0ZXIgdGhlIHBsdWdpbiB3aXRoIHZpZGVvLmpzLlxudmlkZW9qcy5wbHVnaW4oJ29wZW4nLCBvcGVuKTtcbnZpZGVvanMucGx1Z2luKCd2aWRlb0pzUmVzb2x1dGlvblN3aXRjaGVyJywgdmlkZW9Kc1Jlc29sdXRpb25Td2l0Y2hlcik7XG52aWRlb2pzLnBsdWdpbignZGlzYWJsZVByb2dyZXNzJywgZGlzYWJsZVByb2dyZXNzKTtcbnZpZGVvanMucGx1Z2luKCdtYXJrZXJzJywgbWFya2Vycyk7XG52aWRlb2pzLnBsdWdpbignd2F0ZXJNYXJrJywgd2F0ZXJNYXJrKTtcblxuLy8gSW5jbHVkZSB0aGUgdmVyc2lvbiBudW1iZXIuXG5vcGVuLlZFUlNJT04gPSAnX19WRVJTSU9OX18nO1xuXG5leHBvcnQgZGVmYXVsdCBvcGVuOyIsImltcG9ydCBkb2N1bWVudCBmcm9tICdnbG9iYWwvZG9jdW1lbnQnO1xuXG5pbXBvcnQgUVVuaXQgZnJvbSAncXVuaXQnO1xuaW1wb3J0IHNpbm9uIGZyb20gJ3Npbm9uJztcbmltcG9ydCB2aWRlb2pzIGZyb20gJ3ZpZGVvLmpzJztcblxuaW1wb3J0IHBsdWdpbiBmcm9tICcuLi9zcmMvcGx1Z2luJztcblxuY29uc3QgUGxheWVyID0gdmlkZW9qcy5nZXRDb21wb25lbnQoJ1BsYXllcicpO1xuXG5RVW5pdC50ZXN0KCd0aGUgZW52aXJvbm1lbnQgaXMgc2FuZScsIGZ1bmN0aW9uKGFzc2VydCkge1xuICBhc3NlcnQuc3RyaWN0RXF1YWwodHlwZW9mIEFycmF5LmlzQXJyYXksICdmdW5jdGlvbicsICdlczUgZXhpc3RzJyk7XG4gIGFzc2VydC5zdHJpY3RFcXVhbCh0eXBlb2Ygc2lub24sICdvYmplY3QnLCAnc2lub24gZXhpc3RzJyk7XG4gIGFzc2VydC5zdHJpY3RFcXVhbCh0eXBlb2YgdmlkZW9qcywgJ2Z1bmN0aW9uJywgJ3ZpZGVvanMgZXhpc3RzJyk7XG4gIGFzc2VydC5zdHJpY3RFcXVhbCh0eXBlb2YgcGx1Z2luLCAnZnVuY3Rpb24nLCAncGx1Z2luIGlzIGEgZnVuY3Rpb24nKTtcbn0pO1xuXG5RVW5pdC5tb2R1bGUoJ3ZpZGVvanMtb3BlbicsIHtcblxuICBiZWZvcmVFYWNoKCkge1xuXG4gICAgLy8gTW9jayB0aGUgZW52aXJvbm1lbnQncyB0aW1lcnMgYmVjYXVzZSBjZXJ0YWluIHRoaW5ncyAtIHBhcnRpY3VsYXJseVxuICAgIC8vIHBsYXllciByZWFkaW5lc3MgLSBhcmUgYXN5bmNocm9ub3VzIGluIHZpZGVvLmpzIDUuIFRoaXMgTVVTVCBjb21lXG4gICAgLy8gYmVmb3JlIGFueSBwbGF5ZXIgaXMgY3JlYXRlZDsgb3RoZXJ3aXNlLCB0aW1lcnMgY291bGQgZ2V0IGNyZWF0ZWRcbiAgICAvLyB3aXRoIHRoZSBhY3R1YWwgdGltZXIgbWV0aG9kcyFcbiAgICB0aGlzLmNsb2NrID0gc2lub24udXNlRmFrZVRpbWVycygpO1xuXG4gICAgdGhpcy5maXh0dXJlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3F1bml0LWZpeHR1cmUnKTtcbiAgICB0aGlzLnZpZGVvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndmlkZW8nKTtcbiAgICB0aGlzLmZpeHR1cmUuYXBwZW5kQ2hpbGQodGhpcy52aWRlbyk7XG4gICAgdGhpcy5wbGF5ZXIgPSB2aWRlb2pzKHRoaXMudmlkZW8pO1xuICB9LFxuXG4gIGFmdGVyRWFjaCgpIHtcbiAgICB0aGlzLnBsYXllci5kaXNwb3NlKCk7XG4gICAgdGhpcy5jbG9jay5yZXN0b3JlKCk7XG4gIH1cbn0pO1xuXG5RVW5pdC50ZXN0KCdyZWdpc3RlcnMgaXRzZWxmIHdpdGggdmlkZW8uanMnLCBmdW5jdGlvbihhc3NlcnQpIHtcbiAgYXNzZXJ0LmV4cGVjdCgyKTtcblxuICBhc3NlcnQuc3RyaWN0RXF1YWwoXG4gICAgUGxheWVyLnByb3RvdHlwZS5vcGVuLFxuICAgIHBsdWdpbixcbiAgICAndmlkZW9qcy1vcGVuIHBsdWdpbiB3YXMgcmVnaXN0ZXJlZCdcbiAgKTtcblxuICB0aGlzLnBsYXllci5vcGVuKCk7XG5cbiAgLy8gVGljayB0aGUgY2xvY2sgZm9yd2FyZCBlbm91Z2ggdG8gdHJpZ2dlciB0aGUgcGxheWVyIHRvIGJlIFwicmVhZHlcIi5cbiAgdGhpcy5jbG9jay50aWNrKDEpO1xuXG4gIGFzc2VydC5vayhcbiAgICB0aGlzLnBsYXllci5oYXNDbGFzcygndmpzLW9wZW4nKSxcbiAgICAndGhlIHBsdWdpbiBhZGRzIGEgY2xhc3MgdG8gdGhlIHBsYXllcidcbiAgKTtcbn0pO1xuIl19
